-- ============================================================
-- RLS FIX v2 — Resolve "infinite recursion detected in policy
-- for relation 'exams'"
--
-- Root cause: cycle between exams ↔ exam_assignments policies.
--   exams "Students can view published assigned exams"
--     → is_exam_assigned_to_current_user() → queries exam_assignments
--   exam_assignments "Teachers can manage exam assignments"
--     → is_current_user_exam_teacher()     → queries exams  ← CYCLE
--
-- Fix: convert helper functions to plpgsql and add
--   SET LOCAL row_security = off
-- so they bypass RLS completely, breaking the cycle.
-- ============================================================

-- ── Helper: check current user's role (no profiles RLS recursion) ──

create or replace function current_user_role()
returns user_role
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role user_role;
begin
  set local row_security = off;
  select role into v_role from profiles where id = auth.uid();
  return v_role;
end;
$$;

create or replace function current_user_status()
returns user_status
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status user_status;
begin
  set local row_security = off;
  select status into v_status from profiles where id = auth.uid();
  return v_status;
end;
$$;

-- ── Helper: is the current user assigned to this exam? ──────────────

create or replace function assign_teacher_student_admin(
  p_teacher_id uuid,
  p_student_id uuid
)
returns teacher_students
language plpgsql
security definer
set search_path = public
as $$
declare
  v_assignment teacher_students;
begin
  set local row_security = off;

  if current_user_role() <> 'admin' then
    raise exception 'admin_only' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from profiles
    where id = p_teacher_id
      and role = 'teacher'
      and status = 'approved'
  ) then
    raise exception 'invalid_teacher' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from profiles
    where id = p_student_id
      and role = 'student'
      and status = 'approved'
  ) then
    raise exception 'invalid_student' using errcode = '22023';
  end if;

  insert into teacher_students (teacher_id, student_id)
  values (p_teacher_id, p_student_id)
  returning * into v_assignment;

  return v_assignment;
exception
  when unique_violation then
    raise exception 'duplicate_assignment' using errcode = '23505';
end;
$$;

grant execute on function assign_teacher_student_admin(uuid, uuid) to authenticated;

create or replace function is_exam_assigned_to_current_user(p_exam_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result boolean;
begin
  set local row_security = off;
  select exists (
    select 1
    from exam_assignments
    where exam_id = p_exam_id
      and student_id = auth.uid()
  ) into v_result;
  return v_result;
end;
$$;

-- ── Helper: is the current user the teacher of this exam? ────────────

create or replace function is_current_user_exam_teacher(p_exam_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_result boolean;
begin
  set local row_security = off;
  select exists (
    select 1
    from exams
    where id = p_exam_id
      and teacher_id = auth.uid()
  ) into v_result;
  return v_result;
end;
$$;

-- ── Rebuild exams policies cleanly ──────────────────────────────────

drop policy if exists "Teachers can manage their own exams"    on exams;
drop policy if exists "Admin can manage all exams"             on exams;
drop policy if exists "Students can view published assigned exams" on exams;

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
  using (
    status = 'published'
    and is_exam_assigned_to_current_user(id)
  );

-- ── Rebuild exam_assignments policies cleanly ────────────────────────

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

-- ── Rebuild other admin policies using helper ─────────────────────

drop policy if exists "Admin can manage all questions"        on questions;
drop policy if exists "Admin can manage all options"          on options;
drop policy if exists "Admin can view all attempts"           on exam_attempts;
drop policy if exists "Admin can view all answers"            on student_answers;
drop policy if exists "Admin can manage assignments"          on teacher_students;
drop policy if exists "Admin can view all comments"           on teacher_comments;

create policy "Admin can manage all questions"
  on questions for all
  using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

create policy "Admin can manage all options"
  on options for all
  using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

create policy "Admin can view all attempts"
  on exam_attempts for select
  using (current_user_role() = 'admin');

create policy "Admin can view all answers"
  on student_answers for select
  using (current_user_role() = 'admin');

create policy "Admin can manage assignments"
  on teacher_students for all
  using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

create policy "Admin can view all comments"
  on teacher_comments for select
  using (current_user_role() = 'admin');

-- ── Fix questions/options: allow viewing for completed attempts ──────
-- Original policy only allows 'in_progress'. After submission the
-- attempt is 'submitted'/'graded', so results page gets null questions.

drop policy if exists "Students can view questions during active attempt" on questions;
drop policy if exists "Students can view questions for their attempts"    on questions;

create policy "Students can view questions for their attempts"
  on questions for select using (
    exists (
      select 1 from exam_attempts
      where exam_id = questions.exam_id
        and student_id = auth.uid()
        and status in ('in_progress', 'submitted', 'graded')
    )
  );

drop policy if exists "Students can view options during active attempt" on options;
drop policy if exists "Students can view options for their attempts"    on options;

create policy "Students can view options for their attempts"
  on options for select using (
    exists (
      select 1 from questions q
      join exam_attempts ea on ea.exam_id = q.exam_id
      where q.id = options.question_id
        and ea.student_id = auth.uid()
        and ea.status in ('in_progress', 'submitted', 'graded')
    )
  );
