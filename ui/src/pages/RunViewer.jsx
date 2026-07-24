import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronLeft, StopCircle, CheckCircle, XCircle, AlertCircle, Clock, Image } from 'lucide-react'
import { api, connectWS } from '../api'
import { Btn, Badge } from '../components/ui'

export default function RunViewer() {
  const { projectId, runId } = useParams()
  const [run, setRun] = useState(null)
  const [logs, setLogs] = useState([])
  const [status, setStatus] = useState('running')
  const [summary, setSummary] = useState(null)
  const [screenshots, setScreenshots] = useState([])
  const logRef = useRef(null)
  const wsRef = useRef(null)

  useEffect(() => {
    // Load run metadata only. Logs are streamed exclusively over the WebSocket
    // (the server replays all stored logs on connect, then streams live ones),
    // so pulling them here too would render every existing line twice.
    api.getRun(runId).then(r => {
      setRun(r)
      setStatus(r.status)
      setSummary(r.summary)
    })

    wsRef.current = connectWS(runId, (msg) => {
      if (msg.type === 'log') {
        setLogs(prev => [...prev, msg.text])
      } else if (msg.type === 'complete') {
        setStatus(msg.status)
        setSummary(msg.summary)
        // Screenshots are written during the run; load them once it finishes.
        loadScreenshots()
      }
    })

    return () => wsRef.current?.close()
  }, [runId])

  function loadScreenshots() {
    api.getRunScreenshots(runId).then(r => setScreenshots(r.screenshots || [])).catch(() => {})
  }

  // Also load on mount for already-finished runs opened from history.
  useEffect(() => { loadScreenshots() }, [runId])

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [logs])

  async function abort() {
    if (!confirm('Abort this run?')) return
    await api.abortRun(runId)
    setStatus('error')
  }

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>
      <Link to={`/projects/${projectId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text2)', fontSize: 13, marginBottom: 24 }}>
        <ChevronLeft size={14} /> Back to Project
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1 style={{ fontSize: '20px', fontWeight: 700 }}>{run?.moduleName || 'Running QA Agent'}</h1>
            <Badge status={status} />
          </div>
          {run && (
            <p style={{ color: 'var(--text3)', fontSize: 12 }}>
              Started {new Date(run.startedAt).toLocaleString()}
              {run.completedAt && ` · Completed ${new Date(run.completedAt).toLocaleString()}`}
            </p>
          )}
        </div>
        {status === 'running' && (
          <Btn variant="danger" size="sm" onClick={abort}><StopCircle size={13} /> Abort</Btn>
        )}
      </div>

      {/* Terminal Output */}
      <div style={{ background: '#080a10', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} />
          <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
            E2E Studio — Live Claude Code Agent Execution
          </span>
        </div>
        <div ref={logRef} style={{ height: 480, overflowY: 'auto', padding: '16px', fontFamily: 'var(--font-mono)', fontSize: '12px', lineHeight: '1.7', color: '#94a3b8' }}>
          {logs.map((line, i) => <LogLine key={i} text={line} />)}
        </div>
      </div>

      {/* Captured Screenshots Gallery */}
      {status !== 'running' && run && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, fontSize: 14, marginBottom: 16 }}>
            <Image size={16} /> Captured Screenshots
            {screenshots.length > 0 && (
              <span style={{ color: 'var(--text3)', fontWeight: 400 }}>({screenshots.length})</span>
            )}
          </div>
          {screenshots.length === 0 ? (
            <p style={{ color: 'var(--text3)', fontSize: 13 }}>No screenshot files found for this run.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {screenshots.map(shot => (
                <div key={shot.name}>
                  <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>
                    📸 {shot.name}
                  </div>
                  <a href={shot.url} target="_blank" rel="noreferrer">
                    <img
                      src={`${shot.url}?t=${run.completedAt || ''}`}
                      alt={shot.name}
                      style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid var(--border2)', display: 'block' }}
                    />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function LogLine({ text }) {
  let color = '#94a3b8'
  if (text.includes('✅') || text.includes('PASSED')) color = '#4ade80'
  else if (text.includes('❌') || text.includes('FAILED') || text.includes('Error')) color = '#f87171'
  else if (text.includes('⚠️') || text.includes('warn')) color = '#fbbf24'
  else if (text.includes('🤖') || text.includes('📋') || text.includes('🌐')) color = '#818cf8'

  return <div style={{ color }}>{text || ' '}</div>
}