/**
 * Firebase Firestore Collection Data Deletion Script
 *
 * Usage:
 *   node scripts/delete-firestore-data.cjs [--tables=users,errands] [--dry-run] [--keep-admin]
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

const KNOWN_COLLECTIONS = [
  'users',
  'errands',
  'runner_applications',
  'bids',
  'notifications',
  'reviews',
  'errand_chats',
  'support_messages',
  'transactions',
  'wallets',
  'settings',
  'categories',
  'saved_places',
  'featured_services',
  'service_listings',
  'otp_codes'
];

function loadFirebaseConfig() {
  const cfgPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (!fs.existsSync(cfgPath)) {
    throw new Error(`Firebase config not found at ${cfgPath}`);
  }
  return JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
}

function tableToCollection(tableName) {
  if (tableName === 'profiles' || tableName === 'users') return 'users';
  return tableName;
}

async function getActiveDatabaseId(config) {
  const configured = config.firestoreDatabaseId;
  if (configured && configured !== '(default)') {
    try {
      const testUrl = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/${encodeURIComponent(configured)}/documents/users?pageSize=1&key=${config.apiKey}`;
      const res = await axios.get(testUrl, { timeout: 4000 });
      if (res.status === 200) return configured;
    } catch (e) {
      // If 404 or other error, fallback to (default)
    }
  }
  return '(default)';
}

async function fetchCollectionDocs(config, dbId, collection) {
  const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/${encodeURIComponent(dbId)}/documents/${encodeURIComponent(collection)}?pageSize=300&key=${config.apiKey}`;
  try {
    const res = await axios.get(url, { timeout: 7000 });
    return res.data?.documents || [];
  } catch (err) {
    if (err.response?.status === 404) return [];
    throw err;
  }
}

async function deleteFirestoreData(options = {}) {
  const {
    tables = null,
    dryRun = false,
    keepAdmin = false
  } = options;

  console.log('======================================================');
  console.log('   [FIREBASE FIRESTORE] DATA DELETION SCRIPT         ');
  console.log('======================================================');

  let config;
  try {
    config = loadFirebaseConfig();
  } catch (err) {
    console.error(err.message);
    return { success: false, database: 'firestore', error: err.message };
  }

  const activeDbId = await getActiveDatabaseId(config);
  console.log(`Project: ${config.projectId}`);
  console.log(`Active Firestore Database: ${activeDbId}`);
  console.log(`Mode: ${dryRun ? 'DRY-RUN (Preview only)' : 'LIVE EXECUTION'}\n`);

  let targetCollections = [];
  if (tables && Array.isArray(tables) && tables.length > 0) {
    targetCollections = [...new Set(tables.map(tableToCollection))];
  } else {
    targetCollections = KNOWN_COLLECTIONS;
  }

  const stats = [];

  for (const col of targetCollections) {
    try {
      const docs = await fetchCollectionDocs(config, activeDbId, col);
      const docCount = docs.length;

      if (docCount === 0) {
        stats.push({ collection: col, before: 0, deleted: 0, status: 'empty' });
        console.log(`- ${col.padEnd(25)}: 0 documents (Empty)`);
        continue;
      }

      if (dryRun) {
        stats.push({ collection: col, before: docCount, deleted: docCount, status: 'would_delete' });
        console.log(`- ${col.padEnd(25)}: ${docCount} documents (Would be deleted)`);
        continue;
      }

      let deletedCount = 0;
      for (const doc of docs) {
        const docPath = doc.name; // projects/.../databases/.../documents/...
        const fields = doc.fields || {};

        if (col === 'users' && keepAdmin) {
          const isAdmin = fields.is_admin?.booleanValue === true ||
                          String(fields.role?.stringValue || '').toLowerCase().includes('admin');
          if (isAdmin) {
            continue; // Skip admin
          }
        }

        try {
          const delUrl = `https://firestore.googleapis.com/v1/${docPath}?key=${config.apiKey}`;
          await axios.delete(delUrl, { timeout: 6000 });
          deletedCount++;
        } catch (delErr) {
          console.warn(`! Failed to delete doc ${docPath}:`, delErr.message);
        }
      }

      stats.push({ collection: col, before: docCount, deleted: deletedCount, status: 'deleted' });
      console.log(`- ${col.padEnd(25)}: Successfully deleted ${deletedCount} of ${docCount} documents`);
    } catch (err) {
      console.error(`! Failed on collection ${col}:`, err.message);
      stats.push({ collection: col, error: err.message, status: 'error' });
    }
  }

  const totalDeleted = stats.reduce((acc, s) => acc + (s.deleted || 0), 0);
  console.log('\n------------------------------------------------------');
  console.log(`Summary: ${dryRun ? 'Would delete' : 'Deleted'} ${totalDeleted} documents in Firestore [${activeDbId}].`);
  console.log('------------------------------------------------------\n');

  return { success: true, database: 'firestore', activeDbId, stats, totalDeleted, dryRun };
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

  deleteFirestoreData({ tables, dryRun, keepAdmin })
    .then(res => {
      process.exit(res.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Fatal execution error:', err);
      process.exit(1);
    });
}

module.exports = { deleteFirestoreData };
