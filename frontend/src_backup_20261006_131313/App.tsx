import { lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from '@/components/layout/Layout';

const Overview = lazy(() => import('./pages/Overview'));
const TaskDetail = lazy(() => import('./pages/TaskDetail'));

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="tasks/:task" element={<TaskDetail />} />
          <Route path="*" element={<Overview />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}