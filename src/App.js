import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from "react-router-dom";
import React, { useContext } from "react";

import SignIn from "./pages/SignIn";
import StudentDashboard from "./pages/StudentDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import TpoDashboard from "./pages/TpoDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import SubjectPage from "./pages/SubjectPage";
import ChatbotPage from "./pages/ChatbotPage";
import Materials from "./pages/Materials";

import Sidebar from "./components/Sidebar";

import { SubjectProvider } from "./context/SubjectContext";
import { AuthProvider, AuthContext } from "./context/AuthContext";

import "./App.css";

function App() {
  return (
    <Router>
      <AuthProvider>
        <SubjectProvider>
          <AppContent />
        </SubjectProvider>
      </AuthProvider>
    </Router>
  );
}

function AppContent() {
  const { user, loading } = useContext(AuthContext);
  const location = useLocation();

  if (loading) {
    return (
      <div className="loading-screen" style={loadingScreenStyle}>
        <div className="spinner" style={spinnerStyle}></div>
        <p style={{ marginTop: '15px', color: '#1e293b', fontWeight: '600' }}>Loading OmniCampus...</p>
      </div>
    );
  }

  const hideSidebar = location.pathname === "/";

  // Redirect if not logged in
  if (!user && location.pathname !== "/") {
    return <Navigate to="/" replace />;
  }

  // Redirect if logged in and trying to access login page
  if (user && location.pathname === "/") {
    if (user.role === "student") return <Navigate to="/student" replace />;
    if (user.role === "teacher") return <Navigate to="/teacher" replace />;
    if (user.role === "tpo") return <Navigate to="/tpo" replace />;
    if (user.role === "admin") return <Navigate to="/admin" replace />;
  }

  return (
    <div className="app">
      {!hideSidebar && <Sidebar />}
      <div className="app-content-container" style={contentContainerStyle}>
        <Routes>
          <Route path="/" element={<SignIn />} />
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="/tpo" element={<TpoDashboard />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/subject/:name" element={<SubjectPage />} />
          <Route path="/chatbot" element={<ChatbotPage />} />
          <Route path="/materials" element={<Materials />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

// Inline styling for loading screen & main wrapper to ensure proper flex layouts
const loadingScreenStyle = {
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100vh',
  backgroundColor: '#f8fafc',
  fontFamily: 'Inter, system-ui, sans-serif'
};

const spinnerStyle = {
  width: '40px',
  height: '40px',
  border: '4px solid #cbd5e1',
  borderTop: '4px solid #3b82f6',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite'
};

// Injection of keyframes for spin directly or through class is fine; using CSS is cleaner.
// Adding style tag for animation to bypass complex loaders.
const styleSheet = document.createElement("style");
styleSheet.innerText = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

const contentContainerStyle = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  overflowX: 'hidden',
  background: '#f8fafc'
};

export default App;