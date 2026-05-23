import React, { useState, useEffect, useRef } from 'react';
import { useDashboardStore, Note } from '../../../store/dashboardStore';
import { FileText, Plus, ChevronLeft, Trash2 } from 'lucide-react';

export const NotesWidget: React.FC = () => {
  const notes = useDashboardStore((state) => state.notes);
  const addNote = useDashboardStore((state) => state.addNote);
  const updateNote = useDashboardStore((state) => state.updateNote);
  const deleteNote = useDashboardStore((state) => state.deleteNote);

  const showCardNote = useDashboardStore((state) => state.settings.showCardNote);
  const showCards = useDashboardStore((state) => state.settings.showCards);
  const showMainUI = useDashboardStore((state) => state.settings.showMainUI);
  const backgroundType = useDashboardStore((state) => state.settings.backgroundType);

  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [editorTitle, setEditorTitle] = useState('');
  const [editorBody, setEditorBody] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const activeNote = notes.find(n => n.id === activeNoteId);

  // When activeNoteId changes, populate inputs
  useEffect(() => {
    if (activeNoteId && activeNote) {
      setEditorTitle(activeNote.title || '');
      setEditorBody(activeNote.body || '');
      setSaveStatus(`Saved ${new Date(activeNote.updated).toLocaleTimeString()}`);
    } else {
      setEditorTitle('');
      setEditorBody('');
      setSaveStatus('');
    }
  }, [activeNoteId]);

  // Debounced auto-save effect
  const triggerAutoSave = (title: string, body: string) => {
    if (!activeNoteId) return;
    setSaveStatus('Saving...');
    
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        await updateNote(activeNoteId, title, body);
        setSaveStatus(`Saved ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`);
      } catch (err) {
        console.error('Auto-save note failed:', err);
        setSaveStatus('Error saving!');
      }
    }, 400); // 400ms debounce
  };

  // Immediate save on component unmount or exit editor
  const saveImmediately = async () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    if (activeNoteId) {
      await updateNote(activeNoteId, editorTitle, editorBody);
    }
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEditorTitle(val);
    triggerAutoSave(val, editorBody);
  };

  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setEditorBody(val);
    triggerAutoSave(editorTitle, val);
  };

  const handleCreateNote = async () => {
    const id = await addNote('Untitled Note', '');
    setActiveNoteId(id);
  };

  const handleDeleteNote = async () => {
    if (!activeNoteId) return;
    if (window.confirm('Are you sure you want to delete this note?')) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      await deleteNote(activeNoteId);
      setActiveNoteId(null);
    }
  };

  const handleBackToList = async () => {
    await saveImmediately();
    setActiveNoteId(null);
  };

  // Ensure save on page close
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (activeNoteId) {
        updateNote(activeNoteId, editorTitle, editorBody);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [activeNoteId, editorTitle, editorBody, updateNote]);

  const isLive = backgroundType === 'google_dashboard' || backgroundType === 'bing_dashboard';
  const hideUI = isLive;

  if (hideUI || !showCards || !showCardNote || !showMainUI) {
    return null;
  }

  const charCount = editorBody.length;

  return (
    <div id="notes-widget" className="notes-panel glass-premium rounded-2xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden min-h-[240px] max-h-[280px] w-full transition-all duration-300">
      {!activeNoteId ? (
        <>
          <div className="notes-header flex justify-between items-center p-3 border-b border-white/10 shrink-0 bg-white/5">
            <div className="notes-header-left flex items-center gap-2">
              <FileText className="w-4 h-4 text-accent" />
              <span className="notes-title text-sm font-semibold text-white">Notes</span>
              <span id="notes-count" className="notes-count bg-accent text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                {notes.length}
              </span>
            </div>
            <button
              id="add-note-btn"
              onClick={handleCreateNote}
              className="notes-add-btn bg-gradient-to-r from-accent to-[#5643cc] text-white flex items-center gap-1 text-[11px] font-bold px-3 py-1.5 rounded-lg cursor-pointer hover:scale-105 active:scale-95 shadow-[0_2px_8px_var(--accent-glow)] transition-all duration-200"
            >
              <Plus className="w-3.5 h-3.5" />
              New Note
            </button>
          </div>

          <div id="notes-list" className="notes-list flex-1 overflow-y-auto p-2 flex flex-col gap-1">
            {notes.length === 0 ? (
              <div className="notes-empty flex flex-col items-center justify-center flex-1 p-5 text-white/50 text-xs text-center opacity-60">
                No notes yet. Click + New Note to start.
              </div>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => setActiveNoteId(note.id)}
                  className="note-card p-3 rounded-xl cursor-pointer hover:bg-white/10 hover:border-white/15 border border-transparent transition-all duration-200"
                >
                  <div className="note-card-title text-xs font-semibold text-white truncate">
                    {note.title || 'Untitled Note'}
                  </div>
                  <div className="note-card-preview text-[10px] text-white/60 truncate mt-0.5">
                    {note.body ? note.body.substring(0, 60).replace(/\n/g, ' ') : 'Empty note...'}
                  </div>
                  <div className="note-card-meta text-[9px] text-white/40 mt-1">
                    {new Date(note.updated).toLocaleDateString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <div id="note-editor" className="note-editor flex flex-col flex-1 overflow-hidden bg-white/5">
          <div className="note-editor-header flex justify-between items-center px-3 py-2 border-b border-white/10 shrink-0">
            <button
              id="note-back-btn"
              onClick={handleBackToList}
              className="note-back-btn text-accent hover:underline flex items-center text-xs font-bold bg-transparent border-none outline-none cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 mr-0.5 shrink-0" />
              Back
            </button>
            <span id="note-save-status" className="note-save-status text-[10px] text-white/50 italic select-none">
              {saveStatus}
            </span>
          </div>

          <input
            type="text"
            id="note-editor-title"
            value={editorTitle}
            onChange={handleTitleChange}
            placeholder="Title"
            className="note-editor-title w-full border-none bg-transparent text-white font-semibold text-sm px-4 pt-3 pb-1 outline-none placeholder-white/30"
          />

          <textarea
            id="note-editor-body"
            value={editorBody}
            onChange={handleBodyChange}
            placeholder="Type your notes here..."
            className="note-editor-body flex-1 w-full border-none bg-transparent text-white text-xs px-4 py-2 leading-relaxed outline-none resize-none overflow-y-auto placeholder-white/20"
          />

          <div className="note-editor-footer flex justify-between items-center px-3 py-1.5 border-t border-white/10 shrink-0">
            <span id="note-char-count" className="note-char-count text-[9px] text-white/40 font-semibold select-none">
              {charCount} character{charCount === 1 ? '' : 's'}
            </span>
            <button
              id="note-delete-btn"
              onClick={handleDeleteNote}
              className="note-delete-btn bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white border-none rounded-lg p-1.5 transition-all duration-200 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
