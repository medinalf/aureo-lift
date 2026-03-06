import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export function getMuscleGroupLabel(group: string): string {
  const labels: Record<string, string> = {
    chest: 'Pecho', back: 'Espalda', shoulders: 'Hombros',
    arms: 'Brazos', legs: 'Piernas', core: 'Core',
    glutes: 'Glúteos', full_body: 'Cuerpo completo',
  }
  return labels[group] ?? group
}

export function getMuscleEmoji(group: string): string {
  const map: Record<string, string> = {
    chest: '🏋️', back: '💪', shoulders: '🔺',
    arms: '💪', legs: '🦵', core: '⭕', glutes: '🍑', full_body: '⚡',
  }
  return map[group] ?? '🏃'
}

export function getDayName(dow: number, short = false): string {
  const days = short
    ? ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
    : ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  return days[dow] ?? ''
}

export function calculateE1RM(weight: number, reps: number): number {
  if (reps === 1) return weight
  return Math.round(weight * (1 + reps / 30))
}
