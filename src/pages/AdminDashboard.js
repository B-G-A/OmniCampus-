import React, { useState, useEffect, useContext } from "react";
import AuthContext from "../context/AuthContext";
import api from "../utils/api";

function AdminDashboard() {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("overview");
  const [analytics, setAnalytics] = useState(null);
  const [users, setUsers] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Placements state
  const [placementStats, setPlacementStats] = useState(null);
  const [companies, setCompanies] = useState([]);
  
  // Forms states
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState("student");
  const [studentCGPA, setStudentCGPA] = useState("8.0");
  
  const [courseName, setCourseName] = useState("");
  const [courseCode, setCourseCode] = useState("");
  const [courseDesc, setCourseDesc] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [courseColor, setCourseColor] = useState("#4F46E5");

  const [newSemesterNumber, setNewSemesterNumber] = useState("");
  const [newSemesterYear, setNewSemesterYear] = useState("");

  const [enrollStudentId, setEnrollStudentId] = useState("");
  const [enrollSemesterId, setEnrollSemesterId] = useState("");
  const [assignTeacherId, setAssignTeacherId] = useState("");
  const [assignSubjectId, setAssignSubjectId] = useState("");

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, usersRes, semRes, subRes, placementStatsRes, compRes] = await Promise.all([
        api.get("/admin/analytics"),
        api.get("/admin/users"),
        api.get("/semesters"),
        api.get("/subjects"),
        api.get("/placements/dashboard"),
        api.get("/placements/companies")
      ]);
      if (analyticsRes && analyticsRes.success) setAnalytics(analyticsRes.data);
      if (usersRes && usersRes.success) setUsers(usersRes.data);
      if (semRes && semRes.success) {
        setSemesters(semRes.data);
        if (semRes.data.length > 0) {
          setSelectedSemester(semRes.data[0]._id);
          setEnrollSemesterId(semRes.data[0]._id);
        }
      }
      if (subRes && subRes.success) {
        setSubjects(subRes.data);
        if (subRes.data.length > 0) setAssignSubjectId(subRes.data[0]._id);
      }
      if (placementStatsRes && placementStatsRes.success) setPlacementStats(placementStatsRes.data);
      if (compRes && compRes.success) setCompanies(compRes.data);
    } catch (err) {
      console.error("Failed to load admin metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const students = users.filter(u => u.role === "student");
  const teachers = users.filter(u => u.role === "teacher");

  // On data load, set defaults if empty
  useEffect(() => {
    if (teachers.length > 0 && !selectedTeacher) setSelectedTeacher(teachers[0]._id);
    if (teachers.length > 0 && !assignTeacherId) setAssignTeacherId(teachers[0]._id);
    if (students.length > 0 && !enrollStudentId) setEnrollStudentId(students[0]._id);
  }, [teachers, students]);

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!userName.trim() || !userEmail.trim() || !userPassword.trim() || !userRole) return;
    try {
      const payload = {
        name: userName,
        email: userEmail.toLowerCase(),
        password: userPassword,
        role: userRole
      };
      if (userRole === "student") {
        payload.cgpa = parseFloat(studentCGPA);
        payload.departmentId = null; // Could map department logic here
      }
      const res = await api.post("/admin/users", payload);
      if (res && res.success) {
        alert(`${userRole.toUpperCase()} user account created successfully!`);
        setUserName(""); setUserEmail(""); setUserPassword("");
        loadAdminData();
      }
    } catch (err) {
      alert(err.message || "Failed to create user account.");
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
    if (!courseName.trim() || !courseCode.trim() || !selectedSemester) {
      alert("Please ensure semester is selected.");
      return;
    }
    try {
      const res = await api.post("/subjects", {
        name: courseName,
        code: courseCode,
        description: courseDesc,
        semesterId: selectedSemester,
        teacherId: selectedTeacher || null,
        bannerColor: courseColor
      });
      if (res && res.success) {
        alert(`Course ${courseCode} successfully assigned and created!`);
        setCourseName(""); setCourseCode(""); setCourseDesc("");
        loadAdminData();
      }
    } catch (err) {
      alert(err.message || "Failed to create subject course.");
    }
  };

  const handleAddSemester = async (e) => {
    e.preventDefault();
    if (!newSemesterNumber || !newSemesterYear) return;
    try {
      const res = await api.post("/semesters", {
        semesterNumber: parseInt(newSemesterNumber),
        academicYear: newSemesterYear
      });
      if (res && res.success) {
        alert(`Semester ${newSemesterNumber} created successfully!`);
        setNewSemesterNumber(""); setNewSemesterYear("");
        loadAdminData();
      }
    } catch (err) {
      alert(err.message || "Failed to create semester.");
    }
  };

  const handleEnrollStudent = async (e) => {
    e.preventDefault();
    if (!enrollStudentId || !enrollSemesterId) return;
    try {
      const res = await api.post("/admin/enroll-student", {
        userId: enrollStudentId,
        semesterId: enrollSemesterId
      });
      if (res && res.success) {
        alert("Student enrolled into semester successfully! They have been mapped to all semester subjects.");
      }
    } catch (err) {
      alert(err.message || "Failed to enroll student.");
    }
  };

  const handleAssignTeacher = async (e) => {
    e.preventDefault();
    if (!assignTeacherId || !assignSubjectId) return;
    try {
      const res = await api.post("/admin/assign-teacher", {
        userId: assignTeacherId,
        subjectId: assignSubjectId
      });
      if (res && res.success) {
        alert("Teacher assigned to subject successfully!");
      }
    } catch (err) {
      alert(err.message || "Failed to assign teacher.");
    }
  };

  if (loading) {
    return <div className="main"><h3>Loading central administration metrics...</h3></div>;
  }

  return (
    <div className="main" style={mainStyle}>
      <header style={headerStyle}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: "800", color: "#1e293b", margin: 0 }}>
            System Administration Portal 👋
          </h1>
          <p style={{ color: "#64748b", margin: "4px 0 0 0", fontSize: "14px" }}>
            Superuser privileges. Register accounts, configure semesters, and assign roles dynamically.
          </p>
        </div>
      </header>

      <div style={tabsRowStyle}>
        <button onClick={() => setActiveTab("overview")} style={activeTab === "overview" ? activeTabStyle : tabStyle}>📊 Overview</button>
        <button onClick={() => setActiveTab("students")} style={activeTab === "students" ? activeTabStyle : tabStyle}>🧑‍🎓 Manage Students</button>
        <button onClick={() => setActiveTab("teachers")} style={activeTab === "teachers" ? activeTabStyle : tabStyle}>👩‍🏫 Manage Faculty</button>
        <button onClick={() => setActiveTab("courses")} style={activeTab === "courses" ? activeTabStyle : tabStyle}>📚 Courses & Semesters</button>
        <button onClick={() => setActiveTab("users")} style={activeTab === "users" ? activeTabStyle : tabStyle}>👥 Register Users</button>
      </div>

      {/* OVERVIEW */}
      {activeTab === "overview" && (
        <div style={statsGridStyle}>
          <div style={statCardStyle("linear-gradient(135deg, #1e293b 0%, #0f172a 100%)")}>
            <small>Registered Students</small>
            <h3>{analytics?.counts?.students || students.length}</h3>
          </div>
          <div style={statCardStyle("linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)")}>
            <small>Faculty Members</small>
            <h3>{analytics?.counts?.teachers || teachers.length}</h3>
          </div>
          <div style={statCardStyle("linear-gradient(135deg, #10b981 0%, #059669 100%)")}>
            <small>Campus Courses</small>
            <h3>{analytics?.counts?.courses || subjects.length}</h3>
          </div>
          <div style={statCardStyle("linear-gradient(135deg, #f59e0b 0%, #d97706 100%)")}>
            <small>Placement Rate</small>
            <h3>{analytics?.placementRate || 0}%</h3>
          </div>
        </div>
      )}

      {/* STUDENTS TAB */}
      {activeTab === "students" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px" }}>
          <div style={detailsBlockStyle}>
            <h3 style={{ marginTop: 0, color: "#1e293b" }}>Enroll Student into Semester</h3>
            <p style={{fontSize: "13px", color:"#64748b"}}>Automatically assigns all semester subjects to the student.</p>
            <form onSubmit={handleEnrollStudent}>
              <div style={{ marginBottom: '10px' }}>
                <label style={formLabelStyle}>Select Student</label>
                <select value={enrollStudentId} onChange={(e) => setEnrollStudentId(e.target.value)} style={formInputStyle}>
                  {students.length === 0 && <option value="">-- No Students Available --</option>}
                  {students.map(s => <option key={s._id} value={s._id}>{s.name} ({s.email})</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={formLabelStyle}>Select Semester</label>
                <select value={enrollSemesterId} onChange={(e) => setEnrollSemesterId(e.target.value)} style={formInputStyle}>
                  {semesters.length === 0 && <option value="">-- No Semesters Available --</option>}
                  {semesters.map(s => <option key={s._id} value={s._id}>{s.name} ({s.year})</option>)}
                </select>
              </div>
              <button type="submit" style={saveBtnStyle}>Enroll Student</button>
            </form>
          </div>

          <div style={detailsBlockStyle}>
            <h3 style={{ marginTop: 0, color: "#1e293b" }}>Student Directory</h3>
            <div style={{ overflowY: 'auto', maxHeight: '500px' }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(u => (
                    <tr key={u._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={tdStyle}>{u.name}</td>
                      <td style={tdStyle}>{u.email}</td>
                      <td style={tdStyle}>
                        <button onClick={() => handleDeleteUser(u._id, u.name)} style={deleteBtnStyle}>Remove</button>
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && <tr><td colSpan="3" style={tdStyle}>No students found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TEACHERS TAB */}
      {activeTab === "teachers" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px" }}>
          <div style={detailsBlockStyle}>
            <h3 style={{ marginTop: 0, color: "#1e293b" }}>Assign Teacher to Subject</h3>
            <p style={{fontSize: "13px", color:"#64748b"}}>Grants the teacher control over attendance, marks, and materials for a subject.</p>
            <form onSubmit={handleAssignTeacher}>
              <div style={{ marginBottom: '10px' }}>
                <label style={formLabelStyle}>Select Teacher</label>
                <select value={assignTeacherId} onChange={(e) => setAssignTeacherId(e.target.value)} style={formInputStyle}>
                  {teachers.length === 0 && <option value="">-- No Teachers Available --</option>}
                  {teachers.map(t => <option key={t._id} value={t._id}>{t.name} ({t.email})</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '15px' }}>
                <label style={formLabelStyle}>Select Subject</label>
                <select value={assignSubjectId} onChange={(e) => setAssignSubjectId(e.target.value)} style={formInputStyle}>
                  {subjects.length === 0 && <option value="">-- No Subjects Available --</option>}
                  {subjects.map(s => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
                </select>
              </div>
              <button type="submit" style={saveBtnStyle}>Assign Teacher</button>
            </form>
          </div>

          <div style={detailsBlockStyle}>
            <h3 style={{ marginTop: 0, color: "#1e293b" }}>Faculty Directory</h3>
            <div style={{ overflowY: 'auto', maxHeight: '500px' }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Email</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.map(u => (
                    <tr key={u._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={tdStyle}>{u.name}</td>
                      <td style={tdStyle}>{u.email}</td>
                      <td style={tdStyle}>
                        <button onClick={() => handleDeleteUser(u._id, u.name)} style={deleteBtnStyle}>Remove</button>
                      </td>
                    </tr>
                  ))}
                  {teachers.length === 0 && <tr><td colSpan="3" style={tdStyle}>No teachers found.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* COURSES TAB */}
      {activeTab === "courses" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "20px" }}>
          <div style={detailsBlockStyle}>
            <h3 style={{ marginTop: 0, color: "#1e293b" }}>Create New Subject</h3>
            <form onSubmit={handleAddCourse}>
              <div style={{ marginBottom: '12px' }}>
                <label style={formLabelStyle}>Subject Name</label>
                <input type="text" placeholder="e.g. Cryptography" value={courseName} onChange={(e) => setCourseName(e.target.value)} required style={formInputStyle} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={formLabelStyle}>Subject Code</label>
                <input type="text" placeholder="CS-405" value={courseCode} onChange={(e) => setCourseCode(e.target.value)} required style={formInputStyle} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={formLabelStyle}>Assign Semester</label>
                <select value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value)} required style={formInputStyle}>
                  {semesters.length === 0 && <option value="">-- No Semesters Available --</option>}
                  {semesters.map(sem => <option key={sem._id} value={sem._id}>{sem.name} ({sem.year})</option>)}
                </select>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={formLabelStyle}>Initial Teacher (Optional)</label>
                <select value={selectedTeacher} onChange={(e) => setSelectedTeacher(e.target.value)} style={formInputStyle}>
                  <option value="">-- No Teacher Yet --</option>
                  {teachers.map(t => <option key={t._id} value={t._id}>{t.name} ({t.email})</option>)}
                </select>
              </div>
              <button type="submit" style={saveBtnStyle}>Create Subject</button>
            </form>

            <h3 style={{ marginTop: '30px', color: "#1e293b" }}>Create New Semester</h3>
            <form onSubmit={handleAddSemester}>
              <div style={{ marginBottom: '12px' }}>
                <label style={formLabelStyle}>Semester Number</label>
                <input type="number" placeholder="e.g. 1" value={newSemesterNumber} onChange={(e) => setNewSemesterNumber(e.target.value)} required style={formInputStyle} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={formLabelStyle}>Academic Year</label>
                <input type="text" placeholder="e.g. 2026-2027" value={newSemesterYear} onChange={(e) => setNewSemesterYear(e.target.value)} required style={formInputStyle} />
              </div>
              <button type="submit" style={{ ...saveBtnStyle, background: '#4F46E5' }}>Create Semester</button>
            </form>
          </div>

          <div style={detailsBlockStyle}>
            <h3 style={{ marginTop: 0, color: "#1e293b" }}>Active Subjects Database</h3>
            <div style={{ overflowY: 'auto', maxHeight: '500px' }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={thStyle}>Code</th>
                    <th style={thStyle}>Name</th>
                    <th style={thStyle}>Semester</th>
                  </tr>
                </thead>
                <tbody>
                  {subjects.map(sub => (
                    <tr key={sub._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={tdStyle}><strong>{sub.code}</strong></td>
                      <td style={tdStyle}>{sub.name}</td>
                      <td style={tdStyle}>{sub.semester || "Unassigned"}</td>
                    </tr>
                  ))}
                  {subjects.length === 0 && <tr><td colSpan="3" style={tdStyle}>No subjects defined.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* REGISTER USERS TAB */}
      {activeTab === "users" && (
        <div style={detailsBlockStyle}>
          <h3 style={{ marginTop: 0, color: "#1e293b" }}>Register New Account</h3>
          <form onSubmit={handleAddUser} style={{ maxWidth: '600px' }}>
            <div style={{ marginBottom: '10px' }}>
              <label style={formLabelStyle}>Role</label>
              <select value={userRole} onChange={(e) => setUserRole(e.target.value)} style={formInputStyle}>
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="tpo">TPO</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={formLabelStyle}>Full Name</label>
              <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} required style={formInputStyle} />
            </div>
            <div style={{ marginBottom: '10px' }}>
              <label style={formLabelStyle}>Email</label>
              <input type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} required style={formInputStyle} />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={formLabelStyle}>Password</label>
              <input type="password" value={userPassword} onChange={(e) => setUserPassword(e.target.value)} required style={formInputStyle} />
            </div>
            <button type="submit" style={saveBtnStyle}>Create Account</button>
          </form>
        </div>
      )}
    </div>
  );
}

// Inline Styles
const mainStyle = { padding: "40px", fontFamily: "Inter, system-ui, sans-serif" };
const headerStyle = { marginBottom: "32px" };
const tabsRowStyle = { display: "flex", gap: "8px", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px", marginBottom: "24px", overflowX: "auto" };
const tabStyle = { padding: "10px 16px", background: "transparent", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: "600", color: "#64748b", cursor: "pointer", transition: "all 0.2s" };
const activeTabStyle = { ...tabStyle, background: "#fee2e2", color: "#991b1b" };
const statsGridStyle = { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "20px", marginBottom: "24px" };
const statCardStyle = (background) => ({ background, color: "white", padding: "24px", borderRadius: "16px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" });
const detailsBlockStyle = { background: "white", padding: "24px", borderRadius: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", border: "1px solid #f1f5f9" };
const formLabelStyle = { display: 'block', fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' };
const formInputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '14px', boxSizing: 'border-box' };
const saveBtnStyle = { padding: '10px 20px', background: '#991b1b', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(153, 27, 27, 0.2)' };
const tableStyle = { width: '100%', borderCollapse: 'collapse', textAlign: 'left' };
const thStyle = { padding: '12px 16px', fontWeight: '600', color: '#475569', fontSize: '13px' };
const tdStyle = { padding: '12px 16px', fontSize: '14px', color: '#334155' };
const deleteBtnStyle = { padding: '4px 8px', background: '#fee2e2', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' };

export default AdminDashboard;
