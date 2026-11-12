// Private aggregate snapshots are written by the owner's collector, never by a public route.
export async function readReconciliation(env, now = Date.now()) {
  const unavailable = {schema:'gah_reconciliation_v1',status:'unavailable',message:'Reconciliation collection has not connected. Missing data is not zero.',metrics:[],daily:[],health:[]};
  if (!env.RECONCILIATION) return unavailable;
  let value;
  try { value = await env.RECONCILIATION.get('reconciliation:latest', 'json'); } catch { return unavailable; }
  if (!value || value.schema !== 'gah_reconciliation_v1' || !Number.isFinite(Date.parse(value.generated_at))) return unavailable;
  return {...value,status:now-Date.parse(value.generated_at)>7200000?'stale':'connected'};
}
