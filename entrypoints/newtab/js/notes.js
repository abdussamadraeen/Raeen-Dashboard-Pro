import { StorageManager } from './storage.js';
import { dom } from './dom.js';
import { escapeHTML } from './security.js';

let currentNoteId = null;

export async function renderNotesList() {
    if (!dom.notesList) return;
    
    // Fallback if storage isn't ready yet
    if (!StorageManager.isReady()) {
        dom.notesList.innerHTML = '<div class="notes-empty">Initializing storage...</div>';
        return;
    }

    const notes = (await StorageManager.getAll('notes')) || [];
    if (dom.notesCount) dom.notesCount.textContent = notes.length;

    if (notes.length === 0) {
        dom.notesList.innerHTML = '<div class="notes-empty">No notes yet. Click + New to start.</div>';
        return;
    }

    dom.notesList.innerHTML = notes.sort((a, b) => (b.updated || 0) - (a.updated || 0)).map(n => `
        <div class="note-card" data-id="${n.id}">
            <div class="note-card-title">${escapeHTML(n.title) || 'Untitled Note'}</div>
            <div class="note-card-preview">${n.body ? escapeHTML(n.body.substring(0, 60).replace(/\n/g, ' ')) : 'Empty note...'}</div>
            <div class="note-card-meta">${new Date(n.updated || Date.now()).toLocaleDateString()}</div>
        </div>
    `).join('');

    // Event delegation: Attach click listener to the list container once
    if (!dom.notesList._hasListener) {
        dom.notesList._hasListener = true;
        dom.notesList.onclick = (e) => {
            const card = e.target.closest('.note-card');
            if (card) {
                openNoteEditor(card.dataset.id);
            }
        };
    }
}

export async function openNoteEditor(id = null) {
    currentNoteId = id || 'note_' + Date.now();
    let note = (id ? await StorageManager.get('notes', id) : null) || { id: currentNoteId, title: '', body: '', updated: Date.now() };

    if (dom.noteEditorTitle) dom.noteEditorTitle.value = note.title || '';
    if (dom.noteEditorBody) dom.noteEditorBody.value = note.body || '';
    if (dom.noteSaveStatus) {
        dom.noteSaveStatus.textContent = id ? 'Last saved ' + new Date(note.updated).toLocaleTimeString() : 'New note';
        dom.noteSaveStatus.style.color = '';
    }

    if (dom.noteEditor) dom.noteEditor.classList.remove('hidden');
    if (dom.notesList) dom.notesList.classList.add('hidden');
    if (dom.noteEditorBody) dom.noteEditorBody.focus();
    updateCharCount();
}

export function updateCharCount() {
    if (!dom.noteEditorBody || !dom.noteCharCount) return;
    const count = dom.noteEditorBody.value.length;
    dom.noteCharCount.textContent = `${count} character${count === 1 ? '' : 's'}`;
}

export async function saveCurrentNote() {
    if (!currentNoteId || !dom.noteEditorTitle || !dom.noteEditorBody) return;
    
    const title = dom.noteEditorTitle.value.trim();
    const body = dom.noteEditorBody.value;

    // Show saving status
    if (dom.noteSaveStatus) {
        dom.noteSaveStatus.textContent = 'Saving...';
        dom.noteSaveStatus.style.opacity = '0.7';
    }

    try {
        const note = {
            id: currentNoteId,
            title: title || (body ? body.substring(0, 20) + '...' : 'Untitled Note'),
            body: body,
            updated: Date.now()
        };

        await StorageManager.set('notes', currentNoteId, note);
        
        if (dom.noteSaveStatus) {
            dom.noteSaveStatus.textContent = 'Saved ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            dom.noteSaveStatus.style.opacity = '1';
            dom.noteSaveStatus.style.color = '';
        }
        
        // Only refresh the background list DOM if it's currently visible
        if (dom.notesList && !dom.notesList.classList.contains('hidden')) {
            renderNotesList();
        }
    } catch (e) {
        console.error("Failed to save note:", e);
        if (dom.noteSaveStatus) {
            dom.noteSaveStatus.textContent = 'Error saving!';
            dom.noteSaveStatus.style.color = 'var(--danger)';
        }
    }
}

export async function deleteCurrentNote() {
    if (!currentNoteId) return;
    if (confirm('Are you sure you want to delete this note?')) {
        await StorageManager.remove('notes', currentNoteId);
        closeNoteEditor();
        renderNotesList();
    }
}

export function closeNoteEditor() {
    if (dom.noteEditor) dom.noteEditor.classList.add('hidden');
    if (dom.notesList) dom.notesList.classList.remove('hidden');
    currentNoteId = null;
    renderNotesList();
}
