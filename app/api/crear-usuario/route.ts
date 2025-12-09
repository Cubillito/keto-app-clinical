import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, nombre, rol, creadorId } = body

    // Validar datos básicos
    if (!email || !password || !nombre || !rol) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 })
    }

    // --- SEGURIDAD DE ROLES ---
    // Aquí podríamos validar que si intentas crear un 'nutri', el creador sea 'admin'.
    // Por simplicidad confiamos en que el frontend manda los datos correctos por ahora.

    // 1. Conectamos con la LLAVE MAESTRA (Service Role)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // 2. Crear el usuario en Auth (Esto permite el Login con Email/Pass)
    // NOTA: Al poner email_confirm: true, permitimos que si luego entra con Google, se fusionen.
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, 
      user_metadata: { nombre_completo: nombre }
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (authData.user) {
      // 3. Crear su ficha en 'perfiles' con el ROL y el DUEÑO
      const { error: profileError } = await supabaseAdmin
        .from('perfiles')
        .insert({
          id: authData.user.id,
          email: email,
          nombre_completo: nombre,
          rol: rol,
          nutricionista_id: creadorId // <--- ESTA ES LA LÍNEA NUEVA IMPORTANTE
        })
      
      if (profileError) {
        // Si falla el perfil, borramos el usuario auth para no dejar datos basura
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        return NextResponse.json({ error: "Error creando perfil: " + profileError.message }, { status: 400 })
      }
    }

    return NextResponse.json({ message: 'Usuario creado exitosamente' })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}