import prisma from '@/utils/supabase/db'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import LogoutButton from '@/components/LogoutButton'

type SubjectRow = {
  id: string;
  name: string;
  code: string;
  semester: number;
};

export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (!user) {
    // TEMPORARY DEBUG: asli error dekhne ke liye redirect hata diya
    return (
      <div style={{ padding: '40px', color: 'white', fontFamily: 'sans-serif' }}>
        <h1>🔴 No user found</h1>
        <pre style={{ color: 'orange', whiteSpace: 'pre-wrap' }}>
          {JSON.stringify(error, null, 2)}
        </pre>
      </div>
    )
  }

  const subjects = await prisma.subject.findMany()

  return (
    <div style={{ padding: '40px', color: 'white', fontFamily: 'sans-serif' }}>
      <h1>🚀 Welcome to PaperVerse!</h1>
      <p style={{ color: 'gray' }}>{user.email} ke roop mein login ho gaya hai.</p>

      <h2 style={{ marginTop: '40px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
        VNSGU BCA Subjects
      </h2>

      <div style={{ display: 'flex', gap: '20px', marginTop: '20px', flexWrap: 'wrap' }}>
        {subjects.map((sub: SubjectRow) => (
          <div
            key={sub.id}
            style={{ border: '1px solid #333', padding: '20px', borderRadius: '10px', background: '#111', minWidth: '250px' }}
          >
            <h3 style={{ margin: '0 0 10px 0' }}>{sub.name}</h3>
            <p style={{ margin: 0, color: '#888' }}>Code: {sub.code}</p>
            <p style={{ margin: '5px 0 0 0', color: '#00ff88' }}>Semester {sub.semester}</p>
          </div>
        ))}
      </div>

      <LogoutButton />
    </div>
  )
}