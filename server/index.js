import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

import { initDb, createProject, getProjects, getProject, updateProject, deleteProject,
         createModule, getModules, getModule, updateModule, deleteModule,
         createRun, getRuns, getRun, getAllRuns } from './db.js'
import { executeTest, isRunning, abortRun } from './runner.js'
import { initScheduler, scheduleModule, cancelSchedule } from './scheduler.js'
import { testEmailConfig } from './mailer.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 8083

// WebSocket clients: runId -> Set<ws>
const subscribers = new Map()

function broadcast(runId, payload) {
  const subs = subscribers.get(runId)
  if (!subs) return
  const msg = JSON.stringify(payload)
  subs.forEach(ws => {
    if (ws.readyState === 1) ws.send(msg)
  })
}

async function main() {
  // Ensure data dir
  fs.mkdirSync(path.join(__dirname, '../data'), { recursive: true })
  fs.mkdirSync(path.join(__dirname, '../workspaces'), { recursive: true })

  await initDb()
  initScheduler(broadcast)

  const app = express()
  const server = createServer(app)
  const wss = new WebSocketServer({ server, path: '/ws' })

  app.use(cors())
  app.use(express.json())

  // Serve built UI
  const uiDist = path.join(__dirname, '../ui/dist')
  if (fs.existsSync(uiDist)) {
    app.use(express.static(uiDist))
  }
// ADD THIS LINE: Serve workspaces so the UI can load screenshots
  app.use('/workspaces', express.static(path.join(__dirname, '../workspaces')))
  // ─── WebSocket ────────────────────────────────────────
  wss.on('connection', (ws, req) => {
    const runId = new URL(req.url, 'http://0.0.0.0').searchParams.get('runId')
    if (!runId) { ws.close(); return }

    if (!subscribers.has(runId)) subscribers.set(runId, new Set())
    subscribers.get(runId).add(ws)

    // Send existing logs immediately
    const run = getRun(runId)
    if (run) {
      run.logs.forEach(l => ws.send(JSON.stringify({ type: 'log', text: l.text, runId })))
      if (run.status !== 'running') {
        ws.send(JSON.stringify({ type: 'complete', status: run.status, summary: run.summary, runId }))
      }
    }

    ws.on('close', () => {
      subscribers.get(runId)?.delete(ws)
    })
  })

  // ─── Projects ─────────────────────────────────────────
  app.get('/api/projects', (req, res) => {
    res.json(getProjects())
  })

  app.post('/api/projects', (req, res) => {
    const { name, baseUrl, description, emailConfig } = req.body
    if (!name) return res.status(400).json({ error: 'name required' })
    res.json(createProject({ name, baseUrl, description, emailConfig }))
  })

  app.get('/api/projects/:id', (req, res) => {
    const p = getProject(req.params.id)
    if (!p) return res.status(404).json({ error: 'not found' })
    res.json(p)
  })

  app.put('/api/projects/:id', (req, res) => {
    const updated = updateProject(req.params.id, req.body)
    if (!updated) return res.status(404).json({ error: 'not found' })
    res.json(updated)
  })

  app.delete('/api/projects/:id', (req, res) => {
    deleteProject(req.params.id)
    res.json({ ok: true })
  })

  // ─── Modules ──────────────────────────────────────────
  app.get('/api/projects/:projectId/modules', (req, res) => {
    res.json(getModules(req.params.projectId))
  })

  app.post('/api/projects/:projectId/modules', (req, res) => {
    const { name, url, instructions, schedule, emailOnComplete } = req.body
    if (!name || !instructions) return res.status(400).json({ error: 'name and instructions required' })
    const mod = createModule({ projectId: req.params.projectId, name, url, instructions, schedule, emailOnComplete })
    if (schedule) scheduleModule(mod, broadcast)
    res.json(mod)
  })

  app.put('/api/projects/:projectId/modules/:id', (req, res) => {
    const updated = updateModule(req.params.id, req.body)
    if (!updated) return res.status(404).json({ error: 'not found' })
    // Re-schedule if schedule changed
    if (req.body.schedule !== undefined) {
      if (req.body.schedule) scheduleModule(updated, broadcast)
      else cancelSchedule(req.params.id)
    }
    res.json(updated)
  })

  app.delete('/api/projects/:projectId/modules/:id', (req, res) => {
    cancelSchedule(req.params.id)
    deleteModule(req.params.id)
    res.json({ ok: true })
  })

  // ─── Runs ─────────────────────────────────────────────
  app.get('/api/projects/:projectId/runs', (req, res) => {
    res.json(getAllRuns(req.params.projectId))
  })

  app.get('/api/modules/:moduleId/runs', (req, res) => {
    res.json(getRuns(req.params.moduleId))
  })

  app.post('/api/modules/:moduleId/run', async (req, res) => {
    const mod = getModule(req.params.moduleId)
    if (!mod) return res.status(404).json({ error: 'module not found' })
    const project = getProject(mod.projectId)
    if (!project) return res.status(404).json({ error: 'project not found' })

    const run = createRun({
      projectId: mod.projectId,
      moduleId: mod.id,
      moduleName: mod.name
    })

    // Start async — don't await
    executeTest({ run, module: mod, project, broadcast, wss })

    res.json({ runId: run.id })
  })

  app.post('/api/runs/:runId/abort', (req, res) => {
    abortRun(req.params.runId)
    res.json({ ok: true })
  })

  app.get('/api/runs/:runId', (req, res) => {
    const run = getRun(req.params.runId)
    if (!run) return res.status(404).json({ error: 'not found' })
    res.json(run)
  })

  // List every screenshot the agent captured for a run's module (the mailer
  // attaches all of them; the UI gallery renders whatever this returns).
  app.get('/api/runs/:runId/screenshots', (req, res) => {
    const run = getRun(req.params.runId)
    if (!run) return res.status(404).json({ error: 'not found' })
    const dir = path.join(__dirname, '../workspaces', run.projectId, run.moduleId)
    let files = []
    try {
      files = fs.readdirSync(dir)
        .filter(f => /\.(png|jpe?g)$/i.test(f))
        // Show the final full-page capture first, then the rest alphabetically.
        .sort((a, b) => (a === 'screenshot.png' ? -1 : b === 'screenshot.png' ? 1 : a.localeCompare(b)))
    } catch (_) { /* no workspace dir yet */ }
    res.json({
      screenshots: files.map(f => ({
        name: f,
        url: `/workspaces/${run.projectId}/${run.moduleId}/${f}`
      }))
    })
  })

  // ─── Email test ───────────────────────────────────────
  app.post('/api/test-email', async (req, res) => {
    try {
      await testEmailConfig(req.body)
      res.json({ ok: true })
    } catch (e) {
      res.status(400).json({ error: e.message })
    }
  })

  // ─── Health ───────────────────────────────────────────
  app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }))

  // SPA fallback
  app.get('*', (req, res) => {
    if (fs.existsSync(path.join(uiDist, 'index.html'))) {
      res.sendFile(path.join(uiDist, 'index.html'))
    } else {
      res.json({ message: 'E2E Studio API running. Build the UI with: cd ui && npm run build' })
    }
  })

  // server.listen(PORT, () => {
  //   console.log(`\n🚀 E2E Studio running at http://localhost:${PORT}`)
  //   console.log(`📡 WebSocket at ws://localhost:${PORT}/ws`)
  //   console.log(`📁 Data stored at ${path.join(__dirname, '../data/db.json')}\n`)
  // })

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 E2E Studio running at http://0.0.0.0:${PORT}`)
    console.log(`📡 WebSocket at ws://0.0.0.0:${PORT}/ws`)
    console.log(`📁 Data stored at ${path.join(__dirname, '../data/db.json')}\n`)
  })
}

main().catch(console.error)
