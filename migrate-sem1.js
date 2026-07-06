// migrate-sem1-drive.js
// Pulls each PDF straight from Google Drive (by driveFileId) and uploads it to
// Supabase Storage + the Paper table. No local folder needed — this replaces
// migrate-sem1.js entirely.

require('dotenv').config({ path: require('path').resolve(__dirname, '.env.local') });

const { createClient } = require('@supabase/supabase-js');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const KEY_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || path.join(__dirname, 'drive-service-account.json');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
if (!fs.existsSync(KEY_PATH)) {
  console.error(`Missing Google service account key at ${KEY_PATH}\nSee setup steps below the script.`);
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const auth = new google.auth.GoogleAuth({
  keyFile: KEY_PATH,
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});
const drive = google.drive({ version: 'v3', auth });

const BUCKET_NAME = 'papers';
const METADATA_PATH = path.join(__dirname, 'migration_data.json');
const CONCURRENCY = 5;

async function downloadFromDrive(fileId) {
  const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' });
  return Buffer.from(res.data);
}

async function processRecord(record) {
  const { driveFileId, year, session, subjectCode, subjectId, storagePath } = record;

  let fileBuffer;
  try {
    fileBuffer = await downloadFromDrive(driveFileId);
  } catch (err) {
    return { ok: false, record, reason: `drive download failed: ${err.message} (is the file shared with the service account?)` };
  }

  // 1) Upload the bytes straight to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, fileBuffer, { contentType: 'application/pdf', upsert: true });
  if (uploadError) {
    return { ok: false, record, reason: `storage upload failed: ${uploadError.message}` };
  }

  const { data: publicUrlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);

  // 2) Upsert the Paper row. subjectId already exists in your Subject table.
  //    sourceFileId (= driveFileId) has a unique index, so reruns update in place.
  const { error: paperError } = await supabase.from('Paper').upsert(
    {
      id: crypto.randomUUID(),
      year,
      session,
      subjectId,
      fileUrl: publicUrlData.publicUrl,
      sourceFileId: driveFileId,
    },
    { onConflict: 'sourceFileId' }
  );
  if (paperError) {
    return { ok: false, record, reason: `Paper upsert failed: ${paperError.message}` };
  }

  return { ok: true, record, subjectCode };
}

async function main() {
  const records = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf-8'));
  console.log(`Loaded ${records.length} records from migration_data.json\n`);

  let successCount = 0;
  let failCount = 0;
  const failures = [];

  for (let i = 0; i < records.length; i += CONCURRENCY) {
    const batch = records.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(processRecord));

    results.forEach((result, j) => {
      const n = i + j + 1;
      if (result.ok) {
        successCount++;
        console.log(`✅ [${n}/${records.length}] OK: ${result.record.subjectCode} ${result.record.year}-${result.record.session}`);
      } else {
        failCount++;
        failures.push(result);
        console.error(`❌ [${n}/${records.length}] FAILED: ${result.record.subjectCode} ${result.record.year}-${result.record.session} — ${result.reason}`);
      }
    });
  }

  console.log('\n--- MIGRATION SUMMARY ---');
  console.log(`🎉 Success: ${successCount}`);
  console.log(`❌ Failed:  ${failCount}`);

  if (failures.length) {
    fs.writeFileSync('migration_report.json', JSON.stringify(failures, null, 2));
    console.log('Failure details written to migration_report.json — safe to rerun, upserts on sourceFileId won\'t duplicate.');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});