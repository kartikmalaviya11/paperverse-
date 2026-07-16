'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { RefreshCw } from 'lucide-react'

export default function RetryButton() {
  const router = useRouter()
  const [retrying, setRetrying] = useState(false)

  const handleRetry = () => {
    setRetrying(true)
    router.refresh()
    setTimeout(() => setRetrying(false), 1200)
  }

  return (
    <button
      onClick={handleRetry}
      disabled={retrying}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-[#7C3AED] hover:bg-[#6D28D9] text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
    >
      <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} aria-hidden="true" />
      {retrying ? 'Retrying…' : 'Try again'}
    </button>
  )
}