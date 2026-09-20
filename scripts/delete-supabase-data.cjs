/**
 * Supabase / Primary Cloud PostgreSQL Table Data Deletion Script
 *
 * Usage:
 *   node scripts/delete-supabase-data.cjs [--tables=profiles,errands] [--dry-run] [--force] [--keep-admin]
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const KNOWN_TABLES = [
  'errand_chats',
  'support_messages',
  'reviews',
  'bids',
  'transactions',
  'notifications',
  'saved_places',
  'runner_applications',
  'service_listings',
  'featured_services',
  'otp_codes',
  'errands',
  'wallets',
  'settings',
  'firebase_infrastructure',
  'categories',
  'profiles'
];

function isValidPgUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('postgresql://') || url.startsWith('postgres://');
}

function loadConfig() {
  let dbConfig = {
    host: 'db.ksflmdvqvseiprebgrcp.supabase.co',
    port: 5432,
    user: 'postgres',
    password: process.env.SUPABASE_DB_PASSWORD || 'Company1.Codexict',
    database: 'postgres'
  };

  const configPath = path.join(process.cwd(), 'database_config.json');
  if (fs.existsSync(configPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      dbConfig = { ...dbConfig, ...parsed };
    } catch (e) {
      console.warn('Warning: Could not parse database_config.json:', e.message);
    }
  }

  const appConfigPath = path.join(process.cwd(), 'app_config.json');
  if (fs.existsSync(appConfigPath)) {
    try {
      const appCfg = JSON.parse(fs.readFileSync(appConfigPath, 'utf8'));
      if (appCfg.database) {
        dbConfig = { ...dbConfig, ...appCfg.database };
      }
    } catch (e) {}
  }

  if (isValidPgUrl(process.env.SUPABASE_DATABASE_URL)) {
    dbConfig.connectionString = process.env.SUPABASE_DATABASE_URL;
  } else if (isValidPgUrl(process.env.DATABASE_URL)) {
    dbConfig.connectionString = process.env.DATABASE_URL;
  } else {
    delete dbConfig.connectionString;
  }

  return dbConfig;
}

async function deleteSupabaseData(options = {}) {
  const {
    tables = null,
    dryRun = false,
    force = false,
    keepAdmin = false
  } = options;

  console.log('======================================================');
  console.log(' [SUPABASE / PRIMARY POSTGRESQL] DATA DELETION SCRIPT ');
  console.log('======================================================');

  const dbConfig = loadConfig();
  console.log(`Connecting to: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database || dbConfig.name} as ${dbConfig.user}`);

  const poolOpts = dbConfig.connectionString ? {
    connectionString: dbConfig.connectionString,
    ssl: { rejectUnauthorized: false }
  } : {
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database || dbConfig.name,
    ssl: { rejectUnauthorized: false }
  };

  const pool = new Pool(poolOpts);

  try {
    const client = await pool.connect();
    console.log('Connected to PostgreSQL successfully.\n');
    client.release();

    // Query existing tables
    const tableRes = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';"
    );
    const existingTables = new Set(tableRes.rows.map(r => r.table_name));

    // Determine target tables
    let targetList = [];
    if (tables && Array.isArray(tables) && tables.length > 0) {
      targetList = tables.filter(t => existingTables.has(t));
    } else {
      // Order by dependency
      targetList = KNOWN_TABLES.filter(t => existingTables.has(t));
      // Append any other discovered tables
      for (const t of existingTables) {
        if (!targetList.includes(t)) targetList.push(t);
      }
    }

    console.log(`Found ${targetList.length} target tables in public schema.`);
    console.log(`Mode: ${dryRun ? 'DRY-RUN (Preview only, no changes will be made)' : 'LIVE EXECUTION'}\n`);

    const stats = [];

    for (const table of targetList) {
      try {
        const countRes = await pool.query(`SELECT count(*)::int as count FROM public."${table}";`);
        const rowCount = countRes.rows[0]?.count || 0;

        if (rowCount === 0) {
          stats.push({ table, before: 0, deleted: 0, status: 'empty' });
          console.log(`- ${table.padEnd(25)}: 0 rows (Empty)`);
          continue;
        }

        if (dryRun) {
          stats.push({ table, before: rowCount, deleted: rowCount, status: 'would_delete' });
          console.log(`- ${table.padEnd(25)}: ${rowCount} rows (Would be deleted)`);
          continue;
        }

        if (table === 'profiles' && keepAdmin) {
          // Delete non-admin profiles only
          const delRes = await pool.query(
            'DELETE FROM public.profiles WHERE is_admin IS NOT TRUE AND role NOT ILIKE \'%admin%\';'
          );
          const deletedCount = delRes.rowCount || 0;
          stats.push({ table, before: rowCount, deleted: deletedCount, status: 'kept_admin' });
          console.log(`- ${table.padEnd(25)}: Deleted ${deletedCount} rows (Preserved admin accounts)`);
        } else {
          // Truncate table with cascade
          await pool.query(`TRUNCATE TABLE public."${table}" CASCADE;`);
          stats.push({ table, before: rowCount, deleted: rowCount, status: 'deleted' });
          console.log(`- ${table.padEnd(25)}: Successfully deleted/truncated ${rowCount} rows`);
        }
      } catch (tableErr) {
        console.error(`! Failed on table ${table}:`, tableErr.message);
        stats.push({ table, error: tableErr.message, status: 'error' });
      }
    }

    const totalDeleted = stats.reduce((acc, s) => acc + (s.deleted || 0), 0);
    console.log('\n------------------------------------------------------');
    console.log(`Summary: ${dryRun ? 'Would delete' : 'Deleted'} ${totalDeleted} total rows across ${stats.length} tables.`);
    console.log('------------------------------------------------------\n');

    return { success: true, database: 'supabase', stats, totalDeleted, dryRun };
  } catch (err) {
    console.error('Database connection failed:', err.message);
    return { success: false, database: 'supabase', error: err.message };
  } finally {
    await pool.end();
  }
}

// CLI Execution Support
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force') || args.includes('-f');
  const keepAdmin = args.includes('--keep-admin');

  let tables = null;
  const tablesArg = args.find(a => a.startsWith('--tables=') || a.startsWith('--table='));
  if (tablesArg) {
    const rawVal = tablesArg.split('=')[1];
    tables = rawVal.split(',').map(s => s.trim()).filter(Boolean);
  }

  deleteSupabaseData({ tables, dryRun, force, keepAdmin })
    .then(res => {
      process.exit(res.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Fatal execution error:', err);
      process.exit(1);
    });
}

module.exports = { deleteSupabaseData };
