import React, { useState, useEffect } from 'react';
import {
  Key,
  Terminal,
  FileText,
  Copy,
  Check,
  RefreshCw,
  Plus,
  Trash2,
  ShieldCheck,
  Play,
  Download,
  ExternalLink,
  Code2,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  FolderArchive
} from 'lucide-react';
import {
  CmsStoreState,
  AdminApiConfig,
  AdminApiKeyItem,
  AdminDocumentRecord,
  DEFAULT_API_CONFIG,
  DEFAULT_ADMIN_DOCUMENTS
} from '../lib/cmsStore';
import {
  generateWordPressPluginZip,
  DEFAULT_WP_PLUGIN_CONFIG,
  WpPluginBuildConfig
} from '../lib/wpPluginBuilder';

interface AdminApiAndDocsPanelProps {
  cms: CmsStoreState;
  onUpdateCms: (next: CmsStoreState) => void;
  onLoadDocumentInViewer?: (url: string) => void;
  triggerSavedToast: (msg: string) => void;
}

type ActiveSubTab = 'wp-plugin' | 'documents-vault' | 'api-keys' | 'api-docs';
type CodeLang = 'curl' | 'javascript' | 'python' | 'php';

export const AdminApiAndDocsPanel: React.FC<AdminApiAndDocsPanelProps> = ({
  cms,
  onUpdateCms,
  onLoadDocumentInViewer,
  triggerSavedToast
}) => {
  const [subTab, setSubTab] = useState<ActiveSubTab>('wp-plugin');
  const [showMasterKey, setShowMasterKey] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [codeLang, setCodeLang] = useState<CodeLang>('curl');

  // Documents Vault Add State
  const [newDocUrl, setNewDocUrl] = useState('');
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [docError, setDocError] = useState<string | null>(null);

  // Live API Sandbox State
  const [sandboxEndpoint, setSandboxEndpoint] = useState<'/api/v1/resolve' | '/api/v1/status' | '/api/v1/documents'>('/api/v1/resolve');
  const [sandboxDocUrl, setSandboxDocUrl] = useState('https://www.scribd.com/document/991278283/2026-Grade-12-Investigation-Term-1');
  const [sandboxLoading, setSandboxLoading] = useState(false);
  const [sandboxResponse, setSandboxResponse] = useState<string | null>(null);
  const [sandboxStatus, setSandboxStatus] = useState<number | null>(null);

  const apiConfig: AdminApiConfig = cms.apiConfig || DEFAULT_API_CONFIG;
  const adminDocs: AdminDocumentRecord[] = cms.adminDocuments || DEFAULT_ADMIN_DOCUMENTS;

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  // WordPress Plugin (.zip) Builder Configuration State
  const [wpConfig, setWpConfig] = useState<WpPluginBuildConfig>(() => ({
    ...DEFAULT_WP_PLUGIN_CONFIG,
    remoteApiUrl: '',
    remoteApiKey: (cms.apiConfig || DEFAULT_API_CONFIG).masterApiKey,
    fetchBtnAdUrl: cms.readingAndLayout?.fetchButtonAdUrl || '',
    downloadBtnAdUrl: cms.readingAndLayout?.downloadButtonAdUrl || ''
  }));

  const handleDownloadWpPluginZip = () => {
    try {
      const zipBytes = generateWordPressPluginZip({
        ...wpConfig,
        remoteApiKey: wpConfig.remoteApiKey || apiConfig.masterApiKey
      });
      const blob = new Blob([zipBytes as unknown as BlobPart], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'scribd-downloader-pro.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      triggerSavedToast('Downloaded scribd-downloader-pro.zip (v3.0.0 Turbo) — Ready to upload in WordPress!');
    } catch (err) {
      triggerSavedToast('Error generating WordPress plugin zip.');
    }
  };

  // Sync API Config with Express Backend whenever apiConfig changes
  useEffect(() => {
    fetch('/api/admin/sync-api-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(apiConfig)
    }).catch(() => {
      // ignore offline sync error
    });
  }, [apiConfig]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const updateApiConfig = (patch: Partial<AdminApiConfig>, toastMsg?: string) => {
    const nextConfig: AdminApiConfig = {
      ...apiConfig,
      ...patch
    };
    onUpdateCms({
      ...cms,
      apiConfig: nextConfig
    });
    if (toastMsg) triggerSavedToast(toastMsg);
  };

  const generateRandomKey = (prefix: string) => {
    const chars = '0123456789abcdef';
    let randomPart = '';
    for (let i = 0; i < 24; i++) {
      randomPart += chars[Math.floor(Math.random() * chars.length)];
    }
    return `${prefix}_${randomPart}`;
  };

  const handleRotateMasterKey = () => {
    const rotated = generateRandomKey('sk_admin_master');
    updateApiConfig({ masterApiKey: rotated }, 'Master Admin API Key rotated!');
  };

  const handleCreateApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    const label = newKeyName.trim() || `Admin Key #${apiConfig.apiKeys.length + 1}`;
    const newItem: AdminApiKeyItem = {
      id: `key-${Date.now()}`,
      name: label,
      key: generateRandomKey('sk_admin_key'),
      createdAt: new Date().toISOString().slice(0, 10),
      active: true,
      requestsCount: 0
    };
    updateApiConfig(
      { apiKeys: [newItem, ...apiConfig.apiKeys] },
      `Created new Admin API Key: "${label}"`
    );
    setNewKeyName('');
  };

  const handleToggleKeyStatus = (id: string) => {
    const nextKeys = apiConfig.apiKeys.map((k) =>
      k.id === id ? { ...k, active: !k.active } : k
    );
    updateApiConfig({ apiKeys: nextKeys }, 'API key status updated.');
  };

  const handleDeleteApiKey = (id: string) => {
    const nextKeys = apiConfig.apiKeys.filter((k) => k.id !== id);
    updateApiConfig({ apiKeys: nextKeys }, 'API key revoked & deleted.');
  };

  // Add & Resolve Document into Admin Vault
  const handleAddDocumentToVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocUrl.trim()) return;
    setIsAddingDoc(true);
    setDocError(null);

    try {
      const resp = await fetch('/api/v1/resolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiConfig.masterApiKey
        },
        body: JSON.stringify({ url: newDocUrl.trim() })
      });
      const data = await resp.json();
      if (!resp.ok || !data.success || !data.document) {
        throw new Error(data.error || 'Failed to resolve document');
      }

      const doc = data.document;
      const newRecord: AdminDocumentRecord = {
        id: `doc-${Date.now()}`,
        docId: doc.id,
        title: doc.title,
        pageCount: doc.pageCount || (doc.pages ? doc.pages.length : 1),
        originalUrl: doc.originalUrl,
        embedUrl: doc.embedUrl,
        coverImageUrl: doc.pages?.[0]?.imageUrl || undefined,
        fetchedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        source: 'admin'
      };

      const filtered = adminDocs.filter((d) => d.docId !== newRecord.docId);
      onUpdateCms({
        ...cms,
        adminDocuments: [newRecord, ...filtered]
      });
      setNewDocUrl('');
      triggerSavedToast(`Document #${doc.id} ("${doc.title}") added to Admin Vault!`);
    } catch (err) {
      setDocError(err instanceof Error ? err.message : 'Could not resolve document URL');
    } finally {
      setIsAddingDoc(false);
    }
  };

  const handleDeleteDocumentRecord = (id: string) => {
    const nextDocs = adminDocs.filter((d) => d.id !== id);
    onUpdateCms({
      ...cms,
      adminDocuments: nextDocs
    });
    triggerSavedToast('Document removed from Admin Vault.');
  };

  // Run Live API Sandbox Test
  const handleRunSandboxTest = async () => {
    setSandboxLoading(true);
    setSandboxResponse(null);
    setSandboxStatus(null);

    try {
      let targetUrl = `${sandboxEndpoint}`;
      const options: RequestInit = {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiConfig.masterApiKey
        }
      };

      if (sandboxEndpoint === '/api/v1/resolve') {
        options.method = 'POST';
        options.body = JSON.stringify({ url: sandboxDocUrl.trim() });
      } else {
        options.method = 'GET';
      }

      const resp = await fetch(targetUrl, options);
      setSandboxStatus(resp.status);
      const data = await resp.json();
      setSandboxResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      setSandboxStatus(500);
      setSandboxResponse(
        JSON.stringify(
          { error: err instanceof Error ? err.message : 'Network error' },
          null,
          2
        )
      );
    } finally {
      setSandboxLoading(false);
    }
  };

  // Code Snippets Generator
  const getCodeSnippet = (lang: CodeLang): string => {
    const key = apiConfig.masterApiKey;
    const sampleDoc = 'https://www.scribd.com/document/991278283/2026-Grade-12-Investigation-Term-1';

    if (lang === 'curl') {
      return `# 1. Resolve Document Metadata & All Pages JSON (Admin API Key Required)
curl -X POST "${baseUrl}/api/v1/resolve" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${key}" \\
  -d '{"url": "${sampleDoc}"}'

# 2. Direct Multi-Page PDF Binary Download
curl -X POST "${baseUrl}/api/v1/download-pdf" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${key}" \\
  -d '{"url": "${sampleDoc}", "pageSize": "A4"}' \\
  --output document.pdf`;
    }

    if (lang === 'javascript') {
      return `// Admin-Only REST API — Resolve Scribd Document & Pages
const response = await fetch("${baseUrl}/api/v1/resolve", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "${key}"
  },
  body: JSON.stringify({
    url: "${sampleDoc}"
  })
});

const result = await response.json();
console.log("Total Pages:", result.document.pageCount);
console.log("Pages Array:", result.document.pages);`;
    }

    if (lang === 'python') {
      return `import requests

API_URL = "${baseUrl}/api/v1/resolve"
HEADERS = {
    "Content-Type": "application/json",
    "x-api-key": "${key}"
}

# 1. Extract all pages & metadata
resp = requests.post(API_URL, json={"url": "${sampleDoc}"}, headers=HEADERS)
data = resp.json()
print("Title:", data["document"]["title"])
print("Total Pages:", data["document"]["pageCount"])

# 2. Download compiled PDF
pdf_resp = requests.post(
    "${baseUrl}/api/v1/download-pdf",
    json={"url": "${sampleDoc}"},
    headers=HEADERS
)
with open("downloaded_scribd.pdf", "wb") as f:
    f.write(pdf_resp.content)`;
    }

    return `<?php
$ch = curl_init("${baseUrl}/api/v1/resolve");
$payload = json_encode([
    "url" => "${sampleDoc}"
]);

curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "x-api-key: ${key}"
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);
print_r($data["document"]);
?>`;
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Banner: Strictly Admin-Only Security Notice */}
      <div className="bg-slate-900 text-white rounded-xl p-6 border border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Admin Panel Exclusive
              </span>
              <span className="text-xs font-mono text-slate-400">
                REST API v1 & Private Documents Vault
              </span>
            </div>
            <h2 className="text-xl font-bold font-display">
              Private Admin API, Developer Docs & Documents Vault
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl">
              This API, its documentation, and all stored/extracted documents are strictly restricted to the Admin Panel (`/kmg`). Public visitors cannot view or access these endpoints without your Admin API Key.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-slate-800/90 p-1.5 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setSubTab('wp-plugin')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                subTab === 'wp-plugin'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>WordPress Plugin (.zip)</span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('documents-vault')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                subTab === 'documents-vault'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <FolderArchive className="w-3.5 h-3.5" />
              <span>Documents Vault ({adminDocs.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('api-keys')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                subTab === 'api-keys'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>API Keys & Security</span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('api-docs')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                subTab === 'api-docs'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/60'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>API Docs & Sandbox</span>
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          TAB 0: INSTALLABLE WORDPRESS PLUGIN (.ZIP) BUILDER & DOWNLOADER
         ===================================================================== */}
      {subTab === 'wp-plugin' && (
        <div className="space-y-6">
          {/* Primary 1-Click Download Card */}
          <div className="bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-900 text-white border border-emerald-500/40 rounded-xl p-6 shadow-md space-y-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500 text-slate-950">
                    Ready to Upload in WordPress
                  </span>
                  <span className="text-xs font-mono text-emerald-300">
                    scribd-downloader-pro.zip · v{wpConfig.pluginVersion} · Shortcode: [scribd_downloader]
                  </span>
                </div>
                <h3 className="text-xl font-bold font-display">
                  WordPress Plugin v3.0 (.zip) — Ultra-Fast Sub-Second Fetch + Button Ads + Real PDF
                </h3>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Download the complete, self-contained WordPress plugin package (<code className="text-emerald-300">scribd-downloader-pro.zip</code> v3.0.0). Features <strong>Sub-Second Direct Turbo Extraction (~0.2s)</strong>, <strong>Inline Cache-Proof Script Delivery</strong>, <strong>Real Scribd Page Count &amp; Preview Slider</strong>, <strong>Actual PDF Compilation</strong>, and <strong>Fetch &amp; Download Button Ads</strong>.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadWpPluginZip}
                  className="px-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-extrabold rounded-xl flex items-center gap-2.5 shadow-lg cursor-pointer transition-transform active:scale-95"
                >
                  <Download className="w-5 h-5" />
                  <span>Download WordPress Plugin v3.0 (.zip)</span>
                </button>

                <a
                  href="/api/admin/download-wp-plugin?v=3.0.0"
                  download="scribd-downloader-pro.zip"
                  className="px-4 py-3.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm cursor-pointer transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>Direct HTTP Download v3.0 (.zip)</span>
                </a>
              </div>
            </div>

            {/* Key Plugin Capabilities Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
              <div className="p-3.5 bg-white/5 border border-white/10 rounded-lg space-y-1">
                <div className="text-xs font-bold text-emerald-400">1. Clean 3-Step Frontend UX</div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Shows <strong>only URL Input + Fetch Button</strong> initially. After Fetch: shows <strong>Page Count</strong>, <strong>Document Preview Slider</strong>, and <strong>Download PDF Button</strong>.
                </p>
              </div>
              <div className="p-3.5 bg-white/5 border border-white/10 rounded-lg space-y-1">
                <div className="text-xs font-bold text-emerald-400">2. Zero IP Block Engine</div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Races Client Browser Edge Relays, <code className="text-emerald-300">wsrv.nl</code> CDN, Google Translate Edge, and Spoofed Header Rotation so your WP server IP is never blocked.
                </p>
              </div>
              <div className="p-3.5 bg-white/5 border border-white/10 rounded-lg space-y-1">
                <div className="text-xs font-bold text-emerald-400">3. Real Pages &amp; Actual PDF</div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Zero fake documents. Extracts real Scribd <code className="text-emerald-300">scribdassets.com</code> scans &amp; compiles an actual multi-page <code className="text-emerald-300">.pdf</code> file.
                </p>
              </div>
              <div className="p-3.5 bg-white/5 border border-white/10 rounded-lg space-y-1">
                <div className="text-xs font-bold text-emerald-400">4. Button Ads &amp; WP Settings</div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Full settings page in <strong>WP Admin &rarr; Scribd Pro</strong> to add Direct Ad Links on Fetch &amp; Download buttons, countdown timers, and 4 Banner Ad zones.
                </p>
              </div>
            </div>
          </div>

          {/* Pre-Configure Default Settings Before Downloading .zip (Also Editable in WP Admin -> Scribd Pro) */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200">
              <div>
                <h4 className="text-base font-bold text-slate-900">
                  Pre-Configure WordPress Plugin Settings &amp; Button Ads (Included in .zip &amp; Editable in WP Admin)
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Any settings you enter below will be baked into your downloaded <code className="font-mono">scribd-downloader-pro.zip</code> as default values, and you can also change them anytime inside WordPress (<code className="font-mono">WP Admin &rarr; Scribd Pro</code>).
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownloadWpPluginZip}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Build &amp; Download .zip</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Button Ads & Banner Monetization */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div className="text-xs font-mono font-bold text-blue-600 uppercase">
                  💰 Button Ads &amp; Banner Monetization Settings
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Fetch Button Direct Ad Link / Smartlink URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={wpConfig.fetchBtnAdUrl}
                    onChange={(e) => setWpConfig({ ...wpConfig, fetchBtnAdUrl: e.target.value })}
                    placeholder="https://your-ad-network.com/fetch-button-smartlink"
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                  />
                  <span className="text-[11px] text-slate-500 block mt-1">
                    Opens in a new tab when visitor clicks the <strong>Fetch Document</strong> button.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Download PDF Button Direct Ad Link / Smartlink URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={wpConfig.downloadBtnAdUrl}
                    onChange={(e) => setWpConfig({ ...wpConfig, downloadBtnAdUrl: e.target.value })}
                    placeholder="https://your-ad-network.com/download-pdf-smartlink"
                    className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                  />
                  <span className="text-[11px] text-slate-500 block mt-1">
                    Opens in a new tab when visitor clicks the <strong>Download PDF</strong> button.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Download PDF Countdown Timer (Seconds before PDF starts)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={60}
                    value={wpConfig.downloadCountdownSec}
                    onChange={(e) =>
                      setWpConfig({ ...wpConfig, downloadCountdownSec: Number(e.target.value) || 0 })
                    }
                    className="w-32 px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Banner Ad Code: Below Fetch Button (AdSense / Adsterra / HTML)
                  </label>
                  <textarea
                    rows={2}
                    value={wpConfig.bannerBelowFetchHtml}
                    onChange={(e) =>
                      setWpConfig({ ...wpConfig, bannerBelowFetchHtml: e.target.value })
                    }
                    placeholder="Paste HTML/JS banner code..."
                    className="w-full p-2.5 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Banner Ad Code: Below Download PDF Button (AdSense / Adsterra / HTML)
                  </label>
                  <textarea
                    rows={2}
                    value={wpConfig.bannerBelowDownloadHtml}
                    onChange={(e) =>
                      setWpConfig({ ...wpConfig, bannerBelowDownloadHtml: e.target.value })
                    }
                    placeholder="Paste HTML/JS banner code..."
                    className="w-full p-2.5 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              {/* Right Column: Anti-IP Block & UI Customization */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div className="text-xs font-mono font-bold text-emerald-700 uppercase">
                  🛡️ Anti-IP Block Engine &amp; Frontend UI Settings
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Anti-IP Block Relay Mode
                  </label>
                  <select
                    value={wpConfig.antiBlockMode}
                    onChange={(e) =>
                      setWpConfig({
                        ...wpConfig,
                        antiBlockMode: e.target.value as WpPluginBuildConfig['antiBlockMode']
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg font-medium"
                  >
                    <option value="hybrid-auto">
                      Hybrid Multi-Edge Auto Race (Browser Edge + CDN + Server Relay — Recommended)
                    </option>
                    <option value="browser-edge">
                      100% Client Browser Edge Only (Zero WordPress Hosting IP Traffic)
                    </option>
                    <option value="server-edge">
                      Server Google Translate Edge + Remote Admin API
                    </option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Fetch Button Text
                    </label>
                    <input
                      type="text"
                      value={wpConfig.defaultFetchBtnText}
                      onChange={(e) =>
                        setWpConfig({ ...wpConfig, defaultFetchBtnText: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Download PDF Button Text
                    </label>
                    <input
                      type="text"
                      value={wpConfig.defaultDownloadBtnText}
                      onChange={(e) =>
                        setWpConfig({ ...wpConfig, defaultDownloadBtnText: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    URL Input Placeholder
                  </label>
                  <input
                    type="text"
                    value={wpConfig.defaultInputPlaceholder}
                    onChange={(e) =>
                      setWpConfig({ ...wpConfig, defaultInputPlaceholder: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Connected Admin API Server URL
                    </label>
                    <input
                      type="url"
                      value={wpConfig.remoteApiUrl}
                      onChange={(e) => setWpConfig({ ...wpConfig, remoteApiUrl: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Connected Admin API Key
                    </label>
                    <input
                      type="text"
                      value={wpConfig.remoteApiKey}
                      onChange={(e) => setWpConfig({ ...wpConfig, remoteApiKey: e.target.value })}
                      className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 space-y-1">
                  <div className="font-bold">How to Install in WordPress (30 Seconds):</div>
                  <ol className="list-decimal list-inside space-y-0.5 text-[11px]">
                    <li>Click <strong>Download WordPress Plugin (.zip)</strong> above to save <code className="font-mono">scribd-downloader-pro.zip</code>.</li>
                    <li>In WordPress Admin, go to <strong>Plugins &rarr; Add New &rarr; Upload Plugin</strong> and upload the <code className="font-mono">.zip</code> file.</li>
                    <li>Click <strong>Activate Plugin</strong>, then open <strong>Scribd Pro</strong> in your WP sidebar to manage Ads &amp; settings.</li>
                    <li>Add shortcode <code className="font-mono font-bold">[scribd_downloader]</code> to any WordPress Page or Post!</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 1: ADMIN DOCUMENTS VAULT (ONLY IN ADMIN PANEL)
         ===================================================================== */}
      {subTab === 'documents-vault' && (
        <div className="space-y-6">
          {/* Add / Extract Document Directly Inside Admin Panel */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-600" />
                  <span>Admin Documents Manager & Private Vault</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  All resolved documents and sample test files are kept strictly inside this Admin Panel vault. Extract any Scribd URL below or load an existing document.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-500">
                Total Stored: <strong>{adminDocs.length}</strong> Documents
              </span>
            </div>

            <form onSubmit={handleAddDocumentToVault} className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={newDocUrl}
                onChange={(e) => setNewDocUrl(e.target.value)}
                placeholder="Paste Scribd Document URL or numeric ID to extract & store in Admin Vault..."
                className="flex-1 px-3.5 py-2.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="submit"
                disabled={isAddingDoc}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 cursor-pointer shrink-0"
              >
                {isAddingDoc ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Extracting via Admin API...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Extract & Save Document</span>
                  </>
                )}
              </button>
            </form>

            {docError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{docError}</span>
              </div>
            )}

            {/* Documents Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono uppercase text-slate-500">
                    <th className="py-3 px-4">Document Title & ID</th>
                    <th className="py-3 px-4">Pages</th>
                    <th className="py-3 px-4">Source / Date</th>
                    <th className="py-3 px-4 text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {adminDocs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        No documents stored in Admin Vault yet. Paste a Scribd link above to add one.
                      </td>
                    </tr>
                  ) : (
                    adminDocs.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50/80">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{doc.title}</div>
                          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>ID: #{doc.docId}</span>
                            <span>·</span>
                            <a
                              href={doc.originalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline inline-flex items-center gap-0.5"
                            >
                              <span>Original Link</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-700 whitespace-nowrap">
                          {doc.pageCount} Pages
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="uppercase font-mono text-[10px] font-bold text-slate-600">
                            {doc.source}
                          </span>
                          <div className="text-[11px] text-slate-400 font-mono">{doc.fetchedAt}</div>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                          {onLoadDocumentInViewer && (
                            <button
                              type="button"
                              onClick={() => onLoadDocumentInViewer(doc.originalUrl)}
                              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                              title="Open & preview this document in the main Downloader"
                            >
                              <Play className="w-3 h-3" />
                              <span>Load in Viewer</span>
                            </button>
                          )}

                          <a
                            href={`/api/v1/download-pdf?id=${encodeURIComponent(doc.docId)}&api_key=${encodeURIComponent(apiConfig.masterApiKey)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                            title="Direct PDF download via Admin API"
                          >
                            <Download className="w-3 h-3" />
                            <span>API PDF</span>
                          </a>

                          <a
                            href={doc.embedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                            title="Open raw unlocked Scribd embed stream"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Embed</span>
                          </a>

                          <button
                            type="button"
                            onClick={() => handleDeleteDocumentRecord(doc.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                            title="Delete from Admin Vault"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: API KEYS & ACCESS CONTROL (ADMIN ONLY)
         ===================================================================== */}
      {subTab === 'api-keys' && (
        <div className="space-y-6">
          {/* Global API Status & Security Toggles */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>Admin API Access & Authentication Control</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage who can call `/api/v1/*` endpoints. All API keys are strictly controlled from this Admin Panel.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer bg-slate-100 px-3 py-2 rounded-lg">
                  <input
                    type="checkbox"
                    checked={apiConfig.enabled}
                    onChange={(e) =>
                      updateApiConfig(
                        { enabled: e.target.checked },
                        e.target.checked ? 'Admin REST API Enabled!' : 'Admin REST API Disabled.'
                      )
                    }
                  />
                  <span>API Status: {apiConfig.enabled ? 'ACTIVE' : 'DISABLED'}</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer bg-slate-100 px-3 py-2 rounded-lg">
                  <input
                    type="checkbox"
                    checked={apiConfig.requireApiKey}
                    onChange={(e) =>
                      updateApiConfig(
                        { requireApiKey: e.target.checked },
                        'API key authentication requirement updated.'
                      )
                    }
                  />
                  <span>Require Admin API Key (`x-api-key`)</span>
                </label>
              </div>
            </div>

            {/* Master Admin API Key Box */}
            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-mono uppercase text-amber-400 font-bold flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" />
                  <span>Master Admin API Key (Full Access)</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMasterKey((prev) => !prev)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    {showMasterKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    <span>{showMasterKey ? 'Hide' : 'Reveal'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(apiConfig.masterApiKey, 'master-key')}
                    className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId === 'master-key' ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Key</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleRotateMasterKey}
                    className="px-2.5 py-1 bg-red-600/80 hover:bg-red-600 text-white rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                    title="Generate a new Master Key and invalidate the old one"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Rotate Key</span>
                  </button>
                </div>
              </div>

              <div className="p-3 bg-black/50 border border-slate-700 rounded-lg font-mono text-xs text-emerald-400 select-all break-all">
                {showMasterKey
                  ? apiConfig.masterApiKey
                  : `${apiConfig.masterApiKey.slice(0, 14)}••••••••••••••••••••••••`}
              </div>
            </div>

            {/* Secondary API Keys Generator */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase font-mono text-slate-500">
                Additional Admin API Keys ({apiConfig.apiKeys.length})
              </h4>

              <form onSubmit={handleCreateApiKey} className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="Key Label (e.g., Mobile App Backend, Telegram Bot, External Worker)..."
                  className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Generate New API Key</span>
                </button>
              </form>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono uppercase text-slate-500">
                      <th className="py-2.5 px-4">Key Name</th>
                      <th className="py-2.5 px-4">Secret Token</th>
                      <th className="py-2.5 px-4">Created</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    {apiConfig.apiKeys.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-semibold text-slate-900">{item.name}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {item.key}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-500">{item.createdAt}</td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => handleToggleKeyStatus(item.id)}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase cursor-pointer ${
                              item.active
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {item.active ? 'Active' : 'Revoked'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          <button
                            type="button"
                            onClick={() => handleCopy(item.key, item.id)}
                            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[11px] font-semibold cursor-pointer"
                          >
                            {copiedId === item.id ? 'Copied!' : 'Copy'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteApiKey(item.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: API DOCUMENTATION & LIVE SANDBOX (ADMIN ONLY)
         ===================================================================== */}
      {subTab === 'api-docs' && (
        <div className="space-y-6">
          {/* Interactive Live API Sandbox */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-blue-600" />
                  <span>Live Admin API Sandbox Tester</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Test your `/api/v1/*` endpoints in real-time using your Master Admin API Key.
                </p>
              </div>
              <span className="text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                Authenticated with Master Key
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Select API Endpoint
                </label>
                <select
                  value={sandboxEndpoint}
                  onChange={(e) => setSandboxEndpoint(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg"
                >
                  <option value="/api/v1/resolve">POST /api/v1/resolve (Extract Pages)</option>
                  <option value="/api/v1/documents">GET /api/v1/documents (List Vault)</option>
                  <option value="/api/v1/status">GET /api/v1/status (Health & Auth)</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Target Scribd URL or Document ID
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={sandboxDocUrl}
                    onChange={(e) => setSandboxDocUrl(e.target.value)}
                    disabled={sandboxEndpoint !== '/api/v1/resolve'}
                    placeholder="https://www.scribd.com/document/991278283/..."
                    className="flex-1 px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={handleRunSandboxTest}
                    disabled={sandboxLoading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    {sandboxLoading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                    <span>Send API Request</span>
                  </button>
                </div>
              </div>
            </div>

            {sandboxResponse && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-500">JSON Response Payload:</span>
                  <span
                    className={`font-bold ${
                      sandboxStatus === 200 ? 'text-emerald-600' : 'text-red-600'
                    }`}
                  >
                    HTTP {sandboxStatus}
                  </span>
                </div>
                <pre className="p-4 bg-slate-900 text-emerald-400 rounded-xl text-xs font-mono overflow-x-auto max-h-80">
                  {sandboxResponse}
                </pre>
              </div>
            )}
          </div>

          {/* Complete Endpoint Reference & Code Examples */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-blue-600" />
                  <span>Private API Documentation & Code Examples</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pass your Admin API key via the <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">x-api-key</code> header, <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">Authorization: Bearer KEY</code>, or <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">?api_key=KEY</code> query parameter.
                </p>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                {(['curl', 'javascript', 'python', 'php'] as CodeLang[]).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setCodeLang(lang)}
                    className={`px-3 py-1 rounded-md text-xs font-mono font-bold uppercase cursor-pointer ${
                      codeLang === lang
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Endpoints Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-mono uppercase text-slate-500">
                    <th className="py-2.5 px-4">Method & Endpoint</th>
                    <th className="py-2.5 px-4">Parameters</th>
                    <th className="py-2.5 px-4">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="py-3 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                      POST /api/v1/resolve
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {`{ "url": "https://scribd.com/..." }`}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      Extracts document title, total page count, unlocked embed URL, and high-res image/JSONP URLs for every page (1 to N).
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-700 whitespace-nowrap">
                      POST /api/v1/download-pdf
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {`{ "url": "...", "pageSize": "A4" }`}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      Compiles all pages in parallel on the server and returns the binary <code className="font-mono">application/pdf</code> stream.
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                      GET /api/v1/documents
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">None</td>
                    <td className="py-3 px-4 text-slate-600">
                      Returns the list of all documents stored in the Admin Documents Vault.
                    </td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                      GET /api/v1/status
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">None</td>
                    <td className="py-3 px-4 text-slate-600">
                      Verifies your Admin API key and returns service health & rate limit status.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Code Block */}
            <div className="relative">
              <button
                type="button"
                onClick={() => handleCopy(getCodeSnippet(codeLang), 'code-snippet')}
                className="absolute right-3 top-3 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] font-mono flex items-center gap-1 cursor-pointer"
              >
                {copiedId === 'code-snippet' ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
              <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed">
                {getCodeSnippet(codeLang)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminApiAndDocsPanel;
