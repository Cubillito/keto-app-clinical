'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Mail, Loader2, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mensajeRecuperacion, setMensajeRecuperacion] = useState('')

  // --- 1. LOGIN CON EMAIL Y CLAVE ---
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
        // Verificar Rol
        const { data: perfil } = await supabase
          .from('perfiles')
          .select('rol')
          .eq('id', data.user.id)
          .single()
        
        const rol = perfil?.rol || 'paciente'
        if (rol === 'nutri' || rol === 'admin') router.push('/nutri')
        else router.push('/')
      }
    } catch (err: any) {
      setError('Credenciales incorrectas o error de conexión.')
    } finally {
      setLoading(false)
    }
  }

  // --- 2. LOGIN CON GOOGLE ---
  const loginConGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        // Redirige a la home después de loguearse
        redirectTo: `${window.location.origin}/auth/callback`, 
      },
    })
  }

  // --- 3. RECUPERAR CLAVE ---
  const recuperarClave = async () => {
    if (!email) {
      setError("Por favor, escribe tu correo en la casilla de arriba primero.")
      return
    }
    setLoading(true)
    setError('')
    
    // Esto envía un email mágico que permite al usuario entrar y cambiar su clave
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/perfil`, // Lo mandamos directo a cambiar la clave
    })

    if (error) setError(error.message)
    else setMensajeRecuperacion("📧 ¡Listo! Revisa tu correo para cambiar la clave.")
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        
        <div className="bg-blue-600 p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Acceso Médico</h1>
          <p className="text-blue-100 mt-2 text-sm">Gestión de Dieta Cetogénica</p>
        </div>

        <div className="p-8">
          {/* BOTÓN GOOGLE */}
          <button
            type="button"
            onClick={loginConGoogle}
            className="w-full bg-white border border-slate-300 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-50 flex justify-center items-center gap-3 transition-all mb-6"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="Google" />
            Ingresar con Google
          </button>

          <div className="relative flex py-2 items-center mb-6">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-4 text-slate-400 text-xs uppercase">O usa tu correo</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Correo</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
                  placeholder="paciente@gmail.com"
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
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
                  placeholder="••••••••"
                />
              </div>
              <div className="text-right">
                <button type="button" onClick={recuperarClave} className="text-xs text-blue-600 hover:underline">
                  ¿Olvidaste tu clave?
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
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-all flex justify-center items-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" /> : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}