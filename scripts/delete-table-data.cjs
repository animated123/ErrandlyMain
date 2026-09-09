#!/usr/bin/env node
/**
 * Master Table Data & Local Strings Deletion Script
 *
 * Supports deleting table data for:
 *   1. Supabase / Primary Cloud PostgreSQL
 *   2. Local PostgreSQL
 *   3. Local JSON Database (local_db.json)
 *   4. Firebase Firestore Collections
 *   5. Local Strings & Connection Strings
 *   6. All databases concurrently
 *
 * Usage:
 *   node scripts/delete-table-data.cjs --db=all [--dry-run] [--force] [--keep-admin]
 *   node scripts/delete-table-data.cjs --db=supabase [--tables=profiles,errands]
 *   node scripts/delete-table-data.cjs --db=local_pg
 *   node scripts/delete-table-data.cjs --db=local_json
 *   node scripts/delete-table-data.cjs --db=firestore
 *   node scripts/delete-table-data.cjs --db=local_strings
 */

const readline = require('readline');
const { deleteSupabaseData } = require('./delete-supabase-data.cjs');
const { deleteLocalPgData } = require('./delete-local-pg-data.cjs');
const { deleteLocalJsonData } = require('./delete-local-json-data.cjs');
const { deleteFirestoreData } = require('./delete-firestore-data.cjs');
const { deleteLocalStrings } = require('./delete-local-strings.cjs');

function printHelp() {
  console.log(`
========================================================================
 ERRAND RUNNER - DATABASE TABLE & LOCAL STRINGS DELETION UTILITY
========================================================================

OPTIONS:
  --db=<target>       Target database to purge:
                      - supabase     : Primary Cloud PostgreSQL
                      - local_pg     : Local PostgreSQL Instance
                      - local_json   : Local JSON Database (local_db.json)
                      - firestore    : Firebase Firestore Collections
                      - local_strings: Clear OTP strings, message caches & connection strings
                      - all          : Purge all active databases & local strings
                      (Default: all)

  --tables=<list>     Comma-separated list of tables/collections to purge.
                      Example: --tables=errands,bids,transactions

  --dry-run           Preview what records exist and would be deleted
                      without making any modifications.

  --force, -f         Skip interactive confirmation prompt.

  --keep-admin        Preserve administrator profiles and user accounts.

  --help, -h          Show this help documentation.

EXAMPLES:
  node scripts/delete-table-data.cjs --db=all --dry-run
  node scripts/delete-table-data.cjs --db=supabase --tables=errands,bids --force
  node scripts/delete-table-data.cjs --db=local_json --keep-admin
  node scripts/delete-table-data.cjs --db=local_strings
========================================================================
`);
}

async function promptConfirm(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function runMasterDeletion() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    process.exit(0);
  }

  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force') || args.includes('-f');
  const keepAdmin = args.includes('--keep-admin');

  let dbTarget = 'all';
  const dbArg = args.find(a => a.startsWith('--db=') || a.startsWith('--database='));
  if (dbArg) {
    dbTarget = dbArg.split('=')[1].trim().toLowerCase();
  }

  let tables = null;
  const tablesArg = args.find(a => a.startsWith('--tables=') || a.startsWith('--table='));
  if (tablesArg) {
    const rawVal = tablesArg.split('=')[1];
    tables = rawVal.split(',').map(s => s.trim()).filter(Boolean);
  }

  console.log('\n================================================================');
  console.log('       MULTI-DATABASE TABLE DATA & STRINGS PURGE TOOL          ');
  console.log('================================================================');
  console.log(` Target DB     : ${dbTarget.toUpperCase()}`);
  console.log(` Tables        : ${tables ? tables.join(', ') : 'ALL KNOWN TABLES'}`);
  console.log(` Mode          : ${dryRun ? 'DRY-RUN (Safe Simulation)' : 'LIVE DELETION'}`);
  console.log(` Keep Admin    : ${keepAdmin ? 'YES (Admin profiles preserved)' : 'NO (Purging all records)'}`);
  console.log('================================================================\n');

  if (!dryRun && !force && process.stdin.isTTY) {
    const answer = await promptConfirm(
      '⚠️  WARNING: This will permanently delete table data. Type "YES" to proceed: '
    );
    if (answer !== 'yes') {
      console.log('Deletion cancelled by user.');
      process.exit(0);
    }
    console.log('');
  }

  const overallResults = {};

  // 1. Supabase / Primary PG
  if (dbTarget === 'all' || dbTarget === 'supabase' || dbTarget === 'primary') {
    try {
      overallResults.supabase = await deleteSupabaseData({ tables, dryRun, force, keepAdmin });
    } catch (e) {
      overallResults.supabase = { success: false, error: e.message };
    }
  }

  // 2. Local PostgreSQL
  if (dbTarget === 'all' || dbTarget === 'local_pg' || dbTarget === 'localpg') {
    try {
      overallResults.local_pg = await deleteLocalPgData({ tables, dryRun, force, keepAdmin });
    } catch (e) {
      overallResults.local_pg = { success: false, error: e.message };
    }
  }

  // 3. Local JSON Database
  if (dbTarget === 'all' || dbTarget === 'local_json' || dbTarget === 'json') {
    try {
      overallResults.local_json = deleteLocalJsonData({ tables, dryRun, keepAdmin });
    } catch (e) {
      overallResults.local_json = { success: false, error: e.message };
    }
  }

  // 4. Firebase Firestore
  if (dbTarget === 'all' || dbTarget === 'firestore' || dbTarget === 'firebase') {
    try {
      overallResults.firestore = await deleteFirestoreData({ tables, dryRun, keepAdmin });
    } catch (e) {
      overallResults.firestore = { success: false, error: e.message };
    }
  }

  // 5. Local Strings & Connection Strings
  if (dbTarget === 'all' || dbTarget === 'local_strings' || dbTarget === 'strings') {
    try {
      overallResults.local_strings = deleteLocalStrings({ dryRun });
    } catch (e) {
      overallResults.local_strings = { success: false, error: e.message };
    }
  }

  // Master Summary Report
  console.log('\n================================================================');
  console.log('                   FINAL EXECUTION REPORT                       ');
  console.log('================================================================');
  for (const [dbKey, res] of Object.entries(overallResults)) {
    const statusLabel = res.success ? (dryRun ? 'DRY-RUN OK' : 'SUCCESS') : 'FAILED / SKIPPED';
    const countInfo = res.totalDeleted !== undefined
      ? `${res.totalDeleted} records ${dryRun ? 'simulated' : 'deleted'}`
      : (res.totalActions !== undefined ? `${res.totalActions} string actions` : (res.error || 'Done'));

    console.log(`[${dbKey.toUpperCase().padEnd(14)}] : ${statusLabel.padEnd(14)} (${countInfo})`);
  }
  console.log('================================================================\n');

  return overallResults;
}

if (require.main === module) {
  runMasterDeletion()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Master script failed:', err);
      process.exit(1);
    });
}

module.exports = { runMasterDeletion };
