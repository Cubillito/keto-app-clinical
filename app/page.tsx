'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Trash2, PlusCircle, LogOut, CheckCircle, AlertCircle, Sparkles, ArrowRight, TrendingUp, Activity, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from 'lucide-react'
import { supabase } from './lib/supabaseClient'

export default function PatientDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [usuario, setUsuario] = useState<any>(null)
  
  // --- FECHA SELECCIONADA ---
  const [fecha, setFecha] = useState(new Date().toLocaleDateString('en-CA')) 
  
  // Datos
  const [bloques, setBloques] = useState<any[]>([]) 
  const [diario, setDiario] = useState<any[]>([])   
  const [catalogo, setCatalogo] = useState<any[]>([]) 
  
  // UI
  const [busqueda, setBusqueda] = useState('')
  const [resultados, setResultados] = useState<any[]>([])
  const [bloqueSeleccionado, setBloqueSeleccionado] = useState<any>(null)
  const [alimentoSeleccionado, setAlimentoSeleccionado] = useState<any>(null)
  const [gramos, setGramos] = useState('100')

  const cambiarDia = (dias: number) => {
    const nuevaFecha = new Date(fecha + 'T12:00:00')
    nuevaFecha.setDate(nuevaFecha.getDate() + dias)
    setFecha(nuevaFecha.toLocaleDateString('en-CA'))
  }

  useEffect(() => {
    const cargar = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUsuario(user)

      // 1. CATÁLOGO (Filtrado por prohibidos)
      if (catalogo.length === 0) {
        const { data: todosAlimentos } = await supabase.from('alimentos').select('*')
        const { data: prohibidos } = await supabase.from('alimentos_prohibidos').select('alimento_id').eq('paciente_id', user.id)
        
        const idsProhibidos = new Set(prohibidos?.map(p => p.alimento_id))
        const catalogoFiltrado = todosAlimentos?.filter(a => !idsProhibidos.has(a.id)) || []
        setCatalogo(catalogoFiltrado)
      }

      // 2. BLOQUES (CON LÓGICA DE HISTORIAL) ⏳
      const { data: allBloques } = await supabase
        .from('metas_por_comida')
        .select('*')
        .eq('paciente_id', user.id)
        .order('id', { ascending: true })
      
      // FILTRO DE VIGENCIA:
      // El bloque es visible SI: (Inició antes o hoy) Y (No ha terminado O termina en el futuro)
      const bloquesVigentes = allBloques?.filter(b => {
        const fInicio = b.fecha_inicio
        const fFin = b.fecha_fin
        return fInicio <= fecha && (!fFin || fFin >= fecha)
      }) || []

      setBloques(bloquesVigentes)

      // 3. DIARIO
      const { data: dataDiario } = await supabase
        .from('diario_comidas')
        .select('*, alimentos(*)')
        .eq('paciente_id', user.id)
        .eq('fecha', fecha)
      
      setDiario(dataDiario || [])
      setLoading(false)
    }
    cargar()
  }, [fecha])

  const buscarAlimento = async (txt: string) => {
    setBusqueda(txt)
    if (txt.length < 3) { setResultados([]); return }
    const encontrados = catalogo.filter(a => a.nombre.toLowerCase().includes(txt.toLowerCase())).slice(0, 10)
    setResultados(encontrados)
  }

  // --- ALGORITMO COMBO CLÍNICO REFINADO (X:1) 🧠 ---
  const generarComboRecomendado = (bloque: any, actualP: number, actualG: number, actualC: number) => {
    const faltaP = Math.max(0, bloque.meta_proteina - actualP)
    const ratioMeta = bloque.ratio_ideal || 2.0 

    // Si falta muy poco, no sugerir nada
    if (faltaP < 2 && (bloque.meta_grasa - actualG) < 3) return null

    let recomendacion: any[] = []

    // PASO 1: BASE PROTEICA (Si falta proteína)
    if (faltaP > 3) {
      const opcionesProt = catalogo.filter(a => a.proteina > 10 && a.carbos < 2)
      if (opcionesProt.length > 0) {
        const alimentoBase = opcionesProt[Math.floor(Math.random() * opcionesProt.length)]
        const gramosBase = (faltaP / alimentoBase.proteina) * 100
        recomendacion.push({ alimento: alimentoBase, gramos: Math.round(gramosBase), razon: 'Base Proteica' })
      }
    }

    // PASO 2: AJUSTE DE GRASA (Para cumplir Ratio X:1)
    // Calculamos los macros proyectados (Lo que llevas + lo que acabamos de sugerir de proteína)
    let pProyectada = actualP
    let gProyectada = actualG
    let cProyectada = actualC

    if (recomendacion.length > 0) {
      const base = recomendacion[0]
      pProyectada += (base.alimento.proteina * base.gramos) / 100
      gProyectada += (base.alimento.grasa * base.gramos) / 100
      cProyectada += (base.alimento.carbos * base.gramos) / 100
    }

    // FÓRMULA MAESTRA: Grasa = Ratio * (Proteína + Carbos)
    const grasaObjetivo = ratioMeta * (pProyectada + cProyectada)
    const grasaFaltante = Math.max(0, grasaObjetivo - gProyectada)

    if (grasaFaltante > 3) {
      // Buscamos grasa pura (Aceites, Cremas, Manteca)
      const opcionesGrasa = catalogo.filter(a => a.grasa > 20 && a.proteina < 5 && a.carbos < 5)
      
      if (opcionesGrasa.length > 0) {
        // Preferencia por aceites MCT/Oliva si existen
        const grasaPreferida = opcionesGrasa.find(a => a.nombre.toUpperCase().includes('MCT') || a.nombre.toUpperCase().includes('OLIVA')) || opcionesGrasa[Math.floor(Math.random() * opcionesGrasa.length)]
        
        const gramosGrasa = (grasaFaltante / grasaPreferida.grasa) * 100
        recomendacion.push({ alimento: grasaPreferida, gramos: Math.round(gramosGrasa), razon: 'Ajuste de Ratio' })
      }
    }

    if (recomendacion.length === 0) return null
    return recomendacion
  }

  const agregarCombo = async (items: any[], bloque: any) => {
    if (!bloque) return
    const inserts = items.map(item => ({
      paciente_id: usuario.id,
      alimento_id: item.alimento.id,
      bloque_id: bloque.id,
      gramos_consumidos: item.gramos,
      nombre_comida_asignada: bloque.nombre_bloque,
      fecha: fecha 
    }))
    const { error } = await supabase.from('diario_comidas').insert(inserts)
    if (error) alert("Error: " + error.message)
    else window.location.reload()
  }

  const agregarManual = async () => {
    if (!alimentoSeleccionado || !bloqueSeleccionado) return
    const g = parseFloat(gramos) || 0
    const { error } = await supabase.from('diario_comidas').insert({
      paciente_id: usuario.id,
      alimento_id: alimentoSeleccionado.id,
      bloque_id: bloqueSeleccionado.id,
      gramos_consumidos: g,
      nombre_comida_asignada: bloqueSeleccionado.nombre_bloque,
      fecha: fecha
    })
    if (error) alert(error.message)
    else window.location.reload()
  }

  const borrarComida = async (idDiario: string) => {
    if(!confirm("¿Borrar?")) return
    await supabase.from('diario_comidas').delete().eq('id', idDiario)
    window.location.reload()
  }

  const renderBloque = (bloque: any) => {
    const comidasEsteBloque = diario.filter(d => d.bloque_id === bloque.id)
    
    const sumaP = comidasEsteBloque.reduce((acc, el) => acc + ((el.alimentos.proteina * el.gramos_consumidos)/100), 0)
    const sumaG = comidasEsteBloque.reduce((acc, el) => acc + ((el.alimentos.grasa * el.gramos_consumidos)/100), 0)
    const sumaC = comidasEsteBloque.reduce((acc, el) => acc + ((el.alimentos.carbos * el.gramos_consumidos)/100), 0)

    const calMeta = Math.round((bloque.meta_proteina * 4) + (bloque.meta_carbos * 4) + (bloque.meta_grasa * 9))
    const calActual = Math.round((sumaP * 4) + (sumaC * 4) + (sumaG * 9))
    
    // Ratio
    const denominador = sumaP + sumaC
    const ratioActual = denominador > 0 ? (sumaG / denominador).toFixed(1) : '0.0'
    const ratioMeta = bloque.ratio_ideal || 2.0
    
    const cumplido = Math.abs(sumaP - bloque.meta_proteina) < 2 && Math.abs(parseFloat(ratioActual) - ratioMeta) < 0.2

    const combo = generarComboRecomendado(bloque, sumaP, sumaG, sumaC)

    return (
      <div key={bloque.id} className={`bg-white rounded-xl border-2 mb-8 overflow-hidden shadow-sm ${cumplido ? 'border-green-400' : 'border-slate-100'}`}>
        <div className="bg-slate-50 p-4 border-b border-slate-100">
          <div className="flex justify-between items-start mb-2">
             <h3 className="font-bold text-xl text-slate-800">{bloque.nombre_bloque}</h3>
             {cumplido ? (
               <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm"><CheckCircle className="w-3 h-3"/> LISTO</span>
             ) : (
               <span className="inline-flex items-center gap-1 bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold shadow-sm"><AlertCircle className="w-3 h-3"/> AJUSTAR</span>
             )}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-slate-100 text-slate-600`}>
              <Activity className="w-4 h-4" />
              <div className="flex flex-col leading-none">
                <span className="text-[10px] uppercase font-bold opacity-70">Ratio</span>
                <span className="font-bold text-sm">{ratioActual} / {ratioMeta}</span>
              </div>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-blue-50 text-blue-800 border-blue-100`}>
              <TrendingUp className="w-4 h-4" />
              <div className="flex flex-col leading-none">
                <span className="text-[10px] uppercase font-bold opacity-70">Calorías</span>
                <span className="font-bold text-sm">{calActual} / {calMeta}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
             <div className="bg-white p-1 rounded border border-slate-100"><div className="text-[10px] text-slate-400 font-bold">PROT</div><div className="font-bold text-sm">{sumaP.toFixed(1)} / {bloque.meta_proteina}</div></div>
             <div className="bg-white p-1 rounded border border-slate-100"><div className="text-[10px] text-slate-400 font-bold">GRASA</div><div className="font-bold text-sm">{sumaG.toFixed(1)} / {bloque.meta_grasa}</div></div>
             <div className="bg-white p-1 rounded border border-slate-100"><div className="text-[10px] text-slate-400 font-bold">CARB</div><div className="font-bold text-sm">{sumaC.toFixed(1)} / {bloque.meta_carbos}</div></div>
          </div>
        </div>

        <div className="p-4 space-y-3 relative">
          {comidasEsteBloque.length > 0 ? (
            comidasEsteBloque.map((item: any) => (
              <div key={item.id} className="flex justify-between items-center text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
                 <div>
                   <span className="font-bold text-slate-700 block">{item.alimentos.nombre}</span>
                   <span className="text-slate-400 text-xs">{item.gramos_consumidos}g</span>
                 </div>
                 <button onClick={() => borrarComida(item.id)} className="text-red-300 hover:text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 className="w-4 h-4"/></button>
              </div>
            ))
          ) : (
             <p className="text-center text-slate-300 text-sm py-2 italic">Bloque vacío</p>
          )}

          {!cumplido && combo && combo.length > 0 && (
            <div className="mt-4 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="bg-white p-2 rounded-full text-indigo-600 mt-1 shadow-sm"><Sparkles className="w-5 h-5" /></div>
                <div className="flex-1">
                  <h4 className="text-indigo-900 font-bold text-sm mb-2">Combo Clínico Sugerido</h4>
                  <div className="space-y-2 mb-3">
                    {combo.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 text-sm bg-white/60 p-2 rounded border border-indigo-100/50">
                        <span className="font-bold text-slate-700">{item.alimento.nombre}</span>
                        <span className="text-slate-500 text-xs ml-2">x {item.gramos}g ({item.razon})</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => agregarCombo(combo, bloque)} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-3 rounded-lg flex items-center justify-center gap-2 shadow-md">
                    Agregar Combo <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}

          <button onClick={() => { setBloqueSeleccionado(bloque); setBusqueda(''); setResultados([]); }} className="w-full py-3 mt-2 border border-dashed border-slate-300 text-slate-400 rounded-xl hover:bg-slate-50 hover:border-slate-400 hover:text-slate-600 flex justify-center items-center gap-2 text-sm font-medium">
            <PlusCircle className="w-4 h-4" /> Buscar manualmente
          </button>
        </div>
      </div>
    )
  }

  if (loading) return <div className="flex items-center justify-center h-screen bg-slate-50"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div></div>

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <header className="bg-white shadow-sm sticky top-0 z-10 border-b border-slate-200">
        <div className="flex justify-between items-center p-4 pb-2">
           <h1 className="font-bold text-xl text-slate-800 tracking-tight">Mi Diario Keto</h1>
           <div className="flex gap-2">
             <button onClick={() => router.push('/progreso')} className="bg-blue-50 text-blue-600 p-2 rounded-lg hover:bg-blue-100 transition"><TrendingUp className="w-5 h-5"/></button>
             <button onClick={() => { supabase.auth.signOut(); router.push('/login') }} className="text-slate-400 hover:text-red-500 p-2"><LogOut className="w-5 h-5"/></button>
           </div>
        </div>
        <div className="flex items-center justify-between px-4 pb-4 pt-0">
           <button onClick={() => cambiarDia(-1)} className="p-2 bg-slate-50 rounded-lg hover:bg-slate-100 border border-slate-100 text-slate-600"><ChevronLeft className="w-5 h-5" /></button>
           <div className="flex items-center gap-2 text-slate-700 font-bold bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
             <CalendarIcon className="w-4 h-4 text-blue-500" /> {fecha === new Date().toLocaleDateString('en-CA') ? 'Hoy' : fecha}
           </div>
           <button onClick={() => cambiarDia(1)} className="p-2 bg-slate-50 rounded-lg hover:bg-slate-100 border border-slate-100 text-slate-600"><ChevronRight className="w-5 h-5" /></button>
        </div>
      </header>

      <main className="p-4 max-w-lg mx-auto">
        {bloques.length === 0 ? <div className="text-center py-12 text-slate-400">Sin plan nutricional para esta fecha</div> : bloques.map(renderBloque)}
      </main>

      {/* MODALES */}
      {bloqueSeleccionado && !alimentoSeleccionado && (
        <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl h-[80vh] sm:h-auto flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-700">Agregar a {bloqueSeleccionado.nombre_bloque}</h3>
              <button onClick={() => setBloqueSeleccionado(null)} className="bg-slate-200 text-slate-500 rounded-full w-8 h-8 flex items-center justify-center font-bold">×</button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <input autoFocus placeholder="Buscar..." className="w-full p-4 mb-4 border border-slate-200 rounded-xl bg-slate-50 outline-none text-lg" value={busqueda} onChange={e => buscarAlimento(e.target.value)} />
              <div className="space-y-2">
                {resultados.map(r => (
                  <div key={r.id} onClick={() => setAlimentoSeleccionado(r)} className="p-4 border border-slate-100 rounded-xl hover:bg-blue-50 cursor-pointer flex justify-between items-center">
                    <span className="font-bold text-slate-700">{r.nombre}</span>
                    <PlusCircle className="text-blue-500 w-6 h-6"/>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {alimentoSeleccionado && (
        <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
           <div className="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl">
              <h4 className="text-lg font-bold text-center text-slate-800 mb-6">¿Cuánto {alimentoSeleccionado.nombre}?</h4>
              <div className="flex items-center justify-center gap-3 mb-8">
                <input type="number" value={gramos} onChange={e => setGramos(e.target.value)} className="text-4xl font-black text-center w-32 border-b-4 border-blue-500 outline-none py-2 text-slate-800" autoFocus />
                <span className="text-slate-400 font-bold text-xl mt-2">gramos</span>
              </div>
              <button onClick={agregarManual} className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 shadow-lg">Confirmar</button>
              <button onClick={() => setAlimentoSeleccionado(null)} className="w-full mt-3 py-3 text-slate-400 font-bold text-sm">Cancelar</button>
           </div>
        </div>
      )}
    </div>
  )
}