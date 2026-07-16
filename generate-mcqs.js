/**
 * generate-mcqs.js
 * ---------------------------------------------------------
 * Reads each Paper's PDF (from Supabase Storage fileUrl),
 * sends it to Claude to generate practice MCQs, and upserts
 * them into McqQuestion linked back to the source paper.
 *
 * USAGE:
 *   node generate-mcqs.js                 -> scan + generate for ALL papers missing MCQs
 *   node generate-mcqs.js --dry-run        -> only scan & show counts, no AI calls, no DB writes
 *   node generate-mcqs.js --semester=3     -> only papers in semester 3
 *   node generate-mcqs.js --subject=CODE   -> only a specific subject code
 *   node generate-mcqs.js --force          -> regenerate even if paper already has MCQs
 *
 * ENV VARS REQUIRED (.env):
 *   DATABASE_URL=...
 *   DIRECT_URL=...
 *   ANTHROPIC_API_KEY=sk-ant-...
 *
 * npm install @anthropic-ai/sdk dotenv @prisma/client
 * ---------------------------------------------------------
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const Anthropic = require('@anthropic-ai/sdk');

const prisma = new PrismaClient();
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ---------- CONFIG ----------
const MCQS_PER_PAPER = parseInt(process.env.MCQS_PER_PAPER || '10', 10);
const MODEL = 'claude-sonnet-5'; // use 'claude-haiku-4-5-20251001' for a cheaper/faster run
const DELAY_BETWEEN_CALLS_MS = 2000; // be gentle on rate limits

// ---------- CLI FLAGS ----------
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isForce = args.includes('--force');
const semesterArg = args.find((a) => a.startsWith('--semester='));
const subjectArg = args.find((a) => a.startsWith('--subject='));
const filterSemester = semesterArg ? parseInt(semesterArg.split('=')[1], 10) : null;
const filterSubjectCode = subjectArg ? subjectArg.split('=')[1] : null;

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

// ---------- STEP 1: fetch PDF as base64 ----------
async function fetchPdfAsBase64(fileUrl) {
  const res = await fetch(fileUrl);
  if (!res.ok) {
    throw new Error(`Failed to download PDF (${res.status}): ${fileUrl}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer).toString('base64');
}

// ---------- STEP 2: ask Claude to generate MCQs from the PDF ----------
async function generateMcqsFromPdf({ base64Pdf, subjectName, semester, year, session }) {
  const systemPrompt = `You are an expert VNSGU BCA exam question setter. You will be given a previous year question paper PDF for the subject "${subjectName}" (Semester ${semester}, ${session || ''} ${year || ''}).

Your task: create ${MCQS_PER_PAPER} high-quality multiple-choice practice questions based on the TOPICS AND CONCEPTS covered in this paper (not necessarily copying questions verbatim, since the source paper may be descriptive/long-answer format).

Rules:
- Each question must have exactly 4 options (A, B, C, D), only ONE correct.
- Cover a spread of topics from across the paper, not just the first page.
- Vary difficulty: some easy (definitions/basics), some medium, some hard (applied/numerical/logic).
- Write a short 1-2 sentence explanation for why the correct answer is correct.
- Questions must be self-contained and answerable without seeing the original paper.
- Return ONLY valid JSON, no markdown fences, no preamble, no commentary. Exact shape:

{
  "questions": [
    {
      "questionText": "string",
      "optionA": "string",
      "optionB": "string",
      "optionC": "string",
      "optionD": "string",
      "correctOption": "A",
      "explanation": "string",
      "difficulty": "easy"
    }
  ]
}`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64Pdf,
            },
          },
          {
            type: 'text',
            text: `Generate the ${MCQS_PER_PAPER} MCQs now as pure JSON.`,
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock) throw new Error('No text response from Claude');

  const cleaned = textBlock.text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(cleaned);

  if (!parsed.questions || !Array.isArray(parsed.questions)) {
    throw new Error('Unexpected JSON shape from Claude');
  }
  return parsed.questions;
}

// ---------- STEP 3: upsert into DB ----------
async function saveMcqs({ questions, subjectId, paperId }) {
  let saved = 0;
  for (const q of questions) {
    if (!q.questionText || !q.optionA || !q.optionB || !q.optionC || !q.optionD || !q.correctOption) {
      continue; // skip malformed entries
    }
    await prisma.mcqQuestion.create({
      data: {
        questionText: q.questionText,
        optionA: q.optionA,
        optionB: q.optionB,
        optionC: q.optionC,
        optionD: q.optionD,
        correctOption: q.correctOption.toUpperCase(),
        explanation: q.explanation || null,
        difficulty: q.difficulty || 'medium',
        isReviewed: false,
        isActive: true,
        subjectId,
        paperId,
      },
    });
    saved++;
  }
  return saved;
}

// ---------- MAIN ----------
async function main() {
  log(`Starting MCQ generation${isDryRun ? ' (DRY RUN)' : ''}${isForce ? ' (FORCE)' : ''}`);

  const where = {};
  if (filterSubjectCode) where.subject = { code: filterSubjectCode };
  if (filterSemester) where.subject = { ...(where.subject || {}), semester: filterSemester };

  const papers = await prisma.paper.findMany({
    where,
    include: {
      subject: true,
      mcqQuestions: { select: { id: true } },
    },
    orderBy: [{ subject: { semester: 'asc' } }, { subject: { name: 'asc' } }, { year: 'asc' }],
  });

  const pending = papers.filter((p) => isForce || p.mcqQuestions.length === 0);

  log(`Total papers matched: ${papers.length}`);
  log(`Papers needing MCQs: ${pending.length}`);

  // group summary by semester for a quick sanity check
  const bySemester = {};
  for (const p of pending) {
    const sem = p.subject.semester;
    bySemester[sem] = (bySemester[sem] || 0) + 1;
  }
  log(`Breakdown by semester: ${JSON.stringify(bySemester)}`);

  if (isDryRun) {
    log('Dry run complete. No AI calls made, no DB writes. Re-run without --dry-run to generate.');
    await prisma.$disconnect();
    return;
  }

  let totalGenerated = 0;
  let totalFailed = 0;

  for (let i = 0; i < pending.length; i++) {
    const paper = pending[i];
    const label = `[${i + 1}/${pending.length}] ${paper.subject.name} (Sem ${paper.subject.semester}, ${paper.year})`;

    try {
      log(`${label} - downloading PDF...`);
      const base64Pdf = await fetchPdfAsBase64(paper.fileUrl);

      log(`${label} - generating MCQs via Claude...`);
      const questions = await generateMcqsFromPdf({
        base64Pdf,
        subjectName: paper.subject.name,
        semester: paper.subject.semester,
        year: paper.year,
        session: paper.session,
      });

      const saved = await saveMcqs({
        questions,
        subjectId: paper.subjectId,
        paperId: paper.id,
      });

      log(`${label} - ✅ saved ${saved} MCQs`);
      totalGenerated += saved;
    } catch (err) {
      log(`${label} - ❌ FAILED: ${err.message}`);
      totalFailed++;
    }

    await sleep(DELAY_BETWEEN_CALLS_MS);
  }

  log('---------------------------------------');
  log(`DONE. Total MCQs generated: ${totalGenerated}. Papers failed: ${totalFailed}.`);
  log('Note: all new MCQs have isReviewed=false. Review them in the admin panel before they appear in student quizzes.');

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error('Fatal error:', err);
  await prisma.$disconnect();
  process.exit(1);
});