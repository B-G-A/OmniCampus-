import React, { useState, useEffect, useContext } from "react";
import AuthContext from "../context/AuthContext";
import api from "../utils/api";

function AdminDashboard() {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("overview");
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

<<<<<<< HEAD
=======
  // Placements state
  const [placementStats, setPlacementStats] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [compName, setCompName] = useState("");
  const [compWebsite, setCompWebsite] = useState("");
  const [compDesc, setCompDesc] = useState("");
  const [compMinCGPA, setCompMinCGPA] = useState("7.0");
  const [compBranches, setCompBranches] = useState("CSE,ECE,EEE");
  const [submittingCompany, setSubmittingCompany] = useState(false);

>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)
  // User form state
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState("student");
  const [studentCGPA, setStudentCGPA] = useState("8.0");
  const [studentDept, setStudentDept] = useState("CSE");
  const [submittingUser, setSubmittingUser] = useState(false);

  // Course form state
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [courseDesc, setCourseDesc] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [courseColor, setCourseColor] = useState("#4F46E5");
  const [submittingCourse, setSubmittingCourse] = useState(false);

  // System Settings state
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [apiLogsEnabled, setApiLogsEnabled] = useState(true);

  const loadAdminData = async () => {
    setLoading(true);
    try {
<<<<<<< HEAD
      const [analyticsRes, usersRes, semRes] = await Promise.all([
        api.get("/admin/analytics"),
        api.get("/admin/users"),
        api.get("/semesters")
=======
      const [analyticsRes, usersRes, semRes, placementStatsRes, compRes] = await Promise.all([
        api.get("/admin/analytics"),
        api.get("/admin/users"),
        api.get("/semesters"),
        api.get("/placement/dashboard"),
        api.get("/placement/companies")
>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)
      ]);
      if (analyticsRes && analyticsRes.success) setAnalytics(analyticsRes.data);
      if (usersRes && usersRes.success) {
        setUsers(usersRes.data);
        // Extract teachers for course creation dropdown
        const teacherList = usersRes.data.filter(u => u.role === "teacher");
        setTeachers(teacherList);
        if (teacherList.length > 0) setSelectedTeacher(teacherList[0]._id);
      }
      if (semRes && semRes.success) {
        setSemesters(semRes.data);
        if (semRes.data.length > 0) setSelectedSemester(semRes.data[0]._id);
      }
<<<<<<< HEAD
=======
      if (placementStatsRes && placementStatsRes.success) setPlacementStats(placementStatsRes.data);
      if (compRes && compRes.success) setCompanies(compRes.data);
>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)
    } catch (err) {
      console.error("Failed to load admin metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!userName.trim() || !userEmail.trim() || !userPassword.trim() || !userRole) return;
    setSubmittingUser(true);
    try {
      const payload = {
        name: userName,
        email: userEmail.toLowerCase(),
        password: userPassword,
        role: userRole
      };

      if (userRole === "student") {
        payload.cgpa = parseFloat(studentCGPA);
        payload.department = studentDept;
        payload.attendance = 85; // Default attendance
      }

      const res = await api.post("/admin/users", payload);
      if (res && res.success) {
        alert(`${userRole.toUpperCase()} user account created successfully!`);
        setUserName("");
        setUserEmail("");
        setUserPassword("");
        loadAdminData();
      }
    } catch (err) {
      alert(err.message || "Failed to create user account.");
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleDeleteUser = async (userId, name) => {
    if (!window.confirm(`Are you sure you want to delete user: ${name}?`)) return;
    try {
      const res = await api.delete(`/admin/users/${userId}`);
      if (res && res.success) {
        alert("User account deleted successfully!");
        loadAdminData();
      }
    } catch (err) {
      alert(err.message || "Failed to delete user.");
    }
  };

  const handleAddCourse = async (e) => {
    e.preventDefault();
    if (!courseName.trim() || !courseCode.trim() || !selectedSemester || !selectedTeacher) {
      alert("Please check that semester and teacher values are selected.");
      return;
    }
    setSubmittingCourse(true);
    try {
      const res = await api.post("/subjects", {
        name: courseName,
        code: courseCode,
        description: courseDesc,
        semester: selectedSemester,
        teacher: selectedTeacher,
        bannerColor: courseColor
      });
      if (res && res.success) {
        alert(`Course ${courseCode} successfully assigned and created!`);
        setCourseName("");
        setCourseCode("");
        setCourseDesc("");
        loadAdminData();
      }
    } catch (err) {
      alert(err.message || "Failed to create subject course.");
    } finally {
      setSubmittingCourse(false);
    }
  };

<<<<<<< HEAD
=======
  const handleAddCompany = async (e) => {
    e.preventDefault();
    if (!compName.trim()) return;
    setSubmittingCompany(true);
    try {
      const payload = {
        name: compName,
        website: compWebsite,
        description: compDesc,
        eligibility: {
          minCGPA: parseFloat(compMinCGPA),
          allowedBranches: compBranches.split(",").map(s => s.trim())
        }
      };
      const res = await api.post("/placement/companies", payload);
      if (res && res.success) {
        alert("Company profile added successfully!");
        setCompName("");
        setCompWebsite("");
        setCompDesc("");
        loadAdminData();
      }
    } catch (err) {
      alert(err.message || "Failed to add company.");
    } finally {
      setSubmittingCompany(false);
    }
  };

>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)
  if (loading) {
    return <div className="main"><h3>Loading central administration metrics...</h3></div>;
  }

  return (
    <div className="main" style={mainStyle}>
      {/* Header */}
      <header style={headerStyle}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: "800", color: "#1e293b", margin: 0 }}>
            System Administration Portal 👋
          </h1>
          <p style={{ color: "#64748b", margin: "4px 0 0 0", fontSize: "14px" }}>
            Superuser privileges. Register accounts, configure semesters, audit databases, and configure settings.
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div style={tabsRowStyle}>
        <button onClick={() => setActiveTab("overview")} style={activeTab === "overview" ? activeTabStyle : tabStyle}>
          📊 Analytics Dashboard
        </button>
        <button onClick={() => setActiveTab("users")} style={activeTab === "users" ? activeTabStyle : tabStyle}>
          👥 Manage User Database
        </button>
        <button onClick={() => setActiveTab("courses")} style={activeTab === "courses" ? activeTabStyle : tabStyle}>
          📚 Manage Courses
        </button>
<<<<<<< HEAD
        <button onClick={() => setActiveTab("departments")} style={activeTab === "departments" ? activeTabStyle : tabStyle}>
          🏫 Manage Departments
        </button>
        <button onClick={() => setActiveTab("settings")} style={activeTab === "settings" ? activeTabStyle : tabStyle}>
          ⚙️ System Settings
=======
        <button onClick={() => setActiveTab("placements")} style={activeTab === "placements" ? activeTabStyle : tabStyle}>
          💼 Placements
        </button>
        <button onClick={() => setActiveTab("departments")} style={activeTab === "departments" ? activeTabStyle : tabStyle}>
          🏫 Departments
        </button>
        <button onClick={() => setActiveTab("settings")} style={activeTab === "settings" ? activeTabStyle : tabStyle}>
          ⚙️ Settings
>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div>
          <div style={statsGridStyle}>
            <div style={statCardStyle("linear-gradient(135deg, #1e293b 0%, #0f172a 100%)")}>
              <small>Registered Students</small>
              <h3>{analytics?.counts?.students || 0}</h3>
              <p>Active student database</p>
            </div>
            <div style={statCardStyle("linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)")}>
              <small>Faculty Members</small>
              <h3>{analytics?.counts?.teachers || 0}</h3>
              <p>Registered teaching faculty</p>
            </div>
            <div style={statCardStyle("linear-gradient(135deg, #10b981 0%, #059669 100%)")}>
              <small>Placement Officers</small>
              <h3>{analytics?.counts?.tpos || 0}</h3>
              <p>Placement coordinators</p>
            </div>
            <div style={statCardStyle("linear-gradient(135deg, #f59e0b 0%, #d97706 100%)")}>
              <small>Campus Courses</small>
              <h3>{analytics?.counts?.courses || 0}</h3>
              <p>Curriculum courses registered</p>
            </div>
<<<<<<< HEAD
=======
            <div style={statCardStyle("linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)")}>
              <small>Indexed Materials</small>
              <h3>{analytics?.counts?.materials || 0}</h3>
              <p>Documents in Vector DB</p>
            </div>
            <div style={statCardStyle("linear-gradient(135deg, #ec4899 0%, #be185d 100%)")}>
              <small>Resume Scans</small>
              <h3>{analytics?.counts?.resumeAnalyses || 0}</h3>
              <p>AI ATS analyses performed</p>
            </div>
>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)
          </div>

          <div style={detailsGridStyle}>
            <div style={detailsBlockStyle}>
              <h4 style={{ margin: "0 0 12px 0", color: "#334155", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>📊 Academic Placement Success Rate</h4>
              <div style={{ display: "flex", alignItems: "center", gap: "15px", marginTop: "20px" }}>
                <div style={{ ...progressOuterStyle, height: '14px' }}>
                  <div style={progressInnerStyle(analytics?.placementRate || 57.8)}></div>
                </div>
                <strong style={{ fontSize: "20px", color: "#1e293b" }}>{analytics?.placementRate || 57.8}%</strong>
              </div>
              <p style={{ color: "#64748b", fontSize: "13px", marginTop: "12px" }}>
                Proportion of placed students against total student registration database.
              </p>
            </div>

            <div style={detailsBlockStyle}>
              <h4 style={{ margin: "0 0 12px 0", color: "#334155", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>🖥️ System Status Check</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                <div style={activityItemStyle}>
                  <strong>API Gateway Server</strong>
                  <span style={badgeStyle('#d1fae5', '#065f46')}>Online ✅</span>
                </div>
                <div style={activityItemStyle}>
                  <strong>MongoDB Server</strong>
                  <span style={badgeStyle('#d1fae5', '#065f46')}>Connected ✅</span>
                </div>
                <div style={activityItemStyle}>
                  <strong>FastAPI AI Service</strong>
                  <span style={badgeStyle('#fee2e2', '#991b1b')}>Offline ❌</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Users Tab */}
      {activeTab === "users" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "20px" }}>
          <div style={detailsBlockStyle}>
            <h3 style={{ marginTop: 0, color: "#1e293b" }}>Register New User</h3>
            <form onSubmit={handleAddUser}>
              <div style={{ marginBottom: '10px' }}>
                <label style={formLabelStyle}>Account Role Privilege</label>
                <select value={userRole} onChange={(e) => setUserRole(e.target.value)} style={formInputStyle}>
                  <option value="student">🧑‍🎓 Student</option>
                  <option value="teacher">👩‍🏫 Teacher / Faculty</option>
                  <option value="tpo">💼 TPO / Placement Officer</option>
                  <option value="admin">🛡️ System Administrator</option>
                </select>
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={formLabelStyle}>Full Name</label>
                <input type="text" placeholder="Abhishna" value={userName} onChange={(e) => setUserName(e.target.value)} required style={formInputStyle} />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={formLabelStyle}>Official Email</label>
                <input type="email" placeholder="student@college.com" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} required style={formInputStyle} />
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={formLabelStyle}>System Password</label>
                <input type="password" placeholder="••••••••" value={userPassword} onChange={(e) => setUserPassword(e.target.value)} required style={formInputStyle} />
              </div>

              {userRole === "student" && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '15px' }}>
                  <div>
                    <label style={formLabelStyle}>CGPA</label>
                    <input type="number" step="0.01" min="0" max="10" value={studentCGPA} onChange={(e) => setStudentCGPA(e.target.value)} required style={formInputStyle} />
                  </div>
                  <div>
                    <label style={formLabelStyle}>Department</label>
                    <select value={studentDept} onChange={(e) => setStudentDept(e.target.value)} style={formInputStyle}>
                      <option value="CSE">CSE</option>
                      <option value="ECE">ECE</option>
                      <option value="EEE">EEE</option>
                      <option value="ME">ME</option>
                    </select>
                  </div>
                </div>
              )}

              <button type="submit" disabled={submittingUser} style={saveBtnStyle}>
                {submittingUser ? "Creating Account..." : "Create Account"}
              </button>
            </form>
          </div>

          <div style={detailsBlockStyle}>
            <h3 style={{ marginTop: 0, color: "#1e293b" }}>Users Registration Logs</h3>
            <div style={{ overflowY: 'auto', maxHeight: '500px' }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Role</th>
                    <th style={thStyle}>Email</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={tdStyle}>{u.name}</td>
                      <td style={tdStyle}><span style={badgeStyle(u.role === 'admin' ? '#fee2e2' : u.role === 'tpo' ? '#f3e8ff' : u.role === 'teacher' ? '#e0f2fe' : '#d1fae5', u.role === 'admin' ? '#991b1b' : u.role === 'tpo' ? '#6b21a8' : u.role === 'teacher' ? '#0369a1' : '#065f46')}>{u.role}</span></td>
                      <td style={tdStyle}>{u.email}</td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <button
                          onClick={() => handleDeleteUser(u._id, u.name)}
                          disabled={u._id === user.id}
                          style={u._id === user.id ? disabledDeleteBtnStyle : deleteBtnStyle}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Manage Courses Tab */}
      {activeTab === "courses" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div style={detailsBlockStyle}>
            <h3 style={{ marginTop: 0, color: "#1e293b" }}>Establish Course/Subject</h3>
            <form onSubmit={handleAddCourse}>
              <div style={{ marginBottom: '12px' }}>
                <label style={formLabelStyle}>Course Subject Name</label>
                <input type="text" placeholder="e.g. Cryptography" value={courseName} onChange={(e) => setCourseName(e.target.value)} required style={formInputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={formLabelStyle}>Unique Course Code</label>
                  <input type="text" placeholder="CS-405" value={courseCode} onChange={(e) => setCourseCode(e.target.value)} required style={formInputStyle} />
                </div>
                <div>
                  <label style={formLabelStyle}>Banner Theme Color</label>
                  <select value={courseColor} onChange={(e) => setCourseColor(e.target.value)} style={formInputStyle}>
                    <option value="#4F46E5">Indigo</option>
                    <option value="#10B981">Green</option>
                    <option value="#EF4444">Red</option>
                    <option value="#F59E0B">Amber</option>
                    <option value="#6B7280">Gray</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={formLabelStyle}>Select Semester</label>
                <select value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)} required style={formInputStyle}>
                  {semesters.map(sem => (
                    <option key={sem._id} value={sem._id}>{sem.name} ({sem.year})</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={formLabelStyle}>Assign Teaching Faculty</label>
                <select value={selectedTeacher} onChange={(e) => setSelectedTeacher(e.target.value)} required style={formInputStyle}>
                  {teachers.map(t => (
                    <option key={t._id} value={t._id}>{t.name} ({t.email})</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={formLabelStyle}>Course Syllabus description</label>
                <textarea placeholder="Describe course scope, chapters, goals..." value={courseDesc} onChange={(e) => setCourseDesc(e.target.value)} style={{ ...formInputStyle, height: '60px', resize: 'none' }} />
              </div>
              <button type="submit" disabled={submittingCourse} style={saveBtnStyle}>
                {submittingCourse ? "Baking Course..." : "Create Course"}
              </button>
            </form>
          </div>

          <div style={detailsBlockStyle}>
            <h3 style={{ marginTop: 0, color: "#1e293b" }}>Registered Semesters</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {semesters.map(sem => (
                <div key={sem._id} style={activityItemStyle}>
                  <div>
                    <strong style={{ fontSize: '14px', color: '#1e293b' }}>{sem.name} (Year {sem.year})</strong>
                    <small style={{ display: 'block', color: '#64748b', marginTop: '2px' }}>Chroma Collection: {sem.vectorCollectionName}</small>
                  </div>
                  <span style={badgeStyle(sem.isActive ? '#d1fae5' : '#e2e8f0', sem.isActive ? '#065f46' : '#64748b')}>{sem.isActive ? 'Active' : 'Archived'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

<<<<<<< HEAD
=======
      {/* Placements Tab */}
      {activeTab === "placements" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div style={detailsBlockStyle}>
            <h3 style={{ marginTop: 0, color: "#1e293b" }}>Placement Overview</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
              <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <small style={{ color: '#64748b' }}>Total Companies</small>
                <h3 style={{ margin: '5px 0 0 0', color: '#1e293b', fontSize: '24px' }}>{placementStats?.totalCompanies || 0}</h3>
              </div>
              <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <small style={{ color: '#64748b' }}>Total Placed</small>
                <h3 style={{ margin: '5px 0 0 0', color: '#10b981', fontSize: '24px' }}>{placementStats?.totalPlaced || 0}</h3>
              </div>
              <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <small style={{ color: '#64748b' }}>Highest Package</small>
                <h3 style={{ margin: '5px 0 0 0', color: '#3b82f6', fontSize: '24px' }}>{placementStats?.maxPackage || 0} LPA</h3>
              </div>
              <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <small style={{ color: '#64748b' }}>Avg Package</small>
                <h3 style={{ margin: '5px 0 0 0', color: '#f59e0b', fontSize: '24px' }}>{placementStats?.avgPackage || 0} LPA</h3>
              </div>
            </div>

            <h3 style={{ color: "#1e293b" }}>Add New Company</h3>
            <form onSubmit={handleAddCompany}>
              <div style={{ marginBottom: '10px' }}>
                <label style={formLabelStyle}>Company Name</label>
                <input type="text" placeholder="e.g. Google" value={compName} onChange={(e) => setCompName(e.target.value)} required style={formInputStyle} />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={formLabelStyle}>Website</label>
                <input type="text" placeholder="https://careers.google.com" value={compWebsite} onChange={(e) => setCompWebsite(e.target.value)} style={formInputStyle} />
              </div>
              <div style={{ marginBottom: '10px' }}>
                <label style={formLabelStyle}>Description</label>
                <textarea placeholder="Global tech leader..." value={compDesc} onChange={(e) => setCompDesc(e.target.value)} style={{ ...formInputStyle, height: '60px', resize: 'none' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                <div>
                  <label style={formLabelStyle}>Min CGPA</label>
                  <input type="number" step="0.1" value={compMinCGPA} onChange={(e) => setCompMinCGPA(e.target.value)} style={formInputStyle} />
                </div>
                <div>
                  <label style={formLabelStyle}>Allowed Branches</label>
                  <input type="text" placeholder="CSE, ECE" value={compBranches} onChange={(e) => setCompBranches(e.target.value)} style={formInputStyle} />
                </div>
              </div>
              <button type="submit" disabled={submittingCompany} style={saveBtnStyle}>
                {submittingCompany ? "Adding..." : "Add Company"}
              </button>
            </form>
          </div>

          <div style={detailsBlockStyle}>
            <h3 style={{ marginTop: 0, color: "#1e293b" }}>Registered Companies</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto' }}>
              {companies.map(comp => (
                <div key={comp._id} style={{ padding: '15px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                  <h4 style={{ margin: '0 0 5px 0', color: '#1e293b' }}>{comp.name}</h4>
                  <small style={{ color: '#64748b', display: 'block', marginBottom: '8px' }}>{comp.website}</small>
                  <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>Min CGPA: {comp.eligibility?.minCGPA || 'N/A'} • Branches: {comp.eligibility?.allowedBranches?.join(', ') || 'All'}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)
      {/* Manage Departments Tab */}
      {activeTab === "departments" && (
        <div style={detailsBlockStyle}>
          <h3 style={{ marginTop: 0, color: "#1e293b" }}>Academic Departments</h3>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>Track headcounts and statistics across campus departments.</p>
          <div style={deptGridStyle}>
            <div style={deptCardStyle}>
              <h4>Computer Science (CSE)</h4>
              <p>Students: 120 • Faculty: 14</p>
              <span style={badgeStyle('#d1fae5', '#065f46')}>Highest Placement Rate</span>
            </div>
            <div style={deptCardStyle}>
              <h4>Electronics & Comm (ECE)</h4>
              <p>Students: 85 • Faculty: 10</p>
              <span style={badgeStyle('#e0f2fe', '#0369a1')}>Active Lab Research</span>
            </div>
            <div style={deptCardStyle}>
              <h4>Electrical & Elec (EEE)</h4>
              <p>Students: 60 • Faculty: 8</p>
              <span style={badgeStyle('#f3e8ff', '#6b21a8')}>Robotics Club Partner</span>
            </div>
            <div style={deptCardStyle}>
              <h4>Mechanical Eng (ME)</h4>
              <p>Students: 55 • Faculty: 7</p>
              <span style={badgeStyle('#e2e8f0', '#475569')}>Design Workshop</span>
            </div>
          </div>
        </div>
      )}

      {/* System Settings Tab */}
      {activeTab === "settings" && (
        <div style={detailsBlockStyle}>
          <h3 style={{ marginTop: 0, color: "#1e293b" }}>System Control Panel</h3>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>Admin config switches. Toggle maintenance screens and logs levels.</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '450px' }}>
            <div style={settingItemStyle}>
              <div>
                <strong>Global Maintenance Mode</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>Render offline warning banner to students/teachers.</p>
              </div>
              <input type="checkbox" checked={maintenanceMode} onChange={() => setMaintenanceMode(!maintenanceMode)} style={toggleStyle} />
            </div>

            <div style={settingItemStyle}>
              <div>
                <strong>API Request Logging</strong>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>Store server-side request audit histories.</p>
              </div>
              <input type="checkbox" checked={apiLogsEnabled} onChange={() => setApiLogsEnabled(!apiLogsEnabled)} style={toggleStyle} />
            </div>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px', marginTop: '10px' }}>
              <button onClick={() => alert("Full MongoDB database dump archived to backup storage.")} style={backupBtnStyle}>Backup Database Now</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline Styles
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
  background: "#fee2e2",
  color: "#991b1b"
};

const statsGridStyle = {
  display: "grid",
<<<<<<< HEAD
  gridTemplateColumns: "repeat(4, 1fr)",
=======
  gridTemplateColumns: "repeat(3, 1fr)",
>>>>>>> c6bda4a (Fix AI resume parsing normalization and chat fallback message, add features)
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
  gridTemplateColumns: "1.2fr 0.8fr",
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
  background: '#ef4444',
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
  background: '#991b1b',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontWeight: '600',
  cursor: 'pointer',
  boxShadow: '0 4px 6px -1px rgba(153, 27, 27, 0.2)'
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

const deleteBtnStyle = {
  padding: '4px 8px',
  background: '#fee2e2',
  color: '#ef4444',
  border: '1px solid #fca5a5',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: '600'
};

const disabledDeleteBtnStyle = {
  ...deleteBtnStyle,
  background: '#e2e8f0',
  color: '#94a3b8',
  border: '1px solid #cbd5e1',
  cursor: 'not-allowed'
};

const deptGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: '15px',
  marginTop: '10px'
};

const deptCardStyle = {
  padding: '20px',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '12px'
};

const settingItemStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '16px',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '12px'
};

const toggleStyle = {
  width: '40px',
  height: '20px',
  cursor: 'pointer'
};

const backupBtnStyle = {
  padding: '10px 16px',
  background: '#334155',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontWeight: '600',
  cursor: 'pointer'
};

export default AdminDashboard;
