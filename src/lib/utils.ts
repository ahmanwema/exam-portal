import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('sw-TZ', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
}

export function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} dakika`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}min` : `${h} saa`
}

export function getTimeRemaining(startedAt: string, durationMinutes: number) {
  const start = new Date(startedAt).getTime()
  const end = start + durationMinutes * 60 * 1000
  const now = Date.now()
  const remaining = Math.max(0, end - now)
  return {
    total: remaining,
    minutes: Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((remaining % (1000 * 60)) / 1000),
    expired: remaining === 0,
  }
}

export function calculatePercentage(score: number, total: number) {
  if (total === 0) return 0
  return Math.round((score / total) * 100)
}

export function getGrade(percentage: number) {
  if (percentage >= 90) return { grade: 'A', label: 'Bora Sana', color: 'text-green-600' }
  if (percentage >= 75) return { grade: 'B', label: 'Nzuri', color: 'text-blue-600' }
  if (percentage >= 60) return { grade: 'C', label: 'Wastani', color: 'text-yellow-600' }
  if (percentage >= 50) return { grade: 'D', label: 'Chini ya Wastani', color: 'text-orange-600' }
  return { grade: 'F', label: 'Amefeli', color: 'text-red-600' }
}
