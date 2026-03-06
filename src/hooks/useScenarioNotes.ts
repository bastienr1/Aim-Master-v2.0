import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ScenarioNote {
  scenario_name: string;
  notes: string | null;
  notes_updated_at: string | null;
}

interface UseScenarioNotesReturn {
  notes: Map<string, string>;
  loading: boolean;
  saving: boolean;
  getNote: (scenarioName: string) => string;
  updateNote: (scenarioName: string, text: string) => void;
  hasNote: (scenarioName: string) => boolean;
  noteCount: number;
}

export function useScenarioNotes(
  userId: string | undefined,
  programId: string | undefined
): UseScenarioNotesReturn {
  const [notes, setNotes] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    if (!userId || !programId) return;

    const fetchNotes = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('program_scenario_completions')
          .select('scenario_name, notes, notes_updated_at')
          .eq('user_id', userId)
          .eq('program_id', programId)
          .not('notes', 'is', null);

        if (!error && data) {
          const noteMap = new Map<string, string>();
          data.forEach((row: ScenarioNote) => {
            if (row.notes) noteMap.set(row.scenario_name, row.notes);
          });
          setNotes(noteMap);
        }
      } catch (e) {
        console.error('Failed to fetch scenario notes:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();

    return () => {
      saveTimers.current.forEach(timer => clearTimeout(timer));
    };
  }, [userId, programId]);

  const saveNote = useCallback(async (scenarioName: string, text: string) => {
    if (!userId || !programId) return;

    setSaving(true);
    try {
      const noteValue = text.trim() === '' ? null : text.trim();
      const { error } = await supabase
        .from('program_scenario_completions')
        .update({
          notes: noteValue,
          notes_updated_at: noteValue ? new Date().toISOString() : null,
        })
        .eq('user_id', userId)
        .eq('program_id', programId)
        .eq('scenario_name', scenarioName);

      if (error) {
        console.error('Failed to save scenario note:', error);
      }
    } catch (e) {
      console.error('Save note error:', e);
    } finally {
      setSaving(false);
    }
  }, [userId, programId]);

  const updateNote = useCallback((scenarioName: string, text: string) => {
    setNotes(prev => {
      const next = new Map(prev);
      if (text.trim() === '') {
        next.delete(scenarioName);
      } else {
        next.set(scenarioName, text);
      }
      return next;
    });

    const existingTimer = saveTimers.current.get(scenarioName);
    if (existingTimer) clearTimeout(existingTimer);

    const timer = setTimeout(() => {
      saveNote(scenarioName, text);
      saveTimers.current.delete(scenarioName);
    }, 800);
    saveTimers.current.set(scenarioName, timer);
  }, [saveNote]);

  const getNote = useCallback((scenarioName: string) => {
    return notes.get(scenarioName) || '';
  }, [notes]);

  const hasNote = useCallback((scenarioName: string) => {
    return notes.has(scenarioName) && (notes.get(scenarioName) || '').trim() !== '';
  }, [notes]);

  const noteCount = notes.size;

  return { notes, loading, saving, getNote, updateNote, hasNote, noteCount };
}
