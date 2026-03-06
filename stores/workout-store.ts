import { create } from 'zustand'

interface WorkoutSet { exercise_id: string; set_number: number; weight_kg: number; reps: number; completed: boolean }
interface WorkoutState {
  sessionId: string | null
  startedAt: Date | null
  sets: WorkoutSet[]
  restTimer: number
  isResting: boolean
  startSession: (sessionId: string) => void
  addSet: (exerciseId: string) => void
  updateSet: (exerciseId: string, setIndex: number, data: Partial<WorkoutSet>) => void
  completeSet: (exerciseId: string, setIndex: number) => void
  startRest: (seconds: number) => void
  stopRest: () => void
  reset: () => void
}

export const useWorkoutStore = create<WorkoutState>((set) => ({
  sessionId: null, startedAt: null, sets: [], restTimer: 90, isResting: false,
  startSession: (sessionId) => set({ sessionId, startedAt: new Date() }),
  addSet: (exerciseId) => set((s) => {
    const existing = s.sets.filter(x => x.exercise_id === exerciseId)
    const prev = existing[existing.length - 1]
    return { sets: [...s.sets, { exercise_id: exerciseId, set_number: existing.length + 1, weight_kg: prev?.weight_kg ?? 0, reps: prev?.reps ?? 0, completed: false }] }
  }),
  updateSet: (exerciseId, setIndex, data) => set((s) => {
    let n = 0
    const sets = s.sets.map((x) => {
      if (x.exercise_id === exerciseId) { if (n === setIndex) { n++; return { ...x, ...data } } n++ }
      return x
    })
    return { sets }
  }),
  completeSet: (exerciseId, setIndex) => set((s) => {
    let n = 0
    const sets = s.sets.map((x) => {
      if (x.exercise_id === exerciseId) { if (n === setIndex) { n++; return { ...x, completed: true } } n++ }
      return x
    })
    return { sets, isResting: true }
  }),
  startRest: (seconds) => set({ restTimer: seconds, isResting: true }),
  stopRest: () => set({ isResting: false }),
  reset: () => set({ sessionId: null, startedAt: null, sets: [], isResting: false }),
}))
