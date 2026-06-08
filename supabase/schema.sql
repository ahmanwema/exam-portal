-- ============================================================
-- EXAM PORTAL - Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- ENUMS
-- ============================================================
create type user_role as enum ('admin', 'teacher', 'student');
create type user_status as enum ('pending', 'approved', 'suspended');
create type exam_status as enum ('draft', 'published', 'closed');
create type question_type as enum ('mcq', 'open');
create type attempt_status as enum ('in_progress', 'submitted', 'graded');

-- ============================================================
-- PROFILES TABLE (extends Supabase auth.users)
-- ============================================================
create table profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  email text not null unique,
  role user_role not null default 'student',
  status user_status not null default 'approved',
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Teachers require admin approval, students are auto-approved
-- We handle this in the trigger below

-- ============================================================
-- TEACHER-STUDENT ASSIGNMENTS
-- ============================================================
create table teacher_students (
  id uuid default uuid_generate_v4() primary key,
  teacher_id uuid references profiles(id) on delete cascade not null,
  student_id uuid references profiles(id) on delete cascade not null,
  assigned_at timestamptz default now(),
  unique(teacher_id, student_id)
);

-- ============================================================
-- EXAMS
-- ============================================================
create table exams (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  description text,
  teacher_id uuid references profiles(id) on delete cascade not null,
  duration_minutes integer not null default 60,
  total_marks numeric not null default 0,
  pass_marks numeric,
  status exam_status not null default 'draft',
  show_results boolean not null default false,
  show_answers boolean not null default false,
  randomize_questions boolean not null default true,
  start_time timestamptz,
  end_time timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- QUESTIONS
-- ============================================================
create table questions (
  id uuid default uuid_generate_v4() primary key,
  exam_id uuid references exams(id) on delete cascade not null,
  text text not null,
  type question_type not null default 'mcq',
  marks numeric not null default 1,
  explanation text,
  order_index integer not null default 0,
  created_at timestamptz default now()
);

-- ============================================================
-- OPTIONS (for MCQ questions)
-- ============================================================
create table options (
  id uuid default uuid_generate_v4() primary key,
  question_id uuid references questions(id) on delete cascade not null,
  text text not null,
  is_correct boolean not null default false,
  order_index integer not null default 0
);

-- ============================================================
-- EXAM ASSIGNMENTS (which students can take which exam)
-- ============================================================
create table exam_assignments (
  id uuid default uuid_generate_v4() primary key,
  exam_id uuid references exams(id) on delete cascade not null,
  student_id uuid references profiles(id) on delete cascade not null,
  assigned_at timestamptz default now(),
  unique(exam_id, student_id)
);

-- ============================================================
-- EXAM ATTEMPTS
-- ============================================================
create table exam_attempts (
  id uuid default uuid_generate_v4() primary key,
  exam_id uuid references exams(id) on delete cascade not null,
  student_id uuid references profiles(id) on delete cascade not null,
  started_at timestamptz default now(),
  submitted_at timestamptz,
  score numeric,
  percentage numeric,
  status attempt_status not null default 'in_progress',
  question_order jsonb,
  unique(exam_id, student_id)
);

-- ============================================================
-- STUDENT ANSWERS
-- ============================================================
create table student_answers (
  id uuid default uuid_generate_v4() primary key,
  attempt_id uuid references exam_attempts(id) on delete cascade not null,
  question_id uuid references questions(id) on delete cascade not null,
  selected_option_id uuid references options(id) on delete set null,
  open_answer text,
  marks_awarded numeric,
  is_correct boolean,
  answered_at timestamptz default now(),
  unique(attempt_id, question_id)
);

-- ============================================================
-- TEACHER COMMENTS / REPORTS
-- ============================================================
create table teacher_comments (
  id uuid default uuid_generate_v4() primary key,
  teacher_id uuid references profiles(id) on delete cascade not null,
  student_id uuid references profiles(id) on delete cascade not null,
  attempt_id uuid references exam_attempts(id) on delete cascade,
  comment text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================================
-- TRIGGERS: auto-create profile on user signup
-- ============================================================
create or replace function handle_new_user()
returns trigger as $$
declare
  v_role user_role := 'student'::user_role;
begin
  if new.raw_user_meta_data->>'role' in ('admin', 'teacher', 'student') then
    v_role := (new.raw_user_meta_data->>'role')::user_role;
  end if;

  insert into profiles (id, full_name, email, role, status, phone)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), 'User'),
    new.email,
    v_role,
    case
      when v_role = 'teacher' then 'pending'::user_status
      else 'approved'::user_status
    end,
    nullif(trim(new.raw_user_meta_data->>'phone'), '')
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- TRIGGER: update updated_at automatically
-- ============================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_profiles_updated_at
  before update on profiles
  for each row execute procedure update_updated_at();

create trigger update_exams_updated_at
  before update on exams
  for each row execute procedure update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table profiles enable row level security;
alter table teacher_students enable row level security;
alter table exams enable row level security;
alter table questions enable row level security;
alter table options enable row level security;
alter table exam_assignments enable row level security;
alter table exam_attempts enable row level security;
alter table student_answers enable row level security;
alter table teacher_comments enable row level security;

-- PROFILES policies
create policy "Users can view their own profile"
  on profiles for select using (auth.uid() = id);

create policy "Admin can view all profiles"
  on profiles for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Teacher can view their students"
  on profiles for select using (
    exists (
      select 1 from teacher_students
      where teacher_id = auth.uid() and student_id = profiles.id
    )
  );

create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);

create policy "Admin can update any profile"
  on profiles for update using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- EXAMS policies
create policy "Teachers can manage their own exams"
  on exams for all using (teacher_id = auth.uid());

create policy "Admin can manage all exams"
  on exams for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Students can view published assigned exams"
  on exams for select using (
    status = 'published' and
    exists (
      select 1 from exam_assignments
      where exam_id = exams.id and student_id = auth.uid()
    )
  );

-- QUESTIONS policies
create policy "Teachers can manage questions of their exams"
  on questions for all using (
    exists (select 1 from exams where id = questions.exam_id and teacher_id = auth.uid())
  );

create policy "Admin can manage all questions"
  on questions for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Students can view questions during active attempt"
  on questions for select using (
    exists (
      select 1 from exam_attempts
      where exam_id = questions.exam_id
        and student_id = auth.uid()
        and status = 'in_progress'
    )
  );

-- OPTIONS policies
create policy "Teachers can manage options of their questions"
  on options for all using (
    exists (
      select 1 from questions q
      join exams e on e.id = q.exam_id
      where q.id = options.question_id and e.teacher_id = auth.uid()
    )
  );

create policy "Admin can manage all options"
  on options for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Students can view options during active attempt"
  on options for select using (
    exists (
      select 1 from questions q
      join exam_attempts ea on ea.exam_id = q.exam_id
      where q.id = options.question_id
        and ea.student_id = auth.uid()
        and ea.status = 'in_progress'
    )
  );

-- ATTEMPTS policies
create policy "Students can manage their own attempts"
  on exam_attempts for all using (student_id = auth.uid());

create policy "Teachers can view their students attempts"
  on exam_attempts for select using (
    exists (
      select 1 from exams e
      where e.id = exam_attempts.exam_id and e.teacher_id = auth.uid()
    )
  );

create policy "Admin can view all attempts"
  on exam_attempts for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- ANSWERS policies
create policy "Students can manage their own answers"
  on student_answers for all using (
    exists (
      select 1 from exam_attempts
      where id = student_answers.attempt_id and student_id = auth.uid()
    )
  );

create policy "Teachers can view answers of their students"
  on student_answers for select using (
    exists (
      select 1 from exam_attempts ea
      join exams e on e.id = ea.exam_id
      where ea.id = student_answers.attempt_id and e.teacher_id = auth.uid()
    )
  );

create policy "Teachers can grade open answers"
  on student_answers for update using (
    exists (
      select 1 from exam_attempts ea
      join exams e on e.id = ea.exam_id
      where ea.id = student_answers.attempt_id and e.teacher_id = auth.uid()
    )
  );

create policy "Admin can view all answers"
  on student_answers for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- TEACHER_STUDENTS policies
create policy "Admin can manage assignments"
  on teacher_students for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Teachers can view their assignments"
  on teacher_students for select using (teacher_id = auth.uid());

create policy "Students can view their assignments"
  on teacher_students for select using (student_id = auth.uid());

-- EXAM_ASSIGNMENTS policies
create policy "Teachers can manage exam assignments"
  on exam_assignments for all using (
    exists (select 1 from exams where id = exam_assignments.exam_id and teacher_id = auth.uid())
  );

create policy "Admin can manage all exam assignments"
  on exam_assignments for all using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "Students can view their exam assignments"
  on exam_assignments for select using (student_id = auth.uid());

-- TEACHER_COMMENTS policies
create policy "Teachers can manage their comments"
  on teacher_comments for all using (teacher_id = auth.uid());

create policy "Students can view comments about them"
  on teacher_comments for select using (student_id = auth.uid());

create policy "Admin can view all comments"
  on teacher_comments for select using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );
