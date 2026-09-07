import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/** How the player classified a scenario note. Null = unclassified, renders neutral. */
export type NoteKind = 'mechanics' | 'mindset' | 'positive';

interface ScenarioNote {
  scenario_name: string;
  notes: string | null;
  notes_updated_at: string | null;
  note_kind: NoteKind | null;
}

interface UseScenarioNotesReturn {
  notes: Map<string, string>;
  loading: boolean;
  saving: boolean;
  getNote: (scenarioName: string) => string;
  updateNote: (scenarioName: string, text: string) => void;
  hasNote: (scenarioName: string) => boolean;
  noteCount: number;
  getNoteKind: (scenarioName: string) => NoteKind | null;
  updateNoteKind: (scenarioName: string, kind: NoteKind | null) => void;
}

export function useScenarioNotes(
  userId: string | undefined,
  programId: string | undefined
): UseScenarioNotesReturn {
  const [notes, setNotes] = useState<Map<string, string>>(new Map());
  const [noteKinds, setNoteKinds] = useState<Map<string, NoteKind>>(new Map());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const pendingNotes = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!userId || !programId) return;

    const fetchNotes = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('program_scenario_completions')
          .select('scenario_name, notes, notes_updated_at, note_kind')
          .eq('user_id', userId)
          .eq('program_id', programId)
          .or('notes.not.is.null,note_kind.not.is.null');

        if (!error && data) {
          const noteMap = new Map<string, string>();
          const kindMap = new Map<string, NoteKind>();
          data.forEach((row: ScenarioNote) => {
            if (row.notes) noteMap.set(row.scenario_name, row.notes);
            if (row.note_kind) kindMap.set(row.scenario_name, row.note_kind);
          });
          setNotes(noteMap);
          setNoteKinds(kindMap);
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

  // Flush pending notes on tab switch, page unload, or component unmount
  useEffect(() => {
    const flushAllPending = () => {
      pendingNotes.current.forEach((text, scenarioName) => {
        saveNote(scenarioName, text);
      });
      pendingNotes.current.clear();
      saveTimers.current.forEach(timer => clearTimeout(timer));
      saveTimers.current.clear();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushAllPending();
      }
    };

    window.addEventListener('beforeunload', flushAllPending);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', flushAllPending);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      flushAllPending();
    };
  }, [saveNote]);

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

    pendingNotes.current.set(scenarioName, text);

    const timer = setTimeout(() => {
      saveNote(scenarioName, text);
      saveTimers.current.delete(scenarioName);
      pendingNotes.current.delete(scenarioName);
    }, 800);
    saveTimers.current.set(scenarioName, timer);
  }, [saveNote]);

  const updateNoteKind = useCallback((scenarioName: string, kind: NoteKind | null) => {
    setNoteKinds(prev => {
      const next = new Map(prev);
      if (kind === null) {
        next.delete(scenarioName);
      } else {
        next.set(scenarioName, kind);
      }
      return next;
    });

    if (!userId || !programId) return;

    void (async () => {
      setSaving(true);
      try {
        const { error } = await supabase
          .from('program_scenario_completions')
          .update({ note_kind: kind })
          .eq('user_id', userId)
          .eq('program_id', programId)
          .eq('scenario_name', scenarioName);

        if (error) console.error('Failed to save note kind:', error);
      } catch (e) {
        console.error('Save note kind error:', e);
      } finally {
        setSaving(false);
      }
    })();
  }, [userId, programId]);

  const getNoteKind = useCallback((scenarioName: string) => {
    return noteKinds.get(scenarioName) ?? null;
  }, [noteKinds]);

  const getNote = useCallback((scenarioName: string) => {
    return notes.get(scenarioName) || '';
  }, [notes]);

  const hasNote = useCallback((scenarioName: string) => {
    return notes.has(scenarioName) && (notes.get(scenarioName) || '').trim() !== '';
  }, [notes]);

  const noteCount = notes.size;

  return {
    notes, loading, saving, getNote, updateNote, hasNote, noteCount,
    getNoteKind, updateNoteKind,
  };
}
