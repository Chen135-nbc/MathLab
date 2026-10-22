import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router'
import { AppLayout } from './layouts/AppLayout'
import { Dashboard } from './modules/Dashboard'
import { KnowledgePage } from './modules/knowledge/KnowledgePage'
import { PointPage } from './modules/knowledge/PointPage'
import { ModulePage } from './modules/ModulePage'
import './styles/index.css'
import 'katex/dist/katex.min.css'

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><BrowserRouter><Routes><Route element={<AppLayout/>}><Route index element={<Dashboard/>}/><Route path="knowledge" element={<KnowledgePage/>}/><Route path="knowledge/:pointId" element={<PointPage/>}/><Route path="modeling" element={<ModulePage module="modeling"/>}/><Route path="graph" element={<ModulePage module="graph"/>}/><Route path="practice" element={<ModulePage module="practice"/>}/></Route></Routes></BrowserRouter></React.StrictMode>)
