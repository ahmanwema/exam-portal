-- ============================================================
-- DIAGNOSTIC — Run in Supabase SQL Editor
-- Copy the output and share it
-- ============================================================

-- 1. Check which helper functions exist and their owner
SELECT
  proname   AS function_name,
  prosecdef AS is_security_definer,
  proowner::regrole AS owner
FROM pg_proc
WHERE proname IN (
  'current_user_role',
  'current_user_status',
  'is_exam_assigned_to_current_user',
  'is_current_user_exam_teacher',
  'assign_teacher_student_admin'
)
ORDER BY proname;

-- 2. Check current policies on the problem tables
SELECT
  c.relname  AS table_name,
  p.polname  AS policy_name,
  p.polcmd   AS command,
  p.polqual::text AS using_expr
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
WHERE c.relname IN ('exams', 'exam_assignments', 'teacher_students', 'profiles')
ORDER BY c.relname, p.polname;

-- 3. Quick test: can we call current_user_role() at all?
SELECT current_user_role() AS my_role;
