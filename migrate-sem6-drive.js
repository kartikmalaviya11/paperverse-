// migrate-sem6-drive.js
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

const SEMESTER = 6;
const FOLDER_ID = '1K_pRTF6L7gq4e-5d689yR__jU8N6rkTn';
const BUCKET_NAME = 'papers';
const CONCURRENCY = 5;

const SUBJECTS = [
  { code: '601',     name: 'Computer Graphics' },
  { code: '601-2',   name: 'Fundamental of Cloud Computing' },
  { code: '602',     name: 'E-Commerce & Cyber Security' },
  { code: '602-01',  name: 'Data Analysis Using Python' },
  { code: '603-01',  name: 'Fundamental of Full Stack Web Development' },
  { code: '603-02',  name: 'Advance Mobile Application Development' },
];

function classifySubject(rawName) {
  const s = rawName.toUpperCase();

  if (/CLOUD COMPUTING/.test(s)) return '601-2';
  if (/CYBER SECURITY/.test(s)) return '602';
  if (/DATA ANALYSIS/.test(s) && /PYTHON/.test(s)) return '602-01';
  if (/FULL STACK WEB/.test(s)) return '603-01';
  if (/MOBILE APPLICATION/.test(s)) return '603-02';
  if (/GRAPHICS|GHAPHICS/.test(s)) return '601';

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
      session: session || 'UNKNOWN',
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

  console.log('\n--- SEMESTER 6 MIGRATION SUMMARY ---');
  console.log(`🎉 Success: ${successCount}`);
  console.log(`❌ Failed:  ${failCount}`);

  if (failures.length) {
    fs.writeFileSync('sem6_migration_report.json', JSON.stringify(failures, null, 2));
    console.log('Failure details written to sem6_migration_report.json.');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});