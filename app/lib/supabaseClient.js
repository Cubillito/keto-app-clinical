import { createClient } from '@supabase/supabase-js'

// --- ZONA DE DATOS DUROS (Solo para probar) ---
// Pega aquí tu URL exacta que sale en Supabase (empieza con https://)
const supabaseUrl = 'https://byhmdmkccpwqieqjooqb.supabase.co'

// Pega aquí tu llave "anon" / "public" (es la larga que empieza con eyJ...)
const supabaseKey = 'sb_publishable__H2Z_vrHqgZiaJemq5l01w_vhbj0zY-'
// ----------------------------------------------

export const supabase = createClient(supabaseUrl, supabaseKey)