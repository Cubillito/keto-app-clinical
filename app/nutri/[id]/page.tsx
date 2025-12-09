'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { Save, Plus, Trash2, ArrowLeft, Search, Check, Ban, Calendar, Eye, Edit3, AlertCircle, CheckCircle } from 'lucide-react'

export default function GestionPaciente() {
  const { id } = useParams()
  const router = useRouter()
  const [paciente, setPaciente] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'plan' | 'diario'>('plan')
  
  // --- DATOS COMUNES ---
  const [bloques, setBloques] = useState<any[]>([])

  // --- ESTADOS TAB PLANIFICACIÓN ---
  const [permitidos, setPermitidos] = useState<any[]>([])
  const [busquedaGlobal, setBusquedaGlobal] = useState('')
  const [resultadosGlobales, setResultadosGlobales] = useState<any[]>([])
  const [nuevoBloque, setNuevoBloque] = useState('')
  const [metaProt, setMetaProt] = useState('')
  const [metaGrasa, setMetaGrasa] = useState('')
  const [metaCarbo, setMetaCarbo] = useState('')
  const [ratio, setRatio] = useState('')

  // --- ESTADOS TAB DIARIO (AUDITORÍA) ---
  const [fechaAudit, setFechaAudit] = useState(new Date().toLocaleDateString('en-CA'))
  const [diarioAudit, setDiarioAudit] = useState<any[]>([])
  const [loadingDiario, setLoadingDiario] = useState(false)

  useEffect(() => {
    cargarDatosGenerales()
  }, [])

  useEffect(() => {
    if (activeTab === 'diario') cargarDiario()
  }, [activeTab, fechaAudit])

  const cargarDatosGenerales = async () => {
    // 1. Paciente
    const { data: userData } = await supabase.from('perfiles').select('*').eq('id', id).single()
    setPaciente(userData)

    // 2. Metas (Bloques)
    const { data: metasData } = await supabase.from('metas_por_comida').select('*').eq('paciente_id', id).order('id', { ascending: true })
    setBloques(metasData || [])

    // 3. Alimentos Permitidos
    const { data: alimentosData } = await supabase
      .from('alimentos_permitidos')
      .select('id, alimento_id, alimentos(*)')
      .eq('paciente_id', id)
    
    const listaLimpia = alimentosData?.map((item: any) => ({ permiso_id: item.id, ...item.alimentos }))
    setPermitidos(listaLimpia || [])
  }

  const cargarDiario = async () => {
    setLoadingDiario(true)
    const { data } = await supabase
      .from('diario_comidas')
      .select('*, alimentos(*)')
      .eq('paciente_id', id)
      .eq('fecha', fechaAudit)
    
    setDiarioAudit(data || [])
    setLoadingDiario(false)
  }

  // --- LOGICA PLANIFICACION (Igual que antes) ---
  const agregarBloque = async () => {
    if (!nuevoBloque) return alert("Falta nombre")
    await supabase.from('metas_por_comida').insert({
      paciente_id: id, nombre_bloque: nuevoBloque,
      meta_proteina: parseFloat(metaProt)||0, meta_grasa: parseFloat(metaGrasa)||0, 
      meta_carbos: parseFloat(metaCarbo)||0, ratio_ideal: parseFloat(ratio)||0
    })
    setNuevoBloque(''); setMetaProt(''); setMetaGrasa(''); setMetaCarbo('');
    cargarDatosGenerales()
  }

  const borrarBloque = async (bloqueId: number) => {
    if(!confirm("¿Borrar bloque?")) return
    await supabase.from('metas_por_comida').delete().eq('id', bloqueId)
    cargarDatosGenerales()
  }

  const buscarEnGlobal = async (txt: string) => {
    setBusquedaGlobal(txt)
    if (txt.length < 3) { setResultadosGlobales([]); return }
    const { data } = await supabase.from('alimentos').select('*').ilike('nombre', `%${txt}%`).limit(10)
    setResultadosGlobales(data || [])
  }

  const autorizarAlimento = async (alimento: any) => {
    const yaExiste = permitidos.find(p => p.id === alimento.id)
    if (yaExiste) return alert("Ya tiene este alimento.")
    await supabase.from('alimentos_permitidos').insert({ paciente_id: id, alimento_id: alimento.id })
    cargarDatosGenerales(); setBusquedaGlobal(''); setResultadosGlobales([])
  }

  const prohibirAlimento = async (permisoId: number) => {
    await supabase.from('alimentos_permitidos').delete().eq('id', permisoId)
    cargarDatosGenerales()
  }

  // --- RENDERIZADO DEL DIARIO (AUDITORÍA) ---
  const renderBloqueAuditoria = (bloque: any) => {
    const comidas = diarioAudit.filter(d => d.bloque_id === bloque.id)
    
    const sumaP = comidas.reduce((acc, el) => acc + ((el.alimentos.proteina * el.gramos_consumidos)/100), 0)
    const sumaG = comidas.reduce((acc, el) => acc + ((el.alimentos.grasa * el.gramos_consumidos)/100), 0)
    
    const cumplido = Math.abs(sumaP - bloque.meta_proteina) < 2

    return (
      <div key={bloque.id} className={`bg-white p-4 rounded-xl border mb-4 ${cumplido ? 'border-green-300 bg-green-50/30' : 'border-red-200 bg-red-50/30'}`}>
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-bold text-slate-800">{bloque.nombre_bloque}</h4>
          {cumplido ? <CheckCircle className="w-5 h-5 text-green-600"/> : <AlertCircle className="w-5 h-5 text-red-500"/>}
        </div>
        
        <div className="flex gap-4 text-xs font-mono text-slate-600 mb-3 bg-white/50 p-2 rounded">
           <span>PROT: <b>{sumaP.toFixed(1)}</b> / {bloque.meta_proteina}</span>
           <span>GRASA: <b>{sumaG.toFixed(1)}</b> / {bloque.meta_grasa}</span>
        </div>

        {comidas.length === 0 ? <p className="text-xs text-slate-400 italic">No registró nada.</p> : (
          <ul className="space-y-1">
            {comidas.map((c: any) => (
              <li key={c.id} className="text-sm flex justify-between border-b border-slate-100 pb-1">
                <span>{c.alimentos.nombre}</span>
                <span className="font-bold text-slate-500">{c.gramos_consumidos}g</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/nutri')} className="p-2 bg-white border rounded-lg hover:bg-slate-100 text-slate-500">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{paciente?.nombre_completo}</h1>
              <p className="text-sm text-slate-500">{paciente?.email}</p>
            </div>
          </div>

          {/* TABS SWITCHER */}
          <div className="bg-white p-1 rounded-xl border border-slate-200 flex shadow-sm">
            <button 
              onClick={() => setActiveTab('plan')}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition ${activeTab === 'plan' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Edit3 className="w-4 h-4"/> Planificación
            </button>
            <button 
              onClick={() => setActiveTab('diario')}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition ${activeTab === 'diario' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Eye className="w-4 h-4"/> Auditoría Diario
            </button>
          </div>
        </div>

        {/* --- PESTAÑA 1: PLANIFICACIÓN (LO QUE YA TENÍAS) --- */}
        {activeTab === 'plan' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in">
            
            {/* IZQUIERDA: BLOQUES */}
            <div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100 mb-6">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><Plus className="w-5 h-5 text-blue-500"/> Crear Bloque</h3>
                <div className="space-y-3">
                  <input value={nuevoBloque} onChange={e => setNuevoBloque(e.target.value)} className="w-full p-2 border rounded" placeholder="Nombre (Ej: Desayuno)" />
                  <div className="grid grid-cols-4 gap-2">
                    <input type="number" value={metaProt} onChange={e => setMetaProt(e.target.value)} className="p-2 border rounded" placeholder="Prot" />
                    <input type="number" value={metaGrasa} onChange={e => setMetaGrasa(e.target.value)} className="p-2 border rounded" placeholder="Grasa" />
                    <input type="number" value={metaCarbo} onChange={e => setMetaCarbo(e.target.value)} className="p-2 border rounded" placeholder="Carb" />
                    <input type="number" value={ratio} onChange={e => setRatio(e.target.value)} className="p-2 border rounded" placeholder="Ratio" />
                  </div>
                  <button onClick={agregarBloque} className="w-full bg-blue-600 text-white font-bold p-2 rounded hover:bg-blue-700">Guardar Bloque</button>
                </div>
              </div>

              <div className="space-y-3">
                {bloques.map((m) => (
                  <div key={m.id} className="bg-white p-4 rounded-xl border flex justify-between">
                    <div>
                      <h4 className="font-bold">{m.nombre_bloque}</h4>
                      <div className="text-xs text-slate-500 flex gap-2">
                        <span>P: {m.meta_proteina}</span><span>G: {m.meta_grasa}</span><span>C: {m.meta_carbos}</span>
                      </div>
                    </div>
                    <button onClick={() => borrarBloque(m.id)} className="text-red-400"><Trash2 className="w-4 h-4"/></button>
                  </div>
                ))}
              </div>
            </div>

            {/* DERECHA: ALIMENTOS PERMITIDOS */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600" /> Despensa Personalizada
              </h2>
              <div className="relative mb-4">
                <input className="w-full p-3 pl-10 border border-slate-300 rounded-lg bg-slate-50 focus:ring-2 focus:ring-green-500 outline-none" placeholder="Buscar para autorizar..." value={busquedaGlobal} onChange={e => buscarEnGlobal(e.target.value)}/>
                <Search className="absolute left-3 top-3.5 text-slate-400 w-4 h-4" />
                {resultadosGlobales.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border shadow-lg rounded-lg mt-1 z-10 max-h-40 overflow-auto">
                    {resultadosGlobales.map(alim => (
                      <div key={alim.id} onClick={() => autorizarAlimento(alim)} className="p-2 hover:bg-green-50 cursor-pointer flex justify-between items-center border-b">
                        <span>{alim.nombre}</span><Plus className="w-4 h-4 text-green-600" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="border rounded-lg overflow-hidden max-h-[500px] overflow-y-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {permitidos.map((p) => (
                      <tr key={p.permiso_id} className="border-b hover:bg-slate-50">
                        <td className="p-3">{p.nombre}</td>
                        <td className="p-3 text-right"><button onClick={() => prohibirAlimento(p.permiso_id)} className="text-red-400 hover:text-red-600"><Ban className="w-4 h-4" /></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* --- PESTAÑA 2: AUDITORÍA DIARIO (NUEVO) --- */}
        {activeTab === 'diario' && (
          <div className="animate-in fade-in">
            <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 flex items-center gap-4">
              <Calendar className="text-indigo-600 w-6 h-6"/>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase block">Fecha a revisar</label>
                <input 
                  type="date" 
                  value={fechaAudit} 
                  onChange={(e) => setFechaAudit(e.target.value)}
                  className="font-bold text-slate-800 text-lg outline-none bg-transparent"
                />
              </div>
            </div>

            {loadingDiario ? <p>Cargando datos del paciente...</p> : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bloques.length === 0 ? <p>No hay dieta asignada.</p> : bloques.map(renderBloqueAuditoria)}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}