const fs = require('fs');
const path = require('path');

const generateSQL = () => {
  const schemaPath = path.join(__dirname, 'omnicampus-backend', 'supabase', 'schema.sql');
  const migrationPath = path.join(__dirname, 'omnicampus-backend', 'supabase', 'migration_v2.sql');
  
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  const migrationContent = fs.readFileSync(migrationPath, 'utf8');

  let sql = `-- ==========================================
-- COMPLETE WIPE AND SEED SCRIPT
-- ==========================================

-- 1. Wipe Existing Schema Clean
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

`;

  // Filter out the enum creations if we just wiped schema? Wait, DROP SCHEMA CASCADE drops enums too.
  // The migration_v2.sql tries to do: ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'tpo';
  // But wait! If we do a clean DROP SCHEMA public CASCADE, we also drop the auth schema? No, auth schema is separate in supabase.
  // Wait, Supabase uses the public schema for our tables.
  
  sql += `-- 2. BASE SCHEMA\n${schemaContent}\n\n`;
  sql += `-- 3. MIGRATION UPDATES\n${migrationContent}\n\n`;

  sql += `-- ==========================================
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
`;

  for(let i=1; i<=5; i++) {
    sql += `INSERT INTO users (user_id, name, email, password_hash, role) VALUES ('tpo00000-0000-0000-0000-00000000000${i}', 'TPO Officer ${i}', 'tpo${i}@omnicampus.com', 'hashed_password', 'tpo');\n`;
  }

  sql += `\n-- Insert 5 Teachers\n`;
  for(let i=1; i<=5; i++) {
    const uid = `teach000-0000-0000-0000-00000000000${i}`;
    sql += `INSERT INTO users (user_id, name, email, password_hash, role) VALUES ('${uid}', 'Teacher ${i}', 'teacher${i}@omnicampus.com', 'hashed_password', 'teacher');\n`;
    sql += `INSERT INTO teachers (user_id, department_id, employee_id) VALUES ('${uid}', '11111111-1111-1111-1111-111111111111', 'EMP-T-${i}');\n`;
  }

  sql += `\n-- Insert 10 Students\n`;
  for(let i=1; i<=10; i++) {
    const uid = `stud0000-0000-0000-0000-0000000000${i < 10 ? '0'+i : i}`;
    sql += `INSERT INTO users (user_id, name, email, password_hash, role) VALUES ('${uid}', 'Student ${i}', 'student${i}@omnicampus.com', 'hashed_password', 'student');\n`;
    sql += `INSERT INTO students (user_id, department_id, semester_id, roll_number, section, cgpa) 
            VALUES ('${uid}', '11111111-1111-1111-1111-111111111111', (SELECT semester_id FROM semesters WHERE semester_number = 5 LIMIT 1), 'ROLL-S-${i}', 'A', 8.5);\n`;
  }

  fs.writeFileSync(path.join(__dirname, 'reset_and_seed.sql'), sql);
  console.log("SQL artifact created at reset_and_seed.sql");
};

generateSQL();
