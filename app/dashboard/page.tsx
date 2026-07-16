import prisma from '@/utils/supabase/db'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import LogoutButton from '@/components/LogoutButton'
import RetryButton from '@/components/RetryButton'
import {
  FolderOpen,
  FileText,
  GraduationCap,
  Layers,
  ChevronDown,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

type SubjectWithCount = {
  id: string
  name: string
  code: string
  semester: number
  _count: { papers: number }
}

export default async function Dashboard() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  let subjects: SubjectWithCount[] = []
  let loadFailed = false

  try {
    subjects = await prisma.subject.findMany({
      orderBy: [{ semester: 'asc' }, { code: 'asc' }],
      select: {
        id: true,
        name: true,
        code: true,
        semester: true,
        _count: { select: { papers: true } },
      },
    })
  } catch (err) {
    console.error('🔥 DASHBOARD: failed to load subjects:', err)
    loadFailed = true
  }

  const displayName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email?.split('@')[0] ??
    'Student'
  const firstName = displayName.split(' ')[0]
  const initial = displayName.charAt(0).toUpperCase()
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined

  const totalPapers = subjects.reduce((sum, s) => sum + s._count.papers, 0)
  const semesterNumbers = Array.from(new Set(subjects.map((s) => s.semester))).sort(
    (a, b) => a - b
  )
  const subjectsBySemester = semesterNumbers.map((sem) => ({
    semester: sem,
    subjects: subjects.filter((s) => s.semester === sem),
  }))

  return (
    <div className="min-h-[100svh] bg-[#09090B] text-[#FAFAFA] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#09090B]/90 backdrop-blur-md border-b border-[#27272A]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#09090B] flex items-center justify-center p-0.5 relative shadow-[0_0_15px_rgba(124,58,237,0.3)]">
              <Image src="/logo.png" alt="PaperVerse Logo" fill sizes="32px" className="object-contain" priority />
            </div>
            <span className="font-semibold tracking-tight text-lg group-hover:text-[#A1A1AA] transition-colors">
              PaperVerse
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3 pr-4 border-r border-[#27272A]">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt=""
                  width={32}
                  height={32}
                  className="rounded-full border border-[#27272A]"
                  unoptimized
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#7C3AED]/20 border border-[#7C3AED]/30 flex items-center justify-center text-sm font-semibold text-[#A78BFA]">
                  {initial}
                </div>
              )}
              <span className="text-sm text-[#A1A1AA]">{user.email}</span>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 w-full">
        {/* Welcome hero — purely personal, no numbers here */}
        <section className="relative mb-6 rounded-3xl border border-[#27272A] bg-[#18181B] overflow-hidden">
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-[#7C3AED]/15 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-[#3B82F6]/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative z-10 p-8 sm:p-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#27272A]/50 border border-[#27272A] w-fit mb-4">
              <span className="flex h-2 w-2 rounded-full bg-[#22C55E]" aria-hidden="true" />
              <span className="text-xs font-medium text-[#A1A1AA]">Signed in</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Welcome back, {firstName}
            </h1>
            <p className="text-[#A1A1AA] mt-2 max-w-md">
              Everything you need for your VNSGU BCA exams, organized by semester.
            </p>
          </div>
        </section>

        {/* Platform totals — clearly labeled as site-wide, not "your" numbers */}
        {!loadFailed && subjects.length > 0 && (
          <div className="mb-12">
            <p className="text-xs font-medium text-[#A1A1AA] uppercase tracking-wider mb-3">
              PaperVerse, at a glance
            </p>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-4">
                <p className="text-2xl font-bold text-[#7C3AED]">{semesterNumbers.length}</p>
                <p className="text-xs text-[#A1A1AA] mt-1 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" aria-hidden="true" /> Semesters covered
                </p>
              </div>
              <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-4">
                <p className="text-2xl font-bold text-[#3B82F6]">{subjects.length}</p>
                <p className="text-xs text-[#A1A1AA] mt-1 flex items-center gap-1.5">
                  <GraduationCap className="w-3.5 h-3.5" aria-hidden="true" /> Subjects listed
                </p>
              </div>
              <div className="bg-[#18181B] border border-[#27272A] rounded-xl p-4">
                <p className="text-2xl font-bold text-[#22C55E]">{totalPapers}</p>
                <p className="text-xs text-[#A1A1AA] mt-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" aria-hidden="true" /> Papers available
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        {loadFailed ? (
          <div className="border border-red-500/20 bg-[#18181B] rounded-2xl p-8 text-center">
            <p className="text-[#FAFAFA] font-medium mb-1">Subjects couldn&apos;t load</p>
            <p className="text-sm text-[#A1A1AA] mb-5">
              The database connection is temporarily unavailable. This is a server-side issue, not
              something wrong with your account — try again in a moment.
            </p>
            <RetryButton />
          </div>
        ) : subjects.length === 0 ? (
          <div className="border border-[#27272A] bg-[#18181B] rounded-2xl p-8 text-center">
            <p className="text-[#FAFAFA] font-medium mb-1">No subjects yet</p>
            <p className="text-sm text-[#A1A1AA] mb-5">
              Once semester data is added, your subjects will show up here automatically.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-[#7C3AED] hover:text-[#A78BFA] font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to home
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {subjectsBySemester.map(({ semester, subjects: semSubjects }, i) => (
              <details
                key={semester}
                open={i === 0}
                className="group bg-[#18181B] border border-[#27272A] rounded-2xl overflow-hidden"
              >
                <summary className="px-6 py-5 flex items-center justify-between cursor-pointer select-none list-none outline-none [&::-webkit-details-marker]:hidden hover:bg-[#1f1f23] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#7C3AED]/10 border border-[#7C3AED]/20 flex items-center justify-center text-sm font-bold text-[#A78BFA]">
                      {semester}
                    </div>
                    <div>
                      <h2 className="font-semibold text-[#FAFAFA]">Semester {semester}</h2>
                      <p className="text-xs text-[#A1A1AA]">
                        {semSubjects.length} subject{semSubjects.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    className="w-5 h-5 text-[#A1A1AA] transition-transform duration-300 group-open:rotate-180"
                    aria-hidden="true"
                  />
                </summary>

                <div className="px-6 pb-6 pt-1 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-[#27272A]">
                  {semSubjects.map((sub) => (
                    <Link
                      href={`/semester/${sub.semester}`}
                      key={sub.id}
                      className="mt-4 bg-[#09090B] border border-[#27272A] rounded-xl p-4 hover:border-[#7C3AED]/50 transition-colors group/card flex flex-col justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]"
                    >
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="p-2 bg-[#18181B] rounded-lg border border-[#27272A] group-hover/card:border-[#7C3AED]/30 group-hover/card:bg-[#7C3AED]/10 transition-colors">
                          <FolderOpen className="w-4 h-4 text-[#7C3AED]" aria-hidden="true" />
                        </div>
                        <span className="text-[10px] font-medium text-[#A1A1AA] bg-[#18181B] px-2 py-1 rounded-full border border-[#27272A] whitespace-nowrap">
                          {sub._count.papers} paper{sub._count.papers !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[#FAFAFA] leading-snug">{sub.name}</h3>
                        <p className="text-xs text-[#A1A1AA] mt-1">{sub.code}</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-medium text-[#7C3AED] mt-3 opacity-0 group-hover/card:opacity-100 transition-opacity">
                        View papers <ArrowRight className="w-3 h-3" aria-hidden="true" />
                      </div>
                    </Link>
                  ))}
                </div>
              </details>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}