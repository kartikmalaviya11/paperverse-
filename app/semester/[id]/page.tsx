import { createClient } from '@supabase/supabase-js';
import { notFound } from 'next/navigation';
import SemesterView from './SemesterView';


// Revalidate every 60s so newly uploaded papers show up without a full redeploy
export const revalidate = 60;

export type Paper = {
  id: string;
  year: number;
  session: string | null;
  fileUrl: string;
};

export type Subject = {
  id: string;
  code: string;
  name: string;
  Paper: Paper[];
};

// Prerenders /semester/1 through /semester/6 at build time
export function generateStaticParams() {
  return [1, 2, 3, 4, 5, 6].map((n) => ({ id: String(n) }));
}

async function getSemesterData(semester: number): Promise<Subject[] | null> {
  // NOTE: this project already has utils/supabase/{client,server,db}.ts.
  // I don't have their exact exports in front of me, so this is a self-contained
  // client using the public anon key (safe — Subject & Paper both have public
  // SELECT policies). Swap this for your existing helper if you'd rather reuse it.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data, error } = await supabase
    .from('Subject')
    .select('id, code, name, Paper(id, year, session, fileUrl)')
    .eq('semester', semester)
    .order('code', { ascending: true })
    .order('year', { ascending: false, foreignTable: 'Paper' });

  if (error) {
    console.error('Failed to load semester data:', error.message);
    return null;
  }

  return data as Subject[];
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return {
    title: `Semester ${id} Papers | PaperVerse`,
    description: `Previous year question papers for BCA Semester ${id} at VNSGU — free to browse and download.`,
  };
}

// NOTE: params is a Promise here (Next.js 15+ convention). If this project is on
// Next.js 14 or earlier, change the signature to `{ params }: { params: { id: string } }`
// and drop the `await`.
export default async function SemesterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const semesterNum = Number(id);

  if (!Number.isInteger(semesterNum) || semesterNum < 1 || semesterNum > 6) {
    notFound();
  }

  const subjects = await getSemesterData(semesterNum);

  if (subjects === null) {
    return (
      <div className="min-h-[100svh] bg-[#09090B] text-[#FAFAFA] flex items-center justify-center px-6">
        <p className="text-[#A1A1AA] text-sm">
          Something went wrong loading this semester. Please refresh, or try again shortly.
        </p>
      </div>
    );
  }

  return <SemesterView semesterNum={semesterNum} subjects={subjects} />;
}