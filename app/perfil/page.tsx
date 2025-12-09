'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'
import { ArrowLeft, Save, Lock, User } from 'lucide-react'

export default function PerfilPage() {
  const router = useRouter()
  const [usuario, setUsuario] = useState<any>(null)
  const [nuevaClave, setNuevaClave] = useState('')
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.push('/login')
      setUsuario(user)
    }
    getProfile()
  }, [])

  const actualizarClave = async () => {
    if (nuevaClave.length < 6) return setMensaje("La clave debe tener 6+ caracteres")
    setLoading(true)
    
    const { error } = await supabase.auth.updateUser({ password: nuevaClave })

    if (error) setMensaje("Error: " + error.message)
    else {
      setMensaje("✅ ¡Contraseña actualizada correctamente!")
      setNuevaClave('')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-lg p-8">
        <button onClick={() => router.back()} className="flex items-center text-slate-400 hover:text-blue-600 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2"/> Volver
        </button>

        <h1 className="text-2xl font-bold text-slate-800 mb-2">Mi Perfil</h1>
        <p className="text-slate-500 text-sm mb-6">Gestiona tu seguridad</p>

        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-xl flex items-center gap-3">
            <div className="bg-blue-200 p-2 rounded-full"><User className="w-5 h-5 text-blue-700"/></div>
            <div>
              <p className="text-xs text-blue-600 font-bold uppercase">Correo Registrado</p>
              <p className="text-slate-700 font-medium">{usuario?.email}</p>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-6">
            <label className="text-sm font-bold text-slate-700 mb-2 block">Nueva Contraseña</label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-400 w-5 h-5"/>
              <input 
                type="password" 
                placeholder="Escribe tu nueva clave..." 
                className="w-full pl-10 p-3 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                value={nuevaClave}
                onChange={e => setNuevaClave(e.target.value)}
              />
            </div>
          </div>

          {mensaje && <p className={`text-center text-sm font-bold ${mensaje.includes('Error') ? 'text-red-500' : 'text-green-600'}`}>{mensaje}</p>}

          <button 
            onClick={actualizarClave}
            disabled={loading || !nuevaClave}
            className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Actualizar Clave'}
          </button>
        </div>
      </div>
    </div>
  )
}