import { ShieldOff, Mail } from 'lucide-react'
import Link from 'next/link'

export default function SuspendedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldOff className="w-10 h-10 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-3">
          Akaunti Imesimamishwa
        </h1>
        <p className="text-gray-500 arabic-text mb-2">تم تعليق الحساب</p>
        <p className="text-gray-600 mt-4 leading-relaxed">
          Akaunti yako imesimamishwa na msimamizi wa mfumo.
          Kama unahisi hii ni kosa, wasiliana na msimamizi wako.
        </p>

        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-6 flex items-start gap-3">
          <Mail className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700 text-start">
            Wasiliana na admin kwa maelezo zaidi kuhusu hali ya akaunti yako.
          </p>
        </div>

        <Link
          href="/login"
          className="mt-6 inline-block text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          ← Rudi kwenye ukurasa wa kuingia
        </Link>
      </div>
    </div>
  )
}
