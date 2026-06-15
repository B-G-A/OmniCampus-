const { getSupabaseAdmin } = require('../config/db');
const { AppError } = require('../middleware/errorHandler');

const db = () => getSupabaseAdmin();

const requireField = (value, message) => {
  if (value === undefined || value === null || value === '') {
    throw new AppError(message, 400, 'VALIDATION_ERROR');
  }
};

const getStudentProfile = async (studentUserId) => {
  const client = db();
  const { data, error } = await client
    .from('students')
    .select('student_id, user_id, roll_number, section, cgpa, active_backlogs, departments(*), semesters(*), users(*)')
    .eq('user_id', studentUserId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    studentId: data.student_id,
    rollNumber: data.roll_number,
    section: data.section,
    cgpa: data.cgpa,
    activeBacklogs: data.active_backlogs,
    departmentId: data.departments?.department_id || null,
    departmentName: data.departments?.department_name || null,
    departmentCode: data.departments?.department_code || null,
    semesterId: data.semesters?.semester_id || null,
    semesterNumber: data.semesters?.semester_number || null,
    academicYear: data.semesters?.academic_year || null,
  };
};

const toCompany = (row, extras = {}) => ({
  _id: row.company_id,
  id: row.company_id,
  name: row.company_name,
  role: row.role,
  package: row.package,
  eligibility: row.eligibility || {},
  driveDate: row.drive_date,
  website: row.website_url || null,
  description: row.description || null,
  eligibilityStatus: extras.eligibilityStatus || null,
  isApplied: extras.isApplied || false,
});

const getDashboardStats = async (req, res, next) => {
  try {
    const client = db();
    const [{ count: companyCount }, { count: applicationCount }, { count: resultCount }, { count: placedCount }] = await Promise.all([
      client.from('companies').select('company_id', { count: 'exact', head: true }),
      client.from('placement_applications').select('application_id', { count: 'exact', head: true }),
      client.from('placement_results').select('result_id', { count: 'exact', head: true }),
      client.from('placement_results').select('result_id', { count: 'exact', head: true }).eq('result', 'selected'),
    ]);

    const { data: results } = await client
      .from('placement_results')
      .select('student_id, company_id, package, result, companies(company_name, role)')
      .order('created_at', { ascending: false });
      
    const deptStats = [];
    const { data: students } = await client.from('students').select('student_id, cgpa, departments(department_code)');
    const totalStudents = students?.length || 0;
    const byDept = new Map();
    
    (results || []).forEach((row) => {
      const student = students?.find((item) => item.student_id === row.student_id);
      const dept = student?.departments?.department_code || 'Unknown';
      const bucket = byDept.get(dept) || { department: dept, selectionsCount: 0, avgPackage: 0, packages: [] };
      bucket.selectionsCount += row.result === 'selected' ? 1 : 0;
      if (row.package) bucket.packages.push(Number(row.package));
      byDept.set(dept, bucket);
    });
    
    for (const bucket of byDept.values()) {
      bucket.avgPackage = bucket.packages.length ? Number((bucket.packages.reduce((sum, pkg) => sum + pkg, 0) / bucket.packages.length).toFixed(2)) : 0;
      delete bucket.packages;
      deptStats.push(bucket);
    }

    res.json({
      success: true,
      data: {
        totalCompanies: companyCount || 0,
        totalApplications: applicationCount || 0,
        totalResults: resultCount || 0,
        totalPlaced: placedCount || 0,
        deptStats,
        placementRate: totalStudents ? Number(((placedCount || 0) / totalStudents * 100).toFixed(1)) : 0,
      },
    });
  } catch (error) {
    next(error);
  }
};

const listCompanies = async (req, res, next) => {
  try {
    const client = db();
    const { data, error } = await client.from('companies').select('*').order('drive_date', { ascending: true });
    if (error) throw error;

    let student = null;
    if (req.user && req.user.role === 'student') {
      student = await getStudentProfile(req.user.id);
    }

    const appliedIds = new Set();
    if (student) {
      const { data: applications } = await client.from('placement_applications').select('company_id').eq('student_id', student.studentId);
      (applications || []).forEach((row) => appliedIds.add(row.company_id));
    }

    const companies = (data || []).map((row) => {
      let eligibilityStatus = null;
      if (student) {
        const minCgpa = Number(row.eligibility?.minCGPA || 0);
        const allowedBranches = row.eligibility?.allowedBranches || [];
        const cgpaOk = Number(student.cgpa || 0) >= minCgpa;
        const branchOk = !allowedBranches.length || allowedBranches.includes(student.departmentCode || student.departmentName || '');
        eligibilityStatus = cgpaOk && branchOk ? 'Eligible' : 'Not Eligible';
      }
      return toCompany(row, { eligibilityStatus, isApplied: appliedIds.has(row.company_id) });
    });

    res.json({ success: true, data: companies });
  } catch (error) {
    next(error);
  }
};

const createCompany = async (req, res, next) => {
  try {
    const { name, role, package: packageAmount, eligibility, driveDate, website, description } = req.body;
    requireField(name, 'name is required.');
    const extractedRole = role || (req.body.rolesOffered && req.body.rolesOffered[0]?.title) || 'Software Engineer';
    const extractedPackage = packageAmount || (req.body.rolesOffered && req.body.rolesOffered[0]?.packageLPA) || 0;
    const extractedDriveDate = driveDate || new Date(Date.now() + 30*24*60*60*1000).toISOString();

    const client = db();
    const { data, error } = await client.from('companies').insert({
      company_name: name,
      role: extractedRole,
      package: extractedPackage,
      eligibility: eligibility || {},
      drive_date: extractedDriveDate,
      website_url: website || null,
      description: description || null,
    }).select('*').single();
    if (error) throw error;
    res.status(201).json({ success: true, data: toCompany(data) });
  } catch (error) {
    next(error);
  }
};

const getCompanyDetails = async (req, res, next) => {
  try {
    const client = db();
    const { data, error } = await client
      .from('companies')
      .select('*')
      .eq('company_id', req.params.id)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new AppError('Company not found.', 404, 'NOT_FOUND');

    let student = null;
    let isApplied = false;
    if (req.user && req.user.role === 'student') {
      student = await getStudentProfile(req.user.id);
      if (student) {
        const { data: application } = await client.from('placement_applications').select('application_id').eq('student_id', student.studentId).eq('company_id', req.params.id).maybeSingle();
        isApplied = !!application;
      }
    }

    res.json({ success: true, data: toCompany(data, { isApplied }) });
  } catch (error) {
    next(error);
  }
};

const listExperiences = async (req, res, next) => {
  try {
    const client = db();
    const { data, error } = await client
      .from('interview_experiences')
      .select('experience_id, company_id, student_id, role, year, difficulty, experience_text, status, created_at')
      .eq('company_id', req.params.id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    next(error);
  }
};

const createExperience = async (req, res, next) => {
  try {
    const { role, year, difficulty, experienceText, status } = req.body;
    const student = await getStudentProfile(req.user.id);
    const client = db();
    const { data, error } = await client.from('interview_experiences').insert({
      company_id: req.params.id,
      student_id: student?.studentId || null,
      role: role || null,
      year: year || null,
      difficulty: difficulty || null,
      experience_text: experienceText || null,
      status: status || null,
    }).select('*').single();
    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const createPlacementRecord = async (req, res, next) => {
  try {
    const { companyId, studentName, studentEmail, department, year, packageLPA } = req.body;
    requireField(companyId, 'companyId is required.');
    const client = db();
    const { data: company, error: companyError } = await client.from('companies').select('*').eq('company_id', companyId).maybeSingle();
    if (companyError) throw companyError;
    if (!company) throw new AppError('Company not found.', 404, 'NOT_FOUND');

    let studentId = null;
    if (studentEmail) {
      const { data: studentUser } = await client.from('users').select('user_id').eq('email', studentEmail.toLowerCase()).maybeSingle();
      if (studentUser) {
        const { data: studentProfile } = await client.from('students').select('student_id').eq('user_id', studentUser.user_id).maybeSingle();
        studentId = studentProfile?.student_id || null;
      }
    }

    const { data, error } = await client.from('placement_results').insert({
      student_id: studentId,
      company_id: companyId,
      package: packageLPA || company.package || null,
      result: 'selected',
      student_name: studentName || null,
      student_email: studentEmail || null,
      department: department || null,
      passed_year: year || null,
    }).select('*').single();
    if (error) throw error;
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const applyToCompany = async (req, res, next) => {
  try {
    const client = db();
    const student = await getStudentProfile(req.user.id);
    if (!student) throw new AppError('Student profile not found', 404, 'NOT_FOUND');
    
    const { error } = await client.from('placement_applications').upsert({
      student_id: student.studentId,
      company_id: req.params.id,
      status: 'applied',
    }, { onConflict: 'student_id,company_id' });
    
    if (error) throw error;
    res.json({ success: true, message: 'Successfully applied to company' });
  } catch (error) {
    next(error);
  }
};

const withdrawApplication = async (req, res, next) => {
  try {
    const client = db();
    const student = await getStudentProfile(req.user.id);
    if (!student) throw new AppError('Student profile not found', 404, 'NOT_FOUND');

    const { error } = await client.from('placement_applications').delete()
      .eq('student_id', student.studentId)
      .eq('company_id', req.params.id);
      
    if (error) throw error;
    res.json({ success: true, message: 'Application withdrawn' });
  } catch (error) {
    next(error);
  }
};

const getStudentApplications = async (req, res, next) => {
  try {
    const client = db();
    const student = await getStudentProfile(req.user.id);
    if (!student) return res.json({ success: true, data: [] });

    const { data, error } = await client.from('placement_applications')
      .select('application_id, status, applied_at, companies(*)')
      .eq('student_id', student.studentId);
      
    if (error) throw error;
    res.json({ success: true, data: data || [] });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  listCompanies,
  createCompany,
  getCompanyDetails,
  listExperiences,
  createExperience,
  createPlacementRecord,
  applyToCompany,
  withdrawApplication,
  getStudentApplications,
};
