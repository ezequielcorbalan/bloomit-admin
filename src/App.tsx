import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PlantRequestsPage } from './pages/PlantRequestsPage';
import { UsersPage } from './pages/UsersPage';
import { AdminsPage } from './pages/AdminsPage';

function AppContent() {
  const { admin, loading, login, logout } = useAuth();

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <Routes>
      <Route
        path="/login"
        element={admin ? <Navigate to="/dashboard" replace /> : <LoginPage onLogin={login} />}
      />
      <Route
        path="/*"
        element={
          admin ? (
            <Layout adminName={admin.name || admin.email} onLogout={logout}>
              <Routes>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/plant-requests" element={<PlantRequestsPage />} />
                <Route path="/users" element={<UsersPage />} />
                <Route path="/admins" element={<AdminsPage />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Layout>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
