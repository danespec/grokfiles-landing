"""Idempotent owner-operated import into existing D1; decisions survive unchanged inputs."""
import argparse,datetime,hashlib,json,pathlib,sys

def quote(s):return "'"+str(s).replace("'","''")+"'"
def statements(package):
    now=datetime.datetime.now(datetime.timezone.utc).isoformat()
    for x in package['items']:
        payload=json.dumps(x['payload'],ensure_ascii=False,separators=(',',':'))
        values=[x['item_id'],x['kind'],x['title'],x['content_hash'],payload,x.get('question_hash',''),'pending' if x['payload'].get('release_gate') else 'blocked',now]
        yield "INSERT INTO gah_review_items(item_id,kind,title,content_hash,payload_json,question_hash,state,updated_at) VALUES ("+','.join(map(quote,values))+""") ON CONFLICT(item_id) DO UPDATE SET title=excluded.title,payload_json=excluded.payload_json,question_hash=excluded.question_hash,updated_at=CASE WHEN gah_review_items.content_hash=excluded.content_hash THEN gah_review_items.updated_at ELSE excluded.updated_at END,state=CASE WHEN gah_review_items.state='revoked' THEN 'revoked' WHEN gah_review_items.content_hash=excluded.content_hash AND gah_review_items.state='pending' AND gah_review_items.last_event_id IS NULL THEN excluded.state WHEN gah_review_items.content_hash=excluded.content_hash THEN gah_review_items.state ELSE excluded.state END,approved_json=CASE WHEN gah_review_items.content_hash=excluded.content_hash THEN gah_review_items.approved_json ELSE NULL END,last_event_id=CASE WHEN gah_review_items.content_hash=excluded.content_hash THEN gah_review_items.last_event_id ELSE NULL END,revision=gah_review_items.revision+CASE WHEN gah_review_items.content_hash=excluded.content_hash THEN 0 ELSE 1 END,content_hash=excluded.content_hash;"""

def main():
    p=argparse.ArgumentParser();p.add_argument('--package',type=pathlib.Path,required=True);p.add_argument('--cloudflare-ops',type=pathlib.Path,required=True);p.add_argument('--database',required=True);p.add_argument('--schema',type=pathlib.Path,required=True);a=p.parse_args()
    sys.path.insert(0,str(a.cloudflare_ops));from cf_ops import api,ACCOUNT
    route='/accounts/'+ACCOUNT+'/d1/database/'+a.database+'/query'
    package=json.loads(a.package.read_text())
    if len(package['items'])!=84 or len({x['item_id'] for x in package['items']})!=84:raise ValueError('Expected exactly 84 distinct review items')
    api(route,'POST',{'sql':a.schema.read_text(),'params':[]})
    trigger="""CREATE TRIGGER IF NOT EXISTS gah_review_source_change AFTER UPDATE OF content_hash ON gah_review_items WHEN OLD.content_hash<>NEW.content_hash BEGIN INSERT INTO gah_review_events(event_id,item_id,content_hash,decision,actor_email,assertions_json,note,created_at) VALUES(lower(hex(randomblob(16))),NEW.item_id,NEW.content_hash,'source_changed','system','{}','Source/package changed; prior certification invalidated. Unchanged verification evidence is retained.',NEW.updated_at); END;"""
    api(route,'POST',{'sql':trigger,'params':[]})
    batch='';count=0
    for sql in statements(package):
        if len((batch+sql).encode())>60000:
            api(route,'POST',{'sql':batch,'params':[]});batch=''
        batch+=sql;count+=1
    if batch:api(route,'POST',{'sql':batch,'params':[]})
    result=api(route,'POST',{'sql':'SELECT kind,state,count(*) AS items FROM gah_review_items GROUP BY kind,state','params':[]})
    print(json.dumps({'imported':count,'decisions_preserved_for_unchanged_versions':True,'counts':result[0]['results']}))

if __name__=='__main__':main()
