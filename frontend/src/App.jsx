import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import AccountDetail from './pages/AccountDetail';
import Alerts from './pages/Alerts';
import GraphView from './pages/GraphView';
import Simulate from './pages/Simulate';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen grid-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-electric rounded-full border-t-transparent animate-spin" />
        <span className="text-sm font-mono text-electric/70">INITIALIZING SYSTEM</span>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login"          element={<Login />} />
          <Route path="/auth/callback"  element={<AuthCallback />} />
          <Route path="/"               element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/users"          element={<ProtectedRoute><Accounts /></ProtectedRoute>} />
          <Route path="/users/:id"      element={<ProtectedRoute><AccountDetail /></ProtectedRoute>} />
          <Route path="/alerts"         element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
          <Route path="/graph"          element={<ProtectedRoute><GraphView /></ProtectedRoute>} />
          <Route path="/simulate"       element={<ProtectedRoute><Simulate /></ProtectedRoute>} />
          <Route path="*"               element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
