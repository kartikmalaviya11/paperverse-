import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import prisma from '@/utils/supabase/db'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}?error=auth_failed`)
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('🔥 SUPABASE AUTH ERROR:', error.message)
    return NextResponse.redirect(`${origin}?error=auth_failed`)
  }

  // Supabase session ban chuka hai matlab login successful hai —
  // ab chahe neeche Prisma sync fail ho jaye, user ko login se bahar nahi karenge.
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()

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
  } catch (dbError) {
    // DB unreachable (galat DATABASE_URL / pooler down / etc.) — sirf log karo,
    // login ko fail mat karo. Agli baar page load pe sync retry ho jayega.
    console.error('🔥 PRISMA USER SYNC FAILED (login still succeeded):', dbError)
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}