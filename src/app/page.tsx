import Link from 'next/link'
import { BookOpen, Users, Award, Clock } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex flex-col">
      {/* Header */}
      <header className="p-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-blue-800" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-none">Exam Portal</h1>
            <p className="text-blue-200 text-xs">مدخل الامتحانات</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link href="/login" className="text-white border border-white/30 hover:bg-white/10 px-4 py-2 rounded-lg text-sm transition-colors">
            Ingia
          </Link>
          <Link href="/register" className="bg-white text-blue-900 hover:bg-blue-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            Jisajili
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center py-16">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white text-sm px-4 py-2 rounded-full mb-6 border border-white/20">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
            Mfumo wa Mitihani Online
          </div>

          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6 leading-tight">
            Fanya Mitihani Yako
            <span className="block text-blue-300 arabic-text mt-2">أُجرِ امتحاناتك</span>
            Online Popote
          </h2>

          <p className="text-blue-200 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
            Mfumo kamili wa mitihani online kwa wanafunzi, walimu, na wasimamizi.
            Inasupport Kiarabu (RTL), inafanya kazi kwenye simu na kompyuta.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="bg-white text-blue-900 hover:bg-blue-50 px-8 py-4 rounded-xl text-base font-semibold transition-colors shadow-lg"
            >
              Anza Sasa — ابدأ الآن
            </Link>
            <Link
              href="/login"
              className="border-2 border-white/40 text-white hover:bg-white/10 px-8 py-4 rounded-xl text-base font-medium transition-colors"
            >
              Nina Akaunti
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-16 max-w-4xl w-full">
          {[
            { icon: BookOpen, title: 'Maswali ya Kiarabu', desc: 'RTL support kamili' },
            { icon: Clock, title: 'Timer Automatic', desc: 'Auto-submit ukiisha muda' },
            { icon: Users, title: 'Roles 3', desc: 'Admin, Mwalimu, Mwanafunzi' },
            { icon: Award, title: 'Matokeo Moja Kwa Moja', desc: 'MCQ marking automatic' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-white/10 backdrop-blur border border-white/20 rounded-xl p-4 text-white">
              <Icon className="w-8 h-8 text-blue-300 mb-3" />
              <p className="font-semibold text-sm">{title}</p>
              <p className="text-blue-300 text-xs mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="text-center text-blue-400 text-xs p-6">
        © 2025 Exam Portal — Mfumo wa Mitihani Online
      </footer>
    </div>
  )
}
