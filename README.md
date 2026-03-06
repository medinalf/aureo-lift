# Aureo Lift

App de tracking de entrenamiento con fuerza progresiva.

## Setup

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ejecutar `supabase/migrations/001_initial_schema.sql` en el SQL Editor
3. Copiar `.env.local.example` a `.env.local` y llenar las variables
4. `npm install && npm run dev`

## Deploy en Vercel

1. Push a GitHub
2. Importar en [vercel.com](https://vercel.com)
3. Agregar variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

## Stack

- Next.js 14 (App Router)
- Supabase (Auth + PostgreSQL + RLS)
- Tailwind CSS
- Recharts
- Zustand
