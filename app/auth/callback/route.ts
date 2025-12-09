import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Si hay una dirección de destino (next), la usamos, si no, vamos al inicio '/'
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = cookies()

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options })
          },
        },
      }
    )
    
    // Intercambiamos el código por la sesión real
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Login exitoso: enviamos al usuario a la app
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Si algo falla, lo devolvemos al login con un error
  return NextResponse.redirect(`${origin}/login?error=auth`)
}