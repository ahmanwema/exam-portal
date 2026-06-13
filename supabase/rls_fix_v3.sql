-- ============================================================
-- RLS FIX v3 — Minimal recursion fix for exams/exam_assignments
-- Root cause: exams policy calls is_exam_assigned_to_current_user()
--   → queries exam_assignments → triggers "Teachers can manage
--   exam assignments" policy → calls is_current_user_exam_teacher()
--   → queries exams → CYCLE.
--
-- Fix: convert both helpers to plpgsql and add
--   SET LOCAL row_security = off  inside each one.
-- This breaks the cycle without touching other policies.
-- ============================================================

-- ── Helper: check current user role ─────────────────────────────────

create or replace function current_user_role()
returns user_role
language plpgsql security definer set search_path = public
as $$
declare v user_role;
begin
  set local row_security = off;
  select role into v from profiles where id = auth.uid();
  return v;
end; $$;

-- ── Helper: is the current user assigned to this exam? ──────────────

create or replace function is_exam_assigned_to_current_user(p_exam_id uuid)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare v boolean;
begin
  set local row_security = off;
  select exists(
    select 1 from exam_assignments
    where exam_id = p_exam_id and student_id = auth.uid()
  ) into v;
  return v;
end; $$;

-- ── Helper: is the current user the teacher of this exam? ────────────

create or replace function is_current_user_exam_teacher(p_exam_id uuid)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare v boolean;
begin
  set local row_security = off;
  select exists(
    select 1 from exams
    where id = p_exam_id and teacher_id = auth.uid()
  ) into v;
  return v;
end; $$;

-- ── Rebuild exams policies ───────────────────────────────────────────

drop policy if exists "Teachers can manage their own exams"         on exams;
drop policy if exists "Admin can manage all exams"                  on exams;
drop policy if exists "Students can view published assigned exams"  on exams;
drop policy if exists "Students can view their attempted exams"     on exams;

create policy "Teachers can manage their own exams"
  on exams for all
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create policy "Admin can manage all exams"
  on exams for all
  using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

create policy "Students can view published assigned exams"
  on exams for select
  using (status = 'published' and is_exam_assigned_to_current_user(id));

create policy "Students can view their attempted exams"
  on exams for select
  using (
    exists (
      select 1 from exam_attempts
      where exam_id = exams.id
        and student_id = auth.uid()
        and status in ('submitted', 'graded')
    )
  );

-- ── Rebuild exam_assignments policies ───────────────────────────────

drop policy if exists "Teachers can manage exam assignments"      on exam_assignments;
drop policy if exists "Admin can manage all exam assignments"     on exam_assignments;
drop policy if exists "Students can view their exam assignments"  on exam_assignments;

create policy "Teachers can manage exam assignments"
  on exam_assignments for all
  using (is_current_user_exam_teacher(exam_id))
  with check (is_current_user_exam_teacher(exam_id));

create policy "Admin can manage all exam assignments"
  on exam_assignments for all
  using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

create policy "Students can view their exam assignments"
  on exam_assignments for select
  using (student_id = auth.uid());

-- ── Rebuild exam_attempts policies ──────────────────────────────────
-- "Students can view their attempted exams" (on exams) reads exam_attempts,
-- and the old exam_attempts teacher policy reads back exams → new cycle.
-- Fix: use is_current_user_exam_teacher (row_security=off) here too.

drop policy if exists "Teachers can view their students attempts"  on exam_attempts;
drop policy if exists "Admin can view all attempts"               on exam_attempts;

create policy "Teachers can view their students attempts"
  on exam_attempts for select
  using (is_current_user_exam_teacher(exam_id));

create policy "Admin can view all attempts"
  on exam_attempts for select
  using (current_user_role() = 'admin');

-- ── Rebuild teacher_students admin policy ────────────────────────────
-- Old policy queries profiles directly inside a profiles policy → cycle.

drop policy if exists "Admin can manage assignments" on teacher_students;

create policy "Admin can manage assignments"
  on teacher_students for all
  using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

-- ── Rebuild profiles admin policies ─────────────────────────────────

drop policy if exists "Admin can view all profiles"   on profiles;
drop policy if exists "Admin can update any profile"  on profiles;

create policy "Admin can view all profiles"
  on profiles for select
  using (current_user_role() = 'admin');

create policy "Admin can update any profile"
  on profiles for update
  using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');
