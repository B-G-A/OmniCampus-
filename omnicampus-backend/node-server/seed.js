/**
 * Database Seeding Script.
 *
 * Populates MongoDB with default users (Student, Teacher, Admin, TPO),
 * an active semester, courses, enrolled students, mock companies,
 * and placement analytics records.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');
const Semester = require('./src/models/Semester');
const Subject = require('./src/models/Subject');
const Company = require('./src/models/Company');
const PlacementRecord = require('./src/models/PlacementRecord');
const InterviewExperience = require('./src/models/InterviewExperience');
const Material = require('./src/models/Material');
const ChatHistory = require('./src/models/ChatHistory');
const Announcement = require('./src/models/Announcement');
const connectDB = require('./src/config/db');

const seed = async () => {
  console.log('🌱 Starting database seeding...');

  // Clear existing collections
  console.log('🧹 Clearing existing collections...');
  await User.deleteMany({});
  await Semester.deleteMany({});
  await Subject.deleteMany({});
  await Company.deleteMany({});
  await PlacementRecord.deleteMany({});
  await InterviewExperience.deleteMany({});
  await Material.deleteMany({});
  await ChatHistory.deleteMany({});
  await Announcement.deleteMany({});

  console.log('👥 Creating default users...');

  // Create Admin
  const admin = await User.create({
    name: 'System Admin',
    email: 'admin@college.com',
    password: 'password123',
    role: 'admin',
    isVerified: true
  });

  // Create TPO
  const tpo = await User.create({
    name: 'Dr. Kiran K.',
    email: 'tpo@college.com',
    password: 'password123',
    role: 'tpo',
    isVerified: true
  });

  // Create Teacher
  const teacher = await User.create({
    name: 'Dr. Sharma',
    email: 'teacher@college.com',
    password: 'password123',
    role: 'teacher',
    isVerified: true
  });

  // Create Student
  const student = await User.create({
    name: 'Abhishna',
    email: 'student@college.com',
    password: 'password123',
    role: 'student',
    isVerified: true,
    cgpa: 8.15,
    department: 'CSE',
    attendance: 89,
    placementReadiness: 78,
    nextClass: 'DBMS',
    assignmentDue: 'Tomorrow'
  });

  // Create additional students for analytics
  const student2 = await User.create({
    name: 'Rohan Gupta',
    email: 'rohan@college.com',
    password: 'password123',
    role: 'student',
    isVerified: true,
    cgpa: 8.7,
    department: 'CSE',
    attendance: 92,
    placementReadiness: 85
  });

  const student3 = await User.create({
    name: 'Priya Sen',
    email: 'priya@college.com',
    password: 'password123',
    role: 'student',
    isVerified: true,
    cgpa: 7.2,
    department: 'ECE',
    attendance: 76,
    placementReadiness: 62
  });

  console.log('📅 Creating active semester...');
  const semester = await Semester.create({
    name: 'Fall 2026',
    year: '2026',
    semesterNumber: 7,
    isActive: true,
    startDate: new Date('2026-06-01'),
    endDate: new Date('2026-12-15'),
    vectorCollectionName: 'fall_2026_vector_store',
    createdBy: admin._id
  });

  console.log('📚 Creating subjects...');
  const subjects = [
    {
      name: 'Database Management Systems',
      code: 'CS-401',
      description: 'Introduction to relational databases, SQL, indexing, and transaction management.',
      semester: semester._id,
      teacher: teacher._id,
      bannerColor: 'linear-gradient(135deg, #000080, #00004d)',
      enrolledStudents: [student._id, student2._id]
    },
    {
      name: 'Compiler Design',
      code: 'CS-402',
      description: 'Lexical analysis, parsing, syntax-directed translation, and code generation concepts.',
      semester: semester._id,
      teacher: teacher._id,
      bannerColor: 'linear-gradient(135deg, #6a0dad, #8a2be2)',
      enrolledStudents: [student._id, student2._id, student3._id]
    },
    {
      name: 'Operating Systems',
      code: 'CS-403',
      description: 'Process management, scheduling, memory allocation, and file systems.',
      semester: semester._id,
      teacher: teacher._id,
      bannerColor: 'linear-gradient(135deg, #009688, #4caf50)',
      enrolledStudents: [student._id, student3._id]
    }
  ];

  const createdSubjects = await Subject.create(subjects);

  // Update enrolledSubjects in student users
  student.enrolledSubjects = [createdSubjects[0]._id, createdSubjects[1]._id, createdSubjects[2]._id];
  await student.save();

  student2.enrolledSubjects = [createdSubjects[0]._id, createdSubjects[1]._id];
  await student2.save();

  student3.enrolledSubjects = [createdSubjects[1]._id, createdSubjects[2]._id];
  await student3.save();

  console.log('🏢 Creating companies...');
  const companies = [
    {
      name: 'TCS',
      website: 'https://www.tcs.com',
      description: 'Tata Consultancy Services is a global IT services, consulting, and business solutions organization.',
      rolesOffered: [
        { title: 'Ninja Developer', packageLPA: 4.0, description: 'Entry-level systems engineering.' },
        { title: 'Digital Developer', packageLPA: 7.2, description: 'Specialized systems design and full stack development.' }
      ],
      eligibility: { minCGPA: 6.0, allowedBranches: ['CSE', 'ECE', 'ME', 'EEE'] },
      recruitmentProcess: ['National Qualifier Test', 'Technical Interview', 'HR Round'],
      visitedYears: [2024, 2025, 2026]
    },
    {
      name: 'Infosys',
      website: 'https://www.infosys.com',
      description: 'A global leader in next-generation digital services and consulting.',
      rolesOffered: [
        { title: 'Systems Engineer', packageLPA: 3.6, description: 'Core software roles.' },
        { title: 'Power Programmer', packageLPA: 9.5, description: 'Advanced coding and high-performance computing.' }
      ],
      eligibility: { minCGPA: 6.5, allowedBranches: ['CSE', 'ECE', 'EEE'] },
      recruitmentProcess: ['Online Test', 'Technical Round', 'HR Interview'],
      visitedYears: [2025, 2026]
    },
    {
      name: 'Google',
      website: 'https://careers.google.com',
      description: 'Alphabet Inc. subsidiary focused on search engines, cloud computing, and AI systems.',
      rolesOffered: [
        { title: 'Software Engineer', packageLPA: 38.0, description: 'Full stack product development.' },
        { title: 'Site Reliability Engineer', packageLPA: 42.0, description: 'Production systems reliability and scale.' }
      ],
      eligibility: { minCGPA: 8.5, allowedBranches: ['CSE', 'ECE'] },
      recruitmentProcess: ['Online Assessment', 'Technical Interview 1', 'Technical Interview 2', 'Googleyness Round'],
      visitedYears: [2025, 2026]
    },
    {
      name: 'Microsoft',
      website: 'https://careers.microsoft.com',
      description: 'Global developer of software, consumer electronics, and personal computers.',
      rolesOffered: [
        { title: 'Software Engineering Intern', packageLPA: 12.0, description: 'Summer internship.' },
        { title: 'Full Time SWE', packageLPA: 32.0, description: 'Software Development Engineer in Redmond/IDC.' }
      ],
      eligibility: { minCGPA: 8.0, allowedBranches: ['CSE', 'ECE', 'EEE'] },
      recruitmentProcess: ['Coding Round', 'Technical Interview 1', 'Technical Interview 2', 'HR Fitment'],
      visitedYears: [2024, 2025, 2026]
    }
  ];

  const createdCompanies = await Company.create(companies);

  console.log('📈 Creating placement analytics records...');
  const records = [
    // TCS
    { company: createdCompanies[0]._id, studentName: 'Aditya Rao', studentEmail: 'aditya@college.com', department: 'CSE', year: 2026, packageLPA: 7.2 },
    { company: createdCompanies[0]._id, studentName: 'Deepak Sharma', studentEmail: 'deepak@college.com', department: 'ECE', year: 2026, packageLPA: 4.0 },
    { company: createdCompanies[0]._id, studentName: 'Kunal Verma', studentEmail: 'kunal@college.com', department: 'ME', year: 2026, packageLPA: 4.0 },
    // Infosys
    { company: createdCompanies[1]._id, studentName: 'Megha Nair', studentEmail: 'megha@college.com', department: 'CSE', year: 2026, packageLPA: 9.5 },
    { company: createdCompanies[1]._id, studentName: 'Rohan Gupta', studentEmail: 'rohan@college.com', department: 'CSE', year: 2026, packageLPA: 9.5 },
    // Google
    { company: createdCompanies[2]._id, studentName: 'Siddharth Roy', studentEmail: 'siddharth@college.com', department: 'CSE', year: 2025, packageLPA: 38.0 },
    { company: createdCompanies[2]._id, studentName: 'Nikita Kapoor', studentEmail: 'nikita@college.com', department: 'CSE', year: 2026, packageLPA: 42.0 },
    // Microsoft
    { company: createdCompanies[3]._id, studentName: 'Alice Johnson', studentEmail: 'alice@college.com', department: 'CSE', year: 2025, packageLPA: 32.0 },
    { company: createdCompanies[3]._id, studentName: 'Varun Dhawan', studentEmail: 'varun@college.com', department: 'ECE', year: 2026, packageLPA: 32.0 }
  ];

  await PlacementRecord.create(records);

  console.log('💬 Creating interview experiences...');
  await InterviewExperience.create({
    company: createdCompanies[2]._id,
    student: student._id,
    role: 'Software Engineer',
    year: 2026,
    difficulty: 'Hard',
    experienceText: 'Google interview process had 1 online coding test followed by 3 technical rounds focusing on graphs, dynamic programming, and system design. Focus heavily on LeetCode medium/hard topics. The HR/Googleyness round checked scenario-based conflicts and resolution styles.',
    status: 'Selected'
  });

  await InterviewExperience.create({
    company: createdCompanies[3]._id,
    student: student2._id,
    role: 'Full Time SWE',
    year: 2026,
    difficulty: 'Medium',
    experienceText: 'Microsoft round 1 was a simple array question. Round 2 focused on trees and stacks. The interviewer was friendly and helped when I got stuck on edge cases. Always write clean code and explain dry runs!',
    status: 'Selected'
  });
};

module.exports = seed;

// Run standalone if not imported
if (require.main === module) {
  const runSeedStandalone = async () => {
    await connectDB();
    await seed();
    console.log('✅ Seeding completed successfully!');
    mongoose.connection.close();
  };
  
  runSeedStandalone().catch((err) => {
    console.error('❌ Seeding failed:', err);
    mongoose.connection.close();
  });
}
