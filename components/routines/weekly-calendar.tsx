'use client'
import { useState } from 'react'
import { getMuscleEmoji, getDayName } from '@/lib/utils'
import { Play, ChevronDown, ChevronUp, Dumbbell } from 'lucide-react'

const A    = 'rgb(var(--accent))'
const SURF = 'rgb(var(--bg-surface))'
const ELEV = 'rgb(var(--bg-elevated))'
const BORD = 'rgb(var(--border))'
const MUT  = 'rgb(var(--muted))'
const FG   = 'rgb(var(--foreground))'

const DOW_SHORT = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

interface RoutineDay {
  id: string
  day_of_week: number
  day_label: string
  routine_exercises: any[]
}

interface Props {
  routineDays: RoutineDay[]
  routineName: string
  onStartDay?: (day: RoutineDay) => void
}

export function WeeklyCalendar({ routineDays, routineName, onStartDay }: Props) {
  const today = new Date().getDay()
  const [expandedDay, setExpandedDay] = useState<number | null>(today)

  // Map by day_of_week
  const dayMap = new Map<number, RoutineDay>()
  for (const d of routineDays) dayMap.set(d.day_of_week, d)

  return (
    <div className="space-y-2">
      {/* 7-day strip */}
      <div className="grid grid-cols-7 gap-1 mb-4">
        {Array.from({ length: 7 }).map((_, dow) => {
          const day = dayMap.get(dow)
          const isToday  = dow === today
          const hasWork  = !!day
          return (
            <button key={dow}
              onClick={() => setExpandedDay(expandedDay === dow ? null : dow)}
              className="flex flex-col items-center py-2.5 rounded-xl transition-all"
              style={{
                backgroundColor: expandedDay === dow
                  ? 'rgba(201,168,76,0.15)'
                  : isToday && hasWork
                  ? 'rgba(201,168,76,0.08)'
                  : ELEV,
                border: `1.5px solid ${
                  expandedDay === dow ? A
                  : isToday ? 'rgba(201,168,76,0.4)'
                  : BORD
                }`,
              }}>
              <span className="text-[10px] uppercase tracking-widest mb-1"
                style={{ color: isToday ? A : MUT }}>
                {DOW_SHORT[dow]}
              </span>
              {hasWork ? (
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: A }} />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
              )}
              {isToday && (
                <span className="text-[8px] mt-0.5 font-bold" style={{ color: A }}>HOY</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Expanded day detail */}
      {expandedDay !== null && (() => {
        const day = dayMap.get(expandedDay)
        const isToday = expandedDay === today

        if (!day) {
          return (
            <div className="rounded-2xl px-5 py-6 text-center"
              style={{ backgroundColor: SURF, border: `1px solid ${BORD}` }}>
              <p className="text-2xl mb-2">😴</p>
              <p className="font-semibold mb-1">{getDayName(expandedDay)} — Descanso</p>
              <p className="text-sm" style={{ color: MUT }}>
                Día libre. Recuperación activa o cardio ligero.
              </p>
              {isToday && onStartDay && (
                <button
                  onClick={() => {
                    // Find next training day
                    const nextDay = routineDays
                      .filter(d => d.day_of_week !== expandedDay)
                      .sort((a, b) => {
                        const diffA = (a.day_of_week - today + 7) % 7
                        const diffB = (b.day_of_week - today + 7) % 7
                        return diffA - diffB
                      })[0]
                    if (nextDay) onStartDay(nextDay)
                  }}
                  className="mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2"
                  style={{ backgroundColor: ELEV, color: A, border: `1px solid ${A}` }}>
                  <Play size={14} />
                  Adelantar próxima rutina
                </button>
              )}
            </div>
          )
        }

        const exercises = [...(day.routine_exercises ?? [])].sort((a, b) => a.order_index - b.order_index)

        return (
          <div className="rounded-2xl overflow-hidden"
            style={{ backgroundColor: SURF, border: `1px solid ${isToday ? A : BORD}` }}>
            {/* Day header */}
            <div className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: `1px solid ${BORD}` }}>
              <div>
                {isToday && (
                  <span className="text-xs uppercase tracking-widest font-bold" style={{ color: A }}>HOY · </span>
                )}
                <span className="font-display text-lg font-semibold">
                  {getDayName(expandedDay)} — {day.day_label}
                </span>
                <p className="text-xs mt-0.5" style={{ color: MUT }}>
                  {exercises.length} ejercicios
                </p>
              </div>
              {isToday && onStartDay && (
                <button
                  onClick={() => onStartDay(day)}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-black"
                  style={{ backgroundColor: A }}>
                  <Play size={14} strokeWidth={2.5} />
                  Entrenar
                </button>
              )}
            </div>

            {/* Exercise list */}
            <div className="px-4 py-3 space-y-2">
              {exercises.map((re: any) => (
                <div key={re.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
                  style={{ backgroundColor: ELEV }}>
                  <span className="text-xl">{getMuscleEmoji(re.exercise?.muscle_group)}</span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium truncate block">{re.exercise?.name}</span>
                    <span className="text-xs" style={{ color: MUT }}>
                      {re.target_sets} × {re.target_reps}
                      {re.rest_seconds ? ` · ${re.rest_seconds}s desc.` : ''}
                    </span>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: SURF, color: MUT }}>
                    {re.exercise?.muscle_group}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
