export type Goal       = 'fat_loss' | 'hypertrophy' | 'strength' | 'maintenance'
export type Level      = 'beginner' | 'intermediate' | 'advanced'
// Equipment values match what's stored in exercises.equipment column
export type Equipment  = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'bodyweight' | 'kettlebell'

export interface GeneratorParams {
  goal:      Goal
  frequency: number   // 1–7 days per week
  level:     Level
  equipment: Equipment[]
}

// ── Splits ───────────────────────────────────────────────────────────────────
const SPLITS = {
  full_body:   (freq: number) => Array.from({ length: freq }, (_, i) => ({
    label: freq > 1 ? `Full Body ${i + 1}` : 'Full Body',
    groups: ['chest','back','legs','shoulders','arms','core'],
  })),
  upper_lower: () => [
    { label: 'Upper A', groups: ['chest','back','shoulders','arms'] },
    { label: 'Lower A', groups: ['legs','glutes','core'] },
    { label: 'Upper B', groups: ['chest','back','shoulders','arms'] },
    { label: 'Lower B', groups: ['legs','glutes','core'] },
  ],
  ppl: (freq: number) => {
    const base = [
      { label: 'Push',  groups: ['chest','shoulders','arms'] },
      { label: 'Pull',  groups: ['back','arms'] },
      { label: 'Legs',  groups: ['legs','glutes','core'] },
    ]
    return freq === 6 ? [...base, ...base.map(d => ({ ...d, label: d.label + ' B' }))] : base
  },
  bro: () => [
    { label: 'Pecho',    groups: ['chest','arms'] },
    { label: 'Espalda',  groups: ['back','core'] },
    { label: 'Hombros',  groups: ['shoulders','arms'] },
    { label: 'Piernas',  groups: ['legs','glutes'] },
    { label: 'Brazos',   groups: ['arms','core'] },
  ],
}

function chooseSplit(freq: number, goal: Goal, level: Level) {
  if (freq <= 3 || level === 'beginner') return SPLITS.full_body(freq)
  if (freq === 4) return SPLITS.upper_lower()
  if (freq === 5) return SPLITS.bro()
  return SPLITS.ppl(freq)
}

function exercisesPerSession(level: Level, goal: Goal): number {
  if (goal === 'strength')    return level === 'beginner' ? 4 : 5
  if (goal === 'hypertrophy') return level === 'advanced' ? 7 : 6
  return level === 'beginner' ? 4 : 5
}

function getSetsReps(goal: Goal, level: Level) {
  if (goal === 'strength')    return { sets: 5, reps: '3-5',   rest: 180 }
  if (goal === 'hypertrophy') return { sets: level === 'beginner' ? 3 : 4, reps: '8-12',  rest: 90 }
  if (goal === 'fat_loss')    return { sets: 3, reps: '12-15', rest: 60  }
  return                             { sets: 3, reps: '10-12', rest: 90  }
}

// Map user-facing equipment strings (from profile) to DB equipment column values
export function mapProfileEquipmentToDb(profileEquipment: string[]): Equipment[] {
  const map: Record<string, Equipment> = {
    barbell:    'barbell',
    dumbbells:  'dumbbell',
    dumbbell:   'dumbbell',
    machines:   'machine',
    machine:    'machine',
    cables:     'cable',
    cable:      'cable',
    bodyweight: 'bodyweight',
    kettlebells:'kettlebell',
    kettlebell: 'kettlebell',
  }
  const result = new Set<Equipment>(['bodyweight']) // always include bodyweight
  for (const eq of (profileEquipment ?? [])) {
    const mapped = map[eq.toLowerCase()]
    if (mapped) result.add(mapped)
  }
  return [...result]
}

// Filter exercises to only those the user can perform with their equipment
function filterByEquipment(exercises: any[], allowed: Equipment[]): any[] {
  const set = new Set(allowed)
  return exercises.filter(ex => !ex.equipment || set.has(ex.equipment))
}

const PRIORITY: Record<string, string[]> = {
  chest:     ['Press de Banca', 'Press con Mancuernas', 'Fondos en Paralelas'],
  back:      ['Peso Muerto', 'Dominadas', 'Remo con Barra', 'Remo con Mancuerna'],
  legs:      ['Sentadilla', 'Prensa de Piernas', 'Peso Muerto Rumano'],
  shoulders: ['Press Militar', 'Press Arnold', 'Elevaciones Laterales'],
  arms:      ['Curl de Bíceps con Barra', 'Curl de Bíceps con Mancuerna', 'Extensiones de Tríceps'],
  glutes:    ['Hip Thrust', 'Peso Muerto Rumano', 'Patada de Glúteo'],
  core:      ['Plancha', 'Elevaciones de Piernas', 'Rueda Abdominal'],
}

function pickExercises(exercises: any[], groups: string[], count: number): any[] {
  const result: any[] = []
  const used = new Set<string>()

  // Priority pass
  for (const group of groups) {
    if (result.length >= count) break
    for (const name of (PRIORITY[group] ?? [])) {
      if (result.length >= count) break
      const ex = exercises.find(e => e.muscle_group === group && e.name === name && !used.has(e.id))
      if (ex) { result.push(ex); used.add(ex.id) }
    }
  }
  // Fill pass
  for (const group of groups) {
    if (result.length >= count) break
    for (const ex of exercises.filter(e => e.muscle_group === group && !used.has(e.id))) {
      if (result.length >= count) break
      result.push(ex); used.add(ex.id)
    }
  }
  return result.slice(0, count)
}

// ── Exported interfaces ───────────────────────────────────────────────────────
export interface GeneratedExercise {
  exercise_id:         string
  name:                string
  muscle_group:        string
  order_index:         number
  target_sets:         number
  target_reps:         string
  target_rest_seconds: number
}

export interface GeneratedDay {
  label:       string
  day_of_week: number   // 0=Sun, 1=Mon … 6=Sat
  exercises:   GeneratedExercise[]
}

export interface GeneratedRoutine {
  name:        string
  description: string
  days:        GeneratedDay[]
}

const WEEKDAY_MAP = [1, 2, 3, 4, 5, 6, 0] // Mon→Sun

export function generateRoutine(params: GeneratorParams, exercises: any[]): GeneratedRoutine {
  const { goal, frequency, level, equipment } = params
  const available = filterByEquipment(exercises, equipment)
  const split      = chooseSplit(frequency, goal, level)
  const exCount    = exercisesPerSession(level, goal)
  const { sets, reps, rest } = getSetsReps(goal, level)

  const GOAL_LABELS: Record<Goal,  string> = {
    fat_loss: 'Pérdida de Grasa', hypertrophy: 'Hipertrofia',
    strength: 'Fuerza',           maintenance: 'Mantenimiento',
  }
  const LEVEL_LABELS: Record<Level, string> = {
    beginner: 'principiante', intermediate: 'intermedio', advanced: 'avanzado',
  }

  const days: GeneratedDay[] = split.map((dayConfig, i) => ({
    label:       dayConfig.label,
    day_of_week: WEEKDAY_MAP[i] ?? i,
    exercises:   pickExercises(available, dayConfig.groups, exCount).map((ex, idx) => ({
      exercise_id:         ex.id,
      name:                ex.name,
      muscle_group:        ex.muscle_group,
      order_index:         idx,
      target_sets:         sets,
      target_reps:         reps,
      target_rest_seconds: rest,
    })),
  }))

  return {
    name:        `${GOAL_LABELS[goal]} — ${frequency}d/semana`,
    description: `Rutina para nivel ${LEVEL_LABELS[level]}. ${exCount} ejercicios/sesión, ${sets}×${reps}.`,
    days,
  }
}
