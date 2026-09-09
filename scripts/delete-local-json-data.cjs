/**
 * Local JSON Database (local_db.json) Table Data Deletion Script
 *
 * Usage:
 *   node scripts/delete-local-json-data.cjs [--tables=profiles,errands] [--dry-run] [--keep-admin]
 */

const fs = require('fs');
const path = require('path');

const LOCAL_DB_PATH = path.join(process.cwd(), 'local_db.json');

const KNOWN_TABLES = [
  'profiles',
  'users',
  'errands',
  'transactions',
  'otp_codes',
  'runner_applications',
  'notifications',
  'errand_chats',
  'support_messages',
  'featured_services',
  'service_listings',
  'settings',
  'firebase_infrastructure'
];

function deleteLocalJsonData(options = {}) {
  const {
    tables = null,
    dryRun = false,
    keepAdmin = false
  } = options;

  console.log('======================================================');
  console.log('   [LOCAL JSON DATABASE] DATA DELETION SCRIPT        ');
  console.log('======================================================');
  console.log(`Targeting file: ${LOCAL_DB_PATH}`);

  if (!fs.existsSync(LOCAL_DB_PATH)) {
    console.error(`File not found: ${LOCAL_DB_PATH}`);
    return { success: false, database: 'local_json', error: 'File not found' };
  }

  let db = {};
  try {
    const raw = fs.readFileSync(LOCAL_DB_PATH, 'utf8');
    db = JSON.parse(raw);
  } catch (err) {
    console.error(`Failed to parse local_db.json: ${err.message}`);
    return { success: false, database: 'local_json', error: err.message };
  }

  const existingKeys = Object.keys(db);
  let targetList = [];

  if (tables && Array.isArray(tables) && tables.length > 0) {
    targetList = tables.filter(t => existingKeys.includes(t));
  } else {
    targetList = [...new Set([...KNOWN_TABLES.filter(t => existingKeys.includes(t)), ...existingKeys])];
  }

  console.log(`Found ${targetList.length} table entries in local_db.json.`);
  console.log(`Mode: ${dryRun ? 'DRY-RUN (Preview only)' : 'LIVE EXECUTION'}\n`);

  const stats = [];
  const updatedDb = { ...db };

  for (const table of targetList) {
    const val = db[table];
    if (!Array.isArray(val)) {
      // If it's an object or primitive
      stats.push({ table, before: typeof val, deleted: 0, status: 'skipped_non_array' });
      continue;
    }

    const rowCount = val.length;
    if (rowCount === 0) {
      stats.push({ table, before: 0, deleted: 0, status: 'empty' });
      console.log(`- ${table.padEnd(25)}: 0 items (Empty)`);
      continue;
    }

    if (dryRun) {
      stats.push({ table, before: rowCount, deleted: rowCount, status: 'would_delete' });
      console.log(`- ${table.padEnd(25)}: ${rowCount} items (Would be cleared)`);
      continue;
    }

    if ((table === 'profiles' || table === 'users') && keepAdmin) {
      const kept = val.filter(u => u && (u.is_admin === true || String(u.role).toLowerCase().includes('admin')));
      const deletedCount = rowCount - kept.length;
      updatedDb[table] = kept;
      stats.push({ table, before: rowCount, deleted: deletedCount, status: 'kept_admin' });
      console.log(`- ${table.padEnd(25)}: Cleared ${deletedCount} items (Preserved ${kept.length} admins)`);
    } else {
      updatedDb[table] = [];
      stats.push({ table, before: rowCount, deleted: rowCount, status: 'deleted' });
      console.log(`- ${table.padEnd(25)}: Successfully cleared all ${rowCount} items`);
    }
  }

  const totalDeleted = stats.reduce((acc, s) => acc + (s.deleted || 0), 0);

  if (!dryRun) {
    try {
      fs.writeFileSync(LOCAL_DB_PATH, JSON.stringify(updatedDb, null, 2), 'utf8');
      console.log(`\nSuccessfully updated ${LOCAL_DB_PATH}`);
    } catch (saveErr) {
      console.error(`Failed to save local_db.json: ${saveErr.message}`);
      return { success: false, database: 'local_json', error: saveErr.message };
    }
  }

  console.log('------------------------------------------------------');
  console.log(`Summary: ${dryRun ? 'Would clear' : 'Cleared'} ${totalDeleted} total items in local_db.json.`);
  console.log('------------------------------------------------------\n');

  return { success: true, database: 'local_json', stats, totalDeleted, dryRun };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const keepAdmin = args.includes('--keep-admin');

  let tables = null;
  const tablesArg = args.find(a => a.startsWith('--tables=') || a.startsWith('--table='));
  if (tablesArg) {
    const rawVal = tablesArg.split('=')[1];
    tables = rawVal.split(',').map(s => s.trim()).filter(Boolean);
  }

  const res = deleteLocalJsonData({ tables, dryRun, keepAdmin });
  process.exit(res.success ? 0 : 1);
}

module.exports = { deleteLocalJsonData };
