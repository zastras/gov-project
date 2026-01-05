import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import { LoginPage } from './pages/LoginPage';
import { AppLayout } from './components/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { FcaSpiDashboard } from './pages/FcaSpiDashboard';
import { DeliverableDetail } from './pages/DeliverableDetail';
import { PlaceholderPage } from './pages/PlaceholderPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) return <div className="flex h-screen items-center justify-center">Loading...</div>;

    if (!isAuthenticated) return <Navigate to="/login" replace />;

    return <>{children}</>;
};

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/login" element={<LoginPage />} />

                    <Route path="/" element={
                        <ProtectedRoute>
                            <AppLayout />
                        </ProtectedRoute>
                    }>
                        <Route index element={<Navigate to="/fca-spi" replace />} /> {/* Default to FCA for now per specs or Dashboard */}
                        <Route path="dashboard" element={<Dashboard />} />

                        {/* Regulators */}
                        <Route path="fca-spi" element={<FcaSpiDashboard />} />
                        <Route path="fca-spi/:itemId" element={<DeliverableDetail />} />

                        <Route path="cyber-essentials" element={<PlaceholderPage title="Cyber Essentials" />} />
                        <Route path="iso27001" element={<PlaceholderPage title="ISO27001" />} />
                        <Route path="gdpr" element={<PlaceholderPage title="GDPR" />} />
                    </Route>
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
