import React, { useState, useEffect, useContext } from "react";
import AuthContext from "../context/AuthContext";
import api from "../utils/api";

function TpoDashboard() {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("overview");
  const [dashboardStats, setDashboardStats] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Company Form State
  const [compName, setCompName] = useState("");
  const [compWebsite, setCompWebsite] = useState("");
  const [compDesc, setCompDesc] = useState("");
  const [compCGPA, setCompCGPA] = useState(6.0);
  const [compBranches, setCompBranches] = useState("CSE, ECE, EEE");
  const [compRole, setCompRole] = useState("");
  const [compPackage, setCompPackage] = useState("");

  // Upload Result Form State
  const [resCompany, setResCompany] = useState("");
  const [resStudentName, setResStudentName] = useState("");
  const [resStudentEmail, setResStudentEmail] = useState("");
  const [resDept, setResDept] = useState("CSE");
  const [resPackage, setResPackage] = useState("");

  // Filter Students State
  const [cgpaFilter, setCgpaFilter] = useState(8.0);
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [filteredStudents, setFilteredStudents] = useState([]);

  // Mock Drives
  const drives = [
    { id: 1, name: "Google", date: "June 18, 2026", status: "Confirmed" },
    { id: 2, name: "Microsoft", date: "June 22, 2026", status: "Confirmed" },
    { id: 3, name: "TCS", date: "July 01, 2026", status: "Scheduled" }
  ];

  // Fetch Dashboard Stats and Companies
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [statsRes, compRes] = await Promise.all([
        api.get("/placement/dashboard"),
        api.get("/placement/companies")
      ]);
      if (statsRes && statsRes.success) setDashboardStats(statsRes.data);
      if (compRes && compRes.success) {
        setCompanies(compRes.data);
        if (compRes.data.length > 0) {
          setResCompany(compRes.data[0]._id);
        }
      }
    } catch (err) {
      console.error("Failed to load TPO dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Filter student lists dynamically
  useEffect(() => {
    const filterHeadcount = async () => {
      try {
        const res = await api.get("/admin/users?role=student");
        if (res && res.success) {
          const matched = res.data.filter(s => {
            const cgpaOk = s.cgpa >= cgpaFilter;
            const deptOk = deptFilter === "ALL" || s.department === deptFilter;
            return cgpaOk && deptOk;
          });
          setFilteredStudents(matched);
        }
      } catch (err) {
        console.error(err);
      }
    };
    filterHeadcount();
  }, [cgpaFilter, deptFilter]);

  const handleAddCompany = async (e) => {
    e.preventDefault();
    if (!compName.trim() || !compRole.trim() || !compPackage) return;
    try {
      const branchesArray = compBranches.split(",").map(b => b.trim().toUpperCase());
      const res = await api.post("/placement/companies", {
        name: compName,
        website: compWebsite,
        description: compDesc,
        eligibility: {
          minCGPA: parseFloat(compCGPA),
          allowedBranches: branchesArray
        },
        rolesOffered: [
          { title: compRole, packageLPA: parseFloat(compPackage), description: "Core technical development role." }
        ],
        recruitmentProcess: ["Online Coding Test", "Technical Interview", "HR Fitment"],
        visitedYears: [2026]
      });
      if (res && res.success) {
        alert("Company recruitment drive added successfully!");
        setCompName("");
        setCompWebsite("");
        setCompDesc("");
        setCompRole("");
        setCompPackage("");
        loadDashboardData();
      }
    } catch (err) {
      alert(err.message || "Failed to add company.");
    }
  };

  const handleUploadResult = async (e) => {
    e.preventDefault();
    if (!resCompany || !resStudentName.trim() || !resStudentEmail.trim() || !resPackage) return;
    try {
      const res = await api.post("/placement/records", {
        companyId: resCompany,
        studentName: resStudentName,
        studentEmail: resStudentEmail.toLowerCase(),
        department: resDept,
        year: 2026,
        packageLPA: parseFloat(resPackage)
      });
      if (res && res.success) {
        alert(`Placement record created for ${resStudentName}!`);
        setResStudentName("");
        setResStudentEmail("");
        setResPackage("");
        loadDashboardData();
      }
    } catch (err) {
      alert(err.message || "Failed to log placement result.");
    }
  };

  if (loading) {
    return <div className="main"><h3>Loading placement coordinator metrics...</h3></div>;
  }

  return (
    <div className="main" style={mainStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: "800", color: "#1e293b", margin: 0 }}>
            TPO Officer Portal 👋
          </h1>
          <p style={{ color: "#64748b", margin: "4px 0 0 0", fontSize: "14px" }}>
            Review company recruitment schedules, student eligibility stats, and manage placement logs.
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div style={tabsRowStyle}>
        <button onClick={() => setActiveTab("overview")} style={activeTab === "overview" ? activeTabStyle : tabStyle}>
          📊 Analytics Overview
        </button>
        <button onClick={() => setActiveTab("companies")} style={activeTab === "companies" ? activeTabStyle : tabStyle}>
          🏢 Recruiting Companies
        </button>
        <button onClick={() => setActiveTab("drives")} style={activeTab === "drives" ? activeTabStyle : tabStyle}>
          📅 Drive Calendars
        </button>
        <button onClick={() => setActiveTab("eligible")} style={activeTab === "eligible" ? activeTabStyle : tabStyle}>
          🧑‍🎓 Check Eligibility
        </button>
        <button onClick={() => setActiveTab("results")} style={activeTab === "results" ? activeTabStyle : tabStyle}>
          🏆 Log Placement Results
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div>
          <div style={statsGridStyle}>
            <div style={statCardStyle("linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)")}>
              <small>Placement Rate</small>
              <h3>57.8%</h3>
              <p>Overall selections rate</p>
            </div>
            <div style={statCardStyle("linear-gradient(135deg, #10b981 0%, #047857 100%)")}>
              <small>Placed Headcount</small>
              <h3>{dashboardStats?.totalPlaced || 185}</h3>
              <p>Students with offers</p>
            </div>
            <div style={statCardStyle("linear-gradient(135deg, #f59e0b 0%, #d97706 100%)")}>
              <small>Eligible Students</small>
              <h3>320</h3>
              <p>Batch size on record</p>
            </div>
            <div style={statCardStyle("linear-gradient(135deg, #ec4899 0%, #be185d 100%)")}>
              <small>Recruiters Visited</small>
              <h3>{dashboardStats?.totalCompanies || 4}</h3>
              <p>Active organization partners</p>
            </div>
          </div>

          <div style={detailsGridStyle}>
            <div style={detailsBlockStyle}>
              <h4 style={{ margin: "0 0 12px 0", color: "#334155", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>📈 Selections breakdown by Department</h4>
              {dashboardStats?.deptStats?.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '13px' }}>No stats to show.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
                  {dashboardStats?.deptStats?.map(d => (
                    <div key={d.department}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
                        <span>{d.department} ({d.selectionsCount} placed)</span>
                        <span>Avg Package: {d.avgPackage} LPA</span>
                      </div>
                      <div style={progressOuterStyle}>
                        <div style={progressInnerStyle((d.selectionsCount / 10) * 100)}></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={detailsBlockStyle}>
              <h4 style={{ margin: "0 0 12px 0", color: "#334155", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>💼 Top Performing Recruiters</h4>
              {dashboardStats?.companySelections?.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '13px' }}>No stats to show.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                  {dashboardStats?.companySelections?.map((c, idx) => (
                    <div key={idx} style={activityItemStyle}>
                      <div>
                        <strong style={{ display: 'block', fontSize: '14px', color: '#1e293b' }}>{c.name}</strong>
                        <small style={{ color: '#64748b' }}>Offers extended during drive</small>
                      </div>
                      <span style={badgeStyle('#d1fae5', '#065f46')}>{c.selectionsCount} Hired</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Companies Tab */}
      {activeTab === "companies" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div style={detailsBlockStyle}>
            <h3 style={{ marginTop: 0, color: "#1e293b" }}>Register New Partner</h3>
            <form onSubmit={handleAddCompany}>
              <div style={{ marginBottom: '12px' }}>
                <label style={formLabelStyle}>Company Name</label>
                <input type="text" placeholder="e.g. Amazon" value={compName} onChange={(e) => setCompName(e.target.value)} required style={formInputStyle} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={formLabelStyle}>Recruitment Website</label>
                <input type="url" placeholder="https://careers.amazon.com" value={compWebsite} onChange={(e) => setCompWebsite(e.target.value)} style={formInputStyle} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={formLabelStyle}>Minimum CGPA Cutoff</label>
                <input type="number" step="0.01" min="0" max="10" value={compCGPA} onChange={(e) => setCompCGPA(e.target.value)} required style={formInputStyle} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={formLabelStyle}>Eligible Branches (Comma Separated)</label>
                <input type="text" placeholder="CSE, ECE, EEE" value={compBranches} onChange={(e) => setCompBranches(e.target.value)} required style={formInputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={formLabelStyle}>Role Title</label>
                  <input type="text" placeholder="Software Engineer" value={compRole} onChange={(e) => setCompRole(e.target.value)} required style={formInputStyle} />
                </div>
                <div>
                  <label style={formLabelStyle}>Salary Package (LPA)</label>
                  <input type="number" step="0.1" placeholder="32" value={compPackage} onChange={(e) => setCompPackage(e.target.value)} required style={formInputStyle} />
                </div>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={formLabelStyle}>Brief Profile Description</label>
                <textarea placeholder="Tell us about the company operations and domain..." value={compDesc} onChange={(e) => setCompDesc(e.target.value)} style={{ ...formInputStyle, height: '60px', resize: 'none' }} />
              </div>
              <button type="submit" style={saveBtnStyle}>Add Drive Target</button>
            </form>
          </div>

          <div style={detailsBlockStyle}>
            <h3 style={{ marginTop: 0, color: "#1e293b" }}>Partner Organizations</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '500px', overflowY: 'auto' }}>
              {companies.map(comp => (
                <div key={comp._id} style={companyBlockStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ fontSize: '15px', color: '#1e293b' }}>{comp.name}</strong>
                    <a href={comp.website} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#3b82f6', textDecoration: 'none' }}>Website ↗</a>
                  </div>
                  <p style={{ margin: '6px 0', fontSize: '12px', color: '#64748b' }}>{comp.description}</p>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    <span style={badgeStyle('#e0f2fe', '#0369a1')}>Min CGPA: {comp.eligibility?.minCGPA}</span>
                    <span style={badgeStyle('#f3e8ff', '#6b21a8')}>Branches: {comp.eligibility?.allowedBranches?.join(', ')}</span>
                    <span style={badgeStyle('#ecfdf5', '#047857')}>Package: {comp.rolesOffered?.map(r => `${r.packageLPA} LPA`).join(', ')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Drives Calendar Tab */}
      {activeTab === "drives" && (
        <div style={detailsBlockStyle}>
          <h3 style={{ marginTop: 0, color: "#1e293b" }}>Scheduled Campus Drives</h3>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>List of upcoming recruitment events and execution schedules.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {drives.map(drive => (
              <div key={drive.id} style={activityItemStyle}>
                <div>
                  <strong style={{ fontSize: '15px', color: '#1e293b' }}>{drive.name} Recruitment Drive 2026</strong>
                  <small style={{ display: 'block', color: '#64748b', marginTop: '2px' }}>All online coding sessions and interviews</small>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ display: 'block', color: '#1e293b', fontSize: '14px' }}>{drive.date}</strong>
                  <span style={badgeStyle('#e0f2fe', '#0369a1')}>{drive.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Eligible Students Tab */}
      {activeTab === "eligible" && (
        <div style={detailsBlockStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ margin: 0, color: "#1e293b" }}>Student Drive Eligibility Filter</h3>
            <div style={{ display: 'flex', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>CGPA Cutoff: </label>
                <input type="number" step="0.1" min="0" max="10" value={cgpaFilter} onChange={(e) => setCgpaFilter(parseFloat(e.target.value) || 0)} style={{ ...selectBoxStyle, width: '60px' }} />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>Department: </label>
                <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} style={selectBoxStyle}>
                  <option value="ALL">ALL</option>
                  <option value="CSE">CSE</option>
                  <option value="ECE">ECE</option>
                  <option value="EEE">EEE</option>
                  <option value="ME">ME</option>
                </select>
              </div>
            </div>
          </div>

          <table style={tableStyle}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={thStyle}>Student Name</th>
                <th style={thStyle}>Roll / Email</th>
                <th style={thStyle}>Department</th>
                <th style={thStyle}>CGPA</th>
                <th style={thStyle}>Readiness</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ ...tdStyle, textAlign: 'center', padding: '30px 0', color: '#94a3b8' }}>No students match these criteria.</td>
                </tr>
              ) : (
                filteredStudents.map(student => (
                  <tr key={student._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={tdStyle}>{student.name}</td>
                    <td style={tdStyle}>{student.email}</td>
                    <td style={tdStyle}>{student.department || 'CSE'}</td>
                    <td style={{ ...tdStyle, fontWeight: '700', color: '#1e3a8a' }}>{student.cgpa || '8.0'}</td>
                    <td style={tdStyle}>{student.placementReadiness || '75'}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Log Results Tab */}
      {activeTab === "results" && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={detailsBlockStyle}>
            <h3 style={{ marginTop: 0, color: "#1e293b" }}>Register Offer</h3>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '20px' }}>Create official database records for student job offer achievements.</p>
            <form onSubmit={handleUploadResult}>
              <div style={{ marginBottom: '12px' }}>
                <label style={formLabelStyle}>Select Company</label>
                <select value={resCompany} onChange={(e) => setResCompany(e.target.value)} required style={formInputStyle}>
                  {companies.map(c => (
                    <option key={c._id} value={c._id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={formLabelStyle}>Student Name</label>
                <input type="text" placeholder="Abhishna" value={resStudentName} onChange={(e) => setResStudentName(e.target.value)} required style={formInputStyle} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={formLabelStyle}>Student Email</label>
                <input type="email" placeholder="student@college.com" value={resStudentEmail} onChange={(e) => setResStudentEmail(e.target.value)} required style={formInputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                <div>
                  <label style={formLabelStyle}>Department</label>
                  <select value={resDept} onChange={(e) => setResDept(e.target.value)} style={formInputStyle}>
                    <option value="CSE">CSE</option>
                    <option value="ECE">ECE</option>
                    <option value="EEE">EEE</option>
                    <option value="ME">ME</option>
                  </select>
                </div>
                <div>
                  <label style={formLabelStyle}>Package (LPA)</label>
                  <input type="number" step="0.1" placeholder="42" value={resPackage} onChange={(e) => setResPackage(e.target.value)} required style={formInputStyle} />
                </div>
              </div>
              <button type="submit" style={saveBtnStyle}>Log Achievement Offer</button>
            </form>
          </div>

          <div style={detailsBlockStyle}>
            <h3 style={{ marginTop: 0, color: "#1e293b" }}>Log of Recent Selections</h3>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>Offers logged inside database recently.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '450px', overflowY: 'auto' }}>
              {dashboardStats?.companySelections?.length === 0 ? (
                <p style={{ color: '#64748b', fontSize: '13px', textAlign: 'center' }}>No selections logged yet.</p>
              ) : (
                companies.slice(0, 5).map((comp, idx) => (
                  <div key={idx} style={activityItemStyle}>
                    <div>
                      <strong style={{ fontSize: '14px', color: '#1e293b' }}>Recruiter: {comp.name}</strong>
                      <small style={{ display: 'block', color: '#64748b', marginTop: '2px' }}>Drive target selection completed</small>
                    </div>
                    <span style={badgeStyle('#e0f2fe', '#0369a1')}>Active Drive</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const mainStyle = {
  padding: "40px",
  fontFamily: "Inter, system-ui, sans-serif"
};

const headerStyle = {
  marginBottom: "32px"
};

const tabsRowStyle = {
  display: "flex",
  gap: "8px",
  borderBottom: "1px solid #e2e8f0",
  paddingBottom: "12px",
  marginBottom: "24px",
  overflowX: "auto"
};

const tabStyle = {
  padding: "10px 16px",
  background: "transparent",
  border: "none",
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: "600",
  color: "#64748b",
  cursor: "pointer",
  transition: "all 0.2s"
};

const activeTabStyle = {
  ...tabStyle,
  background: "#e0f2fe",
  color: "#0369a1"
};

const statsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: "20px",
  marginBottom: "24px"
};

const statCardStyle = (background) => ({
  background,
  color: "white",
  padding: "24px",
  borderRadius: "16px",
  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
});

const detailsGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "20px"
};

const detailsBlockStyle = {
  background: "white",
  padding: "24px",
  borderRadius: "16px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  border: "1px solid #f1f5f9"
};

const activityItemStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '10px'
};

const progressOuterStyle = {
  flex: 1,
  height: '10px',
  background: '#e2e8f0',
  borderRadius: '5px',
  overflow: 'hidden'
};

const progressInnerStyle = (percentage) => ({
  width: `${Math.min(percentage, 100)}%`,
  height: '100%',
  background: '#10b981',
  borderRadius: '5px'
});

const badgeStyle = (bg, color) => ({
  padding: '2px 8px',
  background: bg,
  color: color,
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: '700',
  whiteSpace: 'nowrap'
});

const formLabelStyle = {
  display: 'block',
  fontSize: '13px',
  fontWeight: '600',
  color: '#475569',
  marginBottom: '6px'
};

const formInputStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  outline: 'none',
  fontSize: '14px',
  boxSizing: 'border-box'
};

const saveBtnStyle = {
  padding: '10px 20px',
  background: '#1e3a8a',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontWeight: '600',
  cursor: 'pointer',
  boxShadow: '0 4px 6px -1px rgba(30, 58, 138, 0.2)'
};

const selectBoxStyle = {
  padding: '6px 12px',
  borderRadius: '8px',
  border: '1px solid #cbd5e1',
  background: '#fff',
  fontWeight: '600',
  color: '#334155',
  marginLeft: '8px',
  outline: 'none'
};

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  textAlign: 'left'
};

const thStyle = {
  padding: '12px 16px',
  fontWeight: '600',
  color: '#475569',
  fontSize: '13px'
};

const tdStyle = {
  padding: '12px 16px',
  fontSize: '14px',
  color: '#334155'
};

const companyBlockStyle = {
  padding: '16px',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '12px'
};

export default TpoDashboard;
