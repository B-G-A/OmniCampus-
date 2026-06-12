import React, { useState, useEffect, useContext } from "react";
import AuthContext from "../context/AuthContext";
import api from "../utils/api";

function NotificationBell() {
  const { user } = useContext(AuthContext);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const res = await api.get("/notifications");
      if (res && res.success) {
        setNotifications(res.data);
        setUnreadCount(res.data.filter((n) => !n.isRead).length);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Poll every minute
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkAsRead = async (id) => {
    try {
      const res = await api.patch(`/notifications/${id}/read`);
      if (res && res.success) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await api.patch(`/notifications/read-all`);
      if (res && res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  if (!user) return null;

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          position: "relative",
          padding: "8px",
          color: "white"
        }}
      >
        <span style={{ fontSize: "20px" }}>🔔</span>
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "2px",
              right: "2px",
              background: "#ef4444",
              color: "white",
              borderRadius: "50%",
              width: "18px",
              height: "18px",
              fontSize: "11px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "bold",
            }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: "absolute",
            bottom: "100%", // Open upwards from sidebar
            left: "0",
            width: "300px",
            background: "white",
            borderRadius: "12px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            border: "1px solid #e2e8f0",
            zIndex: 1000,
            overflow: "hidden",
            marginBottom: "10px",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "#f8fafc",
            }}
          >
            <strong style={{ color: "#1e293b", fontSize: "14px" }}>Notifications</strong>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#3b82f6",
                  fontSize: "12px",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                Mark all read
              </button>
            )}
          </div>

          <div style={{ maxHeight: "300px", overflowY: "auto" }}>
            {notifications.length === 0 ? (
              <p style={{ textAlign: "center", padding: "20px", color: "#64748b", fontSize: "13px", margin: 0 }}>
                No notifications yet.
              </p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  onClick={() => !n.isRead && handleMarkAsRead(n._id)}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid #f1f5f9",
                    background: n.isRead ? "white" : "#f0f9ff",
                    cursor: n.isRead ? "default" : "pointer",
                    transition: "background 0.2s",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                    <strong style={{ fontSize: "13px", color: "#1e293b" }}>{n.title}</strong>
                    {!n.isRead && <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#3b82f6", flexShrink: 0, marginTop: "4px" }} />}
                  </div>
                  <p style={{ margin: 0, fontSize: "12px", color: "#475569", lineHeight: "1.4" }}>{n.message}</p>
                  <small style={{ display: "block", color: "#94a3b8", fontSize: "11px", marginTop: "6px" }}>
                    {new Date(n.createdAt).toLocaleString()}
                  </small>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
