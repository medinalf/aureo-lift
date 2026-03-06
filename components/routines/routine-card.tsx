'use client'
import Link from 'next/link'
import { getDayName } from '@/lib/utils'
import { Play } from 'lucide-react'

export function RoutineCard({ routine }: any) {
  const days = routine.routine_days?.map((d: any) => getDayName(d.day_of_week, true)).join(' · ') ?? ''
  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: 'rgb(var(--bg-surface))', border: '1px solid rgb(var(--border))' }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold">{routine.name}</h3>
          {routine.description && <p className="text-xs mt-1" style={{ color: 'rgb(var(--muted))' }}>{routine.description}</p>}
        </div>
        {routine.is_active && (
          <span className="text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(201,168,76,0.12)', color: 'rgb(var(--accent))' }}>Activa</span>
        )}
      </div>
      {days && <p className="text-xs mb-4" style={{ color: 'rgb(var(--muted))' }}>{days}</p>}
      <Link href={`/workout?routineId=${routine.id}`}
        className="flex items-center justify-center gap-2 w-full py-3 text-black font-semibold text-sm rounded-xl"
        style={{ backgroundColor: 'rgb(var(--accent))' }}>
        <Play size={14} /> Iniciar
      </Link>
    </div>
  )
}
