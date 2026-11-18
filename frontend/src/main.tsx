import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import { AppLayout } from './layouts/AppLayout'
import { Dashboard } from './modules/Dashboard'
import { KnowledgePage } from './modules/knowledge/KnowledgePage'
import { PointPage } from './modules/knowledge/PointPage'
import { StudioPage } from './modules/studio/StudioPage'
import { ModulePage } from './modules/ModulePage'
import './styles/index.css'
import './styles/workspaces.css'
import 'katex/dist/katex.min.css'

const router = createBrowserRouter([{
  element: <AppLayout/>, children: [
    { index: true, element: <Dashboard/> },
    { path: 'knowledge', element: <KnowledgePage/> },
    { path: 'knowledge/:pointId', element: <PointPage/> },
    { path: 'modeling/:modelId?', element: <StudioPage/> },
    { path: 'graph', element: <ModulePage module="graph"/> },
    { path: 'practice', element: <ModulePage module="practice"/> },
  ],
}])

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><RouterProvider router={router}/></React.StrictMode>)
