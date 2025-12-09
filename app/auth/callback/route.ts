import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    // Intercambiamos el código temporal por una sesión real
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Redirigimos al usuario al inicio (o a donde iba)
  return NextResponse.redirect(requestUrl.origin)
}