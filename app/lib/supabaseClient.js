import { createBrowserClient } from '@supabase/ssr'

// --- DATOS DE CONEXIÓN ---
// Asegúrate de que estas variables estén en tu .env.local o pon las claves "duras" aquí si tienes problemas
const supabaseUrl = 'https://byhmdmkccpwqieqjooqb.supabase.co'
const supabaseKey = 'sb_publishable__H2Z_vrHqgZiaJemq5l01w_vhbj0zY-'

// --- EL CAMBIO MÁGICO ---
// Usamos createBrowserClient en lugar de createClient.
// Esto permite que la app LEA las cookies de sesión de Google/Supabase automáticamente.
export const supabase = createBrowserClient(supabaseUrl, supabaseKey)