// import { spawn } from 'child_process'
// import fs from 'fs'
// import path from 'path'
// import { fileURLToPath } from 'url'
// import { appendRunLog, completeRun, updateModule, getProject } from './db.js'
// import { sendRunSummary } from './mailer.js'

// const __dirname = path.dirname(fileURLToPath(import.meta.url))
// const activeRuns = new Map()

// export function isRunning(runId) {
//   return activeRuns.has(runId)
// }

// export function abortRun(runId) {
//   const entry = activeRuns.get(runId)
//   if (entry) {
//     entry.process?.kill('SIGTERM')
//     activeRuns.delete(runId)
//   }
// }

// export async function executeTest({ run, module: mod, project, wss, broadcast }) {
//   const workspaceDir = path.join(__dirname, '../workspaces', project.id, mod.id)
//   fs.mkdirSync(workspaceDir, { recursive: true })

//   const emit = (text) => {
//     appendRunLog(run.id, text)
//     broadcast(run.id, { type: 'log', text, runId: run.id })
//   }

//   // FORCE CLAUDE TO NARRATE: We explicitly instruct Claude to echo its thoughts so the user sees live progress.
//   const prompt = `You are an expert autonomous QA Engineer testing an enterprise web application.

// Target URL: ${mod.url || project.baseUrl}
// Module Name: ${mod.name}
// Instructions: ${mod.instructions}

// CRITICAL SYSTEM INSTRUCTION: 
// You are running in a background pipeline where a human founder is watching a live terminal. You MUST use the Bash tool to execute 'echo "[AGENT] <describe your next action>"' BEFORE every single tool call or step you take. If you stay silent, the system will assume you have frozen and kill your process.

// REQUIREMENTS & BEST PRACTICES:
// 1. Execute the test using the 'playwright-cli' command-line tool.
// 2. Open the URL using 'playwright-cli open "${mod.url || project.baseUrl}"'.
// 3. Inspect the DOM using 'playwright-cli --raw snapshot'. You may use Bash commands like grep, sed, and awk to parse the snapshots efficiently.
// 4. Complete EVERY section of the form from start to end autonomously. 
// 5. If validation errors appear or progress is blocked, inspect the error, fix the field, and retry.
// 6. Record all UX bugs, field mismatches, placeholder errors, and validation issues you encounter.
// 7. Capture AT LEAST ONE final full-page screenshot named 'screenshot.png' in the current directory: 'playwright-cli screenshot --filename="screenshot.png"'
// 8. Close the browser session ('playwright-cli close') when finished.
// 9. Output a clear, structured Markdown QA Summary report at the end detailing: Sections visited, Fields filled, Bugs/UX issues found, and Final Status (PASSED or FAILED).
// `

//   emit('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
//   emit('🚀 INITIALIZING E2E STUDIO AUTONOMOUS QA AGENT')
//   emit(`🧠 Engine: Claude Code CLI (Pro/Max Auth)`)
//   emit(`📋 Target Module: ${mod.name}`)
//   emit(`🌐 URL: ${mod.url || project.baseUrl}`)
//   emit('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

//   try {
//     const startTime = Date.now()

//     // Spawn Claude Code CLI and parse the real-time execution
//     const resultText = await runClaudeAgent(prompt, workspaceDir, run.id, emit)

//     const duration = Date.now() - startTime
//     const isPassed = !resultText.toLowerCase().includes('status: failed') && !resultText.toLowerCase().includes('status: ❌ failed')
//     const status = isPassed ? 'passed' : 'failed'

//     const summary = {
//       passed: isPassed ? 1 : 0,
//       failed: isPassed ? 0 : 1,
//       total: 1,
//       duration
//     }

//     const completedRun = completeRun(run.id, { status, summary })
//     updateModule(mod.id, {
//       lastRunAt: new Date().toISOString(),
//       lastStatus: status
//     })

//     emit('')
//     emit('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
//     emit(`📊 Final Status: ${status === 'passed' ? '✅ PASSED' : '❌ FAILED'}`)
//     emit(`⏱  Total Execution Time: ${(duration / 1000).toFixed(1)}s`)
//     emit(`💰 Credit Usage: Tracked via Anthropic Pro account limits.`)
//     emit('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

//     broadcast(run.id, { type: 'complete', status, summary, runId: run.id })

//     if (mod.emailOnComplete) {
//       const proj = getProject(mod.projectId)
//       if (proj?.emailConfig?.to) {
//         try {
//           await sendRunSummary({
//             emailConfig: proj.emailConfig,
//             run: completedRun,
//             module: mod,
//             project: proj,
//             summary,
//             logs: completedRun.logs.map(l => l.text).join('\n')
//           })
//           emit('📧 QA Summary email dispatched successfully.')
//         } catch (e) {
//           emit(`⚠️ Email dispatch failed. Please verify SMTP credentials. Error: ${e.message}`)
//         }
//       }
//     }

//     activeRuns.delete(run.id)
//     return { status, summary }

//   } catch (err) {
//     const errorMsg = err.message || 'Unknown execution error'
//     emit('')
//     emit('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
//     emit(`❌ EXECUTION ABORTED: ${errorMsg}`)
//     emit('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
//     completeRun(run.id, { status: 'error', summary: null })
//     updateModule(mod.id, { lastRunAt: new Date().toISOString(), lastStatus: 'error' })
//     broadcast(run.id, { type: 'complete', status: 'error', summary: null, runId: run.id })
//     activeRuns.delete(run.id)
//     return { status: 'error', summary: null }
//   }
// }

// // function runClaudeAgent(prompt, cwd, runId, emit) {
// //   return new Promise((resolve, reject) => {
// //     const tmpFile = path.join('/tmp', `e2e-prompt-${runId}.txt`)
// //     fs.writeFileSync(tmpFile, prompt, 'utf8')

// //     // Allow full Bash so Claude can pipe Playwright commands to grep/awk as it naturally prefers
// //     const proc = spawn('claude', [
// //       '-p', prompt,
// //       '--allowedTools', 'Bash,Read,Write'
// //     ], {
// //       cwd,
// //       env: { ...process.env },
// //       stdio: ['ignore', 'pipe', 'pipe'], // Ignore stdin to prevent the 3s timeout hang
// //       shell: true
// //     })

// //     activeRuns.set(runId, { process: proc })

// //     let output = ''
// //     let stdoutBuf = ''
// //     let stderrBuf = ''
// //     let lastOutputTime = Date.now()

// //     // Line-buffering logic to ensure logs stream cleanly without breaking mid-word
// //     const processChunk = (chunk, isError) => {
// //       lastOutputTime = Date.now() // Reset idle timer
// //       const str = chunk.toString()
      
// //       // Auto-Auth Detection: If Claude asks for login, kill immediately and alert the user.
// //       if (str.includes('OAuth session expired') || str.includes('claude login')) {
// //         proc.kill('SIGKILL')
// //         return reject(new Error("⚠️ Anthropic OAuth session expired. Please open your terminal and run 'claude login' to re-authenticate."))
// //       }

// //       if (isError) {
// //         stderrBuf += str
// //         const lines = stderrBuf.split('\n')
// //         stderrBuf = lines.pop()
// //         lines.filter(l => l.trim()).forEach(line => emit(`⚙️ [CLI] ${line}`))
// //       } else {
// //         stdoutBuf += str
// //         const lines = stdoutBuf.split('\n')
// //         stdoutBuf = lines.pop()
// //         lines.forEach(line => {
// //           output += line + '\n'
// //           if (line.trim()) emit(line)
// //         })
// //       }
// //     }

// //     proc.stdout.on('data', (data) => processChunk(data, false))
// //     proc.stderr.on('data', (data) => processChunk(data, true))

// //     // Idle Tracker: Alert the user if Claude is doing heavy thinking/parsing for over 45 seconds
// //     const idleCheck = setInterval(() => {
// //       if (Date.now() - lastOutputTime > 45000) {
// //         emit('⏳ [System] Claude is analyzing complex DOM data or planning its next move. Please wait...')
// //         lastOutputTime = Date.now() // Reset so it doesn't spam
// //       }
// //     }, 15000)

// //     proc.on('close', (code) => {
// //       clearInterval(idleCheck)
// //       try { fs.unlinkSync(tmpFile) } catch (_) {}
      
// //       // Flush remaining buffers
// //       if (stdoutBuf.trim()) { output += stdoutBuf; emit(stdoutBuf) }
// //       if (stderrBuf.trim()) { emit(`⚙️ [CLI] ${stderrBuf}`) }

// //       if (output.trim().length > 0) {
// //         resolve(output.trim())
// //       } else {
// //         reject(new Error(`Claude CLI exited abruptly (Code ${code}). Check terminal authentication or local Playwright installation.`))
// //       }
// //     })

// //     proc.on('error', (err) => {
// //       clearInterval(idleCheck)
// //       try { fs.unlinkSync(tmpFile) } catch (_) {}
// //       reject(new Error(`Failed to initialize Claude CLI: ${err.message}`))
// //     })
// //   })
// // }


// function runClaudeAgent(prompt, cwd, runId, emit) {
//   return new Promise((resolve, reject) => {
//     // 1. Cross-platform temporary directory handling
//     const tmpDir = os.tmpdir()
//     const tmpFile = path.join(tmpDir, `e2e-prompt-${runId}.txt`)
//     fs.writeFileSync(tmpFile, prompt, 'utf8')

//     // 2. Resolve Windows command executable properly (.cmd)
//     const isWin = process.platform === 'win32'
//     const claudeBinary = isWin ? 'claude.cmd' : 'claude'

//     // 3. Ensure global NPM binary folder is present in PATH for Windows subprocesses
//     const env = { ...process.env }
//     if (isWin && process.env.APPDATA) {
//       const npmPath = path.join(process.env.APPDATA, 'npm')
//       if (!env.PATH?.includes(npmPath)) {
//         env.PATH = `${npmPath};${env.PATH || ''}`
//       }
//     }

//     // Spawn Claude Code CLI with proper binary and environment flags
//     const proc = spawn(claudeBinary, [
//       '-p', prompt,
//       '--allowedTools', 'Bash,Read,Write'
//     ], {
//       cwd,
//       env,
//       stdio: ['ignore', 'pipe', 'pipe'],
//       shell: true
//     })

//     activeRuns.set(runId, { process: proc })

//     let output = ''
//     let stdoutBuf = ''
//     let stderrBuf = ''
//     let lastOutputTime = Date.now()

//     // Line-buffering logic to ensure logs stream cleanly without breaking mid-word
//     const processChunk = (chunk, isError) => {
//       lastOutputTime = Date.now() // Reset idle timer
//       const str = chunk.toString()
      
//       // Auto-Auth Detection: If Claude asks for login, kill immediately and alert the user.
//       if (str.includes('OAuth session expired') || str.includes('claude login')) {
//         proc.kill('SIGKILL')
//         return reject(new Error("⚠️ Anthropic OAuth session expired. Please open your terminal and run 'claude login' to re-authenticate."))
//       }

//       if (isError) {
//         stderrBuf += str
//         const lines = stderrBuf.split('\n')
//         stderrBuf = lines.pop()
//         lines.filter(l => l.trim()).forEach(line => emit(`⚙️ [CLI] ${line}`))
//       } else {
//         stdoutBuf += str
//         const lines = stdoutBuf.split('\n')
//         stdoutBuf = lines.pop()
//         lines.forEach(line => {
//           output += line + '\n'
//           if (line.trim()) emit(line)
//         })
//       }
//     }

//     proc.stdout.on('data', (data) => processChunk(data, false))
//     proc.stderr.on('data', (data) => processChunk(data, true))

//     // Idle Tracker: Alert the user if Claude is doing heavy thinking/parsing for over 45 seconds
//     const idleCheck = setInterval(() => {
//       if (Date.now() - lastOutputTime > 45000) {
//         emit('⏳ [System] Claude is analyzing complex DOM data or planning its next move. Please wait...')
//         lastOutputTime = Date.now() // Reset so it doesn't spam
//       }
//     }, 15000)

//     proc.on('close', (code) => {
//       clearInterval(idleCheck)
//       try { fs.unlinkSync(tmpFile) } catch (_) {}
      
//       // Flush remaining buffers
//       if (stdoutBuf.trim()) { output += stdoutBuf; emit(stdoutBuf) }
//       if (stderrBuf.trim()) { emit(`⚙️ [CLI] ${stderrBuf}`) }

//       if (output.trim().length > 0) {
//         resolve(output.trim())
//       } else {
//         reject(new Error(`Claude CLI exited abruptly (Code ${code}). Check terminal authentication or local Playwright installation.`))
//       }
//     })

//     proc.on('error', (err) => {
//       clearInterval(idleCheck)
//       try { fs.unlinkSync(tmpFile) } catch (_) {}
//       reject(new Error(`Failed to initialize Claude CLI: ${err.message}`))
//     })
//   })
// }




import { spawn, execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'
import { appendRunLog, completeRun, updateModule, getProject } from './db.js'
import { sendRunSummary } from './mailer.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const activeRuns = new Map()

export function isRunning(runId) {
  return activeRuns.has(runId)
}

export function abortRun(runId) {
  const entry = activeRuns.get(runId)
  if (entry) {
    entry.process?.kill('SIGTERM')
    activeRuns.delete(runId)
  }
}

export async function executeTest({ run, module: mod, project, wss, broadcast }) {
  const workspaceDir = path.join(__dirname, '../workspaces', project.id, mod.id)
  fs.mkdirSync(workspaceDir, { recursive: true })

  const emit = (text) => {
    appendRunLog(run.id, text)
    broadcast(run.id, { type: 'log', text, runId: run.id })
  }

  const prompt = `You are an expert autonomous QA Engineer testing an enterprise web application.

Target URL: ${mod.url || project.baseUrl}
Module Name: ${mod.name}
Instructions: ${mod.instructions}

CRITICAL SYSTEM INSTRUCTION: 
You are running in a background pipeline where a human founder is watching a live terminal. You MUST use the Bash tool to execute 'echo "[AGENT] <describe your next action>"' BEFORE every single tool call or step you take. If you stay silent, the system will assume you have frozen and kill your process.

REQUIREMENTS & BEST PRACTICES:
1. Execute the test using the 'playwright-cli' command-line tool.
2. Open the URL using 'playwright-cli open "${mod.url || project.baseUrl}"'.
3. Inspect the DOM using 'playwright-cli --raw snapshot'. You may use Bash commands like grep, sed, and awk to parse the snapshots efficiently.
4. Complete EVERY section of the form from start to end autonomously. 
5. If validation errors appear or progress is blocked, inspect the error, fix the field, and retry.
6. Record all UX bugs, field mismatches, placeholder errors, and validation issues you encounter.
7. Capture AT LEAST ONE final full-page screenshot named 'screenshot.png' in the current directory: 'playwright-cli screenshot --filename="screenshot.png"'
8. Close the browser session ('playwright-cli close') when finished.
9. Output a clear, structured Markdown QA Summary report at the end detailing: Sections visited, Fields filled, Bugs/UX issues found, and Final Status (PASSED or FAILED).
`

  emit('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  emit('🚀 INITIALIZING E2E STUDIO AUTONOMOUS QA AGENT')
  emit(`🧠 Engine: Claude Code CLI (Pro/Max Auth)`)
  emit(`📋 Target Module: ${mod.name}`)
  emit(`🌐 URL: ${mod.url || project.baseUrl}`)
  emit('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

  try {
    const startTime = Date.now()

    const resultText = await runClaudeAgent(prompt, workspaceDir, run.id, emit)

    const duration = Date.now() - startTime
    const isPassed = !resultText.toLowerCase().includes('status: failed') && !resultText.toLowerCase().includes('status: ❌ failed')
    const status = isPassed ? 'passed' : 'failed'

    const summary = {
      passed: isPassed ? 1 : 0,
      failed: isPassed ? 0 : 1,
      total: 1,
      duration
    }

    const completedRun = completeRun(run.id, { status, summary })
    updateModule(mod.id, {
      lastRunAt: new Date().toISOString(),
      lastStatus: status
    })

    emit('')
    emit('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    emit(`📊 Final Status: ${status === 'passed' ? '✅ PASSED' : '❌ FAILED'}`)
    emit(`⏱  Total Execution Time: ${(duration / 1000).toFixed(1)}s`)
    emit(`💰 Credit Usage: Tracked via Anthropic Pro account limits.`)
    emit('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

    broadcast(run.id, { type: 'complete', status, summary, runId: run.id })

    // if (mod.emailOnComplete) {
    //   const proj = getProject(mod.projectId)
    //   if (proj?.emailConfig?.to) {
    //     try {
    //       await sendRunSummary({
    //         emailConfig: proj.emailConfig,
    //         run: completedRun,
    //         module: mod,
    //         project: proj,
    //         summary,
    //         logs: completedRun.logs.map(l => l.text).join('\n')
    //       })
    //       emit('📧 QA Summary email dispatched successfully.')
    //     } catch (e) {
    if (mod.emailOnComplete) {
      const proj = getProject(mod.projectId)
      if (proj?.emailConfig?.to) {
        try {
          await sendRunSummary({
            emailConfig: proj.emailConfig,
            run: completedRun,
            module: mod,
            project: proj,
            summary,
            report: resultText, // <-- NEW: Pass the pristine Markdown report
            logs: completedRun.logs.map(l => l.text).join('\n')
          })
          emit('📧 QA Summary email dispatched successfully.')
        } catch (e) {
          emit(`⚠️ Email dispatch failed. Please verify SMTP credentials. Error: ${e.message}`)
        }
      }
    }

    activeRuns.delete(run.id)
    return { status, summary }

  } catch (err) {
    const errorMsg = err.message || 'Unknown execution error'
    emit('')
    emit('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    emit(`❌ EXECUTION ABORTED: ${errorMsg}`)
    emit('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    
    completeRun(run.id, { status: 'error', summary: null })
    updateModule(mod.id, { lastRunAt: new Date().toISOString(), lastStatus: 'error' })
    broadcast(run.id, { type: 'complete', status: 'error', summary: null, runId: run.id })
    activeRuns.delete(run.id)
    return { status: 'error', summary: null }
  }
}

// function runClaudeAgent(prompt, cwd, runId, emit) {
//   return new Promise((resolve, reject) => {
//     const tmpDir = os.tmpdir()
//     const tmpFile = path.join(tmpDir, `e2e-prompt-${runId}.txt`)
//     fs.writeFileSync(tmpFile, prompt, 'utf8')

//     let cmd = 'claude'
//     let args = ['-p', prompt, '--allowedTools', 'Bash,Read,Write']
//     let useShell = false

//     if (process.platform === 'win32') {
//       useShell = true
//       try {
//         // LAYER 1: Ask Windows to find the executable path dynamically inside this specific process.
//         const whereOut = execSync('where claude', { env: process.env, encoding: 'utf8' })
//         const lines = whereOut.split('\n').map(l => l.trim()).filter(Boolean)
        
//         // Grab the .cmd file specifically
//         cmd = lines.find(l => l.toLowerCase().endsWith('.cmd')) || lines[0]
//         emit(`⚙️ [System] Resolved Claude binary at: ${cmd}`)
//       } catch (e) {
//         // LAYER 2: If the PATH is completely missing, fallback to npx. npx is native to Node and bypasses global pathing entirely.
//         emit(`⚠️ [System] Claude not found in PATH. Falling back to npx executor...`)
//         cmd = 'npx.cmd'
//         args = ['-y', '@anthropic-ai/claude-code', '-p', prompt, '--allowedTools', 'Bash,Read,Write']
//       }
//     }

//     const proc = spawn(cmd, args, {
//       cwd,
//       env: process.env,
//       stdio: ['ignore', 'pipe', 'pipe'], 
//       shell: useShell
//     })

//     activeRuns.set(runId, { process: proc })

//     let output = ''
//     let stdoutBuf = ''
//     let stderrBuf = ''
//     let lastOutputTime = Date.now()

//     const processChunk = (chunk, isError) => {
//       lastOutputTime = Date.now() 
//       const str = chunk.toString()
      
//       if (str.includes('OAuth session expired') || str.includes('claude login')) {
//         proc.kill('SIGKILL')
//         return reject(new Error("⚠️ Anthropic OAuth session expired. Please open your terminal and run 'claude login' to re-authenticate."))
//       }

//       if (isError) {
//         stderrBuf += str
//         const lines = stderrBuf.split('\n')
//         stderrBuf = lines.pop()
//         lines.filter(l => l.trim()).forEach(line => emit(`⚙️ [CLI] ${line}`))
//       } else {
//         stdoutBuf += str
//         const lines = stdoutBuf.split('\n')
//         stdoutBuf = lines.pop()
//         lines.forEach(line => {
//           output += line + '\n'
//           if (line.trim()) emit(line)
//         })
//       }
//     }

//     proc.stdout.on('data', (data) => processChunk(data, false))
//     proc.stderr.on('data', (data) => processChunk(data, true))

//     const idleCheck = setInterval(() => {
//       if (Date.now() - lastOutputTime > 45000) {
//         emit('⏳ [System] Claude is analyzing complex DOM data or planning its next move. Please wait...')
//         lastOutputTime = Date.now() 
//       }
//     }, 15000)

//     proc.on('close', (code) => {
//       clearInterval(idleCheck)
//       try { fs.unlinkSync(tmpFile) } catch (_) {}
      
//       if (stdoutBuf.trim()) { output += stdoutBuf; emit(stdoutBuf) }
//       if (stderrBuf.trim()) { emit(`⚙️ [CLI] ${stderrBuf}`) }

//       if (output.trim().length > 0) {
//         resolve(output.trim())
//       } else {
//         reject(new Error(`Claude CLI exited abruptly (Code ${code}). Check terminal authentication or local Playwright installation.`))
//       }
//     })

//     proc.on('error', (err) => {
//       clearInterval(idleCheck)
//       try { fs.unlinkSync(tmpFile) } catch (_) {}
//       reject(new Error(`Failed to initialize Claude CLI: ${err.message}`))
//     })
//   })
// }

// function runClaudeAgent(prompt, cwd, runId, emit) {
//   return new Promise((resolve, reject) => {
//     const tmpDir = os.tmpdir()
//     const tmpFile = path.join(tmpDir, `e2e-prompt-${runId}.txt`)
//     fs.writeFileSync(tmpFile, prompt, 'utf8')

//     // THE FIX: Do not pass the massive multi-line string into the Windows shell.
//     // Instead, pass a safe, single-line prompt instructing Claude to read the temp file.
//     const safePrompt = `Please strictly follow the instructions inside this file: ${tmpFile}`

//     let cmd = 'claude'
//     // Notice we are wrapping safePrompt in double quotes for the Windows shell
//     let args = ['-p', `"${safePrompt}"`, '--allowedTools', 'Bash,Read,Write']
//     let useShell = false

//     if (process.platform === 'win32') {
//       useShell = true
//       try {
//         const whereOut = execSync('where claude', { env: process.env, encoding: 'utf8' })
//         const lines = whereOut.split('\n').map(l => l.trim()).filter(Boolean)
//         cmd = lines.find(l => l.toLowerCase().endsWith('.cmd')) || lines[0]
//         emit(`⚙️ [System] Resolved Claude binary at: ${cmd}`)
//       } catch (e) {
//         emit(`⚠️ [System] Claude not found in PATH. Falling back to npx executor...`)
//         cmd = 'npx.cmd'
//         args = ['-y', '@anthropic-ai/claude-code', '-p', `"${safePrompt}"`, '--allowedTools', 'Bash,Read,Write']
//       }
//     }

//     const proc = spawn(cmd, args, {
//       cwd,
//       env: process.env,
//       stdio: ['ignore', 'pipe', 'pipe'], 
//       shell: useShell
//     })

//     activeRuns.set(runId, { process: proc })

//     let output = ''
//     let stdoutBuf = ''
//     let stderrBuf = ''
//     let lastOutputTime = Date.now()

//     const processChunk = (chunk, isError) => {
//       lastOutputTime = Date.now() 
//       const str = chunk.toString()
      
//       if (str.includes('OAuth session expired') || str.includes('claude login')) {
//         proc.kill('SIGKILL')
//         return reject(new Error("⚠️ Anthropic OAuth session expired. Please open your terminal and run 'claude login' to re-authenticate."))
//       }

//       if (isError) {
//         stderrBuf += str
//         const lines = stderrBuf.split('\n')
//         stderrBuf = lines.pop()
//         lines.filter(l => l.trim()).forEach(line => emit(`⚙️ [CLI] ${line}`))
//       } else {
//         stdoutBuf += str
//         const lines = stdoutBuf.split('\n')
//         stdoutBuf = lines.pop()
//         lines.forEach(line => {
//           output += line + '\n'
//           if (line.trim()) emit(line)
//         })
//       }
//     }

//     proc.stdout.on('data', (data) => processChunk(data, false))
//     proc.stderr.on('data', (data) => processChunk(data, true))

//     const idleCheck = setInterval(() => {
//       if (Date.now() - lastOutputTime > 45000) {
//         emit('⏳ [System] Claude is analyzing complex DOM data or planning its next move. Please wait...')
//         lastOutputTime = Date.now() 
//       }
//     }, 15000)

//     proc.on('close', (code) => {
//       clearInterval(idleCheck)
//       try { fs.unlinkSync(tmpFile) } catch (_) {}
      
//       if (stdoutBuf.trim()) { output += stdoutBuf; emit(stdoutBuf) }
//       if (stderrBuf.trim()) { emit(`⚙️ [CLI] ${stderrBuf}`) }

//       if (output.trim().length > 0) {
//         resolve(output.trim())
//       } else {
//         reject(new Error(`Claude CLI exited abruptly (Code ${code}). Check terminal authentication or local Playwright installation.`))
//       }
//     })

//     proc.on('error', (err) => {
//       clearInterval(idleCheck)
//       try { fs.unlinkSync(tmpFile) } catch (_) {}
//       reject(new Error(`Failed to initialize Claude CLI: ${err.message}`))
//     })
//   })
// }






function runClaudeAgent(prompt, cwd, runId, emit) {
  return new Promise((resolve, reject) => {
    const tmpDir = os.tmpdir()
    const tmpFile = path.join(tmpDir, `e2e-prompt-${runId}.txt`)
    
    // LAYER 1: Prompt-Level Cost & Security Guardrails
    // const guardrailedPrompt = prompt + 
    //   `\n\n=== CRITICAL SAFETY & COST GUARDRAILS ===\n` +
    //   `1. FAIL FAST: If a Playwright command fails, you may retry ONCE. If it fails again, immediately output the QA Summary with FAILED status and exit.\n` +
    //   `2. MAX STEPS: You must complete this test in under 12 tool calls to conserve API credits.\n` +
    //   `3. SAFE SHELL: You are strictly limited to 'playwright-cli', 'echo', and basic text parsing. DO NOT use rm, del, npm install, or modify system files.\n`;

      //   const guardrailedPrompt = prompt + 
      // `\n\n=== CRITICAL SAFETY & COST GUARDRAILS ===\n` +
      // `1. SAFE SHELL: You are strictly limited to 'playwright-cli', 'echo', and basic text parsing. DO NOT use rm, del, npm install, or modify system files.\n`;
      const guardrailedPrompt = prompt + 
      `\n\n=== CRITICAL SAFETY & COST GUARDRAILS ===\n` +
      `1. SAFE SHELL: You are strictly limited to 'playwright-cli', 'echo', and basic text parsing. DO NOT use rm, del, npm install, or modify system files.\n` +
      `2. NARRATE PROGRESS: Before executing any tool or browser action, output a short, single-line status update (e.g., "Navigating to Personal Info step...", "Filling out Disclosure Questionnaire...").\n`;
    fs.writeFileSync(tmpFile, guardrailedPrompt, 'utf8')

    // Programmatically suppress the one-time warning dialog for bypass mode
    try {
      const claudeSettingsDir = path.join(os.homedir(), '.claude');
      const claudeSettingsFile = path.join(claudeSettingsDir, 'settings.json');
      fs.mkdirSync(claudeSettingsDir, { recursive: true });
      let settings = {};
      if (fs.existsSync(claudeSettingsFile)) {
        try { settings = JSON.parse(fs.readFileSync(claudeSettingsFile, 'utf8')); } catch(e){}
      }
      settings.skipDangerousModePermissionPrompt = true;
      fs.writeFileSync(claudeSettingsFile, JSON.stringify(settings, null, 2));
    } catch (e) {
      emit('⚠️ [System] Failed to update Claude settings. The headless run might pause for a warning dialog.');
    }

    const safePrompt = `Please strictly follow the instructions inside this file: ${tmpFile}`

    let cmd = 'claude'
    let args = [
      '-p', `"${safePrompt}"`, 
      '--allowedTools', 'Bash,Read,Write',
      '--dangerously-skip-permissions'
    ]
    let useShell = false

    if (process.platform === 'win32') {
      useShell = true
      try {
        const whereOut = execSync('where claude', { env: process.env, encoding: 'utf8' })
        const lines = whereOut.split('\n').map(l => l.trim()).filter(Boolean)
        cmd = lines.find(l => l.toLowerCase().endsWith('.cmd')) || lines[0]
        emit(`⚙️ [System] Resolved Claude binary at: ${cmd}`)
      } catch (e) {
        emit(`⚠️ [System] Claude not found in PATH. Falling back to npx executor...`)
        cmd = 'npx.cmd'
        args = ['-y', '@anthropic-ai/claude-code', '-p', `"${safePrompt}"`, '--allowedTools', 'Bash,Read,Write', '--dangerously-skip-permissions']
      }
    }

    const proc = spawn(cmd, args, {
      cwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'], 
      shell: useShell
    })

    activeRuns.set(runId, { process: proc })

    // LAYER 2: Hard Timeout (3 Minutes max execution)
    // const MAX_RUNTIME_MS = 3 * 60 * 1000;
    // const hardTimeout = setTimeout(() => {
    //   proc.kill('SIGKILL');
    //   reject(new Error(`⚠️ Cost Protection Triggered: Execution exceeded the 3-minute limit. The agent was forcefully terminated to prevent API cost drain.`));
    // }, MAX_RUNTIME_MS);

    let output = ''
    let stdoutBuf = ''
    let stderrBuf = ''
    let lastOutputTime = Date.now()
    
    // Metric for Layer 3 Watchdog
    let bashCommandCount = 0;

    const processChunk = (chunk, isError) => {
      lastOutputTime = Date.now() 
      const str = chunk.toString()
      
      if (str.includes('OAuth session expired') || str.includes('claude login')) {
        // clearTimeout(hardTimeout);
        proc.kill('SIGKILL')
        return reject(new Error("⚠️ Anthropic OAuth session expired. Please open your terminal and run 'claude login' to re-authenticate."))
      }

      // if (isError) {
      //   stderrBuf += str
      //   const lines = stderrBuf.split('\n')
      //   stderrBuf = lines.pop()
      //   lines.filter(l => l.trim()).forEach(line => emit(`⚙️ [CLI] ${line}`))
      // } else {
      //   stdoutBuf += str
      //   const lines = stdoutBuf.split('\n')
      //   stdoutBuf = lines.pop()
      //   lines.forEach(line => {
      //     output += line + '\n'
      //     if (line.trim()) emit(line)

      //     // LAYER 3: Runaway Loop Watchdog
      //     // If the agent keeps executing tools without finishing, pull the plug.
      //     if (line.toLowerCase().includes('running command') || line.toLowerCase().includes('tool use')) {
      //       bashCommandCount++;
      //       if (bashCommandCount > 12) {
      //         // clearTimeout(hardTimeout);
      //         proc.kill('SIGKILL');
      //         return reject(new Error(`⚠️ Loop Protection Triggered: Agent exceeded 12 bash commands. Terminated to save costs.`));
      //       }
      //     }
      //   })
      // }
      if (isError) {
        stderrBuf += str
        // Split on newline OR carriage return
        const lines = stderrBuf.split(/\r?\n|\r/)
        stderrBuf = lines.pop()
        lines.filter(l => l.trim()).forEach(line => {
          // Strip terminal color codes for clean UI
          const cleanLine = line.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').trim()
          if (cleanLine) emit(`⚙️ [CLI] ${cleanLine}`)
        })
      } else {
        stdoutBuf += str
        // Split on newline OR carriage return
        const lines = stdoutBuf.split(/\r?\n|\r/)
        stdoutBuf = lines.pop()
        lines.forEach(line => {
          // Strip terminal color codes for clean UI
          const cleanLine = line.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '').trim()
          
          if (cleanLine) {
            output += cleanLine + '\n'
            emit(`🧠 [Agent] ${cleanLine}`)
          }

          // Layer 3: Runaway Loop Watchdog
          if (cleanLine.toLowerCase().includes('running command') || cleanLine.toLowerCase().includes('tool use')) {
            bashCommandCount++;
            if (bashCommandCount > 12) {
              // clearTimeout(hardTimeout);
              proc.kill('SIGKILL');
              return reject(new Error(`⚠️ Loop Protection Triggered: Agent exceeded 12 bash commands. Terminated to save costs.`));
            }
          }
        })
      }
    }

    proc.stdout.on('data', (data) => processChunk(data, false))
    proc.stderr.on('data', (data) => processChunk(data, true))

    // const idleCheck = setInterval(() => {
    //   if (Date.now() - lastOutputTime > 45000) {
    //     emit('⏳ [System] Claude is analyzing complex DOM data or planning its next move. Please wait...')
    //     lastOutputTime = Date.now() 
    //   }
    // }, 15000)

    proc.on('close', (code) => {
      // clearInterval(idleCheck)
      // clearTimeout(hardTimeout)
      try { fs.unlinkSync(tmpFile) } catch (_) {}
      
      if (stdoutBuf.trim()) { output += stdoutBuf; emit(stdoutBuf) }
      if (stderrBuf.trim()) { emit(`⚙️ [CLI] ${stderrBuf}`) }

      if (output.trim().length > 0) {
        resolve(output.trim())
      } else {
        reject(new Error(`Claude CLI exited abruptly (Code ${code}). Check terminal authentication or local Playwright installation.`))
      }
    })

    proc.on('error', (err) => {
      // clearInterval(idleCheck)
      // clearTimeout(hardTimeout)
      try { fs.unlinkSync(tmpFile) } catch (_) {}
      reject(new Error(`Failed to initialize Claude CLI: ${err.message}`))
    })
  })
}