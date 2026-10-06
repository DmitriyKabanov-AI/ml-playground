import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { Loader } from './components/ui/Loader'

const Overview = lazy(() => import('./pages/Overview'))
const TaskDetail = lazy(() => import('./pages/TaskDetail'))

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route
          path="/"
          element={
            <Suspense fallback={<Loader />}>
              <Overview />
            </Suspense>
          }
        />
        <Route
          path="/tasks/:task"
          element={
            <Suspense fallback={<Loader />}>
              <TaskDetail />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  )
}