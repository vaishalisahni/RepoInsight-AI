import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home      from './pages/Home';
import Dashboard from './pages/Dashboard';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-screen overflow-hidden w-full">
        <Routes>
          {/* Home — full-page landing, no sidebar */}
          <Route path="/" element={<Home />} />

          {/* Dashboard — sidebar + content (sidebar is rendered inside Dashboard) */}
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}