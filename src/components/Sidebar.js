import React, { useState, useContext } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AuthContext from "../context/AuthContext";
<<<<<<< HEAD
=======
import NotificationBell from "./NotificationBell";
>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)

function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  const getNavItems = () => {
    if (!user) return [];
    switch (user.role) {
      case "student":
        return [
          { label: "Dashboard", path: "/student", icon: "📊" },
          { label: "AI Assistant", path: "/chatbot", icon: "🤖" },
          { label: "Materials", path: "/materials", icon: "📚" },
        ];
      case "teacher":
        return [
          { label: "Dashboard", path: "/teacher", icon: "📊" },
          { label: "Materials", path: "/materials", icon: "📚" },
        ];
      case "tpo":
        return [
          { label: "Dashboard", path: "/tpo", icon: "📊" },
        ];
      case "admin":
        return [
          { label: "Dashboard", path: "/admin", icon: "📊" },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();
  const isActive = (path) => location.pathname === path;

  const handleSignOut = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <aside className={"sidebar" + (collapsed ? " collapsed" : "")}>
      <div className="sidebar-header">
        <button
          className="collapse-toggle"
          onClick={() => setCollapsed((s) => !s)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          ☰
        </button>

        <div className="brand">
          <span className="brand-icon">🎓</span>
          {!collapsed && <span className="brand-text">OmniCampus</span>}
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(({ label, path, icon }) => (
          <button
            key={path}
            type="button"
            className={"sidebar-item" + (isActive(path) ? " active" : "")}
            onClick={() => navigate(path)}
          >
            <span className="item-icon">{icon}</span>
            {!collapsed && <span className="item-label">{label}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        {user && !collapsed && (
<<<<<<< HEAD
          <div className="sidebar-user" style={{ padding: "8px 0", borderTop: "1px solid rgba(255,255,255,0.1)", marginBottom: "10px" }}>
            <div className="user-name" style={{ fontSize: "14px", fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
            <div className="user-role" style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: "2px" }}>{user.role}</div>
=======
          <div className="sidebar-user" style={{ padding: "8px 0", borderTop: "1px solid rgba(255,255,255,0.1)", marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ overflow: "hidden" }}>
              <div className="user-name" style={{ fontSize: "14px", fontWeight: "bold", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
              <div className="user-role" style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginTop: "2px" }}>{user.role}</div>
            </div>
            <NotificationBell />
>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)
          </div>
        )}
        <button
          className="sidebar-signout"
          type="button"
          onClick={handleSignOut}
        >
          <span className="item-icon">↩</span>
          {!collapsed && <span className="item-label">Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;