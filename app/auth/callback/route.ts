import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(`${origin}/dashboard`)
    } else {
      // CHOR YAHAN PAKDA JAYEGA!
      console.error("🔥 SUPABASE AUTH ERROR:", error.message)
    }
  }

  // Ab agar fail hua toh URL me 'error=auth_failed' likha aayega
  return NextResponse.redirect(`${origin}?error=auth_failed`)
}