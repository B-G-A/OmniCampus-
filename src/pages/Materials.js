<<<<<<< HEAD
function Materials() {
  return (
    <div className="main">
      <header className="dashboard-header">
        <div className="header-info">
          <h1>Materials</h1>
          <p>Browse and access your course materials.</p>
        </div>
      </header>

      <div>
        <p>Coming soon: a place to view lecture notes, assignments, and resources.</p>
=======
import React, { useState, useEffect, useContext } from "react";
import AuthContext from "../context/AuthContext";
import api from "../utils/api";

function Materials() {
  const { user } = useContext(AuthContext);
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const endpoint = user?.role === "teacher" ? "/teacher/subjects" : "/student/subjects";
        const res = await api.get(endpoint);
        if (res && res.success) {
          setSubjects(res.data);
          if (res.data.length > 0) {
            setSelectedSubject(res.data[0]._id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch subjects:", err);
      }
    };
    if (user) fetchSubjects();
  }, [user]);

  useEffect(() => {
    if (!selectedSubject) return;
    const fetchMaterials = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/materials?subjectId=${selectedSubject}`);
        if (res && res.success) {
          setMaterials(res.data);
        }
      } catch (err) {
        console.error("Failed to fetch materials:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMaterials();
  }, [selectedSubject]);

  return (
    <div className="main" style={mainStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: "800", color: "#1e293b", margin: 0 }}>
            📚 Central Materials Hub
          </h1>
          <p style={{ color: "#64748b", margin: "4px 0 0 0", fontSize: "14px" }}>
            Browse and access all synchronized course materials, notes, and references.
          </p>
        </div>
      </header>

      <div style={detailsBlockStyle}>
        <div style={{ marginBottom: "20px" }}>
          <label style={{ fontSize: "14px", fontWeight: "600", color: "#475569", marginRight: "12px" }}>
            Select Subject:
          </label>
          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            style={selectBoxStyle}
          >
            {subjects.length === 0 ? <option value="">No subjects found</option> : null}
            {subjects.map(sub => (
              <option key={sub._id} value={sub._id}>{sub.name} ({sub.code})</option>
            ))}
          </select>
        </div>

        {loading ? (
          <p style={{ color: "#64748b" }}>Loading materials...</p>
        ) : materials.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", background: "#f8fafc", borderRadius: "12px", border: "1px dashed #cbd5e1" }}>
            <span style={{ fontSize: "30px", opacity: 0.5 }}>📂</span>
            <p style={{ color: "#64748b", margin: "10px 0 0 0" }}>No materials uploaded for this subject yet.</p>
          </div>
        ) : (
          <div style={gridStyle}>
            {materials.map((mat) => (
              <div key={mat._id} style={cardStyle}>
                <div style={cardHeaderStyle}>
                  <span style={badgeStyle(
                    mat.fileType === 'pdf' ? '#fee2e2' : 
                    mat.fileType === 'zip' ? '#fef3c7' : '#e0f2fe',
                    mat.fileType === 'pdf' ? '#991b1b' : 
                    mat.fileType === 'zip' ? '#92400e' : '#0369a1'
                  )}>
                    {mat.fileType.toUpperCase()}
                  </span>
                  <small style={{ color: "#94a3b8", fontSize: "12px" }}>
                    {(mat.fileSize / 1024 / 1024).toFixed(2)} MB
                  </small>
                </div>
                <h3 style={{ fontSize: "16px", color: "#1e293b", margin: "12px 0 6px 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {mat.title}
                </h3>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "16px" }}>
                  {mat.department && <span style={tagStyle}>Dept: {mat.department}</span>}
                  {mat.unit && <span style={tagStyle}>Unit {mat.unit}</span>}
                </div>
                <div style={{ marginTop: "auto", borderTop: "1px solid #f1f5f9", paddingTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <small style={{ color: "#64748b", fontSize: "11px" }}>
                    {new Date(mat.createdAt).toLocaleDateString()}
                  </small>
                  <button 
                    onClick={() => alert("Downloading: " + mat.fileName)}
                    style={downloadBtnStyle}
                  >
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)
      </div>
    </div>
  );
}

<<<<<<< HEAD
=======
// Inline Styles
const mainStyle = {
  padding: "40px",
  fontFamily: "Inter, system-ui, sans-serif"
};

const headerStyle = {
  marginBottom: "32px"
};

const detailsBlockStyle = {
  background: "white",
  padding: "24px",
  borderRadius: "16px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  border: "1px solid #f1f5f9"
};

const selectBoxStyle = {
  padding: "8px 16px",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  outline: "none",
  background: "#f8fafc",
  fontSize: "14px",
  color: "#1e293b",
  fontWeight: "600",
  minWidth: "250px"
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: "20px",
  marginTop: "20px"
};

const cardStyle = {
  background: "#fff",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  padding: "16px",
  display: "flex",
  flexDirection: "column",
  transition: "transform 0.2s, box-shadow 0.2s",
  cursor: "default"
};

const cardHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center"
};

const badgeStyle = (bg, color) => ({
  padding: '4px 8px',
  background: bg,
  color: color,
  borderRadius: '6px',
  fontSize: '11px',
  fontWeight: '700',
});

const tagStyle = {
  padding: "2px 6px",
  background: "#f1f5f9",
  color: "#475569",
  borderRadius: "4px",
  fontSize: "11px",
  fontWeight: "500"
};

const downloadBtnStyle = {
  background: "#3b82f6",
  color: "white",
  border: "none",
  padding: "6px 12px",
  borderRadius: "6px",
  fontSize: "12px",
  fontWeight: "600",
  cursor: "pointer"
};

>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)
export default Materials;
