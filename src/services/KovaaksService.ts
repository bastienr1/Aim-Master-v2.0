import { supabase } from '../lib/supabase';

const EDGE_FUNCTION_NAME = 'kovaaks-sync';

export interface KovaaksProfile {
  username: string;
  steamName: string | null;
  avatar: string | null;
  playerId: number | null;
  country: string | null;
  scenariosPlayed: string | null;
  kovaaksPlus: boolean;
  mouse: string | null;
  dpi: string | null;
  cm360: string | null;
  sensitivity: string | null;
}

export interface SyncResults {
  profile: boolean;
  recentScores: number;
  favorites: number;
  scenariosPlayed: number;
}

export class KovaaksService {
  // Validate a Kovaaks username and save profile
  static async validateUsername(
    username: string
  ): Promise<{ valid: boolean; profile?: KovaaksProfile; error?: string }> {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        return { valid: false, error: 'Not authenticated' };
      }

      const { data, error } = await supabase.functions.invoke(EDGE_FUNCTION_NAME, {
        body: { action: 'validate', username },
      });

      if (error) {
        console.error('Validate error:', error);
        return { valid: false, error: error.message };
      }

      return data;
    } catch (err: any) {
      console.error('Validate exception:', err);
      return { valid: false, error: err.message };
    }
  }

  // Run a full sync of all Kovaaks data
  static async fullSync(
    username: string
  ): Promise<{ success: boolean; results?: SyncResults; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke(EDGE_FUNCTION_NAME, {
        body: { action: 'full_sync', username },
      });

      if (error) {
        console.error('Sync error:', error);
        return { success: false, error: error.message };
      }

      return data;
    } catch (err: any) {
      console.error('Sync exception:', err);
      return { success: false, error: err.message };
    }
  }

  // Get the current sync status from the database
  static async getSyncStatus(
    userId: string
  ): Promise<{
    connected: boolean;
    username: string | null;
    lastSynced: string | null;
    syncStatus: string | null;
  }> {
    try {
      const { data } = await supabase
        .from('kovaaks_profiles')
        .select('username, last_synced_at, sync_status')
        .eq('user_id', userId)
        .maybeSingle();

      return {
        connected: !!data?.username,
        username: data?.username || null,
        lastSynced: data?.last_synced_at || null,
        syncStatus: data?.sync_status || null,
      };
    } catch {
      return { connected: false, username: null, lastSynced: null, syncStatus: null };
    }
  }
}
