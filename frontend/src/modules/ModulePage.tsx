import { Link } from 'react-router'
import { ArrowRight, Boxes, ChartNoAxesCombined, Network } from 'lucide-react'

const pages = {
  modeling: { eyebrow: 'MODEL STUDIO', title: '数学建模实验室', description: '在可交互画布中观察数学对象，让抽象关系变得可见。', icon: Boxes, items: ['2D / 3D 数学构造', 'GeoGebra 引擎接入', '模型文件与模板'] },
  graph: { eyebrow: 'KNOWLEDGE GRAPH', title: '数学知识网络', description: '把前置、推导、等价、推广与应用关系串成知识网络。', icon: Network, items: ['多类型知识关联', '可视化关系探索', '关联解释与审核'] },
  practice: { eyebrow: 'PRACTICE & SKILLS', title: '练习统计与能力树', description: '把教辅练习、作答记录和能力证据放在同一个视图中。', icon: ChartNoAxesCombined, items: ['教辅书与题号管理', '作答与错因记录', '能力树与统计看板'] },
}

export function ModulePage({ module }: { module: keyof typeof pages }) {
  const data = pages[module]
  return <div className="page-width module-page"><div className="eyebrow">{data.eyebrow}</div><div className="module-hero"><div><span className="phase-pill">后续阶段</span><h1>{data.title}</h1><p>{data.description}</p></div><div className="module-hero-icon"><data.icon size={42}/></div></div><div className="section-header"><div><span className="eyebrow">ROADMAP</span><h2>计划中的工作区</h2></div></div><div className="future-grid">{data.items.map((item, index) => <div className="future-item" key={item}><span>0{index + 1}</span><h3>{item}</h3><p>将在后续开发阶段逐步接入。</p></div>)}</div><div className="module-return"><span>先从已经可用的知识库开始积累内容。</span><Link to="/knowledge">打开数学知识库 <ArrowRight size={16}/></Link></div></div>
}
