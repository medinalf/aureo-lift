// ─── Types ────────────────────────────────────────────────────────────────────
export type Goal = 'fat_loss' | 'hypertrophy' | 'strength' | 'maintenance'
export type Level = 'beginner' | 'intermediate' | 'advanced'
export type Equipment = 'full_gym' | 'home_weights' | 'calisthenics' | 'minimal' | 'none'

export interface OnboardingData {
  fitness_goal: Goal
  weekly_frequency: number
  experience_level: Level
  equipment: Equipment[]
}

// ─── Routine templates ────────────────────────────────────────────────────────
// Maps (goal, level, freq) → array of day configs with muscle groups per day
// Each day = { label, muscleGroups[] }

interface DayTemplate { label: string; muscleGroups: string[] }

function getTemplate(goal: Goal, level: Level, freq: number): DayTemplate[] {
  // Full Body for beginners or low freq
  if (level === 'beginner' || freq <= 3) {
    const fullBody: DayTemplate = { label: 'Cuerpo Completo', muscleGroups: ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'] }
    return Array(freq).fill(null).map((_, i) => ({ ...fullBody, label: `Cuerpo Completo ${i + 1}` }))
  }

  // 4 days
  if (freq === 4) {
    if (goal === 'strength') return [
      { label: 'Empuje A', muscleGroups: ['chest', 'shoulders', 'arms'] },
      { label: 'Jalón A', muscleGroups: ['back', 'arms', 'core'] },
      { label: 'Piernas A', muscleGroups: ['legs', 'glutes', 'core'] },
      { label: 'Empuje B', muscleGroups: ['chest', 'shoulders', 'arms'] },
    ]
    return [
      { label: 'Pecho y Tríceps', muscleGroups: ['chest', 'arms'] },
      { label: 'Espalda y Bíceps', muscleGroups: ['back', 'arms'] },
      { label: 'Piernas', muscleGroups: ['legs', 'glutes'] },
      { label: 'Hombros y Core', muscleGroups: ['shoulders', 'core'] },
    ]
  }

  // 5 days
  if (freq === 5) return [
    { label: 'Pecho', muscleGroups: ['chest', 'arms'] },
    { label: 'Espalda', muscleGroups: ['back', 'arms'] },
    { label: 'Hombros', muscleGroups: ['shoulders', 'core'] },
    { label: 'Piernas', muscleGroups: ['legs', 'glutes'] },
    { label: 'Full Body / Rezagados', muscleGroups: ['chest', 'back', 'legs', 'arms'] },
  ]

  // 6-7 days → PPL x2
  return [
    { label: 'Empuje A', muscleGroups: ['chest', 'shoulders', 'arms'] },
    { label: 'Jalón A', muscleGroups: ['back', 'arms'] },
    { label: 'Piernas A', muscleGroups: ['legs', 'glutes', 'core'] },
    { label: 'Empuje B', muscleGroups: ['chest', 'shoulders', 'arms'] },
    { label: 'Jalón B', muscleGroups: ['back', 'arms'] },
    { label: 'Piernas B', muscleGroups: ['legs', 'glutes', 'core'] },
  ].slice(0, freq)
}

// ─── Sets/reps by goal ────────────────────────────────────────────────────────
function getSetsReps(goal: Goal, level: Level): { sets: number; reps: string; rest: number } {
  if (goal === 'strength')     return { sets: level === 'advanced' ? 5 : 4, reps: '3-5',  rest: 180 }
  if (goal === 'hypertrophy')  return { sets: level === 'advanced' ? 4 : 3, reps: '8-12', rest: 90  }
  if (goal === 'fat_loss')     return { sets: 3, reps: '12-15', rest: 60 }
  return                              { sets: 3, reps: '10-12', rest: 90 }
}

// ─── Exercises per muscle group × equipment ───────────────────────────────────
// Returns exercise names to look up in DB (we'll match by name)
type ExerciseKey = { name: string; priority: number }

const EXERCISE_POOL: Record<string, Record<string, ExerciseKey[]>> = {
  chest: {
    full_gym:      [{ name: 'Press de Banca', priority: 1 }, { name: 'Press Inclinado con Barra', priority: 2 }, { name: 'Aperturas con Mancuernas', priority: 3 }],
    home_weights:  [{ name: 'Press con Mancuernas', priority: 1 }, { name: 'Aperturas con Mancuernas', priority: 2 }, { name: 'Fondos en Paralelas', priority: 3 }],
    calisthenics:  [{ name: 'Fondos en Paralelas', priority: 1 }],
    minimal:       [{ name: 'Fondos en Paralelas', priority: 1 }],
    none:          [{ name: 'Fondos en Paralelas', priority: 1 }],
  },
  back: {
    full_gym:      [{ name: 'Peso Muerto', priority: 1 }, { name: 'Remo con Barra', priority: 2 }, { name: 'Jalón al Pecho', priority: 3 }],
    home_weights:  [{ name: 'Peso Muerto', priority: 1 }, { name: 'Remo con Mancuerna', priority: 2 }, { name: 'Dominadas', priority: 3 }],
    calisthenics:  [{ name: 'Dominadas', priority: 1 }],
    minimal:       [{ name: 'Dominadas', priority: 1 }],
    none:          [{ name: 'Dominadas', priority: 1 }],
  },
  shoulders: {
    full_gym:      [{ name: 'Press Militar', priority: 1 }, { name: 'Elevaciones Laterales', priority: 2 }, { name: 'Elevaciones Frontales', priority: 3 }],
    home_weights:  [{ name: 'Press Arnold', priority: 1 }, { name: 'Elevaciones Laterales', priority: 2 }],
    calisthenics:  [{ name: 'Press Militar', priority: 1 }],
    minimal:       [{ name: 'Press Arnold', priority: 1 }],
    none:          [{ name: 'Press Militar', priority: 1 }],
  },
  arms: {
    full_gym:      [{ name: 'Curl de Bíceps con Barra', priority: 1 }, { name: 'Extensiones de Tríceps', priority: 2 }, { name: 'Curl Martillo', priority: 3 }],
    home_weights:  [{ name: 'Curl de Bíceps con Mancuerna', priority: 1 }, { name: 'Press Francés', priority: 2 }],
    calisthenics:  [{ name: 'Fondos de Tríceps', priority: 1 }],
    minimal:       [{ name: 'Curl Martillo', priority: 1 }, { name: 'Fondos de Tríceps', priority: 2 }],
    none:          [{ name: 'Fondos de Tríceps', priority: 1 }],
  },
  legs: {
    full_gym:      [{ name: 'Sentadilla', priority: 1 }, { name: 'Prensa de Piernas', priority: 2 }, { name: 'Extensiones de Cuádriceps', priority: 3 }, { name: 'Curl de Femoral', priority: 4 }],
    home_weights:  [{ name: 'Sentadilla', priority: 1 }, { name: 'Peso Muerto Rumano', priority: 2 }],
    calisthenics:  [{ name: 'Sentadilla', priority: 1 }],
    minimal:       [{ name: 'Sentadilla', priority: 1 }, { name: 'Peso Muerto Rumano', priority: 2 }],
    none:          [{ name: 'Sentadilla', priority: 1 }],
  },
  glutes: {
    full_gym:      [{ name: 'Hip Thrust', priority: 1 }, { name: 'Patada de Glúteo', priority: 2 }],
    home_weights:  [{ name: 'Hip Thrust', priority: 1 }],
    calisthenics:  [{ name: 'Hip Thrust', priority: 1 }],
    minimal:       [{ name: 'Hip Thrust', priority: 1 }],
    none:          [{ name: 'Hip Thrust', priority: 1 }],
  },
  core: {
    full_gym:      [{ name: 'Crunch con Cable', priority: 1 }, { name: 'Plancha', priority: 2 }, { name: 'Rueda Abdominal', priority: 3 }],
    home_weights:  [{ name: 'Rueda Abdominal', priority: 1 }, { name: 'Plancha', priority: 2 }],
    calisthenics:  [{ name: 'Plancha', priority: 1 }, { name: 'Elevaciones de Piernas', priority: 2 }],
    minimal:       [{ name: 'Plancha', priority: 1 }, { name: 'Elevaciones de Piernas', priority: 2 }],
    none:          [{ name: 'Plancha', priority: 1 }, { name: 'Elevaciones de Piernas', priority: 2 }],
  },
}

// Exercises per day: full body = 4, split = 3 per muscle group (capped)
function getExercisesForMuscle(muscle: string, equipment: Equipment[], count = 2): string[] {
  const eq = equipment[0] ?? 'full_gym'
  const pool = EXERCISE_POOL[muscle]?.[eq] ?? EXERCISE_POOL[muscle]?.full_gym ?? []
  return pool.sort((a, b) => a.priority - b.priority).slice(0, count).map(e => e.name)
}

// ─── Main builder ─────────────────────────────────────────────────────────────
export interface RoutinePlan {
  routineName: string
  days: {
    dayOfWeek: number
    label: string
    exercises: { name: string; sets: number; reps: string; rest: number }[]
  }[]
}

export function buildRoutinePlan(data: OnboardingData, dbExercises: any[]): RoutinePlan {
  const { fitness_goal, weekly_frequency, experience_level, equipment } = data
  const template = getTemplate(fitness_goal, experience_level, weekly_frequency)
  const { sets, reps, rest } = getSetsReps(fitness_goal, experience_level)

  // Map exercises by name for quick lookup
  const exByName = new Map<string, any>()
  for (const ex of dbExercises) exByName.set(ex.name.toLowerCase(), ex)

  const isFullBody = template.every(d => d.muscleGroups.length > 3)
  const exPerMuscle = isFullBody ? 1 : 2

  // Assign days of week evenly
  const WEEKDAYS = [1, 3, 5, 0, 2, 4, 6] // Mon, Wed, Fri, Sun, Tue, Thu, Sat
  const assignedDays = WEEKDAYS.slice(0, weekly_frequency)

  const days = template.map((tmpl, i) => {
    const exNames: string[] = []
    for (const muscle of tmpl.muscleGroups) {
      const names = getExercisesForMuscle(muscle, equipment, exPerMuscle)
      exNames.push(...names)
    }

    // Deduplicate and resolve against DB
    const seen = new Set<string>()
    const exercises: RoutinePlan['days'][0]['exercises'] = []
    for (const name of exNames) {
      const ex = exByName.get(name.toLowerCase())
      if (ex && !seen.has(ex.id)) {
        seen.add(ex.id)
        exercises.push({ name: ex.name, sets, reps, rest })
      }
    }

    return { dayOfWeek: assignedDays[i] ?? i, label: tmpl.label, exercises }
  })

  const goalLabels: Record<Goal, string> = {
    fat_loss: 'Pérdida de Grasa',
    hypertrophy: 'Hipertrofia',
    strength: 'Fuerza',
    maintenance: 'Mantenimiento',
  }

  return {
    routineName: `${goalLabels[fitness_goal]} · ${weekly_frequency}d/semana`,
    days,
  }
}
