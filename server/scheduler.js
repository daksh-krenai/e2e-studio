import schedule from 'node-schedule'
import { getDb, getModule, getProject, createRun } from './db.js'
import { executeTest } from './runner.js'

const jobs = new Map() // moduleId -> job

export function initScheduler(broadcastFn) {
  const db = getDb()
  const modules = db.data.modules.filter(m => m.schedule)
  
  modules.forEach(mod => {
    scheduleModule(mod, broadcastFn)
  })

  console.log(`[Scheduler] Initialized ${jobs.size} scheduled jobs`)
}

export function scheduleModule(mod, broadcastFn) {
  if (!mod.schedule) return

  // Cancel existing job if any
  cancelSchedule(mod.id)

  try {
    const job = schedule.scheduleJob(mod.schedule, async () => {
      console.log(`[Scheduler] Running module: ${mod.name}`)
      const project = getProject(mod.projectId)
      if (!project) return

      const freshMod = getModule(mod.id)
      if (!freshMod) return

      const run = createRun({
        projectId: mod.projectId,
        moduleId: mod.id,
        moduleName: mod.name
      })

      broadcastFn(run.id, { type: 'started', runId: run.id, moduleId: mod.id })

      await executeTest({
        run,
        module: freshMod,
        project,
        broadcast: broadcastFn,
        wss: null
      })
    })

    if (job) {
      jobs.set(mod.id, job)
      console.log(`[Scheduler] Scheduled "${mod.name}" → ${mod.schedule}`)
    } else {
      console.warn(`[Scheduler] Invalid cron for "${mod.name}": ${mod.schedule}`)
    }
  } catch (e) {
    console.error(`[Scheduler] Failed to schedule "${mod.name}":`, e.message)
  }
}

export function cancelSchedule(moduleId) {
  const existing = jobs.get(moduleId)
  if (existing) {
    existing.cancel()
    jobs.delete(moduleId)
    console.log(`[Scheduler] Cancelled job for module ${moduleId}`)
  }
}

export function getScheduledJobs() {
  return [...jobs.keys()]
}
