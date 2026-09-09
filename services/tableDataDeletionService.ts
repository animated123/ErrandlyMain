import pg from 'pg';
const { Pool } = pg;
import fs from 'fs';
import path from 'path';
import axios from 'axios';

export interface DeleteTableDataOptions {
  tables?: string[] | null;
  dryRun?: boolean;
  force?: boolean;
  keepAdmin?: boolean;
}

export interface TableStat {
  table: string;
  before?: number | string;
  deleted?: number;
  status: string;
  error?: string;
}

export interface DeletionResult {
  success: boolean;
  database: string;
  stats?: TableStat[];
  results?: any[];
  totalDeleted?: number;
  totalActions?: number;
  dryRun?: boolean;
  error?: string;
}

const KNOWN_POSTGRES_TABLES = [
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

const KNOWN_JSON_TABLES = [
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

const KNOWN_FIRESTORE_COLLECTIONS = [
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

function isValidPgUrl(url: any): boolean {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('postgresql://') || url.startsWith('postgres://');
}

/**
 * 1. Supabase / Primary Cloud PostgreSQL Purge
 */
export async function deleteSupabaseData(options: DeleteTableDataOptions = {}): Promise<DeletionResult> {
  const {
    tables = null,
    dryRun = false,
    keepAdmin = false
  } = options;

  let dbConfig: any = {
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
    } catch (e: any) {
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
    } catch (_e: any) {
      // Ignore config read error
    }
  }

  if (isValidPgUrl(process.env.SUPABASE_DATABASE_URL)) {
    dbConfig.connectionString = process.env.SUPABASE_DATABASE_URL;
  } else if (isValidPgUrl(process.env.DATABASE_URL)) {
    dbConfig.connectionString = process.env.DATABASE_URL;
  }

  const poolOpts: any = dbConfig.connectionString ? {
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

  let pool: any = null;
  try {
    pool = new Pool(poolOpts);
    const client = await pool.connect();
    client.release();

    const tableRes = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';"
    );
    const existingTables = new Set(tableRes.rows.map((r: any) => r.table_name));

    let targetList: string[] = [];
    if (tables && Array.isArray(tables) && tables.length > 0) {
      targetList = tables.filter(t => existingTables.has(t));
    } else {
      targetList = KNOWN_POSTGRES_TABLES.filter(t => existingTables.has(t));
      for (const t of existingTables) {
        if (!targetList.includes(t as string)) targetList.push(t as string);
      }
    }

    const stats: TableStat[] = [];

    for (const table of targetList) {
      try {
        const countRes = await pool.query(`SELECT count(*)::int as count FROM public."${table}";`);
        const rowCount = countRes.rows[0]?.count || 0;

        if (rowCount === 0) {
          stats.push({ table, before: 0, deleted: 0, status: 'empty' });
          continue;
        }

        if (dryRun) {
          stats.push({ table, before: rowCount, deleted: rowCount, status: 'would_delete' });
          continue;
        }

        if (table === 'profiles' && keepAdmin) {
          const delRes = await pool.query(
            'DELETE FROM public.profiles WHERE is_admin IS NOT TRUE AND role NOT ILIKE \'%admin%\';'
          );
          const deletedCount = delRes.rowCount || 0;
          stats.push({ table, before: rowCount, deleted: deletedCount, status: 'kept_admin' });
        } else {
          await pool.query(`TRUNCATE TABLE public."${table}" CASCADE;`);
          stats.push({ table, before: rowCount, deleted: rowCount, status: 'deleted' });
        }
      } catch (tableErr: any) {
        stats.push({ table, error: tableErr.message, status: 'error' });
      }
    }

    const totalDeleted = stats.reduce((acc, s) => acc + (s.deleted || 0), 0);
    return { success: true, database: 'supabase', stats, totalDeleted, dryRun };
  } catch (err: any) {
    return { success: false, database: 'supabase', error: err.message };
  } finally {
    if (pool) {
      try { 
        await pool.end(); 
      } catch (_e: any) {
        // Pool end error ignored
      }
    }
  }
}

/**
 * 2. Local PostgreSQL Purge
 */
export async function deleteLocalPgData(options: DeleteTableDataOptions = {}): Promise<DeletionResult> {
  const {
    tables = null,
    dryRun = false,
    keepAdmin = false
  } = options;

  let localDbConfig: any = {
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
    } catch (_e: any) {
      // Ignore local DB app_config read error
    }
  }

  const localDbConfigPath = path.join(process.cwd(), 'local_db_config.json');
  if (fs.existsSync(localDbConfigPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(localDbConfigPath, 'utf8'));
      localDbConfig = { ...localDbConfig, ...parsed };
      if (!isValidPgUrl(localDbConfig.connectionString)) {
        delete localDbConfig.connectionString;
      }
    } catch (_e: any) {
      // Ignore local DB config read error
    }
  }

  if (isValidPgUrl(process.env.LOCAL_DATABASE_URL)) {
    localDbConfig.connectionString = process.env.LOCAL_DATABASE_URL;
  }

  const isRemote = localDbConfig.host && !localDbConfig.host.includes('127.0.0.1') && !localDbConfig.host.includes('localhost');
  const poolOpts: any = localDbConfig.connectionString ? {
    connectionString: localDbConfig.connectionString,
    connectionTimeoutMillis: 3000,
    ...(isRemote ? { ssl: { rejectUnauthorized: false } } : {})
  } : {
    host: localDbConfig.host,
    port: localDbConfig.port,
    user: localDbConfig.user,
    password: localDbConfig.password,
    database: localDbConfig.database,
    connectionTimeoutMillis: 3000,
    ...(isRemote ? { ssl: { rejectUnauthorized: false } } : {})
  };

  let pool: any = null;
  try {
    pool = new Pool(poolOpts);
    const client = await pool.connect();
    client.release();

    const tableRes = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';"
    );
    const existingTables = new Set(tableRes.rows.map((r: any) => r.table_name));

    let targetList: string[] = [];
    if (tables && Array.isArray(tables) && tables.length > 0) {
      targetList = tables.filter(t => existingTables.has(t));
    } else {
      targetList = KNOWN_POSTGRES_TABLES.filter(t => existingTables.has(t));
      for (const t of existingTables) {
        if (!targetList.includes(t as string)) targetList.push(t as string);
      }
    }

    const stats: TableStat[] = [];

    for (const table of targetList) {
      try {
        const countRes = await pool.query(`SELECT count(*)::int as count FROM public."${table}";`);
        const rowCount = countRes.rows[0]?.count || 0;

        if (rowCount === 0) {
          stats.push({ table, before: 0, deleted: 0, status: 'empty' });
          continue;
        }

        if (dryRun) {
          stats.push({ table, before: rowCount, deleted: rowCount, status: 'would_delete' });
          continue;
        }

        if (table === 'profiles' && keepAdmin) {
          const delRes = await pool.query(
            'DELETE FROM public.profiles WHERE is_admin IS NOT TRUE AND role NOT ILIKE \'%admin%\';'
          );
          const deletedCount = delRes.rowCount || 0;
          stats.push({ table, before: rowCount, deleted: deletedCount, status: 'kept_admin' });
        } else {
          await pool.query(`TRUNCATE TABLE public."${table}" CASCADE;`);
          stats.push({ table, before: rowCount, deleted: rowCount, status: 'deleted' });
        }
      } catch (tableErr: any) {
        stats.push({ table, error: tableErr.message, status: 'error' });
      }
    }

    const totalDeleted = stats.reduce((acc, s) => acc + (s.deleted || 0), 0);
    return { success: true, database: 'local_pg', stats, totalDeleted, dryRun };
  } catch (err: any) {
    return { success: false, database: 'local_pg', error: `Local PG offline or unreachable: ${err.message}` };
  } finally {
    if (pool) {
      try { 
        await pool.end(); 
      } catch (_e: any) {
        // Pool end error ignored
      }
    }
  }
}

/**
 * 3. Local JSON Database (local_db.json) Purge
 */
export function deleteLocalJsonData(options: DeleteTableDataOptions = {}): DeletionResult {
  const {
    tables = null,
    dryRun = false,
    keepAdmin = false
  } = options;

  const localDbPath = path.join(process.cwd(), 'local_db.json');
  if (!fs.existsSync(localDbPath)) {
    return { success: false, database: 'local_json', error: 'local_db.json not found' };
  }

  let db: Record<string, any> = {};
  try {
    const raw = fs.readFileSync(localDbPath, 'utf8');
    db = JSON.parse(raw);
  } catch (err: any) {
    return { success: false, database: 'local_json', error: err.message };
  }

  const existingKeys = Object.keys(db);
  let targetList: string[] = [];

  if (tables && Array.isArray(tables) && tables.length > 0) {
    targetList = tables.filter(t => existingKeys.includes(t));
  } else {
    targetList = [...new Set([...KNOWN_JSON_TABLES.filter(t => existingKeys.includes(t)), ...existingKeys])];
  }

  const stats: TableStat[] = [];
  const updatedDb = { ...db };

  for (const table of targetList) {
    const val = db[table];
    if (!Array.isArray(val)) {
      stats.push({ table, before: typeof val, deleted: 0, status: 'skipped_non_array' });
      continue;
    }

    const rowCount = val.length;
    if (rowCount === 0) {
      stats.push({ table, before: 0, deleted: 0, status: 'empty' });
      continue;
    }

    if (dryRun) {
      stats.push({ table, before: rowCount, deleted: rowCount, status: 'would_delete' });
      continue;
    }

    if ((table === 'profiles' || table === 'users') && keepAdmin) {
      const kept = val.filter((u: any) => u && (u.is_admin === true || String(u.role).toLowerCase().includes('admin')));
      const deletedCount = rowCount - kept.length;
      updatedDb[table] = kept;
      stats.push({ table, before: rowCount, deleted: deletedCount, status: 'kept_admin' });
    } else {
      updatedDb[table] = [];
      stats.push({ table, before: rowCount, deleted: rowCount, status: 'deleted' });
    }
  }

  const totalDeleted = stats.reduce((acc, s) => acc + (s.deleted || 0), 0);

  if (!dryRun) {
    try {
      fs.writeFileSync(localDbPath, JSON.stringify(updatedDb, null, 2), 'utf8');
    } catch (saveErr: any) {
      return { success: false, database: 'local_json', error: saveErr.message };
    }
  }

  return { success: true, database: 'local_json', stats, totalDeleted, dryRun };
}

/**
 * 4. Firebase Firestore Collections Purge
 */
export async function deleteFirestoreData(options: DeleteTableDataOptions = {}): Promise<DeletionResult> {
  const {
    tables = null,
    dryRun = false,
    keepAdmin = false
  } = options;

  let config: any;
  const cfgPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (!fs.existsSync(cfgPath)) {
    return { success: false, database: 'firestore', error: `Firebase config not found at ${cfgPath}` };
  }

  try {
    config = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  } catch (err: any) {
    return { success: false, database: 'firestore', error: err.message };
  }

  if (!config.projectId || !config.apiKey) {
    return { success: false, database: 'firestore', error: 'Firebase projectId or apiKey missing' };
  }

  // Detect active Firestore database ID
  let activeDbId = '(default)';
  const configured = config.firestoreDatabaseId;
  if (configured && configured !== '(default)') {
    try {
      const testUrl = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/${encodeURIComponent(configured)}/documents/users?pageSize=1&key=${config.apiKey}`;
      const res = await axios.get(testUrl, { timeout: 4000 });
      if (res.status === 200) activeDbId = configured;
    } catch (e) {
      // Fall back to default
    }
  }

  function tableToCollection(tableName: string) {
    if (tableName === 'profiles' || tableName === 'users') return 'users';
    return tableName;
  }

  let targetCollections: string[] = [];
  if (tables && Array.isArray(tables) && tables.length > 0) {
    targetCollections = [...new Set(tables.map(tableToCollection))];
  } else {
    targetCollections = KNOWN_FIRESTORE_COLLECTIONS;
  }

  const stats: TableStat[] = [];

  for (const col of targetCollections) {
    try {
      const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/${encodeURIComponent(activeDbId)}/documents/${encodeURIComponent(col)}?pageSize=300&key=${config.apiKey}`;
      let docs: any[] = [];
      try {
        const res = await axios.get(url, { timeout: 7000 });
        docs = res.data?.documents || [];
      } catch (e: any) {
        if (e.response?.status === 404) {
          stats.push({ table: col, before: 0, deleted: 0, status: 'empty' });
          continue;
        }
        throw e;
      }

      const rowCount = docs.length;
      if (rowCount === 0) {
        stats.push({ table: col, before: 0, deleted: 0, status: 'empty' });
        continue;
      }

      if (dryRun) {
        stats.push({ table: col, before: rowCount, deleted: rowCount, status: 'would_delete' });
        continue;
      }

      let deletedCount = 0;
      let keptCount = 0;

      for (const doc of docs) {
        const docName = doc.name;
        if (col === 'users' && keepAdmin) {
          const fields = doc.fields || {};
          const isAdmin = fields.is_admin?.booleanValue === true ||
            String(fields.role?.stringValue || '').toLowerCase().includes('admin');

          if (isAdmin) {
            keptCount++;
            continue;
          }
        }

        try {
          const delUrl = `https://firestore.googleapis.com/v1/${docName}?key=${config.apiKey}`;
          await axios.delete(delUrl, { timeout: 5000 });
          deletedCount++;
        } catch (delErr: any) {
          console.warn(`Could not delete doc ${docName}:`, delErr.message);
        }
      }

      stats.push({
        table: col,
        before: rowCount,
        deleted: deletedCount,
        status: keptCount > 0 ? `kept_${keptCount}_admins` : 'deleted'
      });
    } catch (colErr: any) {
      stats.push({ table: col, error: colErr.message, status: 'error' });
    }
  }

  const totalDeleted = stats.reduce((acc, s) => acc + (s.deleted || 0), 0);
  return { success: true, database: 'firestore', stats, totalDeleted, dryRun };
}

/**
 * 5. Local Strings & Tokens Purge
 */
export function deleteLocalStrings(options: { dryRun?: boolean; includeDrafts?: boolean } = {}): DeletionResult {
  const { dryRun = false, includeDrafts = true } = options;
  const results: any[] = [];

  const localDbPath = path.join(process.cwd(), 'local_db.json');
  if (fs.existsSync(localDbPath)) {
    try {
      const db = JSON.parse(fs.readFileSync(localDbPath, 'utf8'));
      let modified = false;

      // OTP Codes
      if (Array.isArray(db.otp_codes) && db.otp_codes.length > 0) {
        const count = db.otp_codes.length;
        if (!dryRun) {
          db.otp_codes = [];
          modified = true;
        }
        results.push({ target: 'local_db.json [otp_codes strings]', count, status: dryRun ? 'would_delete' : 'cleared' });
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
        }

        if (Array.isArray(db.support_messages) && db.support_messages.length > 0) {
          const count = db.support_messages.length;
          if (!dryRun) {
            db.support_messages = [];
            modified = true;
          }
          results.push({ target: 'local_db.json [support_messages strings]', count, status: dryRun ? 'would_delete' : 'cleared' });
        }
      }

      if (modified && !dryRun) {
        fs.writeFileSync(localDbPath, JSON.stringify(db, null, 2), 'utf8');
      }
    } catch (e: any) {
      results.push({ target: 'local_db.json', error: e.message, status: 'error' });
    }
  }

  // Client LocalStorage Guidance
  results.push({
    target: 'Client Browser Local Storage Keys',
    keys: ['errand_drafts', 'custom_action_server_url', 'custom_gateway_url', 'connection_admin_token', 'auth_token', 'selected_theme'],
    note: 'Client localStorage can be wiped in browser console via localStorage.clear() or via Admin UI purge button.'
  });

  return {
    success: true,
    database: 'local_strings',
    results,
    totalActions: results.length,
    dryRun
  };
}
