import { lazy } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';

const Overview = lazy(() => import('./pages/Overview'));
const Classification = lazy(() => import('./pages/Classification'));
const Regression = lazy(() => import('./pages/Regression'));
const Walmart = lazy(() => import('./pages/Walmart'));
const Weather = lazy(() => import('./pages/Weather'));

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Overview />} />
          <Route path="classification" element={<Classification />} />
          <Route path="regression" element={<Regression />} />
          <Route path="walmart" element={<Walmart />} />
          <Route path="weather" element={<Weather />} />
          <Route path="*" element={<Overview />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}