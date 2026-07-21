import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Plus, Play, Trash2, Clock, ChevronLeft, Edit2, Calendar, Mail } from 'lucide-react'
import { api } from '../api'
import { Btn, Card, Modal, Field, Empty, Badge, Spinner } from '../components/ui'

export default function ProjectDetail() {
  const { projectId } = useParams()
  const nav = useNavigate()
  const [project, setProject] = useState(null)
  const [modules, setModules] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [editModule, setEditModule] = useState(null)
  const [runningIds, setRunningIds] = useState(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [projectId])

  async function load() {
    setLoading(true)
    try {
      const [p, m] = await Promise.all([api.getProject(projectId), api.getModules(projectId)])
      setProject(p); setModules(m)
    } catch { nav('/') } finally { setLoading(false) }
  }

  async function runModule(mod) {
    setRunningIds(s => new Set([...s, mod.id]))
    try {
      const { runId } = await api.runModule(mod.id)
      nav(`/projects/${projectId}/runs/${runId}`)
    } catch (e) {
      alert(e.message)
      setRunningIds(s => { const n = new Set(s); n.delete(mod.id); return n })
    }
  }

  async function deleteModule(mod) {
    if (!confirm(`Delete module "${mod.name}"?`)) return
    await api.deleteModule(projectId, mod.id)
    load()
  }

  if (loading) return <div style={{ padding: 40, color: 'var(--text2)' }}>Loading...</div>
  if (!project) return null

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
      {/* Breadcrumb */}
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text2)', fontSize: 13, marginBottom: 24 }}>
        <ChevronLeft size={14} /> Projects
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>{project.name}</h1>
          {project.description && <p style={{ color: 'var(--text2)', fontSize: '13px', marginBottom: 4 }}>{project.description}</p>}
          {project.baseUrl && <p style={{ color: 'var(--text3)', fontSize: '12px' }}>{project.baseUrl}</p>}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="ghost" size="sm" onClick={() => nav(`/projects/${projectId}/runs`)}>
            <Clock size={13} /> History
          </Btn>
          <Btn size="sm" onClick={() => setShowCreate(true)}><Plus size={13} /> Add Module</Btn>
        </div>
      </div>

      {/* Modules */}
      {modules.length === 0 ? (
        <Empty icon="🧩" title="No modules yet"
          subtitle="Modules represent pages or features to test — like Login, Checkout, or Dashboard"
          action={<Btn onClick={() => setShowCreate(true)}><Plus size={15} /> Add first module</Btn>} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {modules.map(m => (
            <ModuleRow key={m.id} mod={m} project={project}
              running={runningIds.has(m.id)}
              onRun={() => runModule(m)}
              onEdit={() => setEditModule(m)}
              onDelete={() => deleteModule(m)}
              onViewHistory={() => nav(`/projects/${projectId}/modules/${m.id}/runs`)}
            />
          ))}
        </div>
      )}

      {showCreate && (
        <ModuleModal projectId={projectId} onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); load() }} />
      )}
      {editModule && (
        <ModuleModal projectId={projectId} module={editModule} onClose={() => setEditModule(null)} onSaved={() => { setEditModule(null); load() }} />
      )}
    </div>
  )
}

function ModuleRow({ mod, project, running, onRun, onEdit, onDelete, onViewHistory }) {
  const status = mod.lastStatus || 'never'

  return (
    <Card style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontWeight: 600, fontSize: '14px' }}>{mod.name}</span>
          <Badge status={status} />
          {mod.schedule && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--accent)', background: 'var(--accent-glow)', padding: '1px 6px', borderRadius: 99 }}>
              <Calendar size={10} /> {mod.schedule}
            </span>
          )}
          {mod.emailOnComplete && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--text3)' }}>
              <Mail size={10} />
            </span>
          )}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {mod.url || project.baseUrl} · {mod.instructions.slice(0, 80)}{mod.instructions.length > 80 ? '…' : ''}
        </div>
        {mod.lastRunAt && (
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2 }}>
            Last run {new Date(mod.lastRunAt).toLocaleString()}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <Btn variant="ghost" size="sm" onClick={onViewHistory}><Clock size={13} /></Btn>
        <Btn variant="ghost" size="sm" onClick={onEdit}><Edit2 size={13} /></Btn>
        <Btn variant="danger" size="sm" onClick={onDelete}><Trash2 size={13} /></Btn>
        <Btn size="sm" onClick={onRun} disabled={running}>
          {running ? <Spinner size={13} /> : <Play size={13} />}
          {running ? 'Running…' : 'Run'}
        </Btn>
      </div>
    </Card>
  )
}

function ModuleModal({ projectId, module: mod, onClose, onSaved }) {
  const editing = !!mod
  const [form, setForm] = useState({
    name: mod?.name || '',
    url: mod?.url || '',
    instructions: mod?.instructions || '',
    schedule: mod?.schedule || '',
    emailOnComplete: mod?.emailOnComplete || false,
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function submit() {
    if (!form.name.trim()) { setErr('Module name is required'); return }
    if (!form.instructions.trim()) { setErr('Instructions are required'); return }
    setSaving(true)
    try {
      if (editing) await api.updateModule(projectId, mod.id, form)
      else await api.createModule(projectId, form)
      onSaved()
    } catch (e) { setErr(e.message) } finally { setSaving(false) }
  }

  return (
    <Modal title={editing ? `Edit: ${mod.name}` : 'Add Module'} onClose={onClose} width={560}>
      {err && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: 'var(--red)', marginBottom: 16 }}>{err}</div>}

      <Field label="Module Name"><input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Login Flow" autoFocus /></Field>
      <Field label="URL" hint="Leave blank to use the project base URL"><input value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://myapp.com/login" /></Field>
      <Field label="Test Instructions" hint="Describe what to test in plain English. Claude will generate the Playwright test.">
        <textarea value={form.instructions} onChange={e => set('instructions', e.target.value)}
          rows={5} placeholder={`Examples:\n- Navigate to the login page\n- Enter valid credentials (user: test@example.com, pass: Test@123)\n- Verify the dashboard loads\n- Check that user name appears in header`}
          style={{ resize: 'vertical' }} />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
        <Field label="Schedule (Cron)" hint="e.g. '0 9 * * 1' = every Monday 9am. Leave blank to run manually.">
          <input value={form.schedule} onChange={e => set('schedule', e.target.value)} placeholder="0 9 * * 1-5" />
        </Field>
        <div style={{ paddingTop: 20 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text2)', whiteSpace: 'nowrap', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.emailOnComplete} onChange={e => set('emailOnComplete', e.target.checked)} style={{ width: 'auto' }} />
            Email on complete
          </label>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={submit} disabled={saving}>{saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Module'}</Btn>
      </div>
    </Modal>
  )
}
