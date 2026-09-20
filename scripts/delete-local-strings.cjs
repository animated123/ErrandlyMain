/**
 * Local Strings & Connection Strings Deletion / Purge Script
 *
 * Usage:
 *   node scripts/delete-local-strings.cjs [--dry-run] [--include-connection-strings] [--include-tokens]
 */

const fs = require('fs');
const path = require('path');

function deleteLocalStrings(options = {}) {
  const {
    dryRun = false,
    includeConnectionStrings = true,
    includeTokens = true,
    includeDrafts = true
  } = options;

  console.log('======================================================');
  console.log('       [LOCAL STRINGS] DATA DELETION SCRIPT          ');
  console.log('======================================================');
  console.log(`Mode: ${dryRun ? 'DRY-RUN (Preview only)' : 'LIVE EXECUTION'}\n`);

  const results = [];

  // 1. Clean local string tables in local_db.json (otp_codes, drafts, text tokens)
  const localDbPath = path.join(process.cwd(), 'local_db.json');
  if (fs.existsSync(localDbPath)) {
    try {
      const db = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
      let modified = false;

      // OTP Codes (verification code strings)
      if (includeTokens && Array.isArray(db.otp_codes) && db.otp_codes.length > 0) {
        const count = db.otp_codes.length;
        if (!dryRun) {
          db.otp_codes = [];
          modified = true;
        }
        results.push({ target: 'local_db.json [otp_codes strings]', count, status: dryRun ? 'would_delete' : 'cleared' });
        console.log(`- local_db.json [otp_codes]: ${dryRun ? 'Would clear' : 'Cleared'} ${count} OTP string entries`);
      }

      // Temporary chat/support message strings in local JSON
      if (includeDrafts) {
        if (Array.isArray(db.errand_chats) && db.errand_chats.length > 0) {
          const count = db.errand_chats.length;
          if (!dryRun) {
            db.errand_chats = [];
            modified = true;
          }
          results.push({ target: 'local_db.json [errand_chats strings]', count, status: dryRun ? 'would_delete' : 'cleared' });
          console.log(`- local_db.json [errand_chats]: ${dryRun ? 'Would clear' : 'Cleared'} ${count} chat message strings`);
        }

        if (Array.isArray(db.support_messages) && db.support_messages.length > 0) {
          const count = db.support_messages.length;
          if (!dryRun) {
            db.support_messages = [];
            modified = true;
          }
          results.push({ target: 'local_db.json [support_messages strings]', count, status: dryRun ? 'would_delete' : 'cleared' });
          console.log(`- local_db.json [support_messages]: ${dryRun ? 'Would clear' : 'Cleared'} ${count} support message strings`);
        }
      }

      if (modified && !dryRun) {
        fs.writeFileSync(localDbPath, JSON.stringify(db, null, 2), 'utf8');
        console.log('Saved updated local_db.json');
      }
    } catch (e) {
      console.warn('Failed cleaning string entries in local_db.json:', e.message);
      results.push({ target: 'local_db.json', error: e.message, status: 'error' });
    }
  }

  // 2. Local Connection Strings in local configuration files
  if (includeConnectionStrings) {
    // Check local_db_config.json
    const localDbConfigPath = path.join(process.cwd(), 'local_db_config.json');
    if (fs.existsSync(localDbConfigPath)) {
      try {
        const raw = fs.readFileSync(localDbConfigPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed.connectionString) {
          results.push({ target: 'local_db_config.json [connectionString]', count: 1, status: dryRun ? 'would_delete' : 'cleared' });
          console.log(`- local_db_config.json: ${dryRun ? 'Would reset' : 'Reset'} connectionString`);
          if (!dryRun) {
            delete parsed.connectionString;
            fs.writeFileSync(localDbConfigPath, JSON.stringify(parsed, null, 2), 'utf8');
          }
        }
      } catch (e) {
        console.warn('Could not update local_db_config.json:', e.message);
      }
    }

    // Check app_config.json
    const appConfigPath = path.join(process.cwd(), 'app_config.json');
    if (fs.existsSync(appConfigPath)) {
      try {
        const raw = fs.readFileSync(appConfigPath, 'utf8');
        const parsed = JSON.parse(raw);
        let modified = false;

        if (parsed.database?.connectionString) {
          results.push({ target: 'app_config.json [database.connectionString]', count: 1, status: dryRun ? 'would_delete' : 'cleared' });
          console.log(`- app_config.json [database.connectionString]: ${dryRun ? 'Would clear' : 'Cleared'}`);
          if (!dryRun) {
            delete parsed.database.connectionString;
            modified = true;
          }
        }

        if (parsed.localDatabase?.connectionString) {
          results.push({ target: 'app_config.json [localDatabase.connectionString]', count: 1, status: dryRun ? 'would_delete' : 'cleared' });
          console.log(`- app_config.json [localDatabase.connectionString]: ${dryRun ? 'Would clear' : 'Cleared'}`);
          if (!dryRun) {
            delete parsed.localDatabase.connectionString;
            modified = true;
          }
        }

        if (modified && !dryRun) {
          fs.writeFileSync(appConfigPath, JSON.stringify(parsed, null, 2), 'utf8');
        }
      } catch (e) {
        console.warn('Could not update app_config.json:', e.message);
      }
    }

    // Check database_config.json
    const databaseConfigPath = path.join(process.cwd(), 'database_config.json');
    if (fs.existsSync(databaseConfigPath)) {
      try {
        const raw = fs.readFileSync(databaseConfigPath, 'utf8');
        const parsed = JSON.parse(raw);
        if (parsed.connectionString) {
          results.push({ target: 'database_config.json [connectionString]', count: 1, status: dryRun ? 'would_delete' : 'cleared' });
          console.log(`- database_config.json [connectionString]: ${dryRun ? 'Would clear' : 'Cleared'}`);
          if (!dryRun) {
            delete parsed.connectionString;
            fs.writeFileSync(databaseConfigPath, JSON.stringify(parsed, null, 2), 'utf8');
          }
        }
      } catch (e) {}
    }
  }

  // 3. Client Local Storage strings instructions & purge descriptor
  const clientStorageKeys = [
    'errand_drafts',
    'custom_action_server_url',
    'custom_gateway_url',
    'connection_admin_token',
    'auth_token',
    'selected_theme'
  ];
  results.push({
    target: 'Client Browser Local Storage Keys',
    keys: clientStorageKeys,
    note: 'Client localStorage can be wiped in browser console via localStorage.clear() or via Admin UI purge button.'
  });

  const totalActions = results.filter(r => r.status === 'cleared' || r.status === 'would_delete').length;
  console.log('\n------------------------------------------------------');
  console.log(`Summary: ${dryRun ? 'Identified' : 'Completed'} ${totalActions} local string purge operations.`);
  console.log('------------------------------------------------------\n');

  return { success: true, database: 'local_strings', results, totalActions, dryRun };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  const res = deleteLocalStrings({ dryRun });
  process.exit(res.success ? 0 : 1);
}

module.exports = { deleteLocalStrings };
