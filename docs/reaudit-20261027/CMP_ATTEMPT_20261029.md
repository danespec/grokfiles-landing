# Authorized paused-tag test — October 29

The owner explicitly approved loading the publisher tag with pauseAdRequests=1 while adsenseApproved stays false. That approval persists for subsequent work.

The test loaded the publisher tag and its managed implementation after allowing their exact script paths. No ad placement was inserted and no pauseAdRequests=0 command was added. The published Google dialog did not appear. A separate single-bootstrap test reproduced the endpoint and debug parameters used in Google’s current managed implementation, including its AdSense client identifier, href, ers=2, fc=alwaysshow and fctype=gdpr. Google’s /i and /f scripts loaded, but the browser DOM ended with __tcfapiLocator, googlefcInactive and googlefcLoaded hidden frames and no consent dialog. No recorded securitypolicyviolation explained that final inactive result.

This is a failed acceptance test, not a completed CMP integration. The cause of Google’s inactive result is not established. Do not claim it is caused by approval, geography, site eligibility or Google blocking the browser without further evidence. Earlier account observation: European regulations message Published since June 22, zero messages shown.

All runtime experiments were reverted and the baseline production artifact redeployed. Post-restore HTML verifies adsenseApproved:false, googleCmpConfiguredByPublisher:false and no experimental bootstrap. The existing privacy wording remains accurate. The existing dispatch/sitemap/noindex changes are retained. No AdSense review was submitted.

The remaining work is to diagnose why Google’s published message is inactive for this publisher/site, then repeat dialog, rejection and revocation tests. The candidate patch is retained locally at reaudit/cmp-approved-attempt.patch; it is not a successful or production-ready patch.
