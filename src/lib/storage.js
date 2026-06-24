// src/lib/storage.js
// Unified storage layer — writes to IndexedDB (local) or Supabase (cloud)
// All functions return { data, error }

import { get, set, del, keys } from 'idb-keyval';
import { supabase } from './supabase';

// ── KEY HELPERS ───────────────────────────────────────────────────────────────

const k = (userId, table, id) => `${userId}:${table}:${id}`;
const prefix = (userId, table) => `${userId}:${table}:`;

// ── LOCAL (IndexedDB) ─────────────────────────────────────────────────────────

export const local = {
  async getAll(userId, table) {
    try {
      const allKeys = await keys();
      const p = prefix(userId, table);
      const matching = allKeys.filter(key => String(key).startsWith(p));
      const items = await Promise.all(matching.map(key => get(key)));
      return { data: items.filter(Boolean), error: null };
    } catch (error) {
      return { data: [], error };
    }
  },

  async upsert(userId, table, item) {
    try {
      await set(k(userId, table, item.id), { ...item, updated_at: new Date().toISOString() });
      return { data: item, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async remove(userId, table, id) {
    try {
      await del(k(userId, table, id));
      return { data: id, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async getProfile(userId) {
    try {
      const data = await get(k(userId, 'profiles', userId));
      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },

  async saveProfile(userId, profile) {
    try {
      await set(k(userId, 'profiles', userId), profile);
      return { data: profile, error: null };
    } catch (error) {
      return { data: null, error };
    }
  },
};

// ── CLOUD (Supabase) ──────────────────────────────────────────────────────────

export const cloud = {
  async getAll(table) {
    return supabase.from(table).select('*').order('created_at', { ascending: false });
  },

  async upsert(table, item) {
    return supabase.from(table).upsert(item).select().single();
  },

  async remove(table, id) {
    return supabase.from(table).delete().eq('id', id);
  },

  async getProfile(userId) {
    return supabase.from('profiles').select('*').eq('id', userId).single();
  },

  async saveProfile(userId, updates) {
    return supabase.from('profiles').upsert({ id: userId, ...updates }).select().single();
  },
};

// ── UNIFIED STORE ─────────────────────────────────────────────────────────────
// Reads/writes to the correct backend based on user's storage preference.

export function createStore(userId, storageMode) {
  const isCloud = storageMode === 'drive';

  return {
    async getAll(table) {
      if (isCloud) return cloud.getAll(table);
      return local.getAll(userId, table);
    },

    async upsert(table, item) {
      const itemWithUser = { ...item, user_id: userId };
      if (isCloud) return cloud.upsert(table, itemWithUser);
      return local.upsert(userId, table, itemWithUser);
    },

    async remove(table, id) {
      if (isCloud) return cloud.remove(table, id);
      return local.remove(userId, table, id);
    },

    async getProfile() {
      if (isCloud) return cloud.getProfile(userId);
      return local.getProfile(userId);
    },

    async saveProfile(updates) {
      if (isCloud) return cloud.saveProfile(userId, updates);
      return local.saveProfile(userId, updates);
    },
  };
}
