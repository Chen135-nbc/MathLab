import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { BookOpen, Boxes, ChevronRight, Command, LayoutDashboard, Moon, Network, Search, Sun } from 'lucide-react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { useRecent } from '../app/useRecent'

const nav = [
  { to: '/', label: '总览', icon: LayoutDashboard, end: true },
  { to: '/knowledge', label: 'Math Notes', icon: BookOpen },
  { to: '/modeling', label: 'Math Studio', icon: Boxes },
  { to: '/mindmaps', label: 'Mind Map', icon: Network },
]

export function AppLayout() {
  const recent = useRecent()
  const location = useLocation()
  const inSection = location.pathname.startsWith('/sections/')
  const [dark, setDark] = useState(() => localStorage.getItem('mathlab-theme') === 'dark')
  useEffect(() => { document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem('mathlab-theme', dark ? 'dark' : 'light') }, [dark])
  const active = nav.find(item => item.end ? location.pathname === item.to : location.pathname.startsWith(item.to) || (item.to === '/knowledge' && inSection))
  return <Tooltip.Provider delayDuration={250}><div className="app-shell">
    <aside className="sidebar">
      <Link to="/" className="brand"><span className="brand-mark">∑</span><span><strong>MathLab</strong><small>数学学习工作台</small></span></Link>
      <div className="sidebar-section-label">工作空间</div>
      <nav className="main-nav" aria-label="全局导航">{nav.map(item => <NavLink key={item.to} to={item.to} aria-label={item.label} end={item.end} className={({isActive}) => `nav-item ${isActive || (item.to === '/knowledge' && inSection) ? 'active' : ''}`}><item.icon size={18}/><span>{item.label}</span>{item.to === '/knowledge' && <ChevronRight className="nav-arrow" size={14}/>}</NavLink>)}</nav>
      <div className="sidebar-divider"/>
      <div className="sidebar-section-label">最近访问</div>
      <div className="recent-list">{recent.length ? recent.map(point => <Link className="recent-link" key={point.id} to={`/knowledge/${point.id}`}><span className="recent-dot"/><span>{point.title}</span></Link>) : <p className="sidebar-muted">打开知识点后会显示在这里</p>}</div>
      <div className="sidebar-bottom"><div className="local-badge"><span className="online-dot"/>仅在本机运行</div><div className="version">MathLab · P2</div></div>
    </aside>
    <div className="main-column"><header className="topbar"><div className="breadcrumbs"><span>工作空间</span><ChevronRight size={14}/><strong>{active?.label || '其他页面'}</strong></div><div className="top-actions"><Tooltip.Root><Tooltip.Trigger asChild><Link className="icon-button" to="/knowledge" aria-label="搜索知识点"><Search size={18}/></Link></Tooltip.Trigger><Tooltip.Portal><Tooltip.Content className="tooltip" sideOffset={7}>搜索知识点<Tooltip.Arrow className="tooltip-arrow"/></Tooltip.Content></Tooltip.Portal></Tooltip.Root><Tooltip.Root><Tooltip.Trigger asChild><button className="icon-button" type="button" onClick={() => setDark(!dark)} aria-label={dark ? '切换亮色模式' : '切换暗色模式'}>{dark ? <Sun size={18}/> : <Moon size={18}/>}</button></Tooltip.Trigger><Tooltip.Portal><Tooltip.Content className="tooltip" sideOffset={7}>{dark ? '切换亮色模式' : '切换暗色模式'}<Tooltip.Arrow className="tooltip-arrow"/></Tooltip.Content></Tooltip.Portal></Tooltip.Root><span className="avatar"><Command size={16}/></span></div></header><main className="content-area"><Outlet/></main></div>
  </div></Tooltip.Provider>
}
