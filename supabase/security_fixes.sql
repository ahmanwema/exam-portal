-- ============================================================
-- SECURITY FIXES — Run after schema.sql
-- ============================================================

-- ============================================================
-- FIX 0: Stop profiles RLS recursion
-- The original admin policies query profiles from inside profiles RLS.
-- That can trigger: infinite recursion detected in policy for relation "profiles".
-- SECURITY DEFINER helpers avoid that recursion.
-- ============================================================

create or replace function current_user_role()
returns user_role
language sql
security definer
stable
set search_path = public
as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function current_user_status()
returns user_status
language sql
security definer
stable
set search_path = public
as $$
  select status from profiles where id = auth.uid()
$$;

drop policy if exists "Admin can view all profiles" on profiles;
drop policy if exists "Admin can update any profile" on profiles;

create policy "Admin can view all profiles"
  on profiles for select
  using (current_user_role() = 'admin');

create policy "Admin can update any profile"
  on profiles for update
  using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

drop policy if exists "Admin can manage all exams" on exams;
drop policy if exists "Admin can manage all questions" on questions;
drop policy if exists "Admin can manage all options" on options;
drop policy if exists "Admin can view all attempts" on exam_attempts;
drop policy if exists "Admin can view all answers" on student_answers;
drop policy if exists "Admin can manage assignments" on teacher_students;
drop policy if exists "Admin can manage all exam assignments" on exam_assignments;
drop policy if exists "Admin can view all comments" on teacher_comments;

create policy "Admin can manage all exams"
  on exams for all
  using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

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

create policy "Admin can manage all exam assignments"
  on exam_assignments for all
  using (current_user_role() = 'admin')
  with check (current_user_role() = 'admin');

create policy "Admin can view all comments"
  on teacher_comments for select
  using (current_user_role() = 'admin');

-- ============================================================
-- FIX 1: Tighten RLS on exam_attempts
-- Students may only start an attempt on an exam that is:
--   - assigned to them
--   - published
--   - within start_time/end_time window (if set)
-- ============================================================

drop policy if exists "Students can manage their own attempts" on exam_attempts;
drop policy if exists "Students can view their own attempts" on exam_attempts;
drop policy if exists "Students can start assigned published exams" on exam_attempts;
drop policy if exists "Students can update their in_progress attempts" on exam_attempts;

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

-- Students may only update their own in-progress attempts
-- (timer save / answer auto-save)
create policy "Students can update their in_progress attempts"
  on exam_attempts for update
  using (student_id = auth.uid() and status = 'in_progress');

-- ============================================================
-- FIX 2: Tighten RLS on student_answers
-- A student may only INSERT/UPDATE answers while attempt is
-- still in_progress AND the exam time has not expired.
-- ============================================================

drop policy if exists "Students can manage their own answers" on student_answers;
drop policy if exists "Students can view their own answers" on student_answers;
drop policy if exists "Students can insert answers for in_progress attempts" on student_answers;
drop policy if exists "Students can update answers for in_progress attempts" on student_answers;

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
        and (now() - ea.started_at) < (e.duration_minutes * interval '1 minute' + interval '30 seconds')
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
        and (now() - ea.started_at) < (e.duration_minutes * interval '1 minute' + interval '30 seconds')
    )
  );

-- ============================================================
-- FIX 3: RPC — get_exam_for_student
-- Returns exam + questions + options WITHOUT is_correct.
-- Enforces assignment + published status.
-- ============================================================

create or replace function get_exam_for_student(p_exam_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid  uuid := auth.uid();
  v_result json;
begin
  -- Must be assigned
  if not exists (
    select 1 from exam_assignments
    where exam_id = p_exam_id and student_id = v_uid
  ) then
    raise exception 'not_assigned';
  end if;

  -- Must be published
  if not exists (
    select 1 from exams
    where id = p_exam_id and status = 'published'
  ) then
    raise exception 'not_published';
  end if;

  select json_build_object(
    'id',                   e.id,
    'title',                e.title,
    'description',          e.description,
    'duration_minutes',     e.duration_minutes,
    'total_marks',          e.total_marks,
    'pass_marks',           e.pass_marks,
    'randomize_questions',  e.randomize_questions,
    'show_results',         e.show_results,
    'show_answers',         e.show_answers,
    'status',               e.status,
    'start_time',           e.start_time,
    'end_time',             e.end_time,
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
              json_build_object(
                'id',          o.id,
                'text',        o.text,
                'order_index', o.order_index
                -- is_correct intentionally excluded
              ) order by o.order_index
            ), '[]'::json)
            from options o
            where o.question_id = q.id
          )
        ) order by q.order_index
      ), '[]'::json)
      from questions q
      where q.exam_id = e.id
    )
  )
  into v_result
  from exams e
  where e.id = p_exam_id;

  return v_result;
end;
$$;

-- ============================================================
-- FIX 4: RPC — submit_exam
-- Server-side grading: auto-marks MCQ, sets proper status.
-- If exam has open questions → status stays 'submitted'
--   and percentage is null until teacher finishes grading.
-- If MCQ-only → status becomes 'graded', percentage set now.
-- Also enforces: attempt must be in_progress + time not expired.
-- ============================================================

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
  -- Lock and verify the attempt
  select * into v_attempt
  from exam_attempts
  where id = p_attempt_id
    and student_id = v_uid
    and status = 'in_progress'
  for update;

  if not found then
    raise exception 'attempt_not_found';
  end if;

  select * into v_exam from exams where id = v_attempt.exam_id;

  -- Allow a 60-second grace period beyond duration
  if (now() - v_attempt.started_at)
       > (v_exam.duration_minutes * interval '1 minute' + interval '60 seconds') then
    raise exception 'time_expired';
  end if;

  -- ── Auto-grade MCQ answers ──────────────────────────────
  update student_answers sa
  set
    is_correct   = (o.is_correct is true),
    marks_awarded = case when o.is_correct is true then q.marks else 0 end
  from questions q
  left join options o on o.id = sa.selected_option_id
  where sa.attempt_id   = p_attempt_id
    and sa.question_id  = q.id
    and q.type          = 'mcq';

  -- Sum MCQ marks
  select coalesce(sum(sa.marks_awarded), 0)
  into v_mcq_score
  from student_answers sa
  join questions q on q.id = sa.question_id
  where sa.attempt_id = p_attempt_id
    and q.type = 'mcq';

  -- Check for open questions
  select exists(
    select 1
    from student_answers sa
    join questions q on q.id = sa.question_id
    where sa.attempt_id = p_attempt_id and q.type = 'open'
  ) into v_has_open;

  if v_has_open then
    -- Partial score; teacher must grade open questions before finalising
    v_percentage   := null;
    v_final_status := 'submitted';
  else
    v_percentage   := case
      when v_exam.total_marks > 0
        then round((v_mcq_score / v_exam.total_marks) * 100)
      else 0
    end;
    v_final_status := 'graded';
  end if;

  update exam_attempts
  set
    status       = v_final_status,
    submitted_at = now(),
    score        = v_mcq_score,
    percentage   = v_percentage
  where id = p_attempt_id;

  return json_build_object(
    'success',            true,
    'score',              v_mcq_score,
    'percentage',         v_percentage,
    'has_open_questions', v_has_open,
    'status',             v_final_status
  );
end;
$$;

-- ============================================================
-- FIX 5: RPC — finalize_open_grading
-- Called by teacher after marking all open answers.
-- Recalculates total score + percentage and sets status='graded'.
-- ============================================================

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
  select * into v_attempt from exam_attempts where id = p_attempt_id;
  if not found then raise exception 'attempt_not_found'; end if;

  select * into v_exam from exams where id = v_attempt.exam_id;

  -- Caller must be the exam's teacher
  if v_exam.teacher_id <> v_uid then
    raise exception 'not_authorized';
  end if;

  -- Check all open answers have been graded
  if exists (
    select 1
    from student_answers sa
    join questions q on q.id = sa.question_id
    where sa.attempt_id  = p_attempt_id
      and q.type         = 'open'
      and sa.marks_awarded is null
  ) then
    raise exception 'open_answers_incomplete';
  end if;

  select coalesce(sum(marks_awarded), 0)
  into v_total
  from student_answers
  where attempt_id = p_attempt_id;

  v_percentage := case
    when v_exam.total_marks > 0
      then round((v_total / v_exam.total_marks) * 100)
    else 0
  end;

  update exam_attempts
  set score = v_total, percentage = v_percentage, status = 'graded'
  where id = p_attempt_id;

  return json_build_object(
    'success', true, 'score', v_total, 'percentage', v_percentage
  );
end;
$$;
