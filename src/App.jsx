import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './lib/auth.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import NewLead from './pages/NewLead.jsx';
import LeadDetail from './pages/LeadDetail.jsx';
import ClientCheck from './pages/ClientCheck.jsx';
import AdminUsers from './pages/AdminUsers.jsx';
import AdminRoute from './components/AdminRoute.jsx';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/check/:share_uuid" element={<ClientCheck />} />
        <Route
          path="/dashboard"
          element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
        />
        <Route
          path="/leads/new"
          element={<ProtectedRoute><NewLead /></ProtectedRoute>}
        />
        <Route
          path="/leads/:id"
          element={<ProtectedRoute><LeadDetail /></ProtectedRoute>}
        />
        <Route
          path="/admin/users"
          element={<AdminRoute><AdminUsers /></AdminRoute>}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
