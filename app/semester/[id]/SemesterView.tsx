'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Calendar, Download, FileText } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';
import type { Subject } from './page';

export default function SemesterView({
  semesterNum,
  subjects,
}: {
  semesterNum: number;
  subjects: Subject[];
}) {
  const [activePill, setActivePill] = useState<string>('all');
  // Default '/' — updated to '/dashboard' once we confirm a session exists,
  // so a logged-in user's "Home" doesn't dump them back on the marketing page.
  const [homeHref, setHomeHref] = useState('/');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setHomeHref('/dashboard');
    });
  }, []);

  const totalPapers = subjects.reduce((sum, s) => sum + s.Paper.length, 0);

  // Clicking a pill no longer hides other subjects — it scrolls the page
  // down to that subject's section instead, like a table of contents.
  const jumpToSubject = (subjectId: string) => {
    setActivePill(subjectId);

    if (subjectId === 'all') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const el = document.getElementById(`subject-${subjectId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-[100svh] bg-[#09090B] text-[#FAFAFA]">
      <header className="sticky top-0 z-40 bg-[#09090B]/90 backdrop-blur-md border-b border-[#27272A]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-4">
          <Link
            href={homeHref}
            className="flex items-center gap-2 text-sm text-[#A1A1AA] hover:text-[#FAFAFA] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            Home
          </Link>
          <div className="w-px h-5 bg-[#27272A]" />
          <span className="text-sm font-medium text-[#FAFAFA]">Semester {semesterNum}</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <motion.div
          initial={{ y: 16 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#27272A]/50 border border-[#27272A] w-fit mb-4">
            <BookOpen className="w-3.5 h-3.5 text-[#7C3AED]" aria-hidden="true" />
            <span className="text-xs font-medium text-[#A1A1AA]">
              {subjects.length} Subjects • {totalPapers} Papers
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Semester {semesterNum}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#7C3AED] to-[#A855F7]">
              Papers
            </span>
          </h1>
          <p className="text-[#A1A1AA] mt-3 max-w-xl">
            Browse and download previous year question papers, organized by subject.
          </p>
        </motion.div>

        {subjects.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-10" aria-label="Jump to subject">
            <button
              type="button"
              onClick={() => jumpToSubject('all')}
              aria-current={activePill === 'all'}
              className={`touch-manipulation ${pillClass(activePill === 'all')}`}
            >
              All
            </button>
            {subjects.map((s) => (
              <button
                type="button"
                key={s.id}
                onClick={() => jumpToSubject(s.id)}
                aria-current={activePill === s.id}
                className={`touch-manipulation ${pillClass(activePill === s.id)}`}
              >
                {s.code}
              </button>
            ))}
          </div>
        )}

        {subjects.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-[#A1A1AA]">No papers uploaded for this semester yet — check back soon.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {subjects.map((subject) => (
              <motion.section
                key={subject.id}
                id={`subject-${subject.id}`}
                initial={{ y: 12 }}
                whileInView={{ y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.3 }}
                className="scroll-mt-24"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold flex items-center gap-2 flex-wrap">
                    <span className="text-[#7C3AED]">{subject.code}</span>
                    {subject.name}
                  </h2>
                  <span className="text-xs text-[#A1A1AA] whitespace-nowrap">
                    {subject.Paper.length} paper{subject.Paper.length === 1 ? '' : 's'}
                  </span>
                </div>

                {subject.Paper.length === 0 ? (
                  <p className="text-sm text-[#A1A1AA]">No papers uploaded yet for this subject.</p>
                ) : (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {subject.Paper.map((paper) => (
                      <a
                        key={paper.id}
                        href={paper.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group touch-manipulation bg-[#18181B] border border-[#27272A] rounded-2xl p-5 hover:border-[#7C3AED]/50 hover:shadow-[0_10px_30px_-10px_rgba(124,58,237,0.15)] active:scale-[0.98] transition-all duration-300 flex flex-col gap-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="p-2.5 bg-[#7C3AED]/10 rounded-xl group-hover:bg-[#7C3AED] transition-colors duration-300">
                            <FileText className="w-5 h-5 text-[#7C3AED] group-hover:text-white transition-colors duration-300" aria-hidden="true" />
                          </div>
                          <Download className="w-4 h-4 text-[#A1A1AA] group-hover:text-[#FAFAFA] transition-colors" aria-hidden="true" />
                        </div>
                        <div>
                          <p className="font-semibold text-[#FAFAFA]">{paper.year}</p>
                          <p className="text-xs text-[#A1A1AA] mt-1 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                            {formatSession(paper.session)}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </motion.section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function pillClass(active: boolean) {
  return `px-4 py-2 rounded-full text-sm font-medium border transition-all ${
    active
      ? 'bg-[#7C3AED] border-[#7C3AED] text-white shadow-[0_0_15px_rgba(124,58,237,0.3)]'
      : 'bg-[#18181B] border-[#27272A] text-[#A1A1AA] hover:border-[#7C3AED]/50 hover:text-[#FAFAFA]'
  }`;
}

function formatSession(session: string | null) {
  if (!session) return 'Unknown session';
  return session
    .split('-')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join('-');
}