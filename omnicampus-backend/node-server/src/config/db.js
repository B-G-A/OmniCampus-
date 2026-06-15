/**
 * Supabase client bootstrap for PostgreSQL, Auth, and Storage.
 */

const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

let supabaseAdminClient = null;
let supabaseAnonClient = null;

const createSupabaseClients = () => {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured.');
  }

  if (!supabaseAdminClient) {
    supabaseAdminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  if (!supabaseAnonClient) {
    supabaseAnonClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  return {
    admin: supabaseAdminClient,
    anon: supabaseAnonClient,
  };
};

const connectDB = async () => {
  const clients = createSupabaseClients();

  const { error } = await clients.admin.from('users').select('user_id', { head: true, count: 'exact' }).limit(1);
  if (error && error.code !== 'PGRST116' && error.code !== '42P01') {
    console.warn(`⚠️  Supabase schema probe returned: ${error.message}`);
  }

  console.log('✅  Supabase clients initialized');
  return clients;
};

const getSupabaseAdmin = () => {
  if (!supabaseAdminClient) {
    createSupabaseClients();
  }
  return supabaseAdminClient;
};

const getSupabaseAnon = () => {
  if (!supabaseAnonClient) {
    createSupabaseClients();
  }
  return supabaseAnonClient;
};

module.exports = connectDB;
module.exports.createSupabaseClients = createSupabaseClients;
module.exports.getSupabaseAdmin = getSupabaseAdmin;
module.exports.getSupabaseAnon = getSupabaseAnon;
