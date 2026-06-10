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

-- ── exam_attempts policies ───────────────────────────────────────────

drop policy if exists "Students can manage their own attempts"          on exam_attempts;
drop policy if exists "Students can view their own attempts"            on exam_attempts;
drop policy if exists "Students can start assigned published exams"     on exam_attempts;
drop policy if exists "Students can update their in_progress attempts"  on exam_attempts;

create policy "Students can view their own attempts"
  on exam_attempts for select
  using (student_id = auth.uid());

create policy "Students can start assigned published exams"
  on exam_attempts for insert
  with check (
    student_id = auth.uid()
    and exists (
      select 1
      from exam_assignments ea
      join exams e on e.id = ea.exam_id
      where ea.exam_id = exam_attempts.exam_id
        and ea.student_id = auth.uid()
        and e.status = 'published'
        and (e.start_time is null or e.start_time <= now())
        and (e.end_time   is null or e.end_time   >= now())
    )
  );

create policy "Students can update their in_progress attempts"
  on exam_attempts for update
  using (student_id = auth.uid() and status = 'in_progress');

-- ── student_answers policies — grace period matches submit_exam (+60s) ──

drop policy if exists "Students can manage their own answers"                   on student_answers;
drop policy if exists "Students can view their own answers"                     on student_answers;
drop policy if exists "Students can insert answers for in_progress attempts"    on student_answers;
drop policy if exists "Students can update answers for in_progress attempts"    on student_answers;

create policy "Students can view their own answers"
  on student_answers for select
  using (
    exists (
      select 1 from exam_attempts ea
      where ea.id = student_answers.attempt_id
        and ea.student_id = auth.uid()
    )
  );

create policy "Students can insert answers for in_progress attempts"
  on student_answers for insert
  with check (
    exists (
      select 1
      from exam_attempts ea
      join exams e on e.id = ea.exam_id
      where ea.id = student_answers.attempt_id
        and ea.student_id = auth.uid()
        and ea.status = 'in_progress'
        and (now() - ea.started_at) < (e.duration_minutes * interval '1 minute' + interval '60 seconds')
    )
  );

create policy "Students can update answers for in_progress attempts"
  on student_answers for update
  using (
    exists (
      select 1
      from exam_attempts ea
      join exams e on e.id = ea.exam_id
      where ea.id = student_answers.attempt_id
        and ea.student_id = auth.uid()
        and ea.status = 'in_progress'
        and (now() - ea.started_at) < (e.duration_minutes * interval '1 minute' + interval '60 seconds')
    )
  );

-- ── RPC: get_exam_for_student ────────────────────────────────────────

create or replace function get_exam_for_student(p_exam_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_result json;
  v_exam   exams%rowtype;
begin
  set local row_security = off;

  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if not exists (
    select 1 from exam_assignments where exam_id = p_exam_id and student_id = v_uid
  ) then raise exception 'not_assigned'; end if;

  select * into v_exam from exams where id = p_exam_id;

  if not found or v_exam.status <> 'published' then
    raise exception 'not_published';
  end if;

  if v_exam.start_time is not null and v_exam.start_time > now() then
    raise exception 'exam_not_started';
  end if;

  if v_exam.end_time is not null and v_exam.end_time < now() then
    raise exception 'exam_closed';
  end if;

  select json_build_object(
    'id',                  e.id,
    'title',               e.title,
    'description',         e.description,
    'duration_minutes',    e.duration_minutes,
    'total_marks',         e.total_marks,
    'pass_marks',          e.pass_marks,
    'randomize_questions', e.randomize_questions,
    'show_results',        e.show_results,
    'show_answers',        e.show_answers,
    'status',              e.status,
    'start_time',          e.start_time,
    'end_time',            e.end_time,
    'questions', (
      select coalesce(json_agg(
        json_build_object(
          'id',          q.id,
          'text',        q.text,
          'type',        q.type,
          'marks',       q.marks,
          'order_index', q.order_index,
          'options', (
            select coalesce(json_agg(
              json_build_object('id', o.id, 'text', o.text, 'order_index', o.order_index)
              order by o.order_index
            ), '[]'::json)
            from options o where o.question_id = q.id
          )
        ) order by q.order_index
      ), '[]'::json)
      from questions q where q.exam_id = e.id
    )
  ) into v_result
  from exams e where e.id = p_exam_id;

  return v_result;
end;
$$;

grant execute on function get_exam_for_student(uuid) to authenticated;

-- ── RPC: submit_exam ─────────────────────────────────────────────────

create or replace function submit_exam(p_attempt_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid          uuid := auth.uid();
  v_attempt      exam_attempts%rowtype;
  v_exam         exams%rowtype;
  v_mcq_score    numeric := 0;
  v_has_open     boolean;
  v_percentage   numeric;
  v_final_status attempt_status;
begin
  set local row_security = off;

  select * into v_attempt
  from exam_attempts
  where id = p_attempt_id and student_id = v_uid and status = 'in_progress'
  for update;

  if not found then raise exception 'attempt_not_found'; end if;

  select * into v_exam from exams where id = v_attempt.exam_id;

  if (now() - v_attempt.started_at)
       > (v_exam.duration_minutes * interval '1 minute' + interval '60 seconds') then
    raise exception 'time_expired';
  end if;

  update student_answers sa
  set
    is_correct    = (o.is_correct is true),
    marks_awarded = case when o.is_correct is true then q.marks else 0 end
  from questions q
  left join options o on o.id = sa.selected_option_id
  where sa.attempt_id = p_attempt_id and sa.question_id = q.id and q.type = 'mcq';

  select coalesce(sum(sa.marks_awarded), 0) into v_mcq_score
  from student_answers sa
  join questions q on q.id = sa.question_id
  where sa.attempt_id = p_attempt_id and q.type = 'mcq';

  select exists(
    select 1 from student_answers sa
    join questions q on q.id = sa.question_id
    where sa.attempt_id = p_attempt_id and q.type = 'open'
  ) into v_has_open;

  if v_has_open then
    v_percentage   := null;
    v_final_status := 'submitted';
  else
    v_percentage := case
      when v_exam.total_marks > 0 then round((v_mcq_score / v_exam.total_marks) * 100)
      else 0
    end;
    v_final_status := 'graded';
  end if;

  update exam_attempts
  set status = v_final_status, submitted_at = now(), score = v_mcq_score, percentage = v_percentage
  where id = p_attempt_id;

  return json_build_object(
    'success', true, 'score', v_mcq_score,
    'percentage', v_percentage, 'has_open_questions', v_has_open, 'status', v_final_status
  );
end;
$$;

grant execute on function submit_exam(uuid) to authenticated;

-- ── RPC: finalize_open_grading ───────────────────────────────────────

create or replace function finalize_open_grading(p_attempt_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid        uuid := auth.uid();
  v_attempt    exam_attempts%rowtype;
  v_exam       exams%rowtype;
  v_total      numeric;
  v_percentage numeric;
begin
  set local row_security = off;

  select * into v_attempt from exam_attempts where id = p_attempt_id;
  if not found then raise exception 'attempt_not_found'; end if;

  select * into v_exam from exams where id = v_attempt.exam_id;

  if v_exam.teacher_id <> v_uid then raise exception 'not_authorized'; end if;

  if exists (
    select 1 from student_answers sa
    join questions q on q.id = sa.question_id
    where sa.attempt_id = p_attempt_id and q.type = 'open' and sa.marks_awarded is null
  ) then raise exception 'open_answers_incomplete'; end if;

  select coalesce(sum(marks_awarded), 0) into v_total
  from student_answers where attempt_id = p_attempt_id;

  v_percentage := case
    when v_exam.total_marks > 0 then round((v_total / v_exam.total_marks) * 100)
    else 0
  end;

  update exam_attempts
  set score = v_total, percentage = v_percentage, status = 'graded'
  where id = p_attempt_id;

  return json_build_object('success', true, 'score', v_total, 'percentage', v_percentage);
end;
$$;

grant execute on function finalize_open_grading(uuid) to authenticated;

-- ── RPC: grade_open_answer ──────────────────────────────────────────
-- Teachers grade open answers through this RPC so marks are validated
-- server-side and RLS does not depend on nested client updates.

create or replace function grade_open_answer(
  p_answer_id uuid,
  p_marks numeric
)
returns student_answers
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid     uuid := auth.uid();
  v_answer  student_answers%rowtype;
  v_max     numeric;
begin
  set local row_security = off;

  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select s.* into v_answer
  from (
    select sa.*
    from student_answers sa
    join questions q on q.id = sa.question_id
    join exam_attempts ea on ea.id = sa.attempt_id
    join exams e on e.id = ea.exam_id
    where sa.id = p_answer_id
      and q.type = 'open'
      and ea.status = 'submitted'
      and e.teacher_id = v_uid
  ) s;

  if not found then
    raise exception 'answer_not_found' using errcode = '22023';
  end if;

  select q.marks into v_max
  from questions q
  where q.id = v_answer.question_id;

  if p_marks is null or p_marks < 0 or p_marks > v_max then
    raise exception 'invalid_marks' using errcode = '22023';
  end if;

  update student_answers
  set
    marks_awarded = p_marks,
    is_correct = (p_marks >= v_max)
  where id = p_answer_id
  returning * into v_answer;

  return v_answer;
end;
$$;

grant execute on function grade_open_answer(uuid, numeric) to authenticated;

-- ── Allow students to see exam metadata for their attempted exams ────
-- Without this policy, closed/draft exams return null on the results
-- and dashboard pages, even though the student has a submitted attempt.

drop policy if exists "Students can view their attempted exams" on exams;

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
