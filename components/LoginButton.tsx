'use client'

import { createClient } from '@/utils/supabase/client'

export default function LoginButton() {
  const supabase = createClient()

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <button
      onClick={handleLogin}
      style={{
        padding: '10px 20px',
        background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 600,
      }}
    >
      Google se Login karo
    </button>
  )
}