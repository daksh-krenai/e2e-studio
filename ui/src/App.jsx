import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Projects from './pages/Projects'
import ProjectDetail from './pages/ProjectDetail'
import RunViewer from './pages/RunViewer'
import RunHistory from './pages/RunHistory'

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Projects />} />
          <Route path="/projects/:projectId" element={<ProjectDetail />} />
          <Route path="/projects/:projectId/runs" element={<RunHistory />} />
          <Route path="/projects/:projectId/runs/:runId" element={<RunViewer />} />
          <Route path="/projects/:projectId/modules/:moduleId/runs" element={<RunHistory />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
