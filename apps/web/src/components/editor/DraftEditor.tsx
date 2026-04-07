'use client';
// ============================================================
// LexAI India — TipTap Draft Editor
// PRD v1.1 DW-01 to DW-04
// ============================================================

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import CharacterCount from '@tiptap/extension-character-count';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Bold, Italic, UnderlineIcon, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Undo, Redo, Wand2, Save, Loader2, CheckCircle2
} from 'lucide-react';

interface DraftEditorProps {
  draftId: string;
  caseId: string;
  initialContent: any;
  title: string;
  token: string;
  onSave?: (wordCount: number) => void;
}

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function DraftEditor({ draftId, caseId, initialContent, title, token, onSave }: DraftEditorProps) {
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{ original: string; suggestion: string } | null>(null);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  // Convert stored content to TipTap format
  const getInitialContent = () => {
    if (!initialContent) return '<p></p>';
    if (typeof initialContent === 'string') return `<p>${initialContent}</p>`;
    // If it's a TipTap JSON doc
    if (initialContent?.type === 'doc') return initialContent;
    // If it's plain text from agent output
    const text = initialContent?.content?.[0]?.content?.[0]?.text || '';
    if (text) {
      // Convert line breaks to paragraphs
      return text.split('\n').filter(Boolean).map((line: string) => `<p>${line}</p>`).join('');
    }
    return '<p></p>';
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      CharacterCount,
      Placeholder.configure({ placeholder: 'Start drafting your legal document...' }),
    ],
    content: getInitialContent(),
    onUpdate: () => {
      setSaveState('unsaved');
      // Auto-save after 2 seconds of inactivity
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        handleSave();
      }, 2000);
    },
  });

  const handleSave = useCallback(async () => {
    if (!editor) return;
    setSaveState('saving');
    try {
      const json = editor.getJSON();
      const wordCount = editor.storage.characterCount?.words() || 0;
      await fetch(`${BASE}/v1/drafts/${draftId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: json }),
      });
      setSaveState('saved');
      onSave?.(wordCount);
    } catch {
      setSaveState('unsaved');
    }
  }, [editor, draftId, token, onSave]);

  // AI Writing Assist
  const handleAiAssist = async () => {
    if (!editor || !aiInstruction.trim()) return;
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    if (!selectedText.trim()) {
      alert('Please select some text first, then describe what you want to change.');
      return;
    }
    setAiLoading(true);
    try {
      const res = await fetch(`${BASE}/v1/drafts/${draftId}/ai-assist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ selected_text: selectedText, instruction: aiInstruction }),
      });
      const json = await res.json();
      if (json.data?.suggestion) {
        setAiSuggestion({ original: selectedText, suggestion: json.data.suggestion });
      }
    } catch {}
    setAiLoading(false);
  };

  const acceptSuggestion = () => {
    if (!editor || !aiSuggestion) return;
    // Find and replace the selected text with suggestion
    const content = editor.getHTML();
    editor.commands.setContent(content.replace(
      aiSuggestion.original,
      aiSuggestion.suggestion
    ));
    setAiSuggestion(null);
    setAiInstruction('');
    setSaveState('unsaved');
  };

  if (!editor) return <div className="h-96 bg-gray-50 rounded-xl animate-pulse" />;

  const wordCount = editor.storage.characterCount?.words() || 0;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-3 py-2 border-b border-gray-100 bg-gray-50 rounded-t-xl flex-wrap">
        <button onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('bold') ? 'bg-gray-200' : ''}`}>
          <Bold size={14} />
        </button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('italic') ? 'bg-gray-200' : ''}`}>
          <Italic size={14} />
        </button>
        <button onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('underline') ? 'bg-gray-200' : ''}`}>
          <UnderlineIcon size={14} />
        </button>
        <div className="w-px h-4 bg-gray-300 mx-1" />
        <button onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive({ textAlign: 'left' }) ? 'bg-gray-200' : ''}`}>
          <AlignLeft size={14} />
        </button>
        <button onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive({ textAlign: 'center' }) ? 'bg-gray-200' : ''}`}>
          <AlignCenter size={14} />
        </button>
        <button onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive({ textAlign: 'right' }) ? 'bg-gray-200' : ''}`}>
          <AlignRight size={14} />
        </button>
        <div className="w-px h-4 bg-gray-300 mx-1" />
        <button onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('bulletList') ? 'bg-gray-200' : ''}`}>
          <List size={14} />
        </button>
        <button onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-1.5 rounded hover:bg-gray-200 transition-colors ${editor.isActive('orderedList') ? 'bg-gray-200' : ''}`}>
          <ListOrdered size={14} />
        </button>
        <div className="w-px h-4 bg-gray-300 mx-1" />
        <button onClick={() => editor.chain().focus().undo().run()}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors">
          <Undo size={14} />
        </button>
        <button onClick={() => editor.chain().focus().redo().run()}
          className="p-1.5 rounded hover:bg-gray-200 transition-colors">
          <Redo size={14} />
        </button>
        <div className="flex-1" />
        {/* Save status */}
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          {saveState === 'saving' && <><Loader2 size={12} className="animate-spin" /> Saving...</>}
          {saveState === 'saved' && <><CheckCircle2 size={12} className="text-green-500" /> Saved</>}
          {saveState === 'unsaved' && 'Unsaved'}
        </div>
        <button onClick={handleSave}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white rounded-lg ml-2"
          style={{ backgroundColor: '#1E3A5F' }}>
          <Save size={12} /> Save
        </button>
        <span className="text-xs text-gray-400 ml-2">{wordCount} words</span>
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent
          editor={editor}
          className="prose prose-sm max-w-none p-6 min-h-[400px] focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[400px]"
        />
      </div>

      {/* AI Writing Assist bar */}
      <div className="border-t border-gray-100 p-3 bg-gray-50 rounded-b-xl">
        <div className="flex items-center gap-2">
          <Wand2 size={14} className="text-purple-500 flex-shrink-0" />
          <input
            type="text"
            value={aiInstruction}
            onChange={e => setAiInstruction(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAiAssist()}
            placeholder="Select text above, then describe what to change (e.g. 'make more formal', 'add legal citations')"
            className="flex-1 text-xs px-2.5 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-300 bg-white"
          />
          <button onClick={handleAiAssist} disabled={aiLoading || !aiInstruction.trim()}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white rounded-lg disabled:opacity-50"
            style={{ backgroundColor: '#7C3AED' }}>
            {aiLoading ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
            Rewrite
          </button>
        </div>

        {/* AI Suggestion */}
        {aiSuggestion && (
          <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-xs font-medium text-purple-700 mb-2">AI suggestion:</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{aiSuggestion.suggestion}</p>
            <div className="flex gap-2 mt-3">
              <button onClick={acceptSuggestion}
                className="px-3 py-1.5 text-xs font-medium text-white rounded-lg"
                style={{ backgroundColor: '#7C3AED' }}>
                Accept
              </button>
              <button onClick={() => setAiSuggestion(null)}
                className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-white">
                Discard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
