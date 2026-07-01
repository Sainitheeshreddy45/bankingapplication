import React, { useContext, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthContext } from './AuthContext';
import { injectNavigator } from './apiClient';

import Login from './Login';
import AdminPortal from './AdminPortal';
import MerchantDashboard from './MerchantDashboard';
import MerchantOverviewTab from './MarchantOverview';

// Centralized role normalization utility for consistent routing matching
const getNormalizedRole = (userObject) => {
  const roleString = userObject?.role;
  if (!roleString) return '';
  return roleString.replace('ROLE_', '').toUpperCase().trim();
};

// 🛡️ Guard wrapper for Admin routes (Now aware of the loading state)
const AdminRoute = ({ user, loading, children }) => {
  if (loading) return null; // Wait for AuthContext to finish its backend check
  if (!user) return <Navigate to="/login" replace />;
  
  const normalizedRole = getNormalizedRole(user);
  return ['SUPER_ADMIN', 'OPS_ADMIN'].includes(normalizedRole)
    ? children
    : <Navigate to="/merchant/dashboard" replace />;
};

// 🛡️ Guard wrapper for Merchant routes (Now aware of the loading state)
const MerchantRoute = ({ user, loading, children }) => {
  if (loading) return null; // Wait for AuthContext to finish its backend check
  if (!user) return <Navigate to="/login" replace />;

  const normalizedRole = getNormalizedRole(user);
  return ['MERCHANT_OWNER', 'MERCHANT_VIEWER'].includes(normalizedRole)
    ? children
    : <Navigate to="/admin/dashboard" replace />;
};

export default function AppRoutes() {
  const navigate = useNavigate();
  const { user, loading } = useContext(AuthContext);

  useEffect(() => {
    injectNavigator(navigate);
  }, [navigate]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif' }}>
        <div>Loading safe environment metrics...</div>
      </div>
    );
  }

  // Determines fallback pathing based entirely on sanitized role evaluations
  const getHomeRedirectPath = () => {
    const role = getNormalizedRole(user);
    if (['SUPER_ADMIN', 'OPS_ADMIN'].includes(role)) return "/admin/dashboard";
    if (['MERCHANT_OWNER', 'MERCHANT_VIEWER'].includes(role)) return "/merchant/dashboard";
    return "/login";
  };

  return (
    <Routes>
      {/* Root Route Handler */}
      <Route 
        path="/" 
        element={user ? <Navigate to={getHomeRedirectPath()} replace /> : <Navigate to="/login" replace />} 
      />

      {/* Public Authentication Canvas */}
      <Route path="/login" element={<Login />} />

      {/* Protected Admin Domain */}
      <Route
        path="/admin/dashboard"
        element = {
          <AdminRoute user={user} loading={loading}>
            <AdminPortal />
          </AdminRoute>
        }
      />

      <Route
        path="/admin/merchants/:merchantId/overview"
        element = {
          <AdminRoute user={user} loading={loading}>
            <MerchantOverviewTab />
          </AdminRoute>
        }
      />

      {/* Protected Merchant Domain */}
      <Route
        path="/merchant/dashboard"
        element = {
          <MerchantRoute user={user} loading={loading}>
            <MerchantDashboard />
          </MerchantRoute>
        }
      />

      {/* Catch-All Fallback Security Router */}
      <Route
        path="*"
        element={<Navigate to={user ? getHomeRedirectPath() : "/login"} replace />}
      />
    </Routes>
  );
}