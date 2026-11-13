#!/usr/bin/env python3
"""Collect aggregate metrics into private KV. Never sends Measurement Protocol events.
Config and optional Google service-account JSON live outside this repository.
Uses the owner's existing Wrangler session for CF reads and the private KV write.
"""
import argparse, datetime as dt, json, os, pathlib, subprocess, tempfile, tomllib, urllib.parse, time, hmac, hashlib
from zoneinfo import ZoneInfo

UTC=dt.timezone.utc
HOSTS=['grokarchivehub.com','www.grokarchivehub.com','wiki.grokarchivehub.com']
ROUTES=['/','/archive/EFTA00035613','/archive/EFTA00035053','/archive/EFTA00035828','/archive/EFTA00035206','/archive/EFTA00035420','/archive/EFTA00035574','/archive/EFTA00035657','/investigations','/dispatches','/news','/research/epstein-final-48-hours-mcc','/archive','/search','/pdf-lite?id=EFTA00035613']

def curl_json(url, token, payload=None, method='POST'):
    args=['curl','--silent','--show-error','--max-time','30','--config','-','-X',method,url]
    body=None
    try:
        if payload is not None:
            body=tempfile.NamedTemporaryFile(mode='w',delete=False)
            json.dump(payload,body);body.close();args+=['--data-binary','@'+body.name]
        p=subprocess.run(args,input='header = "Authorization: Bearer '+token+'"\nheader = "Content-Type: application/json"\n',capture_output=True,text=True,check=True)
        out=json.loads(p.stdout)
        if out.get('errors') or out.get('error') or out.get('success') is False:raise RuntimeError('provider_rejected_request')
        return out
    finally:
        if body:os.unlink(body.name)

def graph(config, token, query):
    return curl_json('https://api.cloudflare.com/client/v4/graphql',token,{'query':query})['data']['viewer']

def web(config, token, since, until, site):
    # Separate property+hostname groups prevent adding duplicate beacons from distinct properties.
    query='''{viewer{accounts(filter:{accountTag:%s}){rumPageloadEventsAdaptiveGroups(limit:5000,filter:{siteTag:%s,datetime_geq:%s,datetime_lt:%s,requestHost_in:%s},orderBy:[count_DESC]){count dimensions{datetimeHour requestHost countryName refererHost requestPath bot}}}}}''' % tuple(map(json.dumps,[config['account_id'],site,since,until,HOSTS]))
    rows=graph(config,token,query)['accounts'][0]['rumPageloadEventsAdaptiveGroups']
    if len(rows)>=5000:raise RuntimeError('provider_group_limit')
    return rows

def raw_day(config, token, since, until):
    query='''{viewer{zones(filter:{zoneTag:%s}){httpRequestsAdaptiveGroups(limit:30,filter:{datetime_geq:%s,datetime_lt:%s,clientRequestHTTPHost_in:%s}){count sum{visits} dimensions{date clientRequestHTTPHost}}}}}''' % tuple(map(json.dumps,[config['zone_id'],since,until,HOSTS]))
    return graph(config,token,query)['zones'][0]['httpRequestsAdaptiveGroups']

def google_token(config):
    path=config.get('google_service_account_file')
    if not path:return None
    # Standard service-account JWT exchange, analytics.readonly only.
    import base64, time
    key=json.loads(pathlib.Path(path).read_text())
    enc=lambda x:base64.urlsafe_b64encode(json.dumps(x,separators=(',',':')).encode()).rstrip(b'=')
    now=int(time.time());unsigned=enc({'alg':'RS256','typ':'JWT'})+b'.'+enc({'iss':key['client_email'],'scope':'https://www.googleapis.com/auth/analytics.readonly','aud':'https://oauth2.googleapis.com/token','iat':now,'exp':now+3600})
    with tempfile.NamedTemporaryFile(mode='w') as k:
        k.write(key['private_key']);k.flush()
        sig=subprocess.run(['openssl','dgst','-sha256','-sign',k.name],input=unsigned,capture_output=True,check=True).stdout
    assertion=unsigned.decode()+'.'+base64.urlsafe_b64encode(sig).rstrip(b'=').decode()
    data=urllib.parse.urlencode({'grant_type':'urn:ietf:params:oauth:grant-type:jwt-bearer','assertion':assertion})
    p=subprocess.run(['curl','-sS','--max-time','30','-X','POST','--data-binary','@-','https://oauth2.googleapis.com/token'],input=data,capture_output=True,text=True,check=True)
    return json.loads(p.stdout)['access_token']

def ga4(config,start,end):
    token=google_token(config)
    if not token:return None
    payload={'dateRanges':[{'startDate':start,'endDate':end}],'dimensions':[{'name':'date'},{'name':'hostName'}],'metrics':[{'name':'screenPageViews'},{'name':'sessions'},{'name':'activeUsers'}],'dimensionFilter':{'filter':{'fieldName':'hostName','inListFilter':{'values':HOSTS}}},'limit':1000,'returnPropertyQuota':True}
    r=curl_json('https://analyticsdata.googleapis.com/v1beta/properties/'+str(config['ga4_property_id'])+':runReport',token,payload)
    if r.get('rowCount',0)>=1000 or r.get('metadata',{}).get('subjectToThresholding'):raise RuntimeError('ga4_incomplete_report')
    totals={**payload,'dimensions':[],'limit':1}
    r['aggregate']=curl_json('https://analyticsdata.googleapis.com/v1beta/properties/'+str(config['ga4_property_id'])+':runReport',token,totals)
    return r

def group(rows, key):
    out={}
    for row in rows:
        label=row['dimensions'].get(key) or 'Direct / unknown';out[label]=out.get(label,0)+int(row['count'])
    return [{'label':k,'requests':v} for k,v in sorted(out.items(),key=lambda x:-x[1])[:30]]

def health(config):
    out=[]
    for route in ROUTES:
        curl_config='user-agent = "GAH-Monitor/1.0 (instrumentation health)"\n'
        if config.get('monitor_secret_file'):
            secret=pathlib.Path(config['monitor_secret_file']).read_text().strip();stamp=str(int(time.time()));path=urllib.parse.urlsplit(route).path
            signature=hmac.new(secret.encode(),(stamp+'\nGET\n'+path).encode(),hashlib.sha256).hexdigest()
            curl_config+='header = "X-GAH-Monitor: '+stamp+'.'+signature+'"\n'
        p=subprocess.run(['curl','-sS','--max-time','20','-L','--config','-','-w','\n%{http_code}','https://grokarchivehub.com'+route],input=curl_config,capture_output=True,text=True)
        body,_,status=p.stdout.rpartition('\n')
        ok=status=='200' and body.count('src="/frontdoor/analytics.js?')==1 and '"ga4MeasurementId":"G-XHE84C8D1V"' in body
        failure='Worker resource limit (1102)' if 'error code: 1102' in body else 'HTML coverage requires review; curl exit '+str(p.returncode)
        out.append({'route':route,'status':'pass' if ok else 'check','note':'HTTP '+status+'; '+('shared HTML instrumentation' if ok else failure)})
    return out

def collect(config,token,now=None):
    now=now or dt.datetime.now(UTC)
    reporting_timezone=config.get('reporting_timezone','UTC');zone=ZoneInfo(reporting_timezone)
    until=now.astimezone(zone).replace(hour=0,minute=0,second=0,microsecond=0);since=until-dt.timedelta(days=7)
    iso=lambda d:d.astimezone(UTC).isoformat().replace('+00:00','Z')
    primary=web(config,token,iso(since),iso(until),config['primary_site_tag'])
    # Browser bot=0 means not identified as a bot by this dataset, never verified human.
    main=[r for r in primary if r['dimensions']['requestHost'] in HOSTS[:2] and not r['dimensions']['bot']]
    legacy=[];legacy_status='unavailable'
    try:legacy=web(config,token,iso(since),iso(until),config['legacy_site_tag']);legacy_status='connected'
    except Exception:pass
    raw=[];raw_status='connected'
    try:
        for i in range(7):
            d=since+dt.timedelta(days=i);raw+=raw_day(config,token,iso(d),iso(d+dt.timedelta(days=1)))
    except Exception:raw_status='partial' if raw else 'unavailable'
    ga=None;ga_status='unavailable: read-only GA4 API credential not connected'
    try:
        ga=ga4(config,since.date().isoformat(),(until-dt.timedelta(days=1)).date().isoformat())
        if ga is not None:ga_status='connected'
    except Exception:ga_status='unavailable: GA4 API authorization or report validation failed'
    timezone=(ga or {}).get('metadata',{}).get('timeZone')
    # Convert CF hourly buckets into the actual GA4 calendar, including DST.
    # Fractional-hour zones need finer CF buckets and must not be compared here.
    whole_hours=all((since+dt.timedelta(days=i)).utcoffset().total_seconds()%3600==0 for i in range(8))
    matching_zone=timezone==reporting_timezone or {timezone,reporting_timezone}<={'UTC','Etc/UTC'}
    comparable=ga is not None and matching_zone and whole_hours
    days={str((since+dt.timedelta(days=i)).date()):{'date':str((since+dt.timedelta(days=i)).date()),'cloudflare':0,'ga4':None,'comparable':comparable} for i in range(7)}
    for r in main:
        day=dt.datetime.fromisoformat(r['dimensions']['datetimeHour'].replace('Z','+00:00')).astimezone(zone).date().isoformat()
        if day not in days:raise RuntimeError('cloudflare_bucket_outside_reporting_window')
        days[day]['cloudflare']+=int(r['count'])
    if ga is not None:
        for row in ga.get('rows',[]):
            day=dt.datetime.strptime(row['dimensionValues'][0]['value'],'%Y%m%d').date().isoformat();host=row['dimensionValues'][1]['value']
            if day in days and host in HOSTS[:2]:days[day]['ga4']=(days[day]['ga4'] or 0)+int(row['metricValues'][0]['value'])
        for d in days.values():
            if d['ga4'] is None:d['ga4']=0
    raw_count=sum(int(r['count']) for r in raw) if raw_status=='connected' else None
    aggregate=((ga or {}).get('aggregate',{}).get('rows') or [{}])[0].get('metricValues',[])
    sessions=int(aggregate[1]['value']) if len(aggregate)>1 else None
    users=int(aggregate[2]['value']) if len(aggregate)>2 else None
    wiki=[r for r in legacy if r['dimensions']['requestHost']==HOSTS[2] and not r['dimensions']['bot']]
    main_count=sum(int(r['count']) for r in main);non_us=sum(int(r['count']) for r in main if r['dimensions']['countryName'] not in ['US','United States','','XX','ZZ','Unknown','unknown'])
    metrics=[
      {'label':'Cloudflare raw HTTP requests','value':raw_count,'status':raw_status,'note':'All public hosts; assets and automation included; adaptive estimates; 7 complete calendar days in '+reporting_timezone+' (GA4 may still revise recent data)'},
      {'label':'Cloudflare browser pageviews · main','value':main_count,'status':'connected','note':'Primary property; apex/www only; known browser bots excluded; not confirmed humans'},
      {'label':'Cloudflare browser pageviews · wiki','value':sum(int(r['count']) for r in wiki) if legacy_status=='connected' else None,'status':legacy_status,'note':'Legacy property; wiki hostname only; not added to main for a parity claim'},
      {'label':'GA4 pageviews · main','value':sum(d['ga4'] for d in days.values()) if ga is not None else None,'status':ga_status,'note':'Apex/www; consenting measured browser activity; property timezone '+str(timezone or 'unavailable')},
      {'label':'PDF viewer browser pageviews · main','value':sum(int(r['count']) for r in main if r['dimensions']['requestPath'] in ['/pdf-lite','/pdf-lite.html']),'status':'connected','note':'Browser beacon views of viewer route; separate from PDF file requests'},
      {'label':'Non-US browser pageviews · main','value':non_us,'status':'connected','note':'Known non-US country-level browser signal; unknown countries are excluded; no confirmed-human estimate'},
      {'label':'GA4 sessions · public hosts','value':sessions,'status':ga_status,'note':'GA4 session definition; not HTTP requests or CF visits'},
      {'label':'GA4 active users · public hosts','value':users,'status':ga_status,'note':'Aggregate GA4 active users over the full period; never summed across days or hostnames'},
      {'label':'Legacy CF property · all public hosts','value':sum(int(r['count']) for r in legacy) if legacy_status=='connected' else None,'status':legacy_status,'note':'Diagnostic parallel property; do not add to primary-property counts'}]
    return {'schema':'gah_reconciliation_v1','generated_at':iso(now),'since':iso(since),'until':iso(until),'metrics':metrics,'daily':list(days.values()),'health':health(config),'countries':group(main,'countryName'),'referrals':group(main,'refererHost'),'reporting_timezone':reporting_timezone,'audience_note':'Calendar dates use '+reporting_timezone+'. '+str(non_us)+' of '+str(main_count)+' main-site browser views originated outside the US; country signal only. Known browser bots excluded; undetected bots may remain. CF groups and raw requests may be sampled. GA4 reporting can lag 24–48 hours. No parity conclusion while GA4 is unavailable or date boundaries differ.','provider_status':{'raw':raw_status,'ga4':ga_status,'ga4_timezone':timezone,'legacy':legacy_status}}

def traffic_classes(config):
    path=config.get('analytics_read_token_file')
    if not path:return None
    token=pathlib.Path(path).read_text().strip()
    sql="SELECT blob7 AS label, SUM(_sample_interval) AS requests FROM gah_intel_v1 WHERE timestamp >= NOW() - INTERVAL '24' HOUR GROUP BY label FORMAT JSON"
    with tempfile.NamedTemporaryFile(mode='w') as f:
        f.write(sql);f.flush()
        url='https://api.cloudflare.com/client/v4/accounts/'+config['account_id']+'/analytics_engine/sql'
        p=subprocess.run(['curl','-sS','--max-time','30','--config','-','--data-binary','@'+f.name,url],input='header = "Authorization: Bearer '+token+'"\nheader = "Content-Type: text/plain"\n',capture_output=True,text=True,check=True)
        r=json.loads(p.stdout)
        if not isinstance(r.get('data'),list):raise RuntimeError('traffic_classes_unavailable')
        return {x['label']:int(x['requests']) for x in r['data']}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--config',required=True);parser.add_argument('--no-upload',action='store_true');args=parser.parse_args()
    config=json.loads(pathlib.Path(args.config).read_text())
    token=tomllib.loads(pathlib.Path(config.get('wrangler_auth',str(pathlib.Path.home()/'.wrangler/config/default.toml'))).read_text())['oauth_token']
    result=collect(config,token)
    try:classes=traffic_classes(config)
    except Exception:classes=None
    for key,label in [('verified_bot','Verified crawler requests'),('monitoring','Signed internal monitoring requests')]:
        result['metrics'].append({'label':label,'value':classes.get(key,0) if classes is not None else None,'status':'connected' if classes is not None else 'unavailable','note':'TI Worker observations, rolling 24 hours; prospective and partial coverage; sample weighted'})
    path=pathlib.Path(config['snapshot_file']);path.write_text(json.dumps(result,indent=2));path.chmod(0o600)
    if not args.no_upload:
        url='https://api.cloudflare.com/client/v4/accounts/'+config['account_id']+'/storage/kv/namespaces/'+config['kv_namespace_id']+'/values/reconciliation:latest'
        curl_json(url+'?expiration_ttl=604800',token,result,'PUT')
    print(json.dumps({'status':'collected' if args.no_upload else 'uploaded','generated_at':result['generated_at'],'providers':result['provider_status'],'health_checks':len(result['health'])}))
if __name__=='__main__':main()
