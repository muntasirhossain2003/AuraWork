import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ZonesPage from './pages/ZonesPage';
import PresencePage from './pages/PresencePage';
import InsightsPage from './pages/InsightsPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 3000, style: { borderRadius: '10px', fontSize: '14px' } }} />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/dashboard" element={
            <PrivateRoute><Layout><DashboardPage /></Layout></PrivateRoute>
          } />
          <Route path="/zones" element={
            <PrivateRoute><Layout><ZonesPage /></Layout></PrivateRoute>
          } />
          <Route path="/presence" element={
            <PrivateRoute><Layout><PresencePage /></Layout></PrivateRoute>
          } />
          <Route path="/insights" element={
            <PrivateRoute><Layout><InsightsPage /></Layout></PrivateRoute>
          } />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
