import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Akatsuki3DScene from './components/Akatsuki3DScene';

// Pages
import HomePage from './pages/HomePage';
import JobDetailsPage from './pages/JobDetailsPage';
import CreateJobPage from './pages/CreateJobPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import MessagesPage from './pages/MessagesPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WebSocketProvider>
          <div className="relative min-h-screen flex flex-col bg-[#060307] text-white selection:bg-red-600 selection:text-white">
            {/* Persistent 3D Interactive WebGL Scene */}
            <Akatsuki3DScene />

            {/* Navigation Header */}
            <Navbar />

            {/* Main View Router */}
            <main className="flex-1 relative z-10">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/jobs/:id" element={<JobDetailsPage />} />
                <Route
                  path="/post-job"
                  element={
                    <ProtectedRoute>
                      <CreateJobPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/conversations"
                  element={
                    <ProtectedRoute>
                      <MessagesPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>

            {/* Global Footer */}
            <Footer />
          </div>
        </WebSocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
