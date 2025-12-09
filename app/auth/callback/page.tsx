'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const procesarLogin = async () => {
      // 1. Conectamos Supabase en el navegador
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // 2. Verificamos si hay sesión en la URL (Hash o Code)
      // Supabase detecta automáticamente el #access_token en la URL y lo procesa aquí
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        console.error("Error en callback:", error.message)
        router.push('/login?error=' + encodeURIComponent(error.message))
      } else if (data.session) {
        // 3. ¡ÉXITO! Tenemos sesión.
        // Verificamos el rol para redirigir correctamente
        const { data: perfil } = await supabase
          .from('perfiles')
          .select('rol')
          .eq('id', data.session.user.id)
          .single()
        
        const rol = perfil?.rol || 'paciente'
        
        // Redirigimos y refrescamos para que la app se entere
        if (rol === 'nutri' || rol === 'admin') {
          router.push('/nutri')
        } else {
          router.push('/')
        }
        router.refresh()
      } else {
        // Si no pasó nada, esperamos un momento (a veces el hash tarda en procesarse)
        // O redirigimos al login si pasa mucho tiempo
      }
    }

    procesarLogin()
  }, [router])

  return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <p className="text-slate-500 font-medium">Validando con Google...</p>
      </div>
    </div>
  )
}