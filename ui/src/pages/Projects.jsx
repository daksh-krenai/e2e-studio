import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Folder, Trash2, Globe, Mail, ChevronRight } from 'lucide-react'
import { api } from '../api'
import { Btn, Card, Modal, Field, Empty, Badge } from '../components/ui'

export default function Projects() {
  const [projects, setProjects] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(true)
  const nav = useNavigate()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try { setProjects(await api.getProjects()) } finally { setLoading(false) }
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>Projects</h1>
          <p style={{ color: 'var(--text2)', fontSize: '13px' }}>Organise your test suites by project</p>
        </div>
        <Btn onClick={() => setShowCreate(true)}><Plus size={15} /> New Project</Btn>
      </div>

      {/* Grid */}
      {loading ? (
        <p style={{ color: 'var(--text2)' }}>Loading...</p>
      ) : projects.length === 0 ? (
        <Empty icon="🗂" title="No projects yet"
          subtitle="Create your first project to start organising test modules"
          action={<Btn onClick={() => setShowCreate(true)}><Plus size={15} /> Create project</Btn>} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '16px' }}>
          {projects.map(p => (
            <ProjectCard key={p.id} project={p} onDelete={load} onClick={() => nav(`/projects/${p.id}`)} />
          ))}
        </div>
      )}

      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} onCreated={p => { load(); nav(`/projects/${p.id}`) }} />}
    </div>
  )
}

function ProjectCard({ project: p, onClick, onDelete }) {
  async function del(e) {
    e.stopPropagation()
    if (!confirm(`Delete "${p.name}" and all its modules?`)) return
    await api.deleteProject(p.id)
    onDelete()
  }

  return (
    <Card onClick={onClick} style={{ position: 'relative', cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ background: 'var(--accent-glow)', borderRadius: 8, padding: 8 }}>
          <Folder size={18} color="var(--accent)" />
        </div>
        <button onClick={del} style={{ color: 'var(--text3)', cursor: 'pointer', padding: 4, background: 'none', border: 'none' }}>
          <Trash2 size={14} />
        </button>
      </div>
      <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}>{p.name}</div>
      {p.description && <div style={{ fontSize: '12px', color: 'var(--text2)', marginBottom: '12px' }}>{p.description}</div>}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {p.baseUrl && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '11px', color: 'var(--text3)' }}>
            <Globe size={11} /> {p.baseUrl.replace(/^https?:\/\//, '')}
          </span>
        )}
        {p.emailConfig?.to && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '11px', color: 'var(--text3)' }}>
            <Mail size={11} /> Email configured
          </span>
        )}
      </div>
      <div style={{ position: 'absolute', bottom: 16, right: 16 }}>
        <ChevronRight size={16} color="var(--text3)" />
      </div>
    </Card>
  )
}

function CreateProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', baseUrl: '', description: '' })
  const [showEmail, setShowEmail] = useState(false)
  const [email, setEmail] = useState({ host: 'smtp.gmail.com', port: 587, user: '', pass: '', to: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }
  function setE(k, v) { setEmail(e => ({ ...e, [k]: v })) }

  async function submit() {
    if (!form.name.trim()) { setErr('Project name is required'); return }
    setSaving(true)
    try {
      const p = await api.createProject({
        ...form,
        emailConfig: showEmail && email.user ? email : null
      })
      onCreated(p)
    } catch (e) { setErr(e.message) } finally { setSaving(false) }
  }

  return (
    <Modal title="New Project" onClose={onClose} width={540}>
      {err && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: 'var(--red)', marginBottom: 16 }}>{err}</div>}
      <Field label="Project Name"><input value={form.name} onChange={e => set('name', e.target.value)} placeholder="My App" autoFocus /></Field>
      <Field label="Base URL" hint="Default URL for modules that don't specify one"><input value={form.baseUrl} onChange={e => set('baseUrl', e.target.value)} placeholder="https://myapp.com" /></Field>
      <Field label="Description"><textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} placeholder="What does this project test?" style={{ resize: 'vertical' }} /></Field>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, marginBottom: showEmail ? 16 : 0 }}>
          <input type="checkbox" checked={showEmail} onChange={e => setShowEmail(e.target.checked)} style={{ width: 'auto' }} />
          Configure email notifications
        </label>
        {showEmail && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="SMTP Host"><input value={email.host} onChange={e => setE('host', e.target.value)} placeholder="smtp.gmail.com" /></Field>
            <Field label="Port"><input type="number" value={email.port} onChange={e => setE('port', +e.target.value)} /></Field>
            <Field label="Username / Email"><input value={email.user} onChange={e => setE('user', e.target.value)} placeholder="you@gmail.com" /></Field>
            <Field label="Password / App Password"><input type="password" value={email.pass} onChange={e => setE('pass', e.target.value)} /></Field>
            <Field label="Send Reports To" hint="Comma-separated"><input value={email.to} onChange={e => setE('to', e.target.value)} placeholder="team@company.com" /></Field>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
        <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        <Btn onClick={submit} disabled={saving}>{saving ? 'Creating…' : 'Create Project'}</Btn>
      </div>
    </Modal>
  )
}
