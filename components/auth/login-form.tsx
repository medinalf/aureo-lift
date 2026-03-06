'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

const schema = z.object({ email: z.string().email(), password: z.string().min(6) })
const IS = { backgroundColor: 'rgb(var(--bg-input))', border: '1px solid rgb(var(--border))', color: 'rgb(var(--foreground))' }

export function LoginForm() {
  const router = useRouter()
  const [show, setShow] = useState(false)
  const [err, setErr] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) })
  const onSubmit = async (d: any) => {
    setErr('')
    const { error } = await createClient().auth.signInWithPassword({ email: d.email, password: d.password })
    if (error) { setErr('Email o contraseña incorrectos'); return }
    router.push('/dashboard'); router.refresh()
  }
  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="font-display text-4xl font-bold" style={{ color: 'rgb(var(--accent))' }}>Aureo Lift</h1>
        <p className="text-sm mt-2" style={{ color: 'rgb(var(--muted))' }}>Registra tu progresión. Supérate cada semana.</p>
      </div>
      <div className="rounded-2xl p-8" style={{ backgroundColor: 'rgb(var(--bg-surface))', border: '1px solid rgb(var(--border))' }}>
        <h2 className="font-semibold text-lg mb-6">Iniciar Sesión</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: 'rgb(var(--muted))' }}>Email</label>
            <input {...register('email')} type="email" placeholder="tu@email.com" className="w-full px-4 py-3 text-sm rounded-xl focus:outline-none" style={IS} />
            {errors.email && <p className="text-xs mt-1" style={{ color: 'rgb(var(--danger))' }}>Email inválido</p>}
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: 'rgb(var(--muted))' }}>Contraseña</label>
            <div className="relative">
              <input {...register('password')} type={show ? 'text' : 'password'} placeholder="••••••••" className="w-full px-4 py-3 pr-11 text-sm rounded-xl focus:outline-none" style={IS} />
              <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'rgb(var(--muted))' }}>
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          {err && <p className="text-sm px-4 py-3 rounded-xl" style={{ backgroundColor: 'rgba(224,83,83,0.1)', color: 'rgb(var(--danger))' }}>{err}</p>}
          <button type="submit" disabled={isSubmitting} className="w-full py-3.5 text-black font-semibold text-sm rounded-xl flex items-center justify-center gap-2 disabled:opacity-60" style={{ backgroundColor: 'rgb(var(--accent))' }}>
            {isSubmitting && <Loader2 size={16} className="animate-spin" />} Iniciar Sesión
          </button>
        </form>
        <div className="mt-6 pt-6 text-center text-sm" style={{ borderTop: '1px solid rgb(var(--border))', color: 'rgb(var(--muted))' }}>
          ¿Sin cuenta? <Link href="/register" style={{ color: 'rgb(var(--accent))' }}>Regístrate gratis</Link>
        </div>
      </div>
    </div>
  )
}
