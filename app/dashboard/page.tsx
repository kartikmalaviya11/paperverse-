// Yahan humne supabase folder ka naam add kar diya hai
import prisma from '../../utils/supabase/db'

type SubjectRow = {
  id: string;
  name: string;
  code: string;
  semester: number;
};

// This page needs a live DB connection every time it loads (it's a dashboard,
// not static content), so it should never be prerendered at build time.
// Without this line, `next build` tries to run the Prisma query itself and
// fails if there's any network hiccup at that exact moment.
export const dynamic = 'force-dynamic'

export default async function Dashboard() {
  // Prisma se saare subjects fetch kar rahe hain
  const subjects = await prisma.subject.findMany()

  return (
    <div style={{ padding: '40px', color: 'white', fontFamily: 'sans-serif' }}>
      <h1>🚀 Welcome to PaperVerse!</h1>
      <p style={{ color: 'gray' }}>Aapka account successfully login ho gaya hai.</p>
      
      <h2 style={{ marginTop: '40px', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
        VNSGU BCA Subjects
      </h2>
      
      {/* Subjects ko screen par dikhane ka loop */}
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

      {/* Temporary Logout / Refresh Button */}
      <button 
        style={{ marginTop: '50px', padding: '10px 20px', background: 'red', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}
      >
        Log Out
      </button>
    </div>
  )
}