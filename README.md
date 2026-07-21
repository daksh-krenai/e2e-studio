# ⚡ E2E Studio

A local web UI for AI-powered end-to-end testing using **Claude Code** + **Playwright** — with scheduling and email reports.

---

## What it does

- **Projects** — organise test suites by app/project
- **Modules** — each module = one URL + plain-English instructions
- **Claude Code** generates the Playwright test file automatically
- **Live log streaming** — watch the test run in real time
- **Scheduling** — run on a cron schedule (daily, weekly, etc.)
- **Email reports** — HTML summary sent via SMTP after each run

---

## Prerequisites

| Requirement | Install |
|---|---|
| Node.js 18+ | https://nodejs.org |
| Claude Code CLI | https://claude.ai/download → run `claude --version` |
| Playwright | Installed automatically by setup.sh |

---

## Setup

```bash
# Clone / place the folder, then:
chmod +x setup.sh
./setup.sh
```

---

## Running

**Development (two terminals):**
```bash
# Terminal 1 — API server
npm start

# Terminal 2 — UI dev server (hot reload)
cd ui && npm run dev
```
Open → http://localhost:5173

**Production (single server):**
```bash
npm run build
npm start
```
Open → http://localhost:3001

---

## Usage

1. **Create a Project** — give it a name, base URL, and optional email config
2. **Add Modules** — e.g. "Login Flow", "Checkout", "Dashboard"
   - Set the URL and write plain-English test instructions
   - Optionally set a cron schedule and enable email on complete
3. **Click Run** — Claude Code generates a Playwright test and runs it
4. **Watch live logs** — see Claude's output and Playwright results in real time
5. **Check history** — every run is stored with full logs and pass/fail counts

---

## Email Setup (Gmail)

1. Enable 2FA on your Google account
2. Go to → Google Account → Security → App Passwords
3. Generate a password for "Mail"
4. In E2E Studio → New Project → Configure email:
   - Host: `smtp.gmail.com`, Port: `587`
   - Username: your Gmail address
   - Password: the app password (not your regular password)
   - Send to: recipient email(s)

---

## Cron Schedule Examples

| Expression | Meaning |
|---|---|
| `0 9 * * 1-5` | Every weekday at 9am |
| `0 9 * * 1` | Every Monday at 9am |
| `0 */6 * * *` | Every 6 hours |
| `0 9,17 * * *` | 9am and 5pm daily |
| `0 0 * * *` | Midnight every night |

---

## Project Structure

```
e2e-studio/
├── server/
│   ├── index.js        # Express + WebSocket API
│   ├── runner.js       # Claude Code + Playwright orchestration
│   ├── scheduler.js    # node-schedule cron jobs
│   ├── mailer.js       # nodemailer email reports
│   └── db.js           # lowdb JSON database
├── ui/
│   └── src/
│       ├── pages/      # Projects, ProjectDetail, RunViewer, RunHistory
│       ├── components/ # Layout, reusable UI
│       └── api.js      # API client + WebSocket
├── data/
│   └── db.json         # All data (auto-created)
├── workspaces/
│   └── {project}/{module}/   # Generated test files
└── setup.sh
```

---

## Data

All data is stored locally in `data/db.json`. No external database needed.
Generated Playwright test files are saved to `workspaces/` and reused between runs.
