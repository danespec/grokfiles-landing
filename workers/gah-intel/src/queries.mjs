export const DATASET = 'gah_intel_v1';
export const TRAFFIC = ['unclassified', 'monitoring', 'verified_bot', 'declared_automation'];

export function queryPlan(searchParams, now = Date.now()) {
  const hours = Number(searchParams.get('hours') || 24);
  const traffic = searchParams.get('traffic') || 'unclassified';
  if (![1, 24, 168, 720].includes(hours) || ![...TRAFFIC, 'all'].includes(traffic)) throw new Error('Invalid dashboard filter');
  // Fixed dataset and dimensions, enum filters, and server timestamps only. No raw SQL endpoint.
  const until = Math.floor(now / 1000), since = until - hours * 3600;
  const time = `blob1 = 'gah_intel_v1' AND timestamp >= toDateTime(${since}) AND timestamp < toDateTime(${until})`;
  const where = time + (traffic === 'all' ? '' : ` AND blob7 = '${traffic}'`);
  const requests = 'SUM(_sample_interval)';
  const grouped = dimension => `SELECT ${dimension} AS label, ${requests} AS requests FROM ${DATASET} WHERE ${where} GROUP BY label ORDER BY requests DESC LIMIT 20 FORMAT JSON`;
  return {
    hours, traffic, since: new Date(since * 1000).toISOString(), until: new Date(until * 1000).toISOString(),
    sql: {
      summary: `SELECT ${requests} AS requests, SUM(_sample_interval * double3) AS html_responses, SUM(IF(double1 >= 500, _sample_interval, 0)) AS server_errors, SUM(IF(double1 >= 400 AND double1 < 500, _sample_interval, 0)) AS client_errors, SUM(_sample_interval * double2) / SUM(_sample_interval) AS mean_ms FROM ${DATASET} WHERE ${where} FORMAT JSON`,
      traffic: `SELECT blob7 AS label, ${requests} AS requests FROM ${DATASET} WHERE ${time} GROUP BY label ORDER BY requests DESC LIMIT 10 FORMAT JSON`,
      routes: grouped('blob3'), countries: grouped('blob5'), sources: grouped('blob6'),
      timeline: `SELECT toStartOfInterval(timestamp, INTERVAL '1' ${hours > 168 ? 'DAY' : 'HOUR'}) AS bucket, ${requests} AS requests FROM ${DATASET} WHERE ${where} GROUP BY bucket ORDER BY bucket LIMIT 744 FORMAT JSON`,
    },
  };
}

export async function readDashboard(env, searchParams, fetcher = fetch, now = Date.now()) {
  const plan = queryPlan(searchParams, now);
  if (!/^[a-f0-9]{32}$/.test(env.CF_ACCOUNT_ID || '') || !env.ANALYTICS_READ_TOKEN) throw new Error('Analytics connection unavailable');
  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/analytics_engine/sql`;
  const entries = await Promise.all(Object.entries(plan.sql).map(async ([name, sql]) => {
    const response = await fetcher(endpoint, {
      method: 'POST', headers: { Authorization: `Bearer ${env.ANALYTICS_READ_TOKEN}`, 'Content-Type': 'text/plain' },
      body: sql, signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw new Error('Analytics query failed');
    const body = await response.json();
    if (!Array.isArray(body.data)) throw new Error('Analytics returned an invalid response');
    return [name, body.data];
  }));
  return {
    schema: 'gah_intel_dashboard_v1', generated_at: new Date(now).toISOString(),
    hours: plan.hours, traffic_filter: plan.traffic, since: plan.since, until: plan.until,
    coverage: 'Pages Worker requests only; excluded static routes and edge-blocked requests are absent. Counts are sample-weighted estimates, not unique visitors or sessions.',
    ...Object.fromEntries(entries),
  };
}
