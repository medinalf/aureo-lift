// ──────────────────────────────────────────────
// Routine Generator
// Generates a personalized routine based on user profile
// ──────────────────────────────────────────────

export type Goal = 'fat_loss' | 'hypertrophy' | 'strength' | 'maintenance'
export type Level = 'beginner' | 'intermediate' | 'advanced'
export type Equipment = 'full_gym' | 'home_weights' | 'calisthenics' | 'minimal' | 'none'

export interface GeneratorParams {
  goal: Goal
  frequency: number // 1–7 days/week
  level: Level
  equipment: Equipment[]
}

// ── Template definitions ──────────────────────

// Each split maps frequency to an array of day configs
// day config: { label, muscle_groups[] }
const SPLITS: Record<string, (freq: number) => { label: string; groups: string[] }[]> = {

  // Full Body — best for beginners, fat loss, low frequency
  full_body: (freq) => Array.from({ length: freq }, (_, i) => ({
    label: `Full Body ${freq > 1 ? i + 1 : ''}`.trim(),
    groups: ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'],
  })),

  // Upper / Lower — 4 days
  upper_lower: (_) => [
    { label: 'Upper A', groups: ['chest', 'back', 'shoulders', 'arms'] },
    { label: 'Lower A', groups: ['legs', 'glutes', 'core'] },
    { label: 'Upper B', groups: ['chest', 'back', 'shoulders', 'arms'] },
    { label: 'Lower B', groups: ['legs', 'glutes', 'core'] },
  ],

  // Push / Pull / Legs — 3 or 6 days
  ppl: (freq) => {
    const base = [
      { label: 'Push', groups: ['chest', 'shoulders', 'arms'] },
      { label: 'Pull', groups: ['back', 'arms'] },
      { label: 'Legs', groups: ['legs', 'glutes', 'core'] },
    ]
    return freq === 6 ? [...base, ...base.map(d => ({ ...d, label: d.label + ' B' }))] : base
  },

  // Bro split — 5 days
  bro: (_) => [
    { label: 'Pecho', groups: ['chest', 'arms'] },
    { label: 'Espalda', groups: ['back', 'core'] },
    { label: 'Hombros', groups: ['shoulders', 'arms'] },
    { label: 'Piernas', groups: ['legs', 'glutes'] },
    { label: 'Brazos', groups: ['arms', 'core'] },
  ],
}

// Pick the best split for the user
function chooseSplit(freq: number, goal: Goal, level: Level) {
  if (freq <= 3 || level === 'beginner') return SPLITS.full_body(freq)
  if (freq === 4) return SPLITS.upper_lower(freq)
  if (freq === 5) return SPLITS.bro(freq)
  if (freq >= 6) return SPLITS.ppl(freq)
  return SPLITS.full_body(freq)
}

// How many exercises per session
function exercisesPerSession(level: Level, goal: Goal): number {
  if (goal === 'strength') return level === 'beginner' ? 4 : 5
  if (goal === 'hypertrophy') return level === 'advanced' ? 7 : 6
  return level === 'beginner' ? 4 : 5
}

// Sets/reps scheme per goal
function getSetsReps(goal: Goal, level: Level): { sets: number; reps: string; rest: number } {
  if (goal === 'strength') return { sets: 5, reps: '3-5', rest: 180 }
  if (goal === 'hypertrophy') return { sets: level === 'beginner' ? 3 : 4, reps: '8-12', rest: 90 }
  if (goal === 'fat_loss') return { sets: 3, reps: '12-15', rest: 60 }
  return { sets: 3, reps: '10-12', rest: 90 } // maintenance
}

// Filter exercises by equipment
function filterByEquipment(exercises: any[], equipment: Equipment[]): any[] {
  if (equipment.includes('full_gym')) return exercises
  const allowed: Record<Equipment, string[]> = {
    full_gym: [],
    home_weights: ['dumbbell', 'barbell', 'bodyweight', 'none'],
    calisthenics: ['bodyweight', 'none'],
    minimal: ['dumbbell', 'bodyweight', 'none'],
    none: ['bodyweight', 'none'],
  }
  const allowedEquip = new Set(equipment.flatMap(e => allowed[e] ?? []))
  return exercises.filter(ex =>
    !ex.equipment || allowedEquip.has(ex.equipment) || allowedEquip.has('none')
  )
}

// Priority exercises per group — picked first regardless of level
const PRIORITY: Record<string, string[]> = {
  chest: ['Press de Banca', 'Press con Mancuernas', 'Fondos en Paralelas'],
  back: ['Peso Muerto', 'Dominadas', 'Remo con Barra'],
  legs: ['Sentadilla', 'Prensa de Piernas', 'Peso Muerto Rumano'],
  shoulders: ['Press Militar', 'Press Arnold', 'Elevaciones Laterales'],
  arms: ['Curl de Bíceps con Barra', 'Extensiones de Tríceps', 'Curl Martillo'],
  glutes: ['Hip Thrust', 'Peso Muerto Rumano', 'Patada de Glúteo'],
  core: ['Plancha', 'Crunch con Cable', 'Elevaciones de Piernas'],
}

// Pick N exercises for a group, prioritising compound/key movements
function pickExercises(
  exercises: any[],
  groups: string[],
  count: number,
  level: Level
): any[] {
  const result: any[] = []
  const used = new Set<string>()

  // First pass: priority exercises
  for (const group of groups) {
    const priority = PRIORITY[group] ?? []
    const groupExercises = exercises.filter(e => e.muscle_group === group)
    for (const name of priority) {
      if (result.length >= count) break
      const ex = groupExercises.find(e => e.name === name && !used.has(e.id))
      if (ex) { result.push(ex); used.add(ex.id) }
    }
    if (result.length >= count) break
  }

  // Second pass: fill remaining slots
  if (result.length < count) {
    for (const group of groups) {
      const groupExercises = exercises.filter(e => e.muscle_group === group && !used.has(e.id))
      for (const ex of groupExercises) {
        if (result.length >= count) break
        result.push(ex); used.add(ex.id)
      }
      if (result.length >= count) break
    }
  }

  return result.slice(0, count)
}

// ── Main export ───────────────────────────────

export interface GeneratedDay {
  label: string
  day_of_week: number // 1=Mon, 2=Tue, ... mapped sequentially
  exercises: {
    exercise_id: string
    name: string
    muscle_group: string
    order_index: number
    target_sets: number
    target_reps: string
    target_rest_seconds: number
  }[]
}

export interface GeneratedRoutine {
  name: string
  description: string
  days: GeneratedDay[]
}

export function generateRoutine(params: GeneratorParams, exercises: any[]): GeneratedRoutine {
  const { goal, frequency, level, equipment } = params

  const availableExercises = filterByEquipment(exercises, equipment)
  const split = chooseSplit(frequency, goal, level)
  const exPerSession = exercisesPerSession(level, goal)
  const { sets, reps, rest } = getSetsReps(goal, level)

  const GOAL_LABELS: Record<Goal, string> = {
    fat_loss: 'Pérdida de Grasa',
    hypertrophy: 'Hipertrofia',
    strength: 'Fuerza',
    maintenance: 'Mantenimiento',
  }

  const LEVEL_LABELS: Record<Level, string> = {
    beginner: 'Principiante',
    intermediate: 'Intermedio',
    advanced: 'Avanzado',
  }

  // Map split days to weekdays starting Monday
  const WEEKDAY_MAP = [1, 2, 3, 4, 5, 6, 0] // Mon–Sun

  const days: GeneratedDay[] = split.map((dayConfig, i) => {
    const picked = pickExercises(availableExercises, dayConfig.groups, exPerSession, level)
    return {
      label: dayConfig.label,
      day_of_week: WEEKDAY_MAP[i] ?? i,
      exercises: picked.map((ex, idx) => ({
        exercise_id: ex.id,
        name: ex.name,
        muscle_group: ex.muscle_group,
        order_index: idx,
        target_sets: sets,
        target_reps: reps,
        target_rest_seconds: rest,
      })),
    }
  })

  return {
    name: `${GOAL_LABELS[goal]} — ${frequency}d/semana`,
    description: `Rutina generada para ${LEVEL_LABELS[level].toLowerCase()}. ${exPerSession} ejercicios por sesión, ${sets}×${reps}.`,
    days,
  }
}
