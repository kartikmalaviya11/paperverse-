// scan-semester.js
// READ-ONLY discovery script — Supabase ya Storage mein kuch bhi nahi likhta.
// Ek semester ka Drive folder scan karke batata hai kaunse subjects/codes mile,
// taaki hum Subject seed karne se pehle review kar sakein.
//
// Usage: node scan-semester.js <semesterNumber> <driveFolderId>
// Example: node scan-semester.js 2 1mYz2uJjqR73T0PqFYsNME0vUjJ-okYh9

require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const KEY_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || path.join(__dirname, 'drive-service-account.json');
if (!fs.existsSync(KEY_PATH)) {
  console.error(`Missing Google service account key at ${KEY_PATH}`);
  process.exit(1);
}

const [,, semArg, folderArg] = process.argv;
const SEMESTER = parseInt(semArg, 10);
const FOLDER_ID = folderArg;

if (!SEMESTER || !FOLDER_ID) {
  console.error('Usage: node scan-semester.js <semesterNumber> <driveFolderId>');
  process.exit(1);
}

const auth = new google.auth.GoogleAuth({
  keyFile: KEY_PATH,
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});
const drive = google.drive({ version: 'v3', auth });

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

// Filename se subject code + clean name nikalne ki koshish karta hai.
// Handle karta hai:
//   "Major-104- CPPM (TH).pdf"      -> code "104", name "CPPM"
//   "AEC-101- Communication Skills.pdf" -> code "101", name "Communication Skills"
//   "CPPM.pdf" (code nahi hai)      -> code null, name "CPPM"
function parseFilename(rawName) {
  const name = rawName.replace(/\.pdf$/i, '').trim();

  const withCode = name.match(/^([A-Za-z]+)-(\d+[A-Za-z0-9-]*)\s*-\s*(.+)$/);
  if (withCode) {
    const [, prefix, code, rest] = withCode;
    const cleanName = rest.replace(/\s*\([^)]*\)\s*$/g, '').trim();
    return { code, prefix, subjectName: cleanName, raw: rawName };
  }

  const cleanName = name.replace(/\s*\([^)]*\)\s*$/g, '').trim();
  return { code: null, prefix: null, subjectName: cleanName, raw: rawName };
}

function parseFolderName(folderName) {
  const m = folderName.match(/^(\d{4})-?\s*([A-Za-z]+(?:-[A-Za-z]+)?)$/);
  if (!m) return { year: null, session: folderName.toUpperCase() };
  return { year: parseInt(m[1], 10), session: m[2].toUpperCase() };
}

async function main() {
  console.log(`Scanning Semester ${SEMESTER} — folder ${FOLDER_ID}\n`);
  const yearFolders = (await listChildren(FOLDER_ID)).filter(f => f.mimeType === 'application/vnd.google-apps.folder');
  console.log(`Found ${yearFolders.length} year/session subfolders\n`);

  const subjectMap = new Map();
  let totalFiles = 0;
  const allRecords = [];

  for (const folder of yearFolders) {
    const { year, session } = parseFolderName(folder.name);
    const files = (await listChildren(folder.id)).filter(f => f.mimeType === 'application/pdf');
    for (const file of files) {
      totalFiles++;
      const parsed = parseFilename(file.name);
      const key = parsed.subjectName.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!subjectMap.has(key)) {
        subjectMap.set(key, { codes: new Set(), names: new Set(), count: 0, samples: [] });
      }
      const entry = subjectMap.get(key);
      if (parsed.code) entry.codes.add(parsed.code);
      entry.names.add(parsed.subjectName);
      entry.count++;
      if (entry.samples.length < 2) entry.samples.push(file.name);

      allRecords.push({
        driveFileId: file.id,
        originalFilename: file.name,
        year,
        session,
        parsedCode: parsed.code,
        parsedName: parsed.subjectName,
        folderName: folder.name,
      });
    }
  }

  console.log(`--- DISCOVERED SUBJECTS (Semester ${SEMESTER}) ---\n`);
  let i = 1;
  for (const [, entry] of subjectMap) {
    console.log(`${i++}. "${[...entry.names][0]}"`);
    console.log(`   codes seen: ${[...entry.codes].join(', ') || '(none — manual code chahiye)'}`);
    console.log(`   files: ${entry.count}  e.g. ${entry.samples.join(' | ')}`);
    console.log('');
  }

  console.log(`Total PDF files scanned: ${totalFiles}`);
  console.log(`Unique subjects detected: ${subjectMap.size}`);

  const outFile = path.join(__dirname, `sem${SEMESTER}_discovery.json`);
  fs.writeFileSync(outFile, JSON.stringify(allRecords, null, 2));
  console.log(`\nFull file list likha gaya: ${outFile}`);
  console.log('Supabase mein kuch bhi nahi likha gaya — ye sirf read-only scan tha.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});