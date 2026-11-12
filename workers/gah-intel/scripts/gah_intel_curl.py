#!/usr/bin/env python3
"""Adapter for the existing GAH shell monitor; no secrets in process arguments."""
import hashlib
import hmac
import os
from pathlib import Path
import stat
import subprocess
import sys
import time
from urllib.parse import urlsplit


def curl_config(args, secret_path, now=None):
    # The audited monitor places one URL last and uses -d with literal JSON.
    # Redirect follow-ups retain this signature and may be unclassified if the path changes.
    if not args:
        raise ValueError('Missing curl arguments')
    url = urlsplit(args[-1])
    config = 'user-agent = "GAH-Monitor/1.0"\n'
    if url.scheme != 'https' or url.hostname not in {'grokarchivehub.com', 'www.grokarchivehub.com'} or url.port not in {None, 443} or url.username or url.password:
        return config  # Never attach signatures to other services.
    method = 'GET'
    if '-X' in args:
        method = args[args.index('-X') + 1]
    elif '-I' in args or '--head' in args:
        method = 'HEAD'
    path = Path(secret_path)
    if not path.exists():
        return config  # Health probes still run before telemetry is enabled.
    mode = path.stat()
    if not stat.S_ISREG(mode.st_mode) or mode.st_mode & 0o077:
        raise ValueError('Monitoring secret file must be private (0600)')
    secret = path.read_text().strip()
    if len(secret) < 32:
        raise ValueError('Monitoring secret is too short')
    timestamp = int(time.time() if now is None else now)
    message = f'{timestamp}\n{method}\n{url.path or "/"}'.encode()
    signature = hmac.new(secret.encode(), message, hashlib.sha256).hexdigest()
    return config + f'header = "X-GAH-Monitor: {timestamp}.{signature}"\n'


def main():
    root = Path(os.environ.get('GROK_WORKER_ROOT', Path.home() / 'grok-worker'))
    secret_path = os.environ.get('GAH_MONITOR_HMAC_SECRET_FILE', str(root / 'config/gah-intel-monitor.secret'))
    try:
        config = curl_config(sys.argv[1:], secret_path)
    except (ValueError, OSError):
        # Classification failures must not turn health checks into false outages.
        print('GAH Intel signing unavailable; health probe continues unsigned.', file=sys.stderr)
        config = 'user-agent = "GAH-Monitor/1.0"\n'
    result = subprocess.run(['/usr/bin/curl', '--config', '-', *sys.argv[1:]], input=config.encode())
    raise SystemExit(result.returncode)


if __name__ == '__main__':
    main()
