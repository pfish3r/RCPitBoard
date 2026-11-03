// Local API adapter; preserves the existing board component interfaces.
async function request(path, method = 'GET', body) {
  const response = await fetch('/api' + path, {
    method, credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-RCPitBoard': '1' },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: response.status });
  return data;
}
export const api = {
  entities: { TrackSettings: {
    filter: () => request('/settings').then(settings => ({ items: [settings] })),
    create: data => request('/settings', 'PUT', data),
    update: (_id, data) => request('/settings', 'PUT', data),
  } },
  functions: { invoke: () => request('/snapshot').then(data => ({ data })) },
};
