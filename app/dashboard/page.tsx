import prisma from '@/utils/supabase/db'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/LogoutButton'

type SubjectRow = {
  id: string
  name: string
  code: string
  semester: number
}

export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  let subjects: SubjectRow[] = []
  let loadFailed = false

  try {
    subjects = await prisma.subject.findMany({
      orderBy: [{ semester: 'asc' }, { code: 'asc' }],
    })
  } catch (err) {
    console.error('🔥 DASHBOARD: failed to load subjects:', err)
    loadFailed = true
  }

  return (
    <div className="min-h-[100svh] bg-[#09090B] text-[#FAFAFA] px-6 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome to PaperVerse 🚀</h1>
            <p className="text-[#A1A1AA] mt-1">Logged in as {user.email}</p>
          </div>
          <LogoutButton />
        </div>

        <h2 className="text-xl font-semibold border-b border-[#27272A] pb-3 mb-6">
          VNSGU BCA Subjects
        </h2>

        {loadFailed ? (
          <p className="text-[#A1A1AA] text-sm">
            Subjects load nahi ho paaye abhi — thodi der mein refresh karke dobara try karo.
          </p>
        ) : subjects.length === 0 ? (
          <p className="text-[#A1A1AA] text-sm">Koi subject abhi database mein nahi hai.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjects.map((sub) => (
              <div
                key={sub.id}
                className="border border-[#27272A] bg-[#18181B] rounded-2xl p-5 hover:border-[#7C3AED]/50 transition-colors"
              >
                <h3 className="font-semibold text-[#FAFAFA]">{sub.name}</h3>
                <p className="text-sm text-[#A1A1AA] mt-1">Code: {sub.code}</p>
                <p className="text-sm text-[#22C55E] mt-1">Semester {sub.semester}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}