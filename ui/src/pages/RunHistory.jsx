import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { ChevronLeft, Play, ExternalLink } from 'lucide-react'
import { api } from '../api'
import { Badge, Card } from '../components/ui'

export default function RunHistory() {
  const { projectId } = useParams()
  const [runs, setRuns] = useState([])
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const nav = useNavigate()

  useEffect(() => {
    Promise.all([
      api.getProject(projectId),
      api.getProjectRuns(projectId)
    ]).then(([p, r]) => { setProject(p); setRuns(r) })
      .finally(() => setLoading(false))
  }, [projectId])

  if (loading) return <div style={{ padding: 40, color: 'var(--text2)' }}>Loading…</div>

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
      <Link to={`/projects/${projectId}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text2)', fontSize: 13, marginBottom: 24 }}>
        <ChevronLeft size={14} /> {project?.name}
      </Link>
      <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: 24 }}>Run History</h1>

      {runs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text2)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 600 }}>No runs yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Run a module to see results here</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {runs.map(run => (
            <Card key={run.id} onClick={() => nav(`/projects/${projectId}/runs/${run.id}`)}
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px' }}>
              <Badge status={run.status} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{run.moduleName}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
                  {new Date(run.startedAt).toLocaleString()}
                  {run.completedAt && ` · ${((new Date(run.completedAt) - new Date(run.startedAt)) / 1000).toFixed(1)}s`}
                </div>
              </div>
              {run.summary && (
                <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text2)' }}>
                  <span style={{ color: 'var(--green)' }}>✓ {run.summary.passed}</span>
                  <span style={{ color: 'var(--red)' }}>✗ {run.summary.failed}</span>
                </div>
              )}
              <ExternalLink size={14} color="var(--text3)" />
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
