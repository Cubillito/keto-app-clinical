import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// ⚠️ IMPORTANTE: Esto obliga a Vercel a ejecutar el código en cada login
// sin esto, a veces usa una versión "congelada" vieja.
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const cookieStore = await cookies()

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
    
    // Intentamos canjear el código
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // ✅ ÉXITO: Vamos a la app
      return NextResponse.redirect(`${origin}${next}`)
    } else {
      // ❌ ERROR ESPECÍFICO (Para que lo veamos en los logs)
      console.error("🔥 Error de Supabase Auth:", error.message)
      // Te devolvemos al login pero mostramos el error en la URL
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
    }
  }

  // Si no había código
  return NextResponse.redirect(`${origin}/login?error=no_code`)
}