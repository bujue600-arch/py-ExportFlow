import { Link, Route, Routes } from "react-router-dom";
import AssetListPage from "./pages/AssetListPage";
import JobCenterPage from "./pages/JobCenterPage";

export default function App() {
  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-title">ExportFlow</span>
        <nav className="app-nav">
          <Link to="/">作品库</Link>
          <Link to="/jobs">导出中心</Link>
        </nav>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<AssetListPage />} />
          <Route path="/jobs" element={<JobCenterPage />} />
        </Routes>
      </main>
    </div>
  );
}
