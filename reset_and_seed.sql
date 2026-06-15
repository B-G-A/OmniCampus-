-- ==========================================
-- COMPLETE WIPE AND SEED SCRIPT
-- ==========================================

-- 1. Wipe Existing Schema Clean
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- 2. BASE SCHEMA
-- Enums
CREATE TYPE user_role AS ENUM ('admin', 'teacher', 'student', 'placement_officer');
CREATE TYPE account_status AS ENUM ('active', 'inactive', 'suspended', 'pending');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'late', 'excused');
CREATE TYPE submission_status AS ENUM ('submitted', 'graded', 'late', 'missing');
CREATE TYPE notification_type AS ENUM ('system', 'academic', 'placement', 'chat', 'assignment');
CREATE TYPE chat_message_role AS ENUM ('user', 'assistant', 'system');
CREATE TYPE application_status AS ENUM ('applied', 'shortlisted', 'rejected', 'selected');
CREATE TYPE result_status AS ENUM ('selected', 'rejected', 'waitlisted');

-- Update Trigger Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- ==========================================
-- USERS & DEPARTMENTS
-- ==========================================

CREATE TABLE users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL,
  status account_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE departments (
  department_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_name TEXT NOT NULL UNIQUE,
  department_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- ACADEMICS
-- ==========================================

CREATE TABLE semesters (
  semester_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  semester_number SMALLINT NOT NULL CHECK (semester_number BETWEEN 1 AND 8),
  academic_year TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(semester_number, academic_year)
);

CREATE TABLE subjects (
  subject_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID NOT NULL REFERENCES departments(department_id) ON DELETE RESTRICT,
  semester_id UUID NOT NULL REFERENCES semesters(semester_id) ON DELETE RESTRICT,
  subject_code TEXT NOT NULL UNIQUE,
  subject_name TEXT NOT NULL,
  credits SMALLINT NOT NULL CHECK (credits > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- ROLES
-- ==========================================

CREATE TABLE teachers (
  teacher_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(department_id) ON DELETE RESTRICT,
  employee_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE students (
  student_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(department_id) ON DELETE RESTRICT,
  semester_id UUID NOT NULL REFERENCES semesters(semester_id) ON DELETE RESTRICT,
  roll_number TEXT NOT NULL UNIQUE,
  section TEXT NOT NULL DEFAULT 'A',
  cgpa NUMERIC(4,2) NOT NULL DEFAULT 0.00 CHECK (cgpa BETWEEN 0 AND 10),
  active_backlogs INTEGER NOT NULL DEFAULT 0 CHECK (active_backlogs >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- MAPPINGS & ENROLLMENTS
-- ==========================================

CREATE TABLE teacher_subject_mappings (
  mapping_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(teacher_id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(subject_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(teacher_id, subject_id)
);

CREATE TABLE student_enrollments (
  enrollment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(subject_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, subject_id)
);

-- ==========================================
-- ATTENDANCE & MARKS
-- ==========================================

CREATE TABLE attendance (
  attendance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(subject_id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status attendance_status NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, subject_id, date)
);

CREATE TABLE marks (
  mark_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(subject_id) ON DELETE CASCADE,
  internal_marks NUMERIC(5,2) NOT NULL DEFAULT 0,
  assignment_marks NUMERIC(5,2) NOT NULL DEFAULT 0,
  lab_marks NUMERIC(5,2) NOT NULL DEFAULT 0,
  mid_exam_marks NUMERIC(5,2) NOT NULL DEFAULT 0,
  total NUMERIC(6,2) NOT NULL DEFAULT 0,
  grade TEXT NOT NULL DEFAULT 'F',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, subject_id)
);
CREATE TRIGGER update_marks_updated_at BEFORE UPDATE ON marks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- COURSEWORK
-- ==========================================

CREATE TABLE materials (
  material_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(teacher_id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(subject_id) ON DELETE CASCADE,
  semester_id UUID NOT NULL REFERENCES semesters(semester_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE assignments (
  assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES teachers(teacher_id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(subject_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE assignment_submissions (
  submission_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES assignments(assignment_id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  file_path TEXT,
  marks NUMERIC(5,2),
  feedback TEXT,
  status submission_status NOT NULL DEFAULT 'submitted',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(assignment_id, student_id)
);

-- ==========================================
-- PLACEMENTS
-- ==========================================

CREATE TABLE companies (
  company_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  package NUMERIC(10,2) NOT NULL,
  eligibility JSONB NOT NULL DEFAULT '{}'::jsonb,
  drive_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE placement_applications (
  application_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  status application_status NOT NULL DEFAULT 'applied',
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, company_id)
);

CREATE TABLE placement_results (
  result_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  package NUMERIC(10,2) NOT NULL,
  result result_status NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, company_id)
);

-- ==========================================
-- EVENTS & NOTIFICATIONS
-- ==========================================

CREATE TABLE events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  venue TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE event_registrations (
  registration_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(event_id, student_id)
);

CREATE TABLE notifications (
  notification_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type notification_type NOT NULL DEFAULT 'system',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- AI CHATBOT
-- ==========================================

CREATE TABLE chat_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(subject_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_active TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TRIGGER update_chats_last_active BEFORE UPDATE ON chat_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE chat_messages (
  message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
  role chat_message_role NOT NULL,
  message TEXT NOT NULL,
  response TEXT,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Enablement
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_subject_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- SYSTEM & SECURITY (Added from erp.routes.js requirements)
-- ==========================================

CREATE TABLE refresh_tokens (
  refresh_token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE audit_logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE interview_experiences (
  experience_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  difficulty SMALLINT CHECK (difficulty BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_experiences ENABLE ROW LEVEL SECURITY;

-- Note: Proper RLS policies should be created per app requirements.

-- 3. MIGRATION UPDATES
-- 9 tables need column additions to match controller code

-- 1. subjects: add description, banner_color
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS banner_color TEXT DEFAULT '#3B82F6';

-- 2. materials: add file_name, file_size, unit, department_id
ALTER TABLE materials ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments(department_id);

-- 3. assignments: add attachment_path, attachment_name
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS attachment_path TEXT;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS attachment_name TEXT;

-- 4. assignment_submissions: add file_name
ALTER TABLE assignment_submissions ADD COLUMN IF NOT EXISTS file_name TEXT;

-- 5. companies: add website_url, description
ALTER TABLE companies ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS description TEXT;

-- 6. interview_experiences: add year, experience_text, status
ALTER TABLE interview_experiences ADD COLUMN IF NOT EXISTS year INT;
ALTER TABLE interview_experiences ADD COLUMN IF NOT EXISTS experience_text TEXT;
ALTER TABLE interview_experiences ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Selected';

-- 7. placement_results: add student_name, student_email, department, passed_year
ALTER TABLE placement_results ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE placement_results ADD COLUMN IF NOT EXISTS student_email TEXT;
ALTER TABLE placement_results ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE placement_results ADD COLUMN IF NOT EXISTS passed_year INT;

-- 8. student_enrollments: add status
ALTER TABLE student_enrollments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'enrolled';

-- 9. teacher_subject_mappings: add academic_year
ALTER TABLE teacher_subject_mappings ADD COLUMN IF NOT EXISTS academic_year TEXT;

-- 10. semesters: add is_active for semester activation
ALTER TABLE semesters ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE;

-- 11. Fix user_role enum to include 'tpo'
DO $$ BEGIN
  ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'tpo';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 12. Fix chat_sessions trigger (uses updated_at but column is last_active)
DROP TRIGGER IF EXISTS update_chats_last_active ON chat_sessions;
CREATE OR REPLACE FUNCTION update_chat_last_active()
RETURNS TRIGGER AS $$
BEGIN
   NEW.last_active = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';
CREATE TRIGGER update_chats_last_active
  BEFORE UPDATE ON chat_sessions
  FOR EACH ROW EXECUTE FUNCTION update_chat_last_active();

-- 13. Add performance indexes
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_subject ON attendance(subject_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_marks_student ON marks(student_id);
CREATE INDEX IF NOT EXISTS idx_marks_subject ON marks(subject_id);
CREATE INDEX IF NOT EXISTS idx_materials_subject ON materials(subject_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON student_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_subject ON student_enrollments(subject_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_assignments_subject ON assignments(subject_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment ON assignment_submissions(assignment_id);


-- ==========================================
-- 4. SEED DATA
-- ==========================================

-- Insert Departments
INSERT INTO departments (department_id, department_name, department_code) VALUES 
('11111111-1111-1111-1111-111111111111', 'Computer Science and Engineering', 'CSE'),
('22222222-2222-2222-2222-222222222222', 'Electronics and Communication', 'ECE');

-- Insert Semesters 1 to 8
INSERT INTO semesters (semester_number, academic_year, is_active) VALUES 
(1, '2026-2027', false),
(2, '2026-2027', false),
(3, '2026-2027', false),
(4, '2026-2027', false),
(5, '2026-2027', true),
(6, '2026-2027', false),
(7, '2026-2027', false),
(8, '2026-2027', false);

-- Insert 1 Admin
INSERT INTO users (user_id, name, email, password_hash, role) VALUES 
('admin000-0000-0000-0000-000000000000', 'Super Admin', 'admin@omnicampus.com', 'hashed_password_placeholder', 'admin');

-- Insert 5 TPOs
INSERT INTO users (user_id, name, email, password_hash, role) VALUES ('tpo00000-0000-0000-0000-000000000001', 'TPO Officer 1', 'tpo1@omnicampus.com', 'hashed_password', 'tpo');
INSERT INTO users (user_id, name, email, password_hash, role) VALUES ('tpo00000-0000-0000-0000-000000000002', 'TPO Officer 2', 'tpo2@omnicampus.com', 'hashed_password', 'tpo');
INSERT INTO users (user_id, name, email, password_hash, role) VALUES ('tpo00000-0000-0000-0000-000000000003', 'TPO Officer 3', 'tpo3@omnicampus.com', 'hashed_password', 'tpo');
INSERT INTO users (user_id, name, email, password_hash, role) VALUES ('tpo00000-0000-0000-0000-000000000004', 'TPO Officer 4', 'tpo4@omnicampus.com', 'hashed_password', 'tpo');
INSERT INTO users (user_id, name, email, password_hash, role) VALUES ('tpo00000-0000-0000-0000-000000000005', 'TPO Officer 5', 'tpo5@omnicampus.com', 'hashed_password', 'tpo');

-- Insert 5 Teachers
INSERT INTO users (user_id, name, email, password_hash, role) VALUES ('teach000-0000-0000-0000-000000000001', 'Teacher 1', 'teacher1@omnicampus.com', 'hashed_password', 'teacher');
INSERT INTO teachers (user_id, department_id, employee_id) VALUES ('teach000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'EMP-T-1');
INSERT INTO users (user_id, name, email, password_hash, role) VALUES ('teach000-0000-0000-0000-000000000002', 'Teacher 2', 'teacher2@omnicampus.com', 'hashed_password', 'teacher');
INSERT INTO teachers (user_id, department_id, employee_id) VALUES ('teach000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'EMP-T-2');
INSERT INTO users (user_id, name, email, password_hash, role) VALUES ('teach000-0000-0000-0000-000000000003', 'Teacher 3', 'teacher3@omnicampus.com', 'hashed_password', 'teacher');
INSERT INTO teachers (user_id, department_id, employee_id) VALUES ('teach000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'EMP-T-3');
INSERT INTO users (user_id, name, email, password_hash, role) VALUES ('teach000-0000-0000-0000-000000000004', 'Teacher 4', 'teacher4@omnicampus.com', 'hashed_password', 'teacher');
INSERT INTO teachers (user_id, department_id, employee_id) VALUES ('teach000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'EMP-T-4');
INSERT INTO users (user_id, name, email, password_hash, role) VALUES ('teach000-0000-0000-0000-000000000005', 'Teacher 5', 'teacher5@omnicampus.com', 'hashed_password', 'teacher');
INSERT INTO teachers (user_id, department_id, employee_id) VALUES ('teach000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'EMP-T-5');

-- Insert 10 Students
INSERT INTO users (user_id, name, email, password_hash, role) VALUES ('stud0000-0000-0000-0000-000000000001', 'Student 1', 'student1@omnicampus.com', 'hashed_password', 'student');
INSERT INTO students (user_id, department_id, semester_id, roll_number, section, cgpa) 
            VALUES ('stud0000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', (SELECT semester_id FROM semesters WHERE semester_number = 5 LIMIT 1), 'ROLL-S-1', 'A', 8.5);
INSERT INTO users (user_id, name, email, password_hash, role) VALUES ('stud0000-0000-0000-0000-000000000002', 'Student 2', 'student2@omnicampus.com', 'hashed_password', 'student');
INSERT INTO students (user_id, department_id, semester_id, roll_number, section, cgpa) 
            VALUES ('stud0000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', (SELECT semester_id FROM semesters WHERE semester_number = 5 LIMIT 1), 'ROLL-S-2', 'A', 8.5);
INSERT INTO users (user_id, name, email, password_hash, role) VALUES ('stud0000-0000-0000-0000-000000000003', 'Student 3', 'student3@omnicampus.com', 'hashed_password', 'student');
INSERT INTO students (user_id, department_id, semester_id, roll_number, section, cgpa) 
            VALUES ('stud0000-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', (SELECT semester_id FROM semesters WHERE semester_number = 5 LIMIT 1), 'ROLL-S-3', 'A', 8.5);
INSERT INTO users (user_id, name, email, password_hash, role) VALUES ('stud0000-0000-0000-0000-000000000004', 'Student 4', 'student4@omnicampus.com', 'hashed_password', 'student');
INSERT INTO students (user_id, department_id, semester_id, roll_number, section, cgpa) 
            VALUES ('stud0000-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', (SELECT semester_id FROM semesters WHERE semester_number = 5 LIMIT 1), 'ROLL-S-4', 'A', 8.5);
INSERT INTO users (user_id, name, email, password_hash, role) VALUES ('stud0000-0000-0000-0000-000000000005', 'Student 5', 'student5@omnicampus.com', 'hashed_password', 'student');
INSERT INTO students (user_id, department_id, semester_id, roll_number, section, cgpa) 
            VALUES ('stud0000-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', (SELECT semester_id FROM semesters WHERE semester_number = 5 LIMIT 1), 'ROLL-S-5', 'A', 8.5);
INSERT INTO users (user_id, name, email, password_hash, role) VALUES ('stud0000-0000-0000-0000-000000000006', 'Student 6', 'student6@omnicampus.com', 'hashed_password', 'student');
INSERT INTO students (user_id, department_id, semester_id, roll_number, section, cgpa) 
            VALUES ('stud0000-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', (SELECT semester_id FROM semesters WHERE semester_number = 5 LIMIT 1), 'ROLL-S-6', 'A', 8.5);
INSERT INTO users (user_id, name, email, password_hash, role) VALUES ('stud0000-0000-0000-0000-000000000007', 'Student 7', 'student7@omnicampus.com', 'hashed_password', 'student');
INSERT INTO students (user_id, department_id, semester_id, roll_number, section, cgpa) 
            VALUES ('stud0000-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', (SELECT semester_id FROM semesters WHERE semester_number = 5 LIMIT 1), 'ROLL-S-7', 'A', 8.5);
INSERT INTO users (user_id, name, email, password_hash, role) VALUES ('stud0000-0000-0000-0000-000000000008', 'Student 8', 'student8@omnicampus.com', 'hashed_password', 'student');
INSERT INTO students (user_id, department_id, semester_id, roll_number, section, cgpa) 
            VALUES ('stud0000-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', (SELECT semester_id FROM semesters WHERE semester_number = 5 LIMIT 1), 'ROLL-S-8', 'A', 8.5);
INSERT INTO users (user_id, name, email, password_hash, role) VALUES ('stud0000-0000-0000-0000-000000000009', 'Student 9', 'student9@omnicampus.com', 'hashed_password', 'student');
INSERT INTO students (user_id, department_id, semester_id, roll_number, section, cgpa) 
            VALUES ('stud0000-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', (SELECT semester_id FROM semesters WHERE semester_number = 5 LIMIT 1), 'ROLL-S-9', 'A', 8.5);
INSERT INTO users (user_id, name, email, password_hash, role) VALUES ('stud0000-0000-0000-0000-000000000010', 'Student 10', 'student10@omnicampus.com', 'hashed_password', 'student');
INSERT INTO students (user_id, department_id, semester_id, roll_number, section, cgpa) 
            VALUES ('stud0000-0000-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', (SELECT semester_id FROM semesters WHERE semester_number = 5 LIMIT 1), 'ROLL-S-10', 'A', 8.5);
