'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'
import { Users, FileText, LogOut, Database, UserPlus, X, Loader2, Lock, ShieldCheck } from 'lucide-react'

export default function NutriDashboard() {
  const router = useRouter()
  const [pacientes, setPacientes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [usuarioActual, setUsuarioActual] = useState<any>(null)
  const [esAdmin, setEsAdmin] = useState(false)
  
  // Modal Crear
  const [mostrarModal, setMostrarModal] = useState(false)
  const [creando, setCreando] = useState(false)
  const [nuevoPaciente, setNuevoPaciente] = useState({ nombre: '', email: '', password: '' })

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      // 1. Obtener usuario actual
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUsuarioActual(user)

      // 2. Verificar si es admin
      const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
      const soyAdmin = perfil?.rol === 'admin'
      if (soyAdmin) setEsAdmin(true)

      // 3. CARGAR PACIENTES (FILTRADO INTELIGENTE) 🧠
      let query = supabase.from('perfiles').select('*').eq('rol', 'paciente')

      if (!soyAdmin) {
        // Si NO soy admin, solo traigo los pacientes donde YO soy el nutricionista
        query = query.eq('nutricionista_id', user.id)
      }
      // (Si soy admin, no aplico filtro y veo a todos)

      const { data, error } = await query
      if (error) throw error
      setPacientes(data || [])

    } catch (err) {
      console.error("Error cargando:", err)
    } finally {
      setLoading(false)
    }
  }

  const crearPaciente = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!usuarioActual) return
    setCreando(true)

    try {
      const response = await fetch('/api/crear-usuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...nuevoPaciente, 
          rol: 'paciente',
          creadorId: usuarioActual.id // <--- ENVIAMOS TU ID COMO EL "PADRE" DEL PACIENTE
        })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      alert('¡Paciente asignado a tu lista!')
      setMostrarModal(false)
      setNuevoPaciente({ nombre: '', email: '', password: '' })
      cargarDatos() // Recargar lista para ver al nuevo

    } catch (error: any) {
      alert(error.message)
    } finally {
      setCreando(false)
    }
  }

  // ... (El resto del renderizado es visualmente igual, aquí te lo dejo completo para copiar y pegar)
  const cerrarSesion = async () => { await supabase.auth.signOut(); router.push('/login') }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg text-blue-600"><FileText className="w-6 h-6" /></div>
          <div>
            <h1 className="font-bold text-slate-800 text-lg leading-tight">Portal Médico</h1>
            <p className="text-xs text-slate-400">Gestión de Pacientes {esAdmin ? '(Modo Admin)' : ''}</p>
          </div>
        </div>
        <div className="flex gap-3">
          {esAdmin && (
            <button onClick={() => router.push('/admin')} className="bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold hover:bg-slate-900 transition shadow-md border border-slate-700">
              <Database className="w-4 h-4" /> Admin
            </button>
          )}
          <button onClick={cerrarSesion} className="text-sm text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg flex items-center gap-2 transition border border-transparent hover:border-red-100">
            <LogOut className="w-4 h-4" /> Salir
          </button>
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" /> Mis Pacientes
          </h2>
          <button onClick={() => setMostrarModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-md transition-all active:scale-95">
            <UserPlus className="w-4 h-4" /> Nuevo Paciente
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
        ) : pacientes.length === 0 ? (
          <div className="bg-white p-12 rounded-xl border border-dashed border-slate-300 text-center text-slate-500">
            <p>No tienes pacientes asignados.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pacientes.map((paciente) => (
              <div key={paciente.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition cursor-pointer group hover:border-blue-300" onClick={() => router.push(`/nutri/${paciente.id}`)}>
                <div className="flex justify-between items-start mb-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600 flex items-center justify-center font-bold text-lg border border-blue-200">
                    {paciente.nombre_completo?.charAt(0).toUpperCase() || 'P'}
                  </div>
                  {/* Etiqueta para saber si es propio o de otro (solo visible para admin) */}
                  {esAdmin && paciente.nutricionista_id !== usuarioActual.id ? (
                     <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-1 rounded-full">Global</span>
                  ) : (
                     <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> Mío</span>
                  )}
                </div>
                <h3 className="font-bold text-slate-800 text-lg group-hover:text-blue-600 transition truncate">{paciente.nombre_completo}</h3>
                <p className="text-sm text-slate-400 mb-4 truncate">{paciente.email}</p>
                <div className="w-full py-2 bg-slate-50 text-slate-600 text-sm font-semibold rounded-lg group-hover:bg-blue-600 group-hover:text-white transition text-center">Gestionar Dieta →</div>
              </div>
            ))}
          </div>
        )}
      </main>

      {mostrarModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="bg-blue-600 p-4 flex justify-between items-center text-white">
              <h3 className="font-bold flex items-center gap-2"><UserPlus className="w-5 h-5" /> Nuevo Paciente</h3>
              <button onClick={() => setMostrarModal(false)} className="hover:bg-blue-700 p-1 rounded-full"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={crearPaciente} className="p-6 space-y-4">
              <div><label className="text-xs font-bold text-slate-500 uppercase">Nombre</label><input required className="w-full border border-slate-200 rounded-lg p-3 mt-1 outline-none" value={nuevoPaciente.nombre} onChange={e => setNuevoPaciente({...nuevoPaciente, nombre: e.target.value})} /></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase">Email</label><input required type="email" className="w-full border border-slate-200 rounded-lg p-3 mt-1 outline-none" value={nuevoPaciente.email} onChange={e => setNuevoPaciente({...nuevoPaciente, email: e.target.value})} /></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase">Contraseña</label><div className="relative"><input required type="text" className="w-full border border-slate-200 rounded-lg p-3 mt-1 pl-10 outline-none" value={nuevoPaciente.password} onChange={e => setNuevoPaciente({...nuevoPaciente, password: e.target.value})} /><Lock className="w-4 h-4 text-slate-400 absolute left-3 top-4" /></div></div>
              <div className="pt-2"><button type="submit" disabled={creando} className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition">{creando ? <Loader2 className="w-4 h-4 animate-spin mx-auto"/> : 'Asignar a mi lista'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}