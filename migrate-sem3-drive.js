// migrate-sem3-drive.js
require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });
const { createClient } = require('@supabase/supabase-js');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const KEY_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || path.join(__dirname, 'drive-service-account.json');

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const auth = new google.auth.GoogleAuth({
  keyFile: KEY_PATH,
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});
const drive = google.drive({ version: 'v3', auth });

const SEMESTER = 3;
const FOLDER_ID = '1uGKZYTCIc7OU23lgY-NjbBD0J1FtOwt6';
const BUCKET_NAME = 'papers';
const CONCURRENCY = 5;

const SUBJECTS = [
  { code: '301',     name: 'Statistical Methods' },
  { code: '302',     name: 'Software Engineering-I' },
  { code: '302-MDC', name: 'Statistical Analysis Using R' },
  { code: '303',     name: 'Database Handling Using Python' },
  { code: '304',     name: 'Data Structures & OOP' },
  { code: '305',     name: 'Object Oriented Programming' },
  { code: '305-01',  name: 'Web Designing-1' },
  { code: '305-02',  name: 'Mobile Application Development-1' },
  { code: '306',     name: 'Practical' },
  { code: '306-1',   name: 'Practical 1' },
  { code: '306-2',   name: 'Practical 2' },
  { code: '306-3',   name: 'Practical 3' },
  { code: '307',     name: 'VAC - Bharatiya Gyan Parampara' },
  { code: 'SEC-3',   name: 'SEC - Automation and Robotics with AI' },
];

function classifySubject(rawName) {
  const s = rawName.toUpperCase();

  if (/ASSIGNMENT/.test(s)) return null;

  // Practicals check FIRST (filenames often also mention 303/304/305 names)
  if (/PRACTICAL/.test(s)) {
    const numMatch = s.match(/PRACTICAL\D{0,3}([123])\b/);
    if (numMatch) return `306-${numMatch[1]}`;
    if (/(DATABASE HANDLING|\b303\b)/.test(s)) return '306-1';
    if (/(OOPS|OBJECT ORIENTED|\b304\b)/.test(s)) return '306-2';
    if (/(WEB DESIGN|MOBILE APPLICATION|\b305\b)/.test(s)) return '306-3';
    return '306';
  }

  if (/BHARATIYA GYAN PARAMPARA/.test(s)) return '307';
  if (/(AUTOMATION|ROBOTICS)/.test(s)) return 'SEC-3';
  if (/STATISTICAL ANALYSIS.*R\b/.test(s) || /MDC-302/.test(s)) return '302-MDC';
  if (/STATISTICAL METHODS/.test(s)) return '301';
  if (/(DATABASE HANDLING|\bRDBMS\b)/.test(s)) return '303';
  if (/WEB DESIGN/.test(s)) return '305-01';
  if (/MOBILE APPLICATION/.test(s)) return '305-02';
  if (/(OOP|OBJECT ORIENTED).*DATA STRUCTURE/.test(s) || /DATA STRUCTURE.*(OOP|OBJECT ORIENTED)/.test(s) || /OOOPS.{0,3}D\.?S/.test(s)) return '304';
  if (/DATA STRUCTURE/.test(s)) return '304';
  if (/OBJECT ORIENTED PROGRAMMING/.test(s) || /\bOOP\b/.test(s)) return '305';
  if (/SOFT.{0,2}WARE ENGINEERING/.test(s) || /SW ENGINEERING/.test(s)) return '302';

  return null;
}

async function listChildren(folderId) {
  let files = [];
  let pageToken;
  do {
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, mimeType)',
      pageToken,
      pageSize: 200,
    });
    files = files.concat(res.data.files);
    pageToken = res.data.nextPageToken;
  } while (pageToken);
  return files;
}

function parseFolderName(folderName) {
  const m = folderName.match(/^(\d{4})-?\s*([A-Za-z]+(?:-[A-Za-z]+)?)$/);
  if (!m) return { year: null, session: folderName.toUpperCase() };
  return { year: parseInt(m[1], 10), session: m[2].toUpperCase() };
}

async function downloadFromDrive(fileId) {
  const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' });
  return Buffer.from(res.data);
}

async function seedSubjects() {
  console.log(`Seeding ${SUBJECTS.length} subjects for Semester ${SEMESTER}...\n`);
  const rows = SUBJECTS.map((s) => ({
    id: crypto.randomUUID(),
    name: s.name,
    code: s.code,
    semester: SEMESTER,
  }));
  const { error } = await supabase.from('Subject').upsert(rows, { onConflict: 'code', ignoreDuplicates: false });
  if (error) {
    console.error('Subject seeding failed:', error.message);
    process.exit(1);
  }

  const { data: existing, error: fetchErr } = await supabase
    .from('Subject')
    .select('id, code')
    .eq('semester', SEMESTER);
  if (fetchErr) {
    console.error('Could not fetch seeded subjects:', fetchErr.message);
    process.exit(1);
  }
  console.log('Subjects ready ✅\n');
  const map = {};
  existing.forEach((row) => { map[row.code] = row.id; });
  return map;
}

async function processFile(file, folderName, subjectIdMap) {
  const { year, session } = parseFolderName(folderName);
  const code = classifySubject(file.name);

  if (!code || !subjectIdMap[code]) {
    return { ok: false, file, reason: `no subject match for "${file.name}"` };
  }

  let fileBuffer;
  try {
    fileBuffer = await downloadFromDrive(file.id);
  } catch (err) {
    return { ok: false, file, reason: `drive download failed: ${err.message}` };
  }

  const storagePath = `sem-${SEMESTER}/${code}/${year}-${session}-${file.id.slice(0, 6)}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, fileBuffer, { contentType: 'application/pdf', upsert: true });
  if (uploadError) {
    return { ok: false, file, reason: `storage upload failed: ${uploadError.message}` };
  }

  const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);

  const { error: paperError } = await supabase.from('Paper').upsert(
    {
      id: crypto.randomUUID(),
      year: year || 0,
      fileUrl: publicUrlData.publicUrl,
      subjectId: subjectIdMap[code],
      sourceFileId: file.id,
    },
    { onConflict: 'sourceFileId' }
  );
  if (paperError) {
    return { ok: false, file, reason: `Paper upsert failed: ${paperError.message}` };
  }

  return { ok: true, file, code };
}

async function main() {
  const subjectIdMap = await seedSubjects();

  console.log(`Scanning Semester ${SEMESTER} Drive folder...\n`);
  const yearFolders = (await listChildren(FOLDER_ID)).filter((f) => f.mimeType === 'application/vnd.google-apps.folder');

  const jobs = [];
  for (const folder of yearFolders) {
    const files = (await listChildren(folder.id)).filter((f) => f.mimeType === 'application/pdf');
    files.forEach((file) => jobs.push({ file, folderName: folder.name }));
  }
  console.log(`Found ${jobs.length} PDF files total.\n`);

  let successCount = 0;
  let failCount = 0;
  const failures = [];

  for (let i = 0; i < jobs.length; i += CONCURRENCY) {
    const batch = jobs.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map((j) => processFile(j.file, j.folderName, subjectIdMap)));

    results.forEach((result, k) => {
      const n = i + k + 1;
      if (result.ok) {
        successCount++;
        console.log(`✅ [${n}/${jobs.length}] OK: ${result.code} — ${result.file.name}`);
      } else {
        failCount++;
        failures.push(result);
        console.error(`❌ [${n}/${jobs.length}] FAILED: ${result.file.name} — ${result.reason}`);
      }
    });
  }

  console.log('\n--- SEMESTER 3 MIGRATION SUMMARY ---');
  console.log(`🎉 Success: ${successCount}`);
  console.log(`❌ Failed:  ${failCount}`);

  if (failures.length) {
    fs.writeFileSync('sem3_migration_report.json', JSON.stringify(failures, null, 2));
    console.log('Failure details written to sem3_migration_report.json.');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});