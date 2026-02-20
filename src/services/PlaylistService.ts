import { supabase } from '../lib/supabase';

const EDGE_FUNCTION = 'Kovaaks-playlists';

export interface PlaylistSearchResult {
  playlistName: string;
  playlistCode: string;
  playlistId: number;
  description: string;
  aimType: string;
  subscribers: number;
  playlistDuration: number;
  steamAccountName: string;
  webappUsername: string;
  scenarioList: {
    scenarioName: string;
    aimType: string;
    playCount: number;
    author: string;
  }[];
}

export interface TrainingProgram {
  id: string;
  program_name: string;
  description: string;
  source_type: string;
  playlist_code: string;
  playlist_author: string;
  aim_type: string;
  subscribers: number;
  playlist_duration: number;
  is_active: boolean;
  is_completed: boolean;
  scenario_count: number;
  scenarios_data: any[];
  created_at: string;
}

export interface ScenarioCompletion {
  id: string;
  scenario_name: string;
  status: string;
  notes: string | null;
  completed_at: string | null;
}

export class PlaylistService {
  static async searchPlaylists(query: string, page = 0, max = 20): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke(EDGE_FUNCTION, {
        body: { action: 'search_playlists', query, page, max },
      });
      if (error) return { success: false, error: error.message };
      return data;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async getPlaylistByCode(code: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke(EDGE_FUNCTION, {
        body: { action: 'get_playlist', code },
      });
      if (error) return { success: false, error: error.message };
      return data;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async importPlaylist(playlistData: PlaylistSearchResult): Promise<{ success: boolean; programId?: string; scenarioCount?: number; error?: string; message?: string }> {
    try {
      const { data, error } = await supabase.functions.invoke(EDGE_FUNCTION, {
        body: { action: 'import_playlist', playlistData },
      });
      if (error) return { success: false, error: error.message };
      return data;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  static async syncProgramScores(scenarioNames: string[]): Promise<{
    success: boolean;
    data?: { synced: number; errors: number; matched: number; total: number; notFound: string[] };
    error?: string;
  }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { success: false, error: 'Not authenticated' };

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kovaaks-scores`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            action: 'sync_program_scores',
            scenarioNames,
          }),
        }
      );

      const result = await response.json();
      if (result.success) {
        return { success: true, data: result };
      }
      return { success: false, error: result.error || 'Sync failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  }

  static async getActiveProgram(userId: string): Promise<TrainingProgram | null> {
    const { data, error } = await supabase
      .from('training_programs')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle();
    if (error || !data) return null;
    return data;
  }

  static async getUserPrograms(userId: string): Promise<TrainingProgram[]> {
    const { data, error } = await supabase
      .from('training_programs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
  }

  static async getCompletions(programId: string): Promise<ScenarioCompletion[]> {
    const { data, error } = await supabase
      .from('program_scenario_completions')
      .select('*')
      .eq('program_id', programId);
    if (error) return [];
    return data || [];
  }

  static async updateCompletion(userId: string, programId: string, scenarioName: string, status: string, notes?: string): Promise<boolean> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (status === 'completed') updateData.completed_at = new Date().toISOString();
    if (status === 'pending') updateData.completed_at = null;
    if (notes !== undefined) updateData.notes = notes;

    const { error } = await supabase
      .from('program_scenario_completions')
      .update(updateData)
      .eq('user_id', userId)
      .eq('program_id', programId)
      .eq('scenario_name', scenarioName);
    return !error;
  }

  static async setActiveProgram(userId: string, programId: string): Promise<boolean> {
    await supabase
      .from('training_programs')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    const { error } = await supabase
      .from('training_programs')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('id', programId)
      .eq('user_id', userId);
    return !error;
  }

  static async deleteProgram(userId: string, programId: string): Promise<boolean> {
    const { error } = await supabase
      .from('training_programs')
      .delete()
      .eq('id', programId)
      .eq('user_id', userId);
    return !error;
  }
}
