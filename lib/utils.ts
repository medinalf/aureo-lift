import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${String(s).padStart(2,'0')}s`
  return `${s}s`
}

/** Epley formula: weight × (1 + reps/30) */
export function calculateE1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0
  if (reps === 1) return weight
  return Math.round(weight * (1 + reps / 30))
}

export function getMuscleGroupLabel(group: string): string {
  const l: Record<string, string> = {
    chest: 'Pecho', back: 'Espalda', shoulders: 'Hombros',
    arms: 'Brazos', legs: 'Piernas', core: 'Core',
    glutes: 'Glúteos', full_body: 'Cuerpo completo',
  }
  return l[group] ?? group
}

export function getMuscleEmoji(group: string): string {
  const m: Record<string, string> = {
    chest: '🏋️', back: '💪', shoulders: '🔺',
    arms: '💪', legs: '🦵', core: '⭕', glutes: '🍑', full_body: '⚡',
  }
  return m[group] ?? '🏃'
}

export function getDayName(dow: number, short = false): string {
  const long = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
  const sh   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
  return (short ? sh : long)[dow] ?? ''
}

export function getProgressPercent(current: number, previous: number): number {
  if (!previous) return 0
  return Math.round(((current - previous) / previous) * 100)
}
