import nodemailer from 'nodemailer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export async function sendRunSummary({ emailConfig, run, module: mod, project, summary, logs }) {
  const { host, port, user, pass, to } = emailConfig

  const transporter = nodemailer.createTransport({
    host: host || 'smtp.gmail.com',
    port: port || 587,
    secure: false,
    auth: { user, pass }
  })

  const statusIcon = run.status === 'passed' ? '✅' : '❌'
  const statusLabel = run.status.toUpperCase()
  const duration = summary ? `${(summary.duration / 1000).toFixed(1)}s` : 'N/A'

  const workspaceDir = path.join(__dirname, '../workspaces', project.id, mod.id)
  const attachments = []
  let imagesHtml = ''

  if (fs.existsSync(workspaceDir)) {
    const files = fs.readdirSync(workspaceDir).filter(f => f.endsWith('.png'))
    files.forEach((file, index) => {
      const filePath = path.join(workspaceDir, file)
      const cid = `screenshot-${index}`
      attachments.push({
        filename: file,
        path: filePath,
        cid
      })
      imagesHtml += `
        <div style="margin-top: 16px; border: 1px solid #2d3148; border-radius: 8px; overflow: hidden;">
          <div style="background: #2d3148; padding: 6px 12px; font-size: 11px; color: #94a3b8; font-family: monospace;">📸 ${file}</div>
          <img src="cid:${cid}" style="max-width: 100%; display: block;" alt="${file}" />
        </div>
      `
    })
  }

  const html = `
<!DOCTYPE html>
<html>
<head>
<style>
  body { font-family: -apple-system, sans-serif; background: #0f1117; color: #e2e8f0; margin: 0; padding: 0; }
  .container { max-width: 680px; margin: 24px auto; background: #1a1d27; border-radius: 12px; overflow: hidden; border: 1px solid #2d3148; }
  .header { background: ${run.status === 'passed' ? '#0d2b1f' : '#2b0d0d'}; padding: 20px 28px; border-bottom: 1px solid #2d3148; }
  .header h1 { margin: 0; font-size: 18px; color: ${run.status === 'passed' ? '#4ade80' : '#f87171'}; }
  .header p { margin: 4px 0 0; color: #94a3b8; font-size: 13px; }
  .body { padding: 24px 28px; }
  .logs { background: #0f1117; border-radius: 8px; padding: 16px; border: 1px solid #2d3148; }
  .logs pre { margin: 0; font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #94a3b8; white-space: pre-wrap; word-break: break-word; max-height: 400px; overflow-y: auto; }
  .footer { padding: 16px 28px; border-top: 1px solid #2d3148; text-align: center; font-size: 12px; color: #475569; }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>${statusIcon} ${statusLabel} — ${mod.name}</h1>
    <p>${project.name} · Duration: ${duration}</p>
  </div>
  <div class="body">
    <div class="logs">
      <pre>${escapeHtml(logs.slice(-4000))}</pre>
    </div>
    ${imagesHtml}
  </div>
  <div class="footer">
    E2E Studio Autonomous QA Report · ${mod.url || project.baseUrl}
  </div>
</div>
</body>
</html>
`

  await transporter.sendMail({
    from: `"E2E Studio" <${user}>`,
    to,
    subject: `${statusIcon} [QA Report] ${mod.name} — ${statusLabel} (${project.name})`,
    html,
    attachments
  })
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export async function testEmailConfig(emailConfig) {
  const { host, port, user, pass, to } = emailConfig
  const transporter = nodemailer.createTransport({
    host: host || 'smtp.gmail.com',
    port: port || 587,
    secure: false,
    auth: { user, pass }
  })
  await transporter.verify()
  return true
}