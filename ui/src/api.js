const BASE = '/api'

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  return res.json()
}

export const api = {
  // Projects
  getProjects: () => req('GET', '/projects'),
  createProject: (data) => req('POST', '/projects', data),
  getProject: (id) => req('GET', `/projects/${id}`),
  updateProject: (id, data) => req('PUT', `/projects/${id}`, data),
  deleteProject: (id) => req('DELETE', `/projects/${id}`),

  // Modules
  getModules: (projectId) => req('GET', `/projects/${projectId}/modules`),
  createModule: (projectId, data) => req('POST', `/projects/${projectId}/modules`, data),
  updateModule: (projectId, moduleId, data) => req('PUT', `/projects/${projectId}/modules/${moduleId}`, data),
  deleteModule: (projectId, moduleId) => req('DELETE', `/projects/${projectId}/modules/${moduleId}`),

  // Runs
  runModule: (moduleId) => req('POST', `/modules/${moduleId}/run`),
  abortRun: (runId) => req('POST', `/runs/${runId}/abort`),
  getRun: (runId) => req('GET', `/runs/${runId}`),
  getRunScreenshots: (runId) => req('GET', `/runs/${runId}/screenshots`),
  getModuleRuns: (moduleId) => req('GET', `/modules/${moduleId}/runs`),
  getProjectRuns: (projectId) => req('GET', `/projects/${projectId}/runs`),

  // Email
  testEmail: (config) => req('POST', '/test-email', config),
}

export function connectWS(runId, onMessage) {
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
  const ws = new WebSocket(`${protocol}://${location.host}/ws?runId=${runId}`)
  ws.onmessage = (e) => onMessage(JSON.parse(e.data))
  return ws
}
