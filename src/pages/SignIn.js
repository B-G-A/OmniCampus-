import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import AuthContext from "../context/AuthContext";

function SignIn() {
  const navigate = useNavigate();
  const { login, error: authError } = useContext(AuthContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");
    try {
      const user = await login(email, password);
      // AuthContext updates the user state, App.js handles the redirects.
      // But we can navigate directly as a backup.
      if (user.role === "student") navigate("/student");
      else if (user.role === "teacher") navigate("/teacher");
      else if (user.role === "tpo") navigate("/tpo");
      else if (user.role === "admin") navigate("/admin");
    } catch (err) {
      setErrorMsg(err.message || "Invalid credentials or verification required.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = async (demoEmail) => {
    setSubmitting(true);
    setErrorMsg("");
    try {
      const user = await login(demoEmail, "password123");
      if (user.role === "student") navigate("/student");
      else if (user.role === "teacher") navigate("/teacher");
      else if (user.role === "tpo") navigate("/tpo");
      else if (user.role === "admin") navigate("/admin");
    } catch (err) {
      setErrorMsg(err.message || "Failed to log in with demo account. Ensure DB is seeded.");
    } finally {
      setSubmitting(false);
    }
  };

  const videoRef = React.useRef(null);
  const toggleVideoPlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  };

  return (
    <div className="login-page" style={loginPageStyle}>
      <div className="left-panel" style={leftPanelStyle}>
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          className="background-video"
          onClick={toggleVideoPlay}
          style={videoStyle}
        >
          <source src="/video.mp4" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        <div className="left-content" style={leftContentStyle}>
          <div className="logo" style={logoStyle}>
            <span className="logo-icon" style={{ fontSize: '28px' }}>🎓</span>
            <span className="logo-text" style={{ fontSize: '26px', fontWeight: '700', letterSpacing: '-0.5px' }}>OmniCampus</span>
          </div>
          <h1 style={headlineStyle}>Your AI-Powered Learning Companion</h1>
          <p style={subTextStyle}>
            Access resources, check placement opportunities, track attendance, and interact with academic AI models.
          </p>
          <div className="features" style={featuresStyle}>
            <div style={featurePillStyle}>🤖 AI Syllabus Chat</div>
            <div style={featurePillStyle}>💼 Placement Portal</div>
            <div style={featurePillStyle}>⚡ Student & Faculty hubs</div>
          </div>
        </div>
      </div>
      <div className="right-panel" style={rightPanelStyle}>
        <div className="signin-card" style={signinCardStyle}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: '700', color: '#1e293b', margin: '0 0 8px 0' }}>Welcome back</h2>
            <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>Sign in to access your portal</p>
          </div>

          {(errorMsg || authError) && (
            <div style={errorBannerStyle}>
              {errorMsg || authError}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Email / Roll Number</label>
              <input
                type="email"
                placeholder="name@college.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
            <button className="submit-btn" type="submit" disabled={submitting} style={submitBtnStyle}>
              {submitting ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <div style={dividerStyle}>
            <span style={dividerTextStyle}>OR QUICK DEMO LOGIN</span>
          </div>

          <div style={demoGridStyle}>
            <button onClick={() => handleQuickLogin("student@college.com")} style={demoBtnStyle}>
              🧑‍🎓 Student <small style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>Abhishna</small>
            </button>
            <button onClick={() => handleQuickLogin("teacher@college.com")} style={demoBtnStyle}>
              👩‍🏫 Teacher <small style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>Dr. Sharma</small>
            </button>
            <button onClick={() => handleQuickLogin("tpo@college.com")} style={demoBtnStyle}>
              💼 TPO Officer <small style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>Placement</small>
            </button>
            <button onClick={() => handleQuickLogin("admin@college.com")} style={demoBtnStyle}>
              🛡️ Admin <small style={{ display: 'block', fontSize: '10px', color: '#64748b' }}>System</small>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Styling definitions
const loginPageStyle = {
  display: 'flex',
  minHeight: '100vh',
  width: '100%',
  fontFamily: 'Inter, system-ui, sans-serif',
  background: '#f8fafc'
};

const leftPanelStyle = {
  flex: '1 1 50%',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  padding: '60px',
  overflow: 'hidden',
  color: '#ffffff'
};

const videoStyle = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  zIndex: 1,
  filter: 'brightness(0.4) contrast(1.1)'
};

const leftContentStyle = {
  position: 'relative',
  zIndex: 2,
  maxWidth: '540px'
};

const logoStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  marginBottom: '40px'
};

const headlineStyle = {
  fontSize: '44px',
  fontWeight: '800',
  lineHeight: '1.15',
  letterSpacing: '-1.5px',
  margin: '0 0 20px 0',
  textShadow: '0 4px 12px rgba(0,0,0,0.3)'
};

const subTextStyle = {
  fontSize: '18px',
  lineHeight: '1.6',
  color: 'rgba(255, 255, 255, 0.85)',
  margin: '0 0 32px 0'
};

const featuresStyle = {
  display: 'flex',
  gap: '12px',
  flexWrap: 'wrap'
};

const featurePillStyle = {
  background: 'rgba(255, 255, 255, 0.15)',
  backdropFilter: 'blur(10px)',
  padding: '8px 16px',
  borderRadius: '20px',
  fontSize: '14px',
  fontWeight: '500',
  border: '1px solid rgba(255, 255, 255, 0.2)'
};

const rightPanelStyle = {
  flex: '1 1 50%',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '40px',
  background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)'
};

const signinCardStyle = {
  width: '100%',
  maxWidth: '440px',
  background: '#ffffff',
  padding: '40px',
  borderRadius: '24px',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  border: '1px solid #f1f5f9'
};

const labelStyle = {
  display: 'block',
  fontSize: '14px',
  fontWeight: '600',
  color: '#334155',
  marginBottom: '6px'
};

const inputStyle = {
  width: '100%',
  padding: '12px 16px',
  borderRadius: '12px',
  border: '1px solid #cbd5e1',
  background: '#f8fafc',
  fontSize: '15px',
  outline: 'none',
  transition: 'all 0.2s',
  boxSizing: 'border-box'
};

const submitBtnStyle = {
  width: '100%',
  padding: '14px',
  background: '#3b82f6',
  color: '#ffffff',
  border: 'none',
  borderRadius: '12px',
  fontSize: '16px',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'background 0.2s',
  boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)'
};

const dividerStyle = {
  display: 'flex',
  alignItems: 'center',
  margin: '24px 0 16px 0',
  textAlign: 'center'
};

const dividerTextStyle = {
  flex: '1',
  fontSize: '11px',
  fontWeight: '700',
  letterSpacing: '1px',
  color: '#94a3b8',
  borderBottom: '1px solid #e2e8f0',
  lineHeight: '0.1em',
  margin: '10px 0 20px'
};

const demoGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '10px',
  marginTop: '10px'
};

const demoBtnStyle = {
  padding: '10px',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '10px',
  fontSize: '13px',
  fontWeight: '600',
  color: '#475569',
  cursor: 'pointer',
  textAlign: 'center',
  transition: 'all 0.2s'
};

const errorBannerStyle = {
  background: '#fef2f2',
  border: '1px solid #fca5a5',
  color: '#b91c1c',
  padding: '12px',
  borderRadius: '12px',
  fontSize: '14px',
  marginBottom: '20px',
  textAlign: 'center'
};

export default SignIn;