import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom'
import { BrandMark } from './components/BrandMark'
import HomePage from './pages/HomePage'
import ProjectPage from './pages/ProjectPage'

function SiteHeader() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link to="/" className="brand" aria-label="琢玉首页">
          <BrandMark />
          <span className="brand-text">
            <strong>琢玉</strong>
            <em>如切如磋，如琢如磨</em>
          </span>
        </Link>
        <div className="header-note">
          <span className="status-dot" aria-hidden="true" />
          本地优先 · 数据只存这台设备
        </div>
      </div>
    </header>
  )
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <span>琢玉 · 把论文亲手做一遍</span>
        <span>M0 骨架 · 无后端 · 数据留在浏览器</span>
      </div>
    </footer>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <SiteHeader />
        <main className="container main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/project/:projectId" element={<ProjectPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <SiteFooter />
      </div>
    </BrowserRouter>
  )
}
