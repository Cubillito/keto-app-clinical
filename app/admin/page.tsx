'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'
import { Search, Save, Trash2, Edit2, X, ArrowLeft, Users, Database, UserPlus, Lock } from 'lucide-react'

export default function AdminPanel() {
  const router = useRouter()
  const [vista, setVista] = useState<'alimentos' | 'nutris'>('alimentos') // Switch de pestañas
  
  // Estados Alimentos
  const [alimentos, setAlimentos] = useState<any[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [editandoAlimento, setEditandoAlimento] = useState<any>(null)
  const [formAlimento, setFormAlimento] = useState({ nombre: '', proteina: 0, grasa: 0, carbos: 0, categoria: 'VARIOS' })

  // Estados Nutricionistas
  const [nutris, setNutris] = useState<any[]>([])
  const [creandoNutri, setCreandoNutri] = useState(false)
  const [nuevoNutri, setNuevoNutri] = useState({ nombre: '', email: '', password: '' })

  useEffect(() => {
    verificarAdmin()
  }, [])

  useEffect(() => {
    if (vista === 'nutris') cargarNutris()
  }, [vista])

  const verificarAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return router.push('/login')
    const { data: perfil } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
    if (perfil?.rol !== 'admin') router.push('/')
  }

  // --- LOGICA ALIMENTOS (Ya la conoces) ---
  const buscarAlimento = async (txt: string) => {
    setBusqueda(txt)
    if (txt.length < 3) return
    const { data } = await supabase.from('alimentos').select('*').ilike('nombre', `%${txt}%`).limit(20)
    setAlimentos(data || [])
  }

  const guardarAlimento = async () => {
    if (!formAlimento.nombre) return alert("Falta nombre")
    const datos = { ...formAlimento, cantidad_base: 100 }
    if (editandoAlimento) await supabase.from('alimentos').update(datos).eq('id', editandoAlimento.id)
    else await supabase.from('alimentos').insert(datos)
    
    setEditandoAlimento(null)
    setFormAlimento({ nombre: '', proteina: 0, grasa: 0, carbos: 0, categoria: 'VARIOS' })
    buscarAlimento(busqueda)
  }

  const borrarAlimento = async (id: number) => {
    if(!confirm("¿Borrar?")) return
    await supabase.from('alimentos').delete().eq('id', id)
    buscarAlimento(busqueda)
  }

  // --- LOGICA NUTRICIONISTAS (NUEVO) ---
  const cargarNutris = async () => {
    const { data } = await supabase.from('perfiles').select('*').in('rol', ['nutri', 'admin'])
    setNutris(data || [])
  }

  const crearNutricionista = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreandoNutri(true)
    try {
      const response = await fetch('/api/crear-usuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...nuevoNutri, rol: 'nutri' }) // <--- Creamos con rol NUTRI
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      
      alert("Nutricionista creado exitosamente")
      setNuevoNutri({ nombre: '', email: '', password: '' })
      cargarNutris()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setCreandoNutri(false)
    }
  }

  const borrarUsuario = async (id: string) => {
    if(!confirm("¿Estás seguro? Esto borrará al usuario y sus datos.")) return
    // Borramos de perfiles (el trigger de supabase auth debería encargarse del resto si está configurado, 
    // pero por ahora borramos el perfil para quitar acceso).
    // Nota: Para borrar completamente de Auth se requiere la API Admin, pero quitar el perfil bloquea el acceso en nuestro Login.
    await supabase.from('perfiles').delete().eq('id', id)
    cargarNutris()
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-6">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-700">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/nutri')} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700">
            <ArrowLeft className="w-5 h-5"/>
          </button>
          <h1 className="text-2xl font-bold text-white">Administración del Sistema</h1>
        </div>
        
        {/* SWITCHER DE PESTAÑAS */}
        <div className="flex bg-slate-800 p-1 rounded-lg">
          <button 
            onClick={() => setVista('alimentos')}
            className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 ${vista === 'alimentos' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Database className="w-4 h-4"/> Alimentos
          </button>
          <button 
            onClick={() => setVista('nutris')}
            className={`px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 ${vista === 'nutris' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <Users className="w-4 h-4"/> Equipo Médico
          </button>
        </div>
      </div>

      {/* VISTA ALIMENTOS (IGUAL QUE ANTES) */}
      {vista === 'alimentos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-slate-500"/>
              <input className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 pl-10 text-white outline-none focus:border-blue-500" placeholder="Buscar alimento..." value={busqueda} onChange={e => buscarAlimento(e.target.value)} />
            </div>
            <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
              {alimentos.map(a => (
                <div key={a.id} className="p-3 border-b border-slate-700 flex justify-between items-center hover:bg-slate-800">
                  <div>
                    <div className="font-bold text-white">{a.nombre}</div>
                    <div className="text-xs text-slate-400 flex gap-2"><span className="text-blue-400">P: {a.proteina}</span><span className="text-yellow-400">G: {a.grasa}</span><span className="text-red-400">C: {a.carbos}</span></div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => {setEditandoAlimento(a); setFormAlimento(a)}} className="p-2 hover:bg-blue-900/50 text-blue-400 rounded"><Edit2 className="w-4 h-4"/></button>
                    <button onClick={() => borrarAlimento(a.id)} className="p-2 hover:bg-red-900/50 text-red-400 rounded"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 h-fit">
            <h2 className="font-bold text-white mb-4">{editandoAlimento ? 'Editar' : 'Nuevo'} Alimento</h2>
            <div className="space-y-3">
              <input className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white" placeholder="Nombre" value={formAlimento.nombre} onChange={e => setFormAlimento({...formAlimento, nombre: e.target.value})} />
              <div className="grid grid-cols-3 gap-2">
                <input type="number" className="bg-slate-900 border border-slate-600 rounded p-2 text-white" placeholder="Prot" value={formAlimento.proteina} onChange={e => setFormAlimento({...formAlimento, proteina: parseFloat(e.target.value)})} />
                <input type="number" className="bg-slate-900 border border-slate-600 rounded p-2 text-white" placeholder="Grasa" value={formAlimento.grasa} onChange={e => setFormAlimento({...formAlimento, grasa: parseFloat(e.target.value)})} />
                <input type="number" className="bg-slate-900 border border-slate-600 rounded p-2 text-white" placeholder="Carb" value={formAlimento.carbos} onChange={e => setFormAlimento({...formAlimento, carbos: parseFloat(e.target.value)})} />
              </div>
              <button onClick={guardarAlimento} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg flex justify-center gap-2"><Save className="w-5 h-5"/> Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* VISTA NUTRICIONISTAS (NUEVO) */}
      {vista === 'nutris' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LISTA DE PERSONAL MÉDICO */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-blue-400"/> Nutricionistas Activos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {nutris.map(n => (
                <div key={n.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-white">{n.nombre_completo}</h3>
                      {n.rol === 'admin' && <span className="text-[10px] bg-purple-900 text-purple-200 px-2 py-0.5 rounded border border-purple-700">ADMIN</span>}
                    </div>
                    <p className="text-sm text-slate-400">{n.email}</p>
                  </div>
                  {n.rol !== 'admin' && ( // No puedes borrarte a ti mismo ni a otros admins por seguridad básica
                    <button onClick={() => borrarUsuario(n.id)} className="text-red-400 hover:bg-red-900/30 p-2 rounded"><Trash2 className="w-4 h-4"/></button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* FORMULARIO CREAR NUTRI */}
          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 h-fit">
            <h2 className="font-bold text-white mb-4 flex items-center gap-2"><UserPlus className="w-5 h-5 text-green-400"/> Contratar Nutricionista</h2>
            <form onSubmit={crearNutricionista} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 uppercase">Nombre del Doctor/a</label>
                <input required className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white mt-1" value={nuevoNutri.nombre} onChange={e => setNuevoNutri({...nuevoNutri, nombre: e.target.value})} placeholder="Ej: Dra. Ana"/>
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase">Correo (Google compatible)</label>
                <input required type="email" className="w-full bg-slate-900 border border-slate-600 rounded p-2 text-white mt-1" value={nuevoNutri.email} onChange={e => setNuevoNutri({...nuevoNutri, email: e.target.value})} placeholder="ana@gmail.com"/>
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase">Contraseña Inicial</label>
                <div className="relative">
                  <input required type="text" className="w-full bg-slate-900 border border-slate-600 rounded p-2 pl-8 text-white mt-1" value={nuevoNutri.password} onChange={e => setNuevoNutri({...nuevoNutri, password: e.target.value})} placeholder="123456"/>
                  <Lock className="w-4 h-4 text-slate-500 absolute left-2 top-4" />
                </div>
              </div>
              <button disabled={creandoNutri} type="submit" className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg mt-2 flex justify-center gap-2">
                {creandoNutri ? 'Creando...' : 'Dar de Alta'}
              </button>
            </form>
          </div>

        </div>
      )}
    </div>
  )
}