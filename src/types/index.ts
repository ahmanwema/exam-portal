export type UserRole = 'admin' | 'teacher' | 'student'
export type UserStatus = 'pending' | 'approved' | 'suspended'
export type ExamStatus = 'draft' | 'published' | 'closed'
export type QuestionType = 'mcq' | 'open'
export type AttemptStatus = 'in_progress' | 'submitted' | 'graded'

export interface Profile {
  id: string
  full_name: string
  email: string
  role: UserRole
  status: UserStatus
  phone?: string
  created_at: string
  updated_at: string
}

export interface Exam {
  id: string
  title: string
  description?: string
  teacher_id: string
  duration_minutes: number
  total_marks: number
  pass_marks?: number
  status: ExamStatus
  show_results: boolean
  show_answers: boolean
  randomize_questions: boolean
  start_time?: string
  end_time?: string
  created_at: string
  updated_at: string
  teacher?: Profile
  questions?: Question[]
  _count?: { questions: number; attempts: number }
}

export interface Question {
  id: string
  exam_id: string
  text: string
  type: QuestionType
  marks: number
  explanation?: string
  order_index: number
  created_at: string
  options?: Option[]
}

export interface Option {
  id: string
  question_id: string
  text: string
  is_correct: boolean  // only present on teacher/admin queries
  order_index: number
}

// Options as returned by get_exam_for_student RPC — no is_correct field
export interface StudentOption {
  id: string
  text: string
  order_index: number
}

// Questions as returned by get_exam_for_student RPC
export interface StudentQuestion {
  id: string
  text: string
  type: QuestionType
  marks: number
  order_index: number
  options: StudentOption[]
}

// Exam as returned by get_exam_for_student RPC
export interface StudentExam {
  id: string
  title: string
  description?: string
  duration_minutes: number
  total_marks: number
  pass_marks?: number
  randomize_questions: boolean
  show_results: boolean
  show_answers: boolean
  status: ExamStatus
  start_time?: string
  end_time?: string
  questions: StudentQuestion[]
}

export type SubmitExamResult = {
  success: boolean
  score: number
  percentage: number | null
  has_open_questions: boolean
  status: AttemptStatus
}

export interface ExamAttempt {
  id: string
  exam_id: string
  student_id: string
  started_at: string
  submitted_at?: string
  score?: number
  percentage?: number
  status: AttemptStatus
  question_order?: string[]
  exam?: Exam
  student?: Profile
  answers?: StudentAnswer[]
}

export interface StudentAnswer {
  id: string
  attempt_id: string
  question_id: string
  selected_option_id?: string
  open_answer?: string
  marks_awarded?: number
  is_correct?: boolean
  answered_at: string
  question?: Question
  selected_option?: Option
}

export interface TeacherComment {
  id: string
  teacher_id: string
  student_id: string
  attempt_id?: string
  comment: string
  created_at: string
  updated_at: string
  teacher?: Profile
  student?: Profile
}

export interface TeacherStudent {
  id: string
  teacher_id: string
  student_id: string
  assigned_at: string
  teacher?: Profile
  student?: Profile
}
