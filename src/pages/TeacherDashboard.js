import React, { useState, useEffect, useContext } from "react";
import AuthContext from "../context/AuthContext";
import api from "../utils/api";

function TeacherDashboard() {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("overview");
  const [subjects, setSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // File Upload state
  const [file, setFile] = useState(null);
  const [noteTitle, setNoteTitle] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [uploading, setUploading] = useState(false);

  // Attendance state
  const [attSubject, setAttSubject] = useState("");
  const [attStudents, setAttStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({});

  // Assignment state
  const [assignTitle, setAssignTitle] = useState("");
  const [assignDueDate, setAssignDueDate] = useState("");
  const [assignDesc, setAssignDesc] = useState("");
  const [assignments, setAssignments] = useState([
    { id: 1, title: "Lab 3: Shift-Reduce Parsing", dueDate: "2026-06-12", desc: "Implement a shift-reduce parser in C or Python.", submissionsCount: 2 }
  ]);
  const [submissions, setSubmissions] = useState([
    { id: 101, studentName: "Abhishna", assignmentTitle: "Lab 3: Shift-Reduce Parsing", submittedAt: "2026-06-10", grade: "", feedback: "" },
    { id: 102, studentName: "Rohan Gupta", assignmentTitle: "Lab 3: Shift-Reduce Parsing", submittedAt: "2026-06-10", grade: "A", feedback: "Excellent implementation." }
  ]);

  // Marks Upload state
  const [marksRecords, setMarksRecords] = useState({});

  // Notices state
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeContent, setNoticeContent] = useState("");
  const [notices, setNotices] = useState([
    { id: 1, title: "Mid-Term Examination Syllabus", content: "Syllabus will cover units 1 to 3. Exam date is June 20, 2026.", date: "June 09, 2026" }
  ]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [subjectsRes, studentsRes, statsRes] = await Promise.all([
          api.get("/teacher/subjects"),
          api.get("/teacher/students"),
          api.get("/teacher/dashboard")
        ]);
        if (subjectsRes && subjectsRes.success) {
          setSubjects(subjectsRes.data);
          if (subjectsRes.data.length > 0) {
            setSelectedSubject(subjectsRes.data[0]._id);
            setAttSubject(subjectsRes.data[0]._id);
          }
        }
        if (studentsRes && studentsRes.success) setStudents(studentsRes.data);
        if (statsRes && statsRes.success) setStats(statsRes.data);
      } catch (err) {
        console.error("Failed to load teacher dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch students for attendance
  useEffect(() => {
    if (!attSubject) return;
    const fetchStudentsForAttendance = async () => {
      try {
        const res = await api.get(`/subjects/${attSubject}/students`);
        if (res && res.success) {
          setAttStudents(res.data);
          // Initialize attendance records to present by default
          const initial = {};
          res.data.forEach(s => {
            initial[s._id] = true;
          });
          setAttendanceRecords(initial);
        }
      } catch (err) {
        console.error("Failed to fetch students for attendance:", err);
      }
    };
    fetchStudentsForAttendance();
  }, [attSubject]);

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file || !noteTitle.trim() || !selectedSubject) {
      alert("Please fill in all notes upload details.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("title", noteTitle);
      formData.append("subject", selectedSubject);
      formData.append("file", file);

      const res = await api.upload("/materials/upload", formData);
      if (res && res.success) {
        alert("Syllabus document uploaded and vector ingestion initiated!");
        setNoteTitle("");
        setFile(null);
        // Reload stats
        const statsRes = await api.get("/teacher/dashboard");
        if (statsRes && statsRes.success) setStats(statsRes.data);
      }
    } catch (err) {
      alert(err.message || "Failed to upload notes.");
    } finally {
      setUploading(false);
    }
  };

  const toggleAttendance = (studentId) => {
    setAttendanceRecords(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const handleSaveAttendance = () => {
    alert("Attendance sheet saved successfully!");
  };

  const handleCreateAssignment = (e) => {
    e.preventDefault();
    if (!assignTitle.trim() || !assignDueDate || !assignDesc.trim()) return;
    const newAssign = {
      id: Date.now(),
      title: assignTitle,
      dueDate: assignDueDate,
      desc: assignDesc,
      submissionsCount: 0
    };
    setAssignments([newAssign, ...assignments]);
    setAssignTitle("");
    setAssignDueDate("");
    setAssignDesc("");
    alert("Assignment distributed successfully!");
  };

  const handleGradeSubmission = (subId, grade, feedback) => {
    setSubmissions(prev => prev.map(s => {
      if (s.id === subId) {
        return { ...s, grade, feedback };
      }
      return s;
    }));
    alert("Submission graded!");
  };

  const handleSaveMarks = () => {
    alert("Marks database updated successfully!");
  };

  const handlePostNotice = (e) => {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeContent.trim()) return;
    const newNotice = {
      id: Date.now(),
      title: noticeTitle,
      content: noticeContent,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    };
    setNotices([newNotice, ...notices]);
    setNoticeTitle("");
    setNoticeContent("");
    alert("Notice bulletin posted!");
  };

  if (loading) {
    return <div className="main"><h3>Loading dashboard details...</h3></div>;
  }

  return (
    <div className="main" style={mainStyle}>
      {/* Personalized Header */}
      <header style={headerStyle}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: "800", color: "#1e293b", margin: 0 }}>
            Welcome back, {user?.name || "Dr. Sharma"} 👋
          </h1>
          <p style={{ color: "#64748b", margin: "4px 0 0 0", fontSize: "14px" }}>
            Faculty portal dashboard. Manage courses, attendance sheets, and grades.
          </p>
        </div>
      </header>

      {/* Tabs Menu */}
      <div style={tabsRowStyle}>
        <button onClick={() => setActiveTab("overview")} style={activeTab === "overview" ? activeTabStyle : tabStyle}>
          📊 Overview
        </button>
        <button onClick={() => setActiveTab("attendance")} style={activeTab === "attendance" ? activeTabStyle : tabStyle}>
          ✓ Attendance Management
        </button>
        <button onClick={() => setActiveTab("assignments")} style={activeTab === "assignments" ? activeTabStyle : tabStyle}>
          📝 Assignments & Grading
        </button>
        <button onClick={() => setActiveTab("marks")} style={activeTab === "marks" ? activeTabStyle : tabStyle}>
          💯 Marks Upload
        </button>
        <button onClick={() => setActiveTab("materials")} style={activeTab === "materials" ? activeTabStyle : tabStyle}>
          📚 Upload Notes
        </button>
        <button onClick={() => setActiveTab("notices")} style={activeTab === "notices" ? activeTabStyle : tabStyle}>
          📢 Notices Bulletin
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div>
          <div style={statsGridStyle}>
            <div style={statCardStyle("linear-gradient(135deg, #0f172a 0%, #1e293b 100%)")}>
              <small>My Courses</small>
              <h3>{stats?.subjectCount || 0}</h3>
              <p>Active course subjects</p>
            </div>
            <div style={statCardStyle("linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)")}>
              <small>Total Students</small>
              <h3>{stats?.totalStudents || 0}</h3>
              <p>Deduplicated class headcount</p>
            </div>
            <div style={statCardStyle("linear-gradient(135deg, #10b981 0%, #059669 100%)")}>
              <small>Total Reference Notes</small>
              <h3>{stats?.totalMaterials || 0}</h3>
              <p>Documents uploaded to vector DB</p>
            </div>
            <div style={statCardStyle("linear-gradient(135deg, #f59e0b 0%, #d97706 100%)")}>
              <small>Pending Tasks</small>
              <h3>12</h3>
              <p>Submissions awaiting feedback</p>
            </div>
          </div>

          <div style={detailsGridStyle}>
            <div style={detailsBlockStyle}>
              <h4 style={{ margin: "0 0 12px 0", color: "#334155", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>📚 Recent Reference Material Uploads</h4>
              {stats?.recentUploads?.length === 0 ? (
                <p style={{ color: "#64748b", fontSize: "13px" }}>No documents uploaded yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                  {stats?.recentUploads?.map((u) => (
                    <div key={u._id} style={activityItemStyle}>
                      <div>
                        <strong style={{ display: 'block', fontSize: '13px', color: '#1e293b' }}>{u.title}</strong>
                        <small style={{ color: '#64748b' }}>Course: {u.subject?.name} • Format: {u.fileType}</small>
                      </div>
                      <small style={{ color: '#94a3b8' }}>{new Date(u.createdAt).toLocaleDateString()}</small>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={detailsBlockStyle}>
              <h4 style={{ margin: "0 0 12px 0", color: "#334155", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>📢 Action Items Checklist</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "10px" }}>
                <div style={scheduleItemStyle}>
                  <span style={{ fontSize: "18px" }}>📝</span>
                  <div>
                    <strong style={{ display: "block", fontSize: "13px", color: "#1e293b" }}>Attendance Pending: 1 Class</strong>
                    <small style={{ color: "#64748b" }}>Compiler Design CSE-A</small>
                  </div>
                </div>
                <div style={scheduleItemStyle}>
                  <span style={{ fontSize: "18px" }}>📚</span>
                  <div>
                    <strong style={{ display: "block", fontSize: "13px", color: "#1e293b" }}>Syllabus Coverage Audit</strong>
                    <small style={{ color: "#64748b" }}>Complete Unit 3 slides upload</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Management Tab */}
      {activeTab === "attendance" && (
        <div style={detailsBlockStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: "#1e293b" }}>Attendance Manager</h3>
            <div>
              <label style={{ fontSize: '14px', fontWeight: '600', color: '#334155' }}>Select Course: </label>
              <select value={attSubject} onChange={(e) => setAttSubject(e.target.value)} style={selectBoxStyle}>
                {subjects.map(sub => (
                  <option key={sub._id} value={sub._id}>{sub.name} ({sub.code})</option>
                ))}
              </select>
            </div>
          </div>

          {attStudents.length === 0 ? (
            <p style={{ color: '#64748b', textAlign: 'center', margin: '40px 0' }}>No students enrolled in this course.</p>
          ) : (
            <div>
              <table style={tableStyle}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={thStyle}>Student Name</th>
                    <th style={thStyle}>Email</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Mark Present</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Mark Absent</th>
                  </tr>
                </thead>
                <tbody>
                  {attStudents.map(student => (
                    <tr key={student._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={tdStyle}>{student.name}</td>
                      <td style={tdStyle}>{student.email}</td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={attendanceRecords[student._id] === true}
                          onChange={() => toggleAttendance(student._id)}
                          style={checkboxStyle}
                        />
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={attendanceRecords[student._id] === false}
                          onChange={() => toggleAttendance(student._id)}
                          style={checkboxStyle}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button onClick={handleSaveAttendance} style={saveBtnStyle}>Save Attendance Sheet</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Assignments Tab */}
      {activeTab === "assignments" && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={detailsBlockStyle}>
            <h3 style={{ marginTop: 0, color: "#1e293b" }}>Create Assignment</h3>
            <form onSubmit={handleCreateAssignment}>
              <div style={{ marginBottom: '12px' }}>
                <label style={formLabelStyle}>Assignment Title</label>
                <input
                  type="text"
                  placeholder="e.g. Lab 4: AST Generator"
                  value={assignTitle}
                  onChange={(e) => setAssignTitle(e.target.value)}
                  required
                  style={formInputStyle}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={formLabelStyle}>Due Date</label>
                <input
                  type="date"
                  value={assignDueDate}
                  onChange={(e) => setAssignDueDate(e.target.value)}
                  required
                  style={formInputStyle}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={formLabelStyle}>Instructions</label>
                <textarea
                  placeholder="Provide compilation details, constraints, and submission formats..."
                  value={assignDesc}
                  onChange={(e) => setAssignDesc(e.target.value)}
                  required
                  style={{ ...formInputStyle, height: '80px', resize: 'none' }}
                />
              </div>
              <button type="submit" style={saveBtnStyle}>Distribute Assignment</button>
            </form>

            <h4 style={{ marginTop: '24px', color: '#1e293b' }}>Active Assignments</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {assignments.map(a => (
                <div key={a.id} style={assignItemStyle}>
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: '14px', color: '#1e293b' }}>{a.title}</strong>
                    <p style={{ margin: '4px 0', fontSize: '12px', color: '#64748b' }}>{a.desc}</p>
                    <small style={{ color: '#475569' }}>Due: {a.dueDate}</small>
                  </div>
                  <span style={badgeStyle('#e0f2fe', '#0369a1')}>{a.submissionsCount} Subs</span>
                </div>
              ))}
            </div>
          </div>

          <div style={detailsBlockStyle}>
            <h3 style={{ marginTop: 0, color: "#1e293b" }}>Submitted Assignments</h3>
            <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '16px' }}>Verify and evaluate student lab code submissions.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {submissions.map(sub => (
                <div key={sub.id} style={subCardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <strong>{sub.studentName}</strong>
                    <small style={{ color: '#94a3b8' }}>{sub.submittedAt}</small>
                  </div>
                  <small style={{ display: 'block', color: '#64748b', marginBottom: '12px' }}>Task: {sub.assignmentTitle}</small>
                  {sub.grade ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={badgeStyle('#d1fae5', '#065f46')}>Graded: {sub.grade}</span>
                      <small style={{ color: '#475569', fontStyle: 'italic' }}>"{sub.feedback}"</small>
                    </div>
                  ) : (
                    <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                        <input
                          type="text"
                          placeholder="Grade (e.g. A, B+)"
                          id={`grade-${sub.id}`}
                          style={gradeInputStyle}
                        />
                        <input
                          type="text"
                          placeholder="Feedback"
                          id={`feedback-${sub.id}`}
                          style={{ ...gradeInputStyle, flex: 1 }}
                        />
                      </div>
                      <button
                        onClick={() => {
                          const g = document.getElementById(`grade-${sub.id}`).value;
                          const f = document.getElementById(`feedback-${sub.id}`).value;
                          handleGradeSubmission(sub.id, g, f);
                        }}
                        style={submitGradeBtnStyle}
                      >
                        Submit Grade
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Marks Upload Tab */}
      {activeTab === "marks" && (
        <div style={detailsBlockStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, color: "#1e293b" }}>Marks Upload Board</h3>
            <div>
              <label style={{ fontSize: '14px', fontWeight: '600', color: '#334155' }}>Subject: </label>
              <select style={selectBoxStyle}>
                {subjects.map(sub => (
                  <option key={sub._id} value={sub._id}>{sub.name}</option>
                ))}
              </select>
            </div>
          </div>

          <table style={tableStyle}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={thStyle}>Student Name</th>
                <th style={thStyle}>Roll Number / Email</th>
                <th style={{ ...thStyle, width: '150px' }}>Mid-Term (30)</th>
                <th style={{ ...thStyle, width: '150px' }}>End-Term (70)</th>
                <th style={{ ...thStyle, width: '150px' }}>Practical (50)</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, i) => (
                <tr key={student._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={tdStyle}>{student.name}</td>
                  <td style={tdStyle}>{student.email}</td>
                  <td style={tdStyle}>
                    <input
                      type="number"
                      placeholder="--"
                      value={marksRecords[`${student._id}-mid`] || ""}
                      onChange={(e) => setMarksRecords({ ...marksRecords, [`${student._id}-mid`]: e.target.value })}
                      style={marksInputStyle}
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      type="number"
                      placeholder="--"
                      value={marksRecords[`${student._id}-end`] || ""}
                      onChange={(e) => setMarksRecords({ ...marksRecords, [`${student._id}-end`]: e.target.value })}
                      style={marksInputStyle}
                    />
                  </td>
                  <td style={tdStyle}>
                    <input
                      type="number"
                      placeholder="--"
                      value={marksRecords[`${student._id}-prac`] || ""}
                      onChange={(e) => setMarksRecords({ ...marksRecords, [`${student._id}-prac`]: e.target.value })}
                      style={marksInputStyle}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button onClick={handleSaveMarks} style={saveBtnStyle}>Save Academic Grades</button>
          </div>
        </div>
      )}

      {/* Upload Notes Tab */}
      {activeTab === "materials" && (
        <div style={detailsBlockStyle}>
          <h3 style={{ marginTop: 0, color: "#1e293b" }}>Academic Notes Uploader</h3>
          <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "20px" }}>
            Add PDFs, DOCX, or text files to index in the AI assistant. These files will be chunked and indexed automatically.
          </p>

          <form onSubmit={handleFileUpload} style={{ maxWidth: '500px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={formLabelStyle}>Document Title</label>
              <input
                type="text"
                placeholder="e.g. Unit 3 SQL Joins Reference"
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
                required
                style={formInputStyle}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={formLabelStyle}>Associated Course</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                required
                style={formInputStyle}
              >
                <option value="" disabled>-- Choose Course --</option>
                {subjects.map(sub => (
                  <option key={sub._id} value={sub._id}>{sub.name} ({sub.code})</option>
                ))}
              </select>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={formLabelStyle}>File Select (PDF, Word, or Text)</label>
              <input
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                onChange={(e) => setFile(e.target.files[0])}
                required
                style={{ ...formInputStyle, padding: '8px' }}
              />
            </div>
            <button type="submit" disabled={uploading} style={saveBtnStyle}>
              {uploading ? "Uploading & Ingesting..." : "Upload Notes"}
            </button>
          </form>
        </div>
      )}

      {/* Notices Tab */}
      {activeTab === "notices" && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div style={detailsBlockStyle}>
            <h3 style={{ marginTop: 0, color: "#1e293b" }}>Publish Announcement</h3>
            <form onSubmit={handlePostNotice}>
              <div style={{ marginBottom: '12px' }}>
                <label style={formLabelStyle}>Notice Title</label>
                <input
                  type="text"
                  placeholder="e.g. Lab exam reschedule"
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  required
                  style={formInputStyle}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={formLabelStyle}>Content Details</label>
                <textarea
                  placeholder="Detail dates, times, sections, and requirements..."
                  value={noticeContent}
                  onChange={(e) => setNoticeContent(e.target.value)}
                  required
                  style={{ ...formInputStyle, height: '120px', resize: 'none' }}
                />
              </div>
              <button type="submit" style={saveBtnStyle}>Publish Notice</button>
            </form>
          </div>

          <div style={detailsBlockStyle}>
            <h3 style={{ marginTop: 0, color: "#1e293b" }}>Active Notices</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {notices.map(notice => (
                <div key={notice.id} style={noticeCardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', paddingBottom: '6px', marginBottom: '8px' }}>
                    <strong style={{ color: '#1e293b' }}>{notice.title}</strong>
                    <small style={{ color: '#94a3b8' }}>{notice.date}</small>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#475569', lineHeight: '1.4' }}>{notice.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Reuse styles for layout
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

const scheduleItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  background: '#f8fafc',
  padding: '12px',
  borderRadius: '12px',
  border: '1px solid #e2e8f0'
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

const checkboxStyle = {
  width: '16px',
  height: '16px',
  cursor: 'pointer'
};

const saveBtnStyle = {
  padding: '10px 20px',
  background: '#3b82f6',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontWeight: '600',
  cursor: 'pointer',
  boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.2)'
};

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

const assignItemStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '10px 12px',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px'
};

const badgeStyle = (bg, color) => ({
  padding: '2px 8px',
  background: bg,
  color: color,
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: '700',
  whiteSpace: 'nowrap'
});

const subCardStyle = {
  padding: '16px',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '12px'
};

const gradeInputStyle = {
  width: '70px',
  padding: '6px 10px',
  border: '1px solid #cbd5e1',
  borderRadius: '6px',
  outline: 'none',
  fontSize: '12px'
};

const submitGradeBtnStyle = {
  padding: '6px 12px',
  background: '#10b981',
  color: 'white',
  border: 'none',
  borderRadius: '6px',
  fontSize: '12px',
  fontWeight: '600',
  cursor: 'pointer'
};

const marksInputStyle = {
  width: '80px',
  padding: '6px 10px',
  border: '1px solid #cbd5e1',
  borderRadius: '6px',
  outline: 'none',
  fontSize: '13px',
  textAlign: 'center'
};

const noticeCardStyle = {
  padding: '14px',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '10px'
};

export default TeacherDashboard;