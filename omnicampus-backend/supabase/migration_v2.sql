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
