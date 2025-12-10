'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Mail, Loader2, AlertCircle, KeyRound, Heart } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mensajeRecuperacion, setMensajeRecuperacion] = useState('')

  // Cliente Supabase
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (authError) throw authError

      if (data.user) {
        // Consultar rol para redirigir
        const { data: perfil } = await supabase
          .from('perfiles')
          .select('rol')
          .eq('id', data.user.id)
          .single()
        
        const rol = perfil?.rol || 'paciente'
        
        // Redirección
        if (rol === 'nutri' || rol === 'admin') window.location.href = '/nutri'
        else window.location.href = '/'
      }
    } catch (err: any) {
      if (err.message.includes('Invalid login')) {
        setError('Correo o contraseña incorrectos.')
      } else {
        setError(err.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const recuperarClave = async () => {
    if (!email) {
      setError("☝️ Escribe tu correo en la casilla de arriba primero.")
      return
    }
    setLoading(true)
    setError('')
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/perfil`,
    })

    if (error) setError(error.message)
    else setMensajeRecuperacion("📧 ¡Listo! Revisa tu correo para cambiar la clave.")
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 font-sans">
      
      {/* TARJETA PRINCIPAL */}
      {/* Header Azul */}
        <div className="bg-blue-600 p-8 text-center">
          {/* Círculo semitransparente */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm mb-4 p-3">
            
            {/* AQUÍ ESTÁ EL CAMBIO: Tu logo en vez del candado */}
            {/* Asegúrate de que el nombre 'mi-logo.png' sea exacto al de tu archivo */}
            <img 
              src="/icon.png" 
              alt="Logo de la aplicación" 
              className="w-full h-full object-contain drop-shadow-sm"
            />

          <h1 className="text-2xl font-bold text-white">Acceso Privado</h1>
          <p className="text-blue-100 mt-2 text-sm">Plataforma de Gestión Keto</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 outline-none transition-all"
                  placeholder="usuario@ejemplo.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
              <div className="text-right mt-2">
                <button 
                  type="button" 
                  onClick={recuperarClave} 
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center justify-end gap-1 ml-auto"
                >
                  <KeyRound className="w-3 h-3" /> ¿Olvidaste tu contraseña?
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}

            {mensajeRecuperacion && (
              <div className="p-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg text-center font-medium">
                {mensajeRecuperacion}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-all flex justify-center items-center gap-2 shadow-lg shadow-slate-200"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>

      {/* FOOTER - TU MARCA */}
      <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <p className="text-slate-400 text-xs font-medium tracking-wide">
          Hecho por
        </p>
        <p className="text-slate-600 text-sm font-bold mt-1">
          Ignacio Cubillos Leal
        </p>
      </div>

    </div>
  )
}