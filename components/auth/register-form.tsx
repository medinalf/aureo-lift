'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

const schema = z.object({
  full_name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  confirm: z.string(),
}).refine(d => d.password === d.confirm, { message: 'No coinciden', path: ['confirm'] })

const IS = { backgroundColor: 'rgb(var(--bg-input))', border: '1px solid rgb(var(--border))', color: 'rgb(var(--foreground))' }

export function RegisterForm() {
  const [err, setErr] = useState('')
  const [ok, setOk] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) })
  const onSubmit = async (d: any) => {
    setErr('')
    const { error } = await createClient().auth.signUp({
      email: d.email, password: d.password,
      options: { data: { full_name: d.full_name }, emailRedirectTo: `${location.origin}/auth/callback` },
    })
    if (error) { setErr(error.message); return }
    setOk(true)
  }
  if (ok) return (
    <div className="w-full max-w-sm text-center rounded-2xl p-8" style={{ backgroundColor: 'rgb(var(--bg-surface))', border: '1px solid rgb(var(--border))' }}>
      <div className="text-4xl mb-4">📧</div>
      <h2 className="font-display text-2xl font-semibold mb-3">Revisa tu email</h2>
      <p className="text-sm" style={{ color: 'rgb(var(--muted))' }}>Te enviamos un enlace de confirmación.</p>
      <Link href="/login" className="inline-block mt-6 text-sm" style={{ color: 'rgb(var(--accent))' }}>Ir al inicio</Link>
    </div>
  )
  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="font-display text-4xl font-bold" style={{ color: 'rgb(var(--accent))' }}>Aureo Lift</h1>
        <p className="text-sm mt-2" style={{ color: 'rgb(var(--muted))' }}>Crea tu cuenta gratuita</p>
      </div>
      <div className="rounded-2xl p-8" style={{ backgroundColor: 'rgb(var(--bg-surface))', border: '1px solid rgb(var(--border))' }}>
        <h2 className="font-semibold text-lg mb-6">Crear Cuenta</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {[['full_name','Nombre','text','Marco García'],['email','Email','email','tu@email.com'],['password','Contraseña','password','Mín. 8 chars'],['confirm','Confirmar','password','Repite']].map(([n,l,t,p]) => (
            <div key={n}>
              <label className="block text-xs uppercase tracking-widest mb-2" style={{ color: 'rgb(var(--muted))' }}>{l}</label>
              <input {...register(n as any)} type={t} placeholder={p} className="w-full px-4 py-3 text-sm rounded-xl focus:outline-none" style={IS} />
              {(errors as any)[n] && <p className="text-xs mt-1" style={{ color: 'rgb(var(--danger))' }}>{(errors as any)[n]?.message}</p>}
            </div>
          ))}
          {err && <p className="text-sm px-4 py-3 rounded-xl" style={{ backgroundColor: 'rgba(224,83,83,0.1)', color: 'rgb(var(--danger))' }}>{err}</p>}
          <button type="submit" disabled={isSubmitting} className="w-full py-3.5 text-black font-semibold text-sm rounded-xl flex items-center justify-center gap-2 disabled:opacity-60" style={{ backgroundColor: 'rgb(var(--accent))' }}>
            {isSubmitting && <Loader2 size={16} className="animate-spin" />} Crear Cuenta
          </button>
        </form>
        <div className="mt-6 pt-6 text-center text-sm" style={{ borderTop: '1px solid rgb(var(--border))', color: 'rgb(var(--muted))' }}>
          ¿Ya tenés cuenta? <Link href="/login" style={{ color: 'rgb(var(--accent))' }}>Inicia sesión</Link>
        </div>
      </div>
    </div>
  )
}
