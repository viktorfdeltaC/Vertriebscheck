import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';

export default function AdminRoute({ children }) {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading && !session) {
    return <div className="min-h-screen flex items-center justify-center text-slate-500">Lade…</div>;
  }
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (!profile?.is_admin) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}
