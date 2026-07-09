import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import prisma from '@/utils/supabase/db'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Login successful — ab Prisma ke User table mein bhi sync kar do
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        await prisma.user.upsert({
          where: { id: user.id },
          update: {
            email: user.email ?? '',
            name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
          },
          create: {
            id: user.id,
            email: user.email ?? '',
            name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? null,
          },
        })
      }

      return NextResponse.redirect(`${origin}/dashboard`)
    } else {
      // CHOR YAHAN PAKDA JAYEGA!
      console.error("🔥 SUPABASE AUTH ERROR:", error.message)
    }
  }

  // Ab agar fail hua toh URL me 'error=auth_failed' likha aayega
  return NextResponse.redirect(`${origin}?error=auth_failed`)
}