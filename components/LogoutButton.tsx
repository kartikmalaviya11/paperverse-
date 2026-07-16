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
      className="px-4 py-2 rounded-full text-sm font-semibold bg-[#18181B] border border-[#27272A] text-[#FAFAFA] hover:border-red-500/50 hover:text-red-400 transition-colors"
    >
      Log Out
    </button>
  )
}