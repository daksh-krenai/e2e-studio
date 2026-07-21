import { JSONFilePreset } from 'lowdb/node'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const defaultData = {
  projects: [],
  modules: [],
  runs: []
}

let db

export async function initDb() {
  db = await JSONFilePreset(path.join(__dirname, '../data/db.json'), defaultData)
  return db
}

export function getDb() {
  return db
}

// Projects
export function createProject({ name, baseUrl, description, emailConfig }) {
  const project = {
    id: uuidv4(),
    name,
    baseUrl,
    description: description || '',
    emailConfig: emailConfig || null,
    createdAt: new Date().toISOString()
  }
  db.data.projects.push(project)
  db.write()
  return project
}

export function getProjects() {
  return db.data.projects
}

export function getProject(id) {
  return db.data.projects.find(p => p.id === id)
}

export function updateProject(id, updates) {
  const idx = db.data.projects.findIndex(p => p.id === id)
  if (idx === -1) return null
  db.data.projects[idx] = { ...db.data.projects[idx], ...updates }
  db.write()
  return db.data.projects[idx]
}

export function deleteProject(id) {
  db.data.projects = db.data.projects.filter(p => p.id !== id)
  db.data.modules = db.data.modules.filter(m => m.projectId !== id)
  db.write()
}

// Modules
export function createModule({ projectId, name, url, instructions, schedule, emailOnComplete }) {
  const module = {
    id: uuidv4(),
    projectId,
    name,
    url,
    instructions,
    schedule: schedule || null,
    emailOnComplete: emailOnComplete || false,
    lastRunAt: null,
    lastStatus: null,
    createdAt: new Date().toISOString()
  }
  db.data.modules.push(module)
  db.write()
  return module
}

export function getModules(projectId) {
  return db.data.modules.filter(m => m.projectId === projectId)
}

export function getModule(id) {
  return db.data.modules.find(m => m.id === id)
}

export function updateModule(id, updates) {
  const idx = db.data.modules.findIndex(m => m.id === id)
  if (idx === -1) return null
  db.data.modules[idx] = { ...db.data.modules[idx], ...updates }
  db.write()
  return db.data.modules[idx]
}

export function deleteModule(id) {
  db.data.modules = db.data.modules.filter(m => m.id !== id)
  db.write()
}

// Runs
export function createRun({ projectId, moduleId, moduleName }) {
  const run = {
    id: uuidv4(),
    projectId,
    moduleId,
    moduleName,
    status: 'running',
    logs: [],
    summary: null,
    startedAt: new Date().toISOString(),
    completedAt: null
  }
  db.data.runs.push(run)
  db.write()
  return run
}

export function appendRunLog(runId, log) {
  const run = db.data.runs.find(r => r.id === runId)
  if (!run) return
  run.logs.push({ time: new Date().toISOString(), text: log })
  db.write()
}

export function completeRun(runId, { status, summary }) {
  const run = db.data.runs.find(r => r.id === runId)
  if (!run) return
  run.status = status
  run.summary = summary
  run.completedAt = new Date().toISOString()
  db.write()
  return run
}

export function getRuns(moduleId) {
  return db.data.runs
    .filter(r => r.moduleId === moduleId)
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
    .slice(0, 20)
}

export function getRun(id) {
  return db.data.runs.find(r => r.id === id)
}

export function getAllRuns(projectId) {
  return db.data.runs
    .filter(r => r.projectId === projectId)
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
    .slice(0, 50)
}
