'use client'

import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function LogoutButton() {
  const supabase = createClient()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      style={{ marginTop: '50px', padding: '10px 20px', background: 'red', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
    >
      Log Out
    </button>
  )
}