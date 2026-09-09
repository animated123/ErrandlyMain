/**
 * Local PostgreSQL Table Data Deletion Script
 *
 * Usage:
 *   node scripts/delete-local-pg-data.cjs [--tables=profiles,errands] [--dry-run] [--force] [--keep-admin]
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

function loadLocalPgConfig() {
  let localDbConfig = {
    host: process.env.LOCAL_PGHOST || '127.0.0.1',
    port: parseInt(process.env.LOCAL_PGPORT || '5432'),
    user: process.env.LOCAL_PGUSER || 'postgres',
    password: process.env.LOCAL_PGPASSWORD || 'admin',
    database: process.env.LOCAL_PGDATABASE || 'Errandly'
  };

  const appConfigPath = path.join(process.cwd(), 'app_config.json');
  if (fs.existsSync(appConfigPath)) {
    try {
      const appCfg = JSON.parse(fs.readFileSync(appConfigPath, 'utf8'));
      if (appCfg.localDatabase) {
        localDbConfig = {
          host: appCfg.localDatabase.host || localDbConfig.host,
          port: appCfg.localDatabase.port || localDbConfig.port,
          user: appCfg.localDatabase.user || localDbConfig.user,
          password: appCfg.localDatabase.password !== undefined ? appCfg.localDatabase.password : localDbConfig.password,
          database: appCfg.localDatabase.name || localDbConfig.database,
          connectionString: isValidPgUrl(appCfg.localDatabase.connectionString) ? appCfg.localDatabase.connectionString : undefined
        };
      }
    } catch (e) {}
  }

  const localDbConfigPath = path.join(process.cwd(), 'local_db_config.json');
  if (fs.existsSync(localDbConfigPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(localDbConfigPath, 'utf8'));
      localDbConfig = { ...localDbConfig, ...parsed };
      if (!isValidPgUrl(localDbConfig.connectionString)) {
        delete localDbConfig.connectionString;
      }
    } catch (e) {}
  }

  if (isValidPgUrl(process.env.LOCAL_DATABASE_URL)) {
    localDbConfig.connectionString = process.env.LOCAL_DATABASE_URL;
  } else if (!isValidPgUrl(localDbConfig.connectionString)) {
    delete localDbConfig.connectionString;
  }

  return localDbConfig;
}

async function deleteLocalPgData(options = {}) {
  const {
    tables = null,
    dryRun = false,
    force = false,
    keepAdmin = false
  } = options;

  console.log('======================================================');
  console.log('    [LOCAL POSTGRESQL] DATA DELETION SCRIPT          ');
  console.log('======================================================');

  const cfg = loadLocalPgConfig();
  console.log(`Targeting Local PG at: ${cfg.host}:${cfg.port}/${cfg.database} (User: ${cfg.user})`);

  const isRemote = cfg.host && !cfg.host.includes('127.0.0.1') && !cfg.host.includes('localhost');
  const poolOpts = cfg.connectionString ? {
    connectionString: cfg.connectionString,
    connectionTimeoutMillis: 4000
  } : {
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    connectionTimeoutMillis: 4000
  };

  if (isRemote) {
    poolOpts.ssl = { rejectUnauthorized: false };
  }

  const pool = new Pool(poolOpts);

  try {
    const client = await pool.connect();
    console.log('Connected to Local PostgreSQL instance successfully.\n');
    client.release();

    const tableRes = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';"
    );
    const existingTables = new Set(tableRes.rows.map(r => r.table_name));

    let targetList = [];
    if (tables && Array.isArray(tables) && tables.length > 0) {
      targetList = tables.filter(t => existingTables.has(t));
    } else {
      targetList = KNOWN_TABLES.filter(t => existingTables.has(t));
      for (const t of existingTables) {
        if (!targetList.includes(t)) targetList.push(t);
      }
    }

    console.log(`Discovered ${targetList.length} tables in Local PostgreSQL.`);
    console.log(`Mode: ${dryRun ? 'DRY-RUN (Preview only)' : 'LIVE EXECUTION'}\n`);

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
          const delRes = await pool.query(
            'DELETE FROM public.profiles WHERE is_admin IS NOT TRUE AND role NOT ILIKE \'%admin%\';'
          );
          const deletedCount = delRes.rowCount || 0;
          stats.push({ table, before: rowCount, deleted: deletedCount, status: 'kept_admin' });
          console.log(`- ${table.padEnd(25)}: Deleted ${deletedCount} rows (Preserved admin accounts)`);
        } else {
          await pool.query(`TRUNCATE TABLE public."${table}" CASCADE;`);
          stats.push({ table, before: rowCount, deleted: rowCount, status: 'deleted' });
          console.log(`- ${table.padEnd(25)}: Successfully deleted/truncated ${rowCount} rows`);
        }
      } catch (tErr) {
        console.error(`! Failed on table ${table}:`, tErr.message);
        stats.push({ table, error: tErr.message, status: 'error' });
      }
    }

    const totalDeleted = stats.reduce((acc, s) => acc + (s.deleted || 0), 0);
    console.log('\n------------------------------------------------------');
    console.log(`Summary: ${dryRun ? 'Would delete' : 'Deleted'} ${totalDeleted} rows in Local PostgreSQL.`);
    console.log('------------------------------------------------------\n');

    return { success: true, database: 'local_pg', stats, totalDeleted, dryRun };
  } catch (err) {
    console.warn(`Local PostgreSQL is currently unreachable (${err.message}).`);
    return { success: false, database: 'local_pg', error: err.message, reachable: false };
  } finally {
    await pool.end();
  }
}

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

  deleteLocalPgData({ tables, dryRun, force, keepAdmin })
    .then(res => {
      process.exit(res.success || !res.reachable ? 0 : 1);
    })
    .catch(err => {
      console.error('Fatal execution error:', err);
      process.exit(1);
    });
}

module.exports = { deleteLocalPgData };
