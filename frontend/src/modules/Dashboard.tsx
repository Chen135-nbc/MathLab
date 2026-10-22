import { Link } from 'react-router'
import { ArrowRight, BookOpen, Boxes, ChartNoAxesCombined, Network, Sparkles } from 'lucide-react'
import { useRecent } from '../app/useRecent'

const modules = [
  { to: '/knowledge', icon: BookOpen, count: '01', title: '数学知识库', description: '按教材组织知识，记录公式、概念与个人理解。', available: true },
  { to: '/modeling', icon: Boxes, count: '02', title: '数学建模实验室', description: '为 2D / 3D 数学对象建立可交互模型。', available: false },
  { to: '/graph', icon: Network, count: '03', title: '数学知识网络', description: '连接概念、定理与方法之间的关系。', available: false },
  { to: '/practice', icon: ChartNoAxesCombined, count: '04', title: '练习统计与能力树', description: '汇总教辅练习记录与能力证据。', available: false },
]

export function Dashboard() {
  const recent = useRecent()
  return <div className="page-width dashboard"><div className="hero"><div className="hero-copy"><div className="hero-eyebrow"><Sparkles size={14}/> PERSONAL MATHEMATICS WORKSPACE</div><h1>把数学知识，<br/><em>连成自己的体系。</em></h1><p>沿着教材顺序探索，在每一个知识点留下你的理解。你的笔记和学习状态只保存在这台电脑上。</p><Link className="hero-button" to="/knowledge">进入数学知识库 <ArrowRight size={17}/></Link></div><div className="hero-art" aria-hidden="true"><div className="graph-grid"/><div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/><span className="math-float m1">ƒ(x)</span><span className="math-float m2">∑</span><span className="math-float m3">∞</span><span className="math-float m4">∈</span><div className="art-center">M<span>∞</span></div></div></div>
    <div className="section-header"><div><span className="eyebrow">YOUR WORKSPACE</span><h2>探索工作空间</h2></div><span>四个模块 · 从知识开始</span></div><div className="module-grid">{modules.map(item => <Link className={`module-card ${!item.available ? 'module-future' : ''}`} to={item.to} key={item.to}><div className="module-card-top"><span className="module-icon"><item.icon size={22}/></span><span className="module-number">{item.count}</span></div><h3>{item.title}</h3><p>{item.description}</p><div className="module-card-bottom"><span>{item.available ? '现在可用' : '规划中'}</span><ArrowRight size={17}/></div></Link>)}</div>
    <div className="dashboard-bottom"><section className="panel recent-panel"><div className="panel-heading"><div><span className="panel-kicker">PICK UP WHERE YOU LEFT OFF</span><h2>最近访问</h2></div><BookOpen size={19} className="muted-icon"/></div>{recent.length ? <div className="result-list">{recent.map(item => <Link to={`/knowledge/${item.id}`} key={item.id} className="result-item"><span className="result-icon"><BookOpen size={17}/></span><span><strong>{item.title}</strong><small>{item.chapter}</small></span><ArrowRight size={17}/></Link>)}</div> : <div className="empty-panel">还没有访问过知识点。<Link to="/knowledge">从课程目录开始 <ArrowRight size={14}/></Link></div>}</section><section className="workflow-card"><span className="panel-kicker">A SIMPLE ROUTINE</span><h2>今天，从一个概念开始。</h2><p>阅读教材后打开对应知识点，写下自己的定义、公式推导或疑问。下一次复习时，所有记录都还在。</p><span className="workflow-decoration">01 / ∞</span></section></div>
  </div>
}
