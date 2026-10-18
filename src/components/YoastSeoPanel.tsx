import React, { useState, useMemo } from 'react';
import {
  Globe,
  Share2,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Smartphone,
  Monitor,
  Sparkles,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import {
  YoastItemSeoFields,
  computeYoastSeoAnalysis
} from '../lib/cmsStore';

interface YoastSeoPanelProps {
  title: string;
  slug: string;
  contentHtml: string;
  siteName?: string;
  baseUrl?: string;
  seoData: YoastItemSeoFields;
  onChange: (updated: YoastItemSeoFields) => void;
  isGlobalSiteConfig?: boolean;
}

export default function YoastSeoPanel({
  title,
  slug,
  contentHtml,
  siteName = 'ScribdDownloader',
  baseUrl = 'https://scribddownloader.org',
  seoData,
  onChange,
  isGlobalSiteConfig = false
}: YoastSeoPanelProps) {
  const [activeTab, setActiveTab] = useState<'seo' | 'readability' | 'social' | 'advanced'>('seo');
  const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile');
  const [showAnalysisDetails, setShowAnalysisDetails] = useState<boolean>(true);

  // Compute live real-time Yoast SEO scores
  const analysis = useMemo(() => {
    return computeYoastSeoAnalysis(title, slug, contentHtml, seoData);
  }, [title, slug, contentHtml, seoData]);

  const effectiveTitle = (seoData.seoTitle || title || siteName).trim();
  const effectiveDesc = (
    seoData.seoDescription ||
    'Download and view Scribd documents in PDF format for free online with full page extraction.'
  ).trim();

  const titleLength = (seoData.seoTitle || '').length;
  const descLength = (seoData.seoDescription || '').length;

  const titleBarColor =
    titleLength >= 30 && titleLength <= 65
      ? 'bg-emerald-500'
      : titleLength > 65
      ? 'bg-amber-500'
      : 'bg-red-500';

  const descBarColor =
    descLength >= 120 && descLength <= 160
      ? 'bg-emerald-500'
      : descLength > 160
      ? 'bg-amber-500'
      : 'bg-red-500';

  const getScoreBadge = (score: 'good' | 'ok' | 'bad') => {
    if (score === 'good') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
          <span>Good</span>
        </span>
      );
    }
    if (score === 'ok') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
          <span className="w-2 h-2 rounded-full bg-amber-600" />
          <span>OK</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300">
        <span className="w-2 h-2 rounded-full bg-red-600" />
        <span>Needs Improvement</span>
      </span>
    );
  };

  const insertVariable = (variable: string) => {
    const current = seoData.seoTitle || '';
    onChange({
      ...seoData,
      seoTitle: current ? `${current} ${variable}` : variable
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      {/* Yoast SEO Header Bar */}
      <div className="bg-[#5c2d91] text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center font-bold font-serif text-lg text-amber-300 border border-white/20">
            Y
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight">Yoast SEO</span>
              <span className="text-[10px] font-mono uppercase bg-amber-400 text-purple-950 px-1.5 py-0.5 rounded font-extrabold">
                PREMIUM
              </span>
            </div>
            <p className="text-[11px] text-purple-200">
              WordPress Search Engine Optimization & Real-Time Content Analysis
            </p>
          </div>
        </div>

        {/* Live Traffic Light Scores */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10 text-xs">
            <span className="text-purple-200 text-[11px]">SEO:</span>
            {getScoreBadge(analysis.overallScore)}
          </div>
          <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-lg border border-white/10 text-xs">
            <span className="text-purple-200 text-[11px]">Readability:</span>
            {getScoreBadge(analysis.readabilityScore)}
          </div>
        </div>
      </div>

      {/* Yoast Sub-Tabs */}
      <div className="px-5 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('seo')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
            activeTab === 'seo'
              ? 'bg-white text-purple-900 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Search className="w-3.5 h-3.5 text-purple-600" />
          <span>SEO Analysis</span>
          <span
            className={`w-2 h-2 rounded-full ${
              analysis.overallScore === 'good'
                ? 'bg-emerald-500'
                : analysis.overallScore === 'ok'
                ? 'bg-amber-500'
                : 'bg-red-500'
            }`}
          />
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('readability')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
            activeTab === 'readability'
              ? 'bg-white text-purple-900 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          <span>Readability</span>
          <span
            className={`w-2 h-2 rounded-full ${
              analysis.readabilityScore === 'good'
                ? 'bg-emerald-500'
                : analysis.readabilityScore === 'ok'
                ? 'bg-amber-500'
                : 'bg-red-500'
            }`}
          />
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('social')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
            activeTab === 'social'
              ? 'bg-white text-purple-900 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Share2 className="w-3.5 h-3.5 text-purple-600" />
          <span>Social (Facebook & X)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('advanced')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
            activeTab === 'advanced'
              ? 'bg-white text-purple-900 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-3.5 h-3.5 text-purple-600" />
          <span>Schema & Advanced</span>
        </button>
      </div>

      {/* TAB 1: SEO ANALYSIS & GOOGLE SERP PREVIEW */}
      {activeTab === 'seo' && (
        <div className="p-6 space-y-6">
          {/* Focus Keyphrase Input */}
          <div className="bg-purple-50/50 border border-purple-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-purple-950 uppercase tracking-wide">
                Focus Keyphrase
              </label>
              <span className="text-[11px] text-purple-700">
                Word or phrase you want this post to rank for
              </span>
            </div>
            <input
              type="text"
              value={seoData.focusKeyphrase || ''}
              onChange={(e) =>
                onChange({ ...seoData, focusKeyphrase: e.target.value })
              }
              placeholder="e.g. scribd downloader free pdf"
              className="w-full px-3.5 py-2 text-sm bg-white border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:outline-none"
            />
          </div>

          {/* Google SERP Snippet Preview */}
          <div className="border border-slate-200 rounded-xl p-5 space-y-3 bg-slate-50/50">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800 uppercase font-mono">
                Google Search Result Snippet Preview
              </span>
              <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => setPreviewMode('mobile')}
                  className={`px-2.5 py-1 text-xs font-medium rounded flex items-center gap-1 cursor-pointer ${
                    previewMode === 'mobile'
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-3 h-3" />
                  <span>Mobile Result</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewMode('desktop')}
                  className={`px-2.5 py-1 text-xs font-medium rounded flex items-center gap-1 cursor-pointer ${
                    previewMode === 'desktop'
                      ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Monitor className="w-3 h-3" />
                  <span>Desktop Result</span>
                </button>
              </div>
            </div>

            {/* Simulated Google Search Result */}
            <div
              className={`bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-1 ${
                previewMode === 'mobile' ? 'max-w-md' : 'w-full'
              }`}
            >
              <div className="flex items-center gap-2 text-xs text-slate-700">
                <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                  S
                </div>
                <div className="truncate">
                  <span className="text-slate-900 font-medium">{siteName}</span>
                  <span className="text-slate-400 font-mono text-[11px] ml-1">
                    {baseUrl} &rsaquo; {slug || 'home'}
                  </span>
                </div>
              </div>

              <h4 className="text-blue-700 text-base font-medium hover:underline cursor-pointer leading-snug line-clamp-2">
                {effectiveTitle}
              </h4>

              <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                {effectiveDesc}
              </p>
            </div>
          </div>

          {/* SEO Title & Snippet Variables */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800">
                SEO Title
              </label>
              <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                {titleLength} characters (recommended: 30–65)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pb-1">
              <span className="text-[11px] text-slate-500 font-medium">Insert Snippet Variable:</span>
              {[
                { label: 'Site Title', val: '%%sitename%%' },
                { label: 'Separator', val: '%%sep%%' },
                { label: 'Title', val: '%%title%%' },
                { label: 'Page', val: '%%page%%' }
              ].map((v) => (
                <button
                  key={v.val}
                  type="button"
                  onClick={() => insertVariable(v.val)}
                  className="px-2 py-0.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded text-[11px] font-mono cursor-pointer"
                >
                  +{v.label}
                </button>
              ))}
            </div>

            <input
              type="text"
              value={seoData.seoTitle || ''}
              onChange={(e) => onChange({ ...seoData, seoTitle: e.target.value })}
              placeholder={title || 'Document title for search engines'}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:outline-none"
            />
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-200 ${titleBarColor}`}
                style={{
                  width: `${Math.min(100, Math.round((titleLength / 65) * 100))}%`
                }}
              />
            </div>
          </div>

          {/* Slug input (if not global) */}
          {!isGlobalSiteConfig && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-800">
                Slug
              </label>
              <input
                type="text"
                value={slug}
                readOnly
                className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-300 rounded-lg text-slate-600"
              />
              <span className="text-[11px] text-slate-400">
                URL slug is managed in the main post/page editor fields.
              </span>
            </div>
          )}

          {/* Meta Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800">
                Meta Description
              </label>
              <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                {descLength} characters (recommended: 120–160)
              </span>
            </div>
            <textarea
              rows={3}
              value={seoData.seoDescription || ''}
              onChange={(e) =>
                onChange({ ...seoData, seoDescription: e.target.value })
              }
              placeholder="Provide an engaging summary that entices users on Google to click your result..."
              className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:outline-none"
            />
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-200 ${descBarColor}`}
                style={{
                  width: `${Math.min(100, Math.round((descLength / 160) * 100))}%`
                }}
              />
            </div>
          </div>

          {/* Real-Time Yoast SEO Checklist */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAnalysisDetails((p) => !p)}
              className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-left cursor-pointer"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                <span>Yoast Real-Time SEO Analysis Checklist ({analysis.checks.length} Checks)</span>
              </div>
              <div className="flex items-center gap-2">
                {getScoreBadge(analysis.overallScore)}
                {showAnalysisDetails ? (
                  <ChevronUp className="w-4 h-4 text-slate-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-500" />
                )}
              </div>
            </button>

            {showAnalysisDetails && (
              <div className="p-4 divide-y divide-slate-100 text-xs space-y-2">
                {analysis.checks.map((chk) => (
                  <div key={chk.id} className="pt-2 flex items-start gap-2.5">
                    {chk.status === 'good' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : chk.status === 'ok' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="font-semibold text-slate-900 mr-2">
                        {chk.label}:
                      </span>
                      <span className="text-slate-600 leading-relaxed">
                        {chk.detail}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: READABILITY ANALYSIS */}
      {activeTab === 'readability' && (
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Content Readability Analysis
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Ensure your writing is easy to scan, engaging, and clear for visitors and search engines.
              </p>
            </div>
            {getScoreBadge(analysis.readabilityScore)}
          </div>

          <div className="space-y-3 pt-2">
            {analysis.readabilityChecks.map((chk) => (
              <div
                key={chk.id}
                className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg flex items-start gap-3 text-xs"
              >
                {chk.status === 'good' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : chk.status === 'ok' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-bold text-slate-900">{chk.label}</div>
                  <p className="text-slate-600 mt-0.5">{chk.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: SOCIAL PREVIEWS (FACEBOOK & TWITTER/X) */}
      {activeTab === 'social' && (
        <div className="p-6 space-y-6">
          {/* Facebook OpenGraph Preview */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="text-[#1877F2] font-black">f</span>
              <span>Facebook / OpenGraph Sharing Card</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Facebook Title (og:title)
                </label>
                <input
                  type="text"
                  value={seoData.ogTitle || ''}
                  onChange={(e) =>
                    onChange({ ...seoData, ogTitle: e.target.value })
                  }
                  placeholder={effectiveTitle}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Facebook Image URL (og:image)
                </label>
                <input
                  type="text"
                  value={seoData.ogImageUrl || ''}
                  onChange={(e) =>
                    onChange({ ...seoData, ogImageUrl: e.target.value })
                  }
                  placeholder="https://example.com/social-cover.jpg"
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Facebook Description (og:description)
                </label>
                <textarea
                  rows={2}
                  value={seoData.ogDescription || ''}
                  onChange={(e) =>
                    onChange({ ...seoData, ogDescription: e.target.value })
                  }
                  placeholder={effectiveDesc}
                  className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            {/* Visual Social Card Preview */}
            <div className="border border-slate-300 rounded-xl overflow-hidden max-w-lg bg-slate-50 shadow-xs">
              <div className="h-44 bg-slate-200 flex items-center justify-center text-slate-400 text-xs font-mono">
                {seoData.ogImageUrl ? (
                  <img
                    src={seoData.ogImageUrl}
                    alt="Social preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <span>[ Social Share Image Preview 1200×630 ]</span>
                )}
              </div>
              <div className="p-3 bg-white space-y-1">
                <div className="text-[11px] font-mono text-slate-400 uppercase">
                  {baseUrl.replace(/^https?:\/\//, '')}
                </div>
                <div className="font-bold text-slate-900 text-sm truncate">
                  {seoData.ogTitle || effectiveTitle}
                </div>
                <div className="text-xs text-slate-600 line-clamp-2">
                  {seoData.ogDescription || effectiveDesc}
                </div>
              </div>
            </div>
          </div>

          {/* Twitter / X Preview */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span className="font-black">𝕏</span>
              <span>Twitter / X Card Settings</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Twitter Title
                </label>
                <input
                  type="text"
                  value={seoData.twitterTitle || ''}
                  onChange={(e) =>
                    onChange({ ...seoData, twitterTitle: e.target.value })
                  }
                  placeholder={effectiveTitle}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Twitter Card Type
                </label>
                <select
                  value={seoData.twitterDescription || 'summary_large_image'}
                  onChange={(e) =>
                    onChange({
                      ...seoData,
                      twitterDescription: e.target.value
                    })
                  }
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
                >
                  <option value="summary_large_image">
                    Summary Card with Large Image
                  </option>
                  <option value="summary">Summary Card (Small Thumbnail)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SCHEMA & ADVANCED */}
      {activeTab === 'advanced' && (
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Robots Meta: Indexing
              </label>
              <select
                value={seoData.robotsIndex || 'index'}
                onChange={(e) =>
                  onChange({
                    ...seoData,
                    robotsIndex: e.target.value as 'index' | 'noindex'
                  })
                }
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
              >
                <option value="index">Allow search engines to show this in results (index)</option>
                <option value="noindex">Do not show in search results (noindex)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Robots Meta: Following
              </label>
              <select
                value={seoData.robotsFollow || 'follow'}
                onChange={(e) =>
                  onChange({
                    ...seoData,
                    robotsFollow: e.target.value as 'follow' | 'nofollow'
                  })
                }
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
              >
                <option value="follow">Should search engines follow links on this page? (follow)</option>
                <option value="nofollow">Do not follow links (nofollow)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Canonical URL
              </label>
              <input
                type="text"
                value={seoData.canonicalUrl || ''}
                onChange={(e) =>
                  onChange({ ...seoData, canonicalUrl: e.target.value })
                }
                placeholder={`${baseUrl}/${slug}`}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Schema.org Page Type
              </label>
              <select
                value={seoData.schemaPageType || 'WebPage'}
                onChange={(e) =>
                  onChange({
                    ...seoData,
                    schemaPageType: e.target.value as any
                  })
                }
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg"
              >
                <option value="WebPage">WebPage</option>
                <option value="Article">Article (Blog Post)</option>
                <option value="FAQPage">FAQPage</option>
                <option value="AboutPage">AboutPage</option>
                <option value="ContactPage">ContactPage</option>
                <option value="WebApplication">WebApplication</option>
              </select>
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-800 cursor-pointer">
              <input
                type="checkbox"
                checked={seoData.isCornerstone || false}
                onChange={(e) =>
                  onChange({ ...seoData, isCornerstone: e.target.checked })
                }
              />
              <span>Mark as Cornerstone Content (Most authoritative, central content on your site)</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
