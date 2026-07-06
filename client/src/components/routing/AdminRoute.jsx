import { Navigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { PageLoader } from '../ui/LoadingSpinner';

export default function AdminRoute({ children }) {
  const { user, isAuthenticated, loading } = useApp();

  if (loading) {
    return <PageLoader />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user && !user.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}
