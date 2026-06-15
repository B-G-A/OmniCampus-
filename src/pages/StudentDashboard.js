import React, { useState, useEffect, useContext } from "react";
import AuthContext from "../context/AuthContext";
import api from "../utils/api";

function StudentDashboard() {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("overview");
  const [subjects, setSubjects] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Academics state
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [subjectMaterials, setSubjectMaterials] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [marks, setMarks] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [assignFile, setAssignFile] = useState(null);
  const [uploadingAssignment, setUploadingAssignment] = useState(false);

  const [events, setEvents] = useState([]);

  // Placements state
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [experiences, setExperiences] = useState([]);
  const [expText, setExpText] = useState("");
  const [expRole, setExpRole] = useState("");
  const [expDifficulty, setExpDifficulty] = useState("Medium");
  const [expStatus, setExpStatus] = useState("Selected");
  const [appliedCompanies, setAppliedCompanies] = useState(new Set());

  // Event Registration state
  const [registeredEvents, setRegisteredEvents] = useState(new Set());

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [subRes, compRes, attRes, marksRes, assignmentsRes, eventsRes] = await Promise.all([
          api.get("/student/subjects"),
          api.get("/placements/companies"),
          api.get("/student/attendance"),
          api.get("/student/marks"),
          api.get("/assignments/student"),
          api.get("/events")
        ]);
        if (subRes && subRes.success) setSubjects(subRes.data);
        if (compRes && compRes.success) setCompanies(compRes.data);
        if (attRes && attRes.success) setAttendance(attRes.data);
        if (marksRes && marksRes.success) setMarks(marksRes.data);
        if (assignmentsRes && assignmentsRes.success) setAssignments(assignmentsRes.data);
        if (eventsRes && eventsRes.success) setEvents(eventsRes.data);
      } catch (err) {
        console.error("Failed to fetch student data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleRegisterEvent = async (eventId) => {
    try {
      const isRegistered = registeredEvents.has(eventId);
      if (isRegistered) {
        await api.delete(`/events/${eventId}/register`);
        setRegisteredEvents(prev => {
          const next = new Set(prev);
          next.delete(eventId);
          return next;
        });
        alert("Unregistered successfully");
      } else {
        await api.post(`/events/${eventId}/register`);
        setRegisteredEvents(prev => {
          const next = new Set(prev);
          next.add(eventId);
          return next;
        });
        alert("Registered successfully");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to register/unregister from event");
    }
  };

  const handleSubmitAssignment = async (e, assignmentId) => {
    e.preventDefault();
    if (!assignFile) return;
    setUploadingAssignment(true);
    try {
      const formData = new FormData();
      formData.append("file", assignFile);
      const res = await api.upload(`/assignments/${assignmentId}/submit`, formData);
      if (res && res.success) {
        alert("Assignment submitted successfully!");
        setAssignFile(null);
        // Refresh assignments
        const assignmentsRes = await api.get("/assignments/student");
        if (assignmentsRes && assignmentsRes.success) setAssignments(assignmentsRes.data);
      }
    } catch (err) {
      alert("Failed to submit assignment.");
      console.error(err);
    } finally {
      setUploadingAssignment(false);
    }
  };

  const handleApplyCompany = async (company) => {
    try {
      const isApplied = appliedCompanies.has(company.name);
      if (isApplied) {
        await api.delete(`/placements/companies/${company._id}/apply`);
        setAppliedCompanies(prev => {
          const next = new Set(prev);
          next.delete(company.name);
          return next;
        });
        alert(`Withdrawn from ${company.name}`);
      } else {
        await api.post(`/placements/companies/${company._id}/apply`);
        setAppliedCompanies(prev => {
          const next = new Set(prev);
          next.add(company.name);
          return next;
        });
        alert(`Successfully applied to ${company.name}!`);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to apply/withdraw.");
    }
  };

  const fetchExperiences = async (companyId) => {
    try {
      const res = await api.get(`/placements/companies/${companyId}/experiences`);
      if (res && res.success) setExperiences(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompanySelect = (company) => {
    setSelectedCompany(company);
    fetchExperiences(company._id);
  };

  const handleSubmitExperience = async (e) => {
    e.preventDefault();
    if (!expText.trim() || !expRole.trim()) return;
    try {
      const res = await api.post(`/placements/companies/${selectedCompany._id}/experiences`, {
        role: expRole,
        year: 2026,
        difficulty: expDifficulty,
        experienceText: expText,
        status: expStatus
      });
      if (res && res.success) {
        setExpText("");
        setExpRole("");
        alert("Experience shared successfully!");
        fetchExperiences(selectedCompany._id);
      }
    } catch (err) {
      alert("Failed to submit experience.");
    }
  };

  const calculateEligibility = (company) => {
    const minCGPA = company.eligibility?.minCGPA || 0;
    const branches = company.eligibility?.allowedBranches || [];
    const cgpaOk = (user?.cgpa || 8.0) >= minCGPA;
    const branchOk = branches.length === 0 || branches.includes(user?.department || "CSE");
    return cgpaOk && branchOk;
  };

  if (loading) {
    return <div className="main"><h3>Loading portal data...</h3></div>;
  }

  // Attendance and Marks parsing (handle both new and old structure)
  const attendanceRecords = attendance?.records || (Array.isArray(attendance) ? attendance : []);
  const attendanceStats = attendance?.stats || null;
  const marksRecords = marks?.records || (Array.isArray(marks) ? marks : []);
  const marksStats = marks?.stats || null;

  // Calculate stats
  const eligibleCount = companies.filter(c => c.eligibilityStatus === 'Eligible').length;

  return (
    <div className="main" style={mainStyle}>
      {/* Personalized Welcoming Header */}
      <header style={headerStyle}>
        <div>
          <h1 style={{ fontSize: "28px", fontWeight: "800", color: "#1e293b", margin: 0 }}>
            Good Morning, {user?.name || "Student"} 👋
          </h1>
          <p style={{ color: "#64748b", margin: "4px 0 0 0", fontSize: "14px" }}>
            Here is what's happening with your academic and placement track today.
          </p>
        </div>
      </header>

      {/* Tabs Row */}
      <div style={tabsRowStyle}>
        <button onClick={() => setActiveTab("overview")} style={activeTab === "overview" ? activeTabStyle : tabStyle}>
          📊 Overview
        </button>
        <button onClick={() => setActiveTab("academics")} style={activeTab === "academics" ? activeTabStyle : tabStyle}>
          📚 Academics
        </button>
        <button onClick={() => setActiveTab("assignments")} style={activeTab === "assignments" ? activeTabStyle : tabStyle}>
          📝 Assignments
        </button>
        <button onClick={() => setActiveTab("placements")} style={activeTab === "placements" ? activeTabStyle : tabStyle}>
          💼 Placement Hub
        </button>
        <button onClick={() => setActiveTab("events")} style={activeTab === "events" ? activeTabStyle : tabStyle}>
          📅 Events
        </button>
        <button onClick={() => setActiveTab("profile")} style={activeTab === "profile" ? activeTabStyle : tabStyle}>
          👤 Profile
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "overview" && (
        <div>
          {/* Personalization & Metric Cards Grid */}
          <div style={statsGridStyle}>
            <div style={statCardStyle("linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)")}>
              <small>Attendance</small>
              <h3>{attendanceStats?.overallPercentage ?? user?.attendance ?? 0}%</h3>
              <p>Overall attendance</p>
            </div>
            <div style={statCardStyle("linear-gradient(135deg, #10b981 0%, #047857 100%)")}>
              <small>CGPA</small>
              <h3>{user?.cgpa ?? 0}</h3>
              <p>Accumulated grade</p>
            </div>
            <div style={statCardStyle("linear-gradient(135deg, #f59e0b 0%, #d97706 100%)")}>
              <small>Eligible Companies</small>
              <h3>{eligibleCount}</h3>
              <p>Matching your profile</p>
            </div>
            <div style={statCardStyle("linear-gradient(135deg, #ec4899 0%, #be185d 100%)")}>
              <small>Applied Companies</small>
              <h3>{appliedCompanies.size}</h3>
              <p>Applications submitted</p>
            </div>
          </div>

          <div style={detailsGridStyle}>
            <div style={detailsBlockStyle}>
              <h4 style={{ margin: "0 0 12px 0", color: "#334155", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>🚀 Placement Readiness</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '15px' }}>
                <div style={progressOuterStyle}>
                  <div style={progressInnerStyle(user?.placementReadiness || 78)}></div>
                </div>
                <span style={{ fontWeight: '700', color: '#1e293b' }}>{user?.placementReadiness || 78}%</span>
              </div>
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '10px' }}>
                Complete your profile and upload mock interview experiences to boost your ranking.
              </p>
            </div>

            <div style={detailsBlockStyle}>
              <h4 style={{ margin: "0 0 12px 0", color: "#334155", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px" }}>📅 Today's Schedule</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={scheduleItemStyle}>
                  <span style={{ fontSize: '20px' }}>🏫</span>
                  <div>
                    <strong style={{ display: 'block', fontSize: '14px', color: '#1e293b' }}>Next Class: {user?.nextClass || 'Not assigned yet'}</strong>
                    <small style={{ color: '#64748b' }}>{user?.nextClassTime || 'Schedule updates from the timetable service.'}</small>
                  </div>
                </div>
                <div style={scheduleItemStyle}>
                  <span style={{ fontSize: '20px' }}>📝</span>
                  <div>
                    <strong style={{ display: 'block', fontSize: '14px', color: '#1e293b' }}>Assignment Due: {user?.assignmentDue || 'Tomorrow'}</strong>
                    <small style={{ color: '#64748b' }}>{user?.assignmentDueDetail || 'Assignment deadlines update from the database.'}</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "academics" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        
        {/* Attendance & Marks Section */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
          <div style={detailsBlockStyle}>
            <h3 style={{ marginTop: 0, color: "#1e293b" }}>My Attendance</h3>
            <div style={{ maxHeight: "200px", overflowY: "auto" }}>
              {attendanceRecords.length === 0 ? <p style={{color: "#64748b", fontSize: "14px"}}>No attendance records.</p> : (
                <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <th style={{ padding: "8px", color: "#475569", fontSize: "13px" }}>Date</th>
                      <th style={{ padding: "8px", color: "#475569", fontSize: "13px" }}>Subject</th>
                      <th style={{ padding: "8px", color: "#475569", fontSize: "13px" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRecords.map(a => (
                      <tr key={a._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px", fontSize: "13px" }}>{new Date(a.date).toLocaleDateString()}</td>
                        <td style={{ padding: "8px", fontSize: "13px" }}>{a.subjectName || a.subject?.name}</td>
                        <td style={{ padding: "8px", fontSize: "13px", color: a.status === "Present" ? "#10b981" : "#ef4444" }}>
                          {a.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          
          <div style={detailsBlockStyle}>
            <h3 style={{ marginTop: 0, color: "#1e293b" }}>My Marks</h3>
            <div style={{ maxHeight: "200px", overflowY: "auto" }}>
              {marksRecords.length === 0 ? <p style={{color: "#64748b", fontSize: "14px"}}>No marks available.</p> : (
                <table style={{ width: "100%", textAlign: "left", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                      <th style={{ padding: "8px", color: "#475569", fontSize: "13px" }}>Subject</th>
                      <th style={{ padding: "8px", color: "#475569", fontSize: "13px" }}>Internal 1</th>
                      <th style={{ padding: "8px", color: "#475569", fontSize: "13px" }}>Internal 2</th>
                      <th style={{ padding: "8px", color: "#475569", fontSize: "13px" }}>Assignment</th>
                      <th style={{ padding: "8px", color: "#475569", fontSize: "13px" }}>Total</th>
                      <th style={{ padding: "8px", color: "#475569", fontSize: "13px" }}>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marksRecords.map(m => (
                      <tr key={m.mark_id || m._id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "8px", fontSize: "13px" }}>{m.subject?.name || m.subjects?.subject_name || '-'}</td>
                        <td style={{ padding: "8px", fontSize: "13px" }}>{m.internal1 ?? m.midTerm ?? '-'}</td>
                        <td style={{ padding: "8px", fontSize: "13px" }}>{m.internal2 ?? m.endTerm ?? '-'}</td>
                        <td style={{ padding: "8px", fontSize: "13px" }}>{m.assignment ?? m.practical ?? '-'}</td>
                        <td style={{ padding: "8px", fontSize: "13px", fontWeight: "600" }}>{m.total ?? '-'}</td>
                        <td style={{ padding: "8px", fontSize: "13px", fontWeight: "bold" }}>{m.grade ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        <div style={detailsBlockStyle}>
          <h3 style={{ marginTop: 0, color: "#1e293b" }}>Your Enrolled Subjects</h3>
          <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "20px" }}>
            Track academic details, reference notes, and check recent notes uploaded by teachers.
          </p>
          <div style={subjectGridStyle}>
            {subjects.map((sub) => (
              <div 
                key={sub._id} 
                style={{...subjectCardStyle(sub.bannerColor || "linear-gradient(135deg, #4f46e5, #3730a3)"), cursor: "pointer"}}
                onClick={async () => {
                  setSelectedSubject(sub);
                  setSubjectMaterials([]);
                  try {
                    const res = await api.get(`/materials?subjectId=${sub._id}`);
                    if (res && res.success) {
                      setSubjectMaterials(res.data);
                    }
                  } catch (err) {
                    console.error("Failed to fetch materials:", err);
                  }
                }}
              >
                <div style={{ padding: "20px", color: "white" }}>
                  <small style={{ fontSize: "11px", opacity: 0.8, textTransform: "uppercase" }}>{sub.code}</small>
                  <h4 style={{ margin: "4px 0 8px 0", fontSize: "18px", fontWeight: "700" }}>{sub.name}</h4>
                  <p style={{ fontSize: "12px", opacity: 0.9, margin: "0 0 16px 0", height: "40px", overflow: "hidden" }}>
                    {sub.description}
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.2)", paddingTop: "12px", fontSize: "12px" }}>
                    <span>{sub.credits ? `${sub.credits} Credits` : "Course"}</span>
                    <span>Click to view materials</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selectedSubject && (
            <div style={{ marginTop: "30px", borderTop: "1px solid #e2e8f0", paddingTop: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h4 style={{ margin: 0, color: "#1e293b", fontSize: "18px" }}>Materials for {selectedSubject.name}</h4>
                <button onClick={() => setSelectedSubject(null)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#64748b" }}>✕ Close</button>
              </div>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {subjectMaterials.length === 0 ? (
                  <p style={{ color: "#64748b", fontSize: "14px" }}>No materials uploaded yet.</p>
                ) : (
                  subjectMaterials.map((mat) => (
                    <div key={mat._id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                      <div>
                        <strong style={{ display: "block", color: "#1e293b", marginBottom: "4px" }}>{mat.title}</strong>
                        <small style={{ color: "#64748b" }}>{mat.fileType.toUpperCase()} • {(mat.fileSize / 1024 / 1024).toFixed(2)} MB</small>
                      </div>
                      <button 
                        onClick={() => {
                          if (mat.fileUrl) {
                            window.open(mat.fileUrl, "_blank");
                          } else {
                            alert("File URL not available");
                          }
                        }} 
                        style={{ padding: "6px 12px", background: "#3b82f6", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}
                      >
                        Download
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        </div>
      )}

      {activeTab === "assignments" && (
        <div style={detailsBlockStyle}>
          <h3 style={{ marginTop: 0, color: "#1e293b" }}>Pending & Submitted Assignments</h3>
          <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "20px" }}>
            Submit your solutions before the due date.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {assignments.length === 0 ? (
              <p style={{ color: "#64748b" }}>No assignments found.</p>
            ) : (
              assignments.map(a => (
                <div key={a._id} style={{ padding: "16px", border: "1px solid #e2e8f0", borderRadius: "12px", background: "#f8fafc" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <div>
                      <strong style={{ fontSize: "16px", color: "#1e293b" }}>{a.title}</strong>
                      <small style={{ display: "block", color: "#64748b", marginTop: "4px" }}>Course: {a.subject?.name}</small>
                      {a.attachmentName && <small style={{ display: "block", color: "#3b82f6", marginTop: "4px", cursor: "pointer" }} onClick={() => {
                        if (a.attachmentPath) {
                          window.open(a.attachmentPath, "_blank");
                        } else {
                          alert("File URL not available");
                        }
                      }}>📎 {a.attachmentName} (Click to download)</small>}
                    </div>
                    {a.mySubmission ? (
                      <span style={badgeStyle("#d1fae5", "#065f46")}>Submitted</span>
                    ) : (
                      <span style={badgeStyle("#fee2e2", "#991b1b")}>Pending</span>
                    )}
                  </div>
                  <p style={{ fontSize: "14px", color: "#475569", margin: "10px 0" }}>{a.description}</p>
                  <small style={{ color: "#475569", fontWeight: "600" }}>Due Date: {new Date(a.dueDate).toLocaleDateString()}</small>
                  
                  {a.mySubmission ? (
                    <div style={{ marginTop: "16px", padding: "12px", background: "white", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                      <strong style={{ display: "block", color: "#10b981", fontSize: "14px", marginBottom: "8px" }}>✓ You have submitted this assignment</strong>
                      {a.mySubmission.grade ? (
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={badgeStyle("#dbeafe", "#1e40af")}>Grade: {a.mySubmission.grade}</span>
                          <small style={{ color: "#475569", fontStyle: "italic" }}>"{a.mySubmission.feedback}"</small>
                        </div>
                      ) : (
                        <small style={{ color: "#64748b" }}>Not graded yet.</small>
                      )}
                    </div>
                  ) : (
                    <form onSubmit={(e) => handleSubmitAssignment(e, a._id)} style={{ marginTop: "16px", padding: "12px", background: "white", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <input
                          type="file"
                          onChange={(e) => setAssignFile(e.target.files[0])}
                          required
                          style={{ padding: "8px", border: "1px solid #cbd5e1", borderRadius: "6px", flex: 1 }}
                        />
                        <button type="submit" disabled={uploadingAssignment} style={{ padding: "10px 16px", background: "#2563eb", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>
                          {uploadingAssignment ? "Submitting..." : "Upload Solution"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === "placements" && (
        <div style={{ display: 'grid', gridTemplateColumns: selectedCompany ? '1fr 1fr' : '1fr', gap: '20px' }}>
          <div style={detailsBlockStyle}>
            <h3 style={{ marginTop: 0, color: "#1e293b" }}>Placement Drives</h3>
            <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "20px" }}>
              Explore visiting recruitment companies and review eligibility policies.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {companies.map((comp) => {
                const eligible = comp.eligibilityStatus === 'Eligible';
                const applied = appliedCompanies.has(comp.name);
                return (
                  <div key={comp._id} style={companyItemStyle(selectedCompany?._id === comp._id)}>
                    <div style={{ flex: 1 }} onClick={() => handleCompanySelect(comp)}>
                      <h4 style={{ margin: "0 0 4px 0", color: "#1e293b", display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {comp.name}
                        {eligible ? (
                          <span style={badgeStyle("#d1fae5", "#065f46")}>Eligible</span>
                        ) : (
                          <span style={badgeStyle("#fee2e2", "#991b1b")} title={comp.ineligibilityReason}>Ineligible</span>
                        )}
                      </h4>
                      <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 6px 0' }}>
                        {comp.description}
                      </p>
                      {comp.ineligibilityReason && !eligible && (
                        <small style={{ color: '#ef4444', display: 'block', marginBottom: '6px' }}>Reason: {comp.ineligibilityReason}</small>
                      )}
                      <small style={{ color: '#475569', fontWeight: '500' }}>
                        Package: {comp.package ? `${comp.package} LPA` : "See company details"}
                      </small>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <button 
                        onClick={() => handleApplyCompany(comp)} 
                        disabled={!eligible}
                        style={applied ? appliedBtnStyle : eligible ? applyBtnStyle : disabledBtnStyle}
                      >
                        {applied ? "Withdraw" : "Apply"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedCompany && (
            <div style={detailsBlockStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, color: "#1e293b" }}>{selectedCompany.name} Experiences</h3>
                <button onClick={() => setSelectedCompany(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px', color: '#64748b' }}>✕</button>
              </div>

              {/* Share Experience Form */}
              <form onSubmit={handleSubmitExperience} style={{ marginBottom: "20px", background: "#f8fafc", padding: "15px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#334155" }}>Share Your Experience</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                  <input
                    type="text"
                    placeholder="Role (e.g. SWE Intern)"
                    value={expRole}
                    onChange={(e) => setExpRole(e.target.value)}
                    required
                    style={subInputStyle}
                  />
                  <select value={expDifficulty} onChange={(e) => setExpDifficulty(e.target.value)} style={subInputStyle}>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                  <select value={expStatus} onChange={(e) => setExpStatus(e.target.value)} style={subInputStyle}>
                    <option value="Selected">Selected</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                  <button type="submit" style={shareBtnStyle}>Submit</button>
                </div>
                <textarea
                  placeholder="Share details about interview rounds, questions, and timings..."
                  value={expText}
                  onChange={(e) => setExpText(e.target.value)}
                  required
                  style={{ ...subInputStyle, width: "100%", height: "60px", resize: "none", boxSizing: "border-box" }}
                />
              </form>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                {experiences.length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '14px', textAlign: 'center', margin: '20px 0' }}>No interview experiences shared yet.</p>
                ) : (
                  experiences.map((exp) => (
                    <div key={exp._id} style={experienceCardStyle}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <strong>{exp.role} ({exp.year})</strong>
                        <span style={badgeStyle(exp.status === 'Selected' ? '#d1fae5' : '#fee2e2', exp.status === 'Selected' ? '#065f46' : '#991b1b')}>
                          {exp.status}
                        </span>
                      </div>
                      <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 8px 0', lineHeight: '1.4' }}>
                        {exp.experienceText}
                      </p>
                      <small style={{ color: '#94a3b8' }}>
                        Difficulty: <span style={{ fontWeight: '600', color: exp.difficulty === 'Hard' ? '#ef4444' : '#eab308' }}>{exp.difficulty}</span> • Submitted by {exp.student?.name || "Student"}
                      </small>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "events" && (
        <div style={detailsBlockStyle}>
          <h3 style={{ marginTop: 0, color: "#1e293b" }}>Campus Events</h3>
          <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "20px" }}>
            Register for upcoming hackathons, career workshops, and technical presentations.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {events.map(ev => {
              const registered = registeredEvents.has(ev.id);
              return (
                <div key={ev.id} style={eventItemStyle}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <h4 style={{ margin: 0, color: '#1e293b' }}>{ev.title}</h4>
                      <span style={badgeStyle('#e0f2fe', '#0369a1')}>{ev.organizer}</span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#64748b', margin: '6px 0' }}>{ev.desc}</p>
                    <small style={{ color: '#475569', fontWeight: '500' }}>Scheduled: {ev.date}</small>
                  </div>
                  <button 
                    onClick={() => handleRegisterEvent(ev.id)}
                    style={registered ? registeredBtnStyle : registerBtnStyle}
                  >
                    {registered ? "Registered ✓" : "Register Now"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === "profile" && (
        <div style={detailsBlockStyle}>
          <h3 style={{ marginTop: 0, color: "#1e293b" }}>Profile Settings</h3>
          <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "20px" }}>
            Verify your official student registration information.
          </p>
          <div style={profileGridStyle}>
            <div style={profileItemStyle}>
              <small>Name</small>
              <p>{user?.name}</p>
            </div>
            <div style={profileItemStyle}>
              <small>Email Address</small>
              <p>{user?.email}</p>
            </div>
            <div style={profileItemStyle}>
              <small>Academic Branch</small>
              <p>{user?.department || "CSE"}</p>
            </div>
            <div style={profileItemStyle}>
              <small>Current CGPA</small>
              <p>{user?.cgpa ?? 0}</p>
            </div>
            <div style={profileItemStyle}>
              <small>Verified Account Status</small>
              <p>{user?.isVerified ? "Verified ✅" : "Pending Verification ⚠️"}</p>
            </div>
            <div style={profileItemStyle}>
              <small>Role Privilege</small>
              <p style={{ textTransform: "uppercase" }}>{user?.role}</p>
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

const progressOuterStyle = {
  flex: 1,
  height: '10px',
  background: '#e2e8f0',
  borderRadius: '5px',
  overflow: 'hidden'
};

const progressInnerStyle = (percentage) => ({
  width: `${percentage}%`,
  height: '100%',
  background: '#3b82f6',
  borderRadius: '5px'
});

const scheduleItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  background: '#f8fafc',
  padding: '12px',
  borderRadius: '12px',
  border: '1px solid #e2e8f0'
};

const subjectGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "20px"
};

const subjectCardStyle = (background) => ({
  background,
  borderRadius: "16px",
  overflow: "hidden",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
});

const companyItemStyle = (isSelected) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '16px',
  background: isSelected ? '#f0f9ff' : '#f8fafc',
  border: isSelected ? '1px solid #0284c7' : '1px solid #e2e8f0',
  borderRadius: '12px',
  cursor: 'pointer',
  transition: 'all 0.2s'
});

const applyBtnStyle = {
  padding: '8px 16px',
  background: '#3b82f6',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontWeight: '600',
  fontSize: '13px',
  cursor: 'pointer'
};

const disabledBtnStyle = {
  ...applyBtnStyle,
  background: '#e2e8f0',
  color: '#94a3b8',
  cursor: 'not-allowed'
};

const appliedBtnStyle = {
  ...applyBtnStyle,
  background: '#10b981',
  color: 'white',
  cursor: 'default'
};

const badgeStyle = (bg, color) => ({
  padding: '2px 8px',
  background: bg,
  color: color,
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: '700'
});

const experienceCardStyle = {
  padding: '12px',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '10px'
};

const subInputStyle = {
  padding: "8px 12px",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  outline: "none",
  fontSize: "13px"
};

const shareBtnStyle = {
  padding: "8px",
  background: "#3b82f6",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: "13px"
};


const eventItemStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '16px',
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '12px'
};

const registerBtnStyle = {
  padding: '8px 16px',
  background: '#0ea5e9',
  color: 'white',
  border: 'none',
  borderRadius: '8px',
  fontWeight: '600',
  fontSize: '13px',
  cursor: 'pointer'
};

const registeredBtnStyle = {
  ...registerBtnStyle,
  background: '#10b981',
  cursor: 'pointer'
};

const profileGridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "20px"
};

const profileItemStyle = {
  background: "#f8fafc",
  padding: "16px",
  borderRadius: "10px",
  border: "1px solid #e2e8f0"
};

export default StudentDashboard;