import React, { useState, useRef, useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Minus,
  Eye,
  FileCode,
  Edit3,
  Plus,
  Layers,
  Undo2,
  Redo2,
  HelpCircle,
  Megaphone
} from 'lucide-react';

import {
  ShortcodeItem,
  DEFAULT_SHORTCODES,
  renderShortcodesInHtml
} from '../lib/cmsStore';

interface WordPressEditorProps {
  value: string;
  onChange: (nextHtml: string) => void;
  label?: string;
  placeholder?: string;
  minHeight?: string;
  shortcodes?: ShortcodeItem[];
}

type EditorTab = 'visual' | 'code' | 'preview';

export default function WordPressEditor({
  value,
  onChange,
  label = 'WordPress Visual & HTML Editor',
  placeholder = 'Start writing or click + to insert blocks, headings, images, tables, shortcodes, or multi-tab content switchers...',
  minHeight = '320px',
  shortcodes = DEFAULT_SHORTCODES
}: WordPressEditorProps) {
  const [activeTab, setActiveTab] = useState<EditorTab>('visual');
  const [showLinkInput, setShowLinkInput] = useState<boolean>(false);
  const [linkUrl, setLinkUrl] = useState<string>('https://');
  const [linkText, setLinkText] = useState<string>('');

  const [showImageInput, setShowImageInput] = useState<boolean>(false);
  const [imageUrl, setImageUrl] = useState<string>('https://');
  const [imageAlt, setImageAlt] = useState<string>('Document illustration');

  const visualRef = useRef<HTMLDivElement | null>(null);

  // Sync external value changes into the contentEditable container when not actively focused
  useEffect(() => {
    if (activeTab === 'visual' && visualRef.current) {
      if (document.activeElement !== visualRef.current && visualRef.current.innerHTML !== value) {
        visualRef.current.innerHTML = value || '';
      }
    }
  }, [value, activeTab]);

  const syncFromVisual = () => {
    if (visualRef.current) {
      onChange(visualRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, arg?: string) => {
    if (activeTab !== 'visual') {
      setActiveTab('visual');
      setTimeout(() => {
        visualRef.current?.focus();
        document.execCommand(command, false, arg);
        syncFromVisual();
      }, 30);
      return;
    }
    visualRef.current?.focus();
    document.execCommand(command, false, arg);
    syncFromVisual();
  };

  const insertHtmlSnippet = (snippet: string) => {
    if (activeTab === 'visual' && visualRef.current) {
      visualRef.current.focus();
      const success = document.execCommand('insertHTML', false, snippet);
      if (!success) {
        visualRef.current.innerHTML += snippet;
      }
      syncFromVisual();
    } else {
      onChange((value || '') + '\n' + snippet);
    }
  };

  const handleInsertLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!linkUrl.trim()) return;
    const labelStr = linkText.trim() || linkUrl.trim();
    insertHtmlSnippet(
      `<a href="${linkUrl.trim()}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline font-medium">${labelStr}</a>`
    );
    setShowLinkInput(false);
    setLinkUrl('https://');
    setLinkText('');
  };

  const handleInsertImage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) return;
    insertHtmlSnippet(
      `<figure class="my-4"><img src="${imageUrl.trim()}" alt="${imageAlt.trim()}" referrerpolicy="no-referrer" class="max-w-full h-auto rounded-lg border border-slate-200" /><figcaption class="text-xs text-slate-500 mt-1">${imageAlt.trim()}</figcaption></figure>`
    );
    setShowImageInput(false);
    setImageUrl('https://');
  };

  // WordPress Gutenberg Block Presets
  const insertMultiContentSwitcherBlock = () => {
    const switcherHtml = `
<div class="my-6 p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
  <div class="text-xs font-mono font-bold text-blue-600 uppercase">Interactive Content Switcher</div>
  <h3 class="text-lg font-bold text-slate-900">Compare Download Methods & Features</h3>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <div class="p-4 bg-white border border-slate-200 rounded-lg">
      <h4 class="font-bold text-slate-900 text-sm mb-1">01. Standard PDF Export</h4>
      <p class="text-xs text-slate-600">Automatically extracts all original page scans and compiles them into a single offline PDF document.</p>
    </div>
    <div class="p-4 bg-white border border-slate-200 rounded-lg">
      <h4 class="font-bold text-slate-900 text-sm mb-1">02. Fullscreen Vector Reader</h4>
      <p class="text-xs text-slate-600">Opens the unblurred original document stream in fullscreen for native vector printing.</p>
    </div>
    <div class="p-4 bg-white border border-slate-200 rounded-lg">
      <h4 class="font-bold text-slate-900 text-sm mb-1">03. Multi-Gateway Proxy</h4>
      <p class="text-xs text-slate-600">Races 5 independent proxy gateways simultaneously so document loading is never rate-limited.</p>
    </div>
  </div>
</div>`;
    insertHtmlSnippet(switcherHtml);
  };

  const insertFaqAccordionBlock = () => {
    const faqHtml = `
<div class="my-6 space-y-3">
  <h3 class="text-lg font-bold text-slate-900">Frequently Asked Questions (FAQ)</h3>
  <details class="p-4 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer" open>
    <summary class="font-semibold text-slate-900 text-sm">Is this Scribd PDF Downloader completely free?</summary>
    <p class="text-xs text-slate-600 mt-2 leading-relaxed">Yes, you can fetch unlimited pages and compile full high-resolution PDF files at zero cost without registering an account.</p>
  </details>
  <details class="p-4 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer">
    <summary class="font-semibold text-slate-900 text-sm">Why do all pages load with page numbers before download?</summary>
    <p class="text-xs text-slate-600 mt-2 leading-relaxed">Our engine verifies every page's JSONP manifest and high-resolution scan hash (Page 1 to Page N) so no page is ever blank.</p>
  </details>
</div>`;
    insertHtmlSnippet(faqHtml);
  };

  const insertTableBlock = () => {
    const tableHtml = `
<div class="my-5 overflow-x-auto">
  <table class="w-full text-left border-collapse border border-slate-200 text-xs">
    <thead>
      <tr class="bg-slate-100 text-slate-800 font-bold">
        <th class="p-3 border border-slate-200">Feature</th>
        <th class="p-3 border border-slate-200">Standard Downloader</th>
        <th class="p-3 border border-slate-200">Our 24x Parallel Engine</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="p-3 border border-slate-200 font-medium">Page Detection</td>
        <td class="p-3 border border-slate-200">First 3–5 Preview Pages Only</td>
        <td class="p-3 border border-slate-200 text-emerald-700 font-semibold">100% Full Pages (Page 1 to Page N)</td>
      </tr>
      <tr>
        <td class="p-3 border border-slate-200 font-medium">Download Speed</td>
        <td class="p-3 border border-slate-200">Slow Sequential (60+ sec)</td>
        <td class="p-3 border border-slate-200 text-emerald-700 font-semibold">Ultra-Fast 24x Parallel Streams</td>
      </tr>
    </tbody>
  </table>
</div>`;
    insertHtmlSnippet(tableHtml);
  };

  const insertCalloutBlock = () => {
    const ctaHtml = `
<div class="my-5 p-5 bg-blue-50 border border-blue-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
  <div>
    <h4 class="text-sm font-bold text-slate-900">Ready to Download Your Scribd Document?</h4>
    <p class="text-xs text-slate-600 mt-0.5">Paste your document link in the top search bar and click Fetch to unlock all pages.</p>
  </div>
  <a href="#downloader" class="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg no-underline shrink-0">Go to Downloader ↑</a>
</div>`;
    insertHtmlSnippet(ctaHtml);
  };

  // Calculate live word & character count
  const plainText = (value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = plainText ? plainText.split(' ').length : 0;

  return (
    <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-2xs">
      {/* Top WordPress Header Bar: Label + Visual / Code / Preview Mode Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-slate-900 text-white">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <Edit3 className="w-3.5 h-3.5 text-blue-400" />
          <span>{label}</span>
        </div>

        <div className="flex items-center gap-1 bg-slate-800 p-0.5 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('visual')}
            className={`px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'visual'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Edit3 className="w-3 h-3" />
            <span>Visual Editor</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'code'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <FileCode className="w-3 h-3" />
            <span>Code (HTML)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'preview'
                ? 'bg-blue-600 text-white font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Live Preview</span>
          </button>
        </div>
      </div>

      {/* WordPress Formatting & Gutenberg Block Toolbar */}
      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-1">
        {/* Undo / Redo */}
        <button
          type="button"
          title="Undo"
          onClick={() => execCommand('undo')}
          className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Redo"
          onClick={() => execCommand('redo')}
          className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>

        <span className="h-4 w-px bg-slate-300 mx-1" />

        {/* Headings */}
        <button
          type="button"
          title="Heading 1"
          onClick={() => execCommand('formatBlock', 'H1')}
          className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
        >
          <Heading1 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Heading 2"
          onClick={() => execCommand('formatBlock', 'H2')}
          className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
        >
          <Heading2 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Heading 3"
          onClick={() => execCommand('formatBlock', 'H3')}
          className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
        >
          <Heading3 className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Paragraph"
          onClick={() => execCommand('formatBlock', 'P')}
          className="px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
        >
          ¶ Para
        </button>

        <span className="h-4 w-px bg-slate-300 mx-1" />

        {/* Inline Formatting */}
        <button
          type="button"
          title="Bold (Ctrl+B)"
          onClick={() => execCommand('bold')}
          className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
        >
          <Bold className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Italic (Ctrl+I)"
          onClick={() => execCommand('italic')}
          className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
        >
          <Italic className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Underline (Ctrl+U)"
          onClick={() => execCommand('underline')}
          className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
        >
          <Underline className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Strikethrough"
          onClick={() => execCommand('strikeThrough')}
          className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </button>

        <span className="h-4 w-px bg-slate-300 mx-1" />

        {/* Alignment */}
        <button
          type="button"
          title="Align Left"
          onClick={() => execCommand('justifyLeft')}
          className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
        >
          <AlignLeft className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Align Center"
          onClick={() => execCommand('justifyCenter')}
          className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
        >
          <AlignCenter className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Align Right"
          onClick={() => execCommand('justifyRight')}
          className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
        >
          <AlignRight className="w-3.5 h-3.5" />
        </button>

        <span className="h-4 w-px bg-slate-300 mx-1" />

        {/* Lists & Quote */}
        <button
          type="button"
          title="Bullet List"
          onClick={() => execCommand('insertUnorderedList')}
          className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Numbered List"
          onClick={() => execCommand('insertOrderedList')}
          className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Blockquote"
          onClick={() => execCommand('formatBlock', 'BLOCKQUOTE')}
          className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
        >
          <Quote className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Horizontal Divider"
          onClick={() => execCommand('insertHorizontalRule')}
          className="p-1.5 text-slate-700 hover:bg-slate-200 rounded cursor-pointer"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <span className="h-4 w-px bg-slate-300 mx-1" />

        {/* Link & Image Popovers */}
        <button
          type="button"
          title="Insert Link"
          onClick={() => {
            setShowLinkInput((prev) => !prev);
            setShowImageInput(false);
          }}
          className={`p-1.5 rounded cursor-pointer ${
            showLinkInput ? 'bg-blue-100 text-blue-700' : 'text-slate-700 hover:bg-slate-200'
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Insert Image"
          onClick={() => {
            setShowImageInput((prev) => !prev);
            setShowLinkInput(false);
          }}
          className={`p-1.5 rounded cursor-pointer ${
            showImageInput ? 'bg-blue-100 text-blue-700' : 'text-slate-700 hover:bg-slate-200'
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* WordPress Gutenberg Quick-Insert Blocks Bar */}
      <div className="px-3 py-1.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="font-semibold text-slate-600 flex items-center gap-1 mr-1">
          <Plus className="w-3 h-3 text-blue-600" />
          <span>Insert Gutenberg Block:</span>
        </span>

        <button
          type="button"
          onClick={insertMultiContentSwitcherBlock}
          className="px-2 py-1 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded flex items-center gap-1 font-medium cursor-pointer"
        >
          <Layers className="w-3 h-3 text-blue-600" />
          <span>Multi-Content Switcher Grid</span>
        </button>

        <button
          type="button"
          onClick={insertFaqAccordionBlock}
          className="px-2 py-1 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded flex items-center gap-1 font-medium cursor-pointer"
        >
          <HelpCircle className="w-3 h-3 text-emerald-600" />
          <span>FAQ Accordion</span>
        </button>

        <button
          type="button"
          onClick={insertTableBlock}
          className="px-2 py-1 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded flex items-center gap-1 font-medium cursor-pointer"
        >
          <TableIcon className="w-3 h-3 text-purple-600" />
          <span>Comparison Table</span>
        </button>

        <button
          type="button"
          onClick={insertCalloutBlock}
          className="px-2 py-1 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded flex items-center gap-1 font-medium cursor-pointer"
        >
          <Megaphone className="w-3 h-3 text-amber-600" />
          <span>CTA Callout Box</span>
        </button>

        <button
          type="button"
          onClick={() =>
            insertHtmlSnippet(
              `<pre class="p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-xs overflow-x-auto my-3"><code>// Custom Code Snippet</code></pre>`
            )
          }
          className="px-2 py-1 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded flex items-center gap-1 font-medium cursor-pointer"
        >
          <Code className="w-3 h-3 text-slate-700" />
          <span>Code Block</span>
        </button>
      </div>

      {/* Custom Shortcodes Quick-Insert Bar */}
      {shortcodes && shortcodes.length > 0 && (
        <div className="px-3 py-1.5 bg-indigo-50/70 border-b border-slate-200 flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="font-semibold text-indigo-900 flex items-center gap-1 mr-1 font-mono">
            <span>[Shortcodes]:</span>
          </span>
          {shortcodes
            .filter((sc) => sc.enabled)
            .map((sc) => (
              <button
                key={sc.id}
                type="button"
                title={`Insert [${sc.tag}] — ${sc.name}`}
                onClick={() => insertHtmlSnippet(`<p>[${sc.tag}]</p>`)}
                className="px-2 py-0.5 bg-white hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 rounded font-mono text-[11px] font-semibold transition-colors cursor-pointer"
              >
                [{sc.tag}]
              </button>
            ))}
        </div>
      )}

      {/* Inline Link Inserter Bar */}
      {showLinkInput && (
        <form
          onSubmit={handleInsertLink}
          className="p-2.5 bg-blue-50 border-b border-blue-200 flex flex-wrap items-center gap-2 text-xs"
        >
          <input
            type="text"
            placeholder="Link Text (e.g. Official Guide)"
            value={linkText}
            onChange={(e) => setLinkText(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-300 rounded"
          />
          <input
            type="url"
            required
            placeholder="https://example.com"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className="flex-1 min-w-[200px] px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-blue-600 text-white font-semibold rounded cursor-pointer"
          >
            Insert Link
          </button>
          <button
            type="button"
            onClick={() => setShowLinkInput(false)}
            className="px-2 py-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Cancel
          </button>
        </form>
      )}

      {/* Inline Image Inserter Bar */}
      {showImageInput && (
        <form
          onSubmit={handleInsertImage}
          className="p-2.5 bg-blue-50 border-b border-blue-200 flex flex-wrap items-center gap-2 text-xs"
        >
          <input
            type="url"
            required
            placeholder="Image URL (https://...)"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="flex-1 min-w-[220px] px-2.5 py-1.5 bg-white border border-slate-300 rounded font-mono"
          />
          <input
            type="text"
            placeholder="Alt Text / Caption"
            value={imageAlt}
            onChange={(e) => setImageAlt(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-slate-300 rounded"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-blue-600 text-white font-semibold rounded cursor-pointer"
          >
            Insert Image
          </button>
          <button
            type="button"
            onClick={() => setShowImageInput(false)}
            className="px-2 py-1.5 text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Cancel
          </button>
        </form>
      )}

      {/* Editor Body Area */}
      {activeTab === 'visual' && (
        <div
          ref={visualRef}
          contentEditable
          suppressContentEditableWarning
          onInput={syncFromVisual}
          onBlur={syncFromVisual}
          data-placeholder={placeholder}
          style={{ minHeight }}
          className="p-5 focus:outline-none prose prose-slate max-w-none text-sm leading-relaxed overflow-y-auto"
        />
      )}

      {activeTab === 'code' && (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ minHeight }}
          className="w-full p-4 font-mono text-xs bg-slate-950 text-emerald-300 focus:outline-none leading-relaxed"
        />
      )}

      {activeTab === 'preview' && (
        <div
          style={{ minHeight }}
          className="p-6 bg-slate-50/50 prose prose-slate max-w-none text-sm leading-relaxed overflow-y-auto"
          dangerouslySetInnerHTML={{
            __html: value
              ? renderShortcodesInHtml(value, shortcodes)
              : `<p class="text-slate-400 italic">Nothing to preview yet. Switch to Visual or Code editor to add content.</p>`
          }}
        />
      )}

      {/* Bottom WordPress Status Bar */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <span>
          Mode: <strong className="uppercase text-slate-700">{activeTab}</strong> · Gutenberg HTML + Shortcodes Ready
        </span>
        <span>
          {wordCount} words · {(value || '').length} chars
        </span>
      </div>
    </div>
  );
}
