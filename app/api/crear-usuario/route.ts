import { createClient } from '@supabase/supabase-js'
// 1. Importamos NextRequest
import { NextResponse, NextRequest } from 'next/server'

// 2. Usamos NextRequest en lugar de Request
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password, nombre, rol, creadorId } = body

    if (!email || !password || !nombre || !rol) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Crear Usuario Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { nombre_completo: nombre }
    })

    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

    if (authData.user) {
      // 2. Crear Perfil
      const { error: profileError } = await supabaseAdmin
        .from('perfiles')
        .insert({
          id: authData.user.id,
          email: email,
          nombre_completo: nombre,
          rol: rol,
          nutricionista_id: creadorId
        })
      
      if (profileError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        return NextResponse.json({ error: "Error perfil: " + profileError.message }, { status: 400 })
      }

      // --- 3. NUEVO: SI ES PACIENTE, DARLE ACCESO A TODOS LOS ALIMENTOS ---
      if (rol === 'paciente') {
        // A. Traer todos los IDs de alimentos globales
        const { data: allFoods } = await supabaseAdmin.from('alimentos').select('id')
        
        if (allFoods && allFoods.length > 0) {
          // B. Preparar la inserción masiva
          const permisos = allFoods.map(food => ({
            paciente_id: authData.user.id,
            alimento_id: food.id
          }))

          // C. Insertar
          await supabaseAdmin.from('alimentos_permitidos').insert(permisos)
        }
      }
      // ------------------------------------------------------------------
    }

    return NextResponse.json({ message: 'Usuario creado y alimentos asignados' })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}