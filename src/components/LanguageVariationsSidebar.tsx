import React from 'react';
import {
  Globe,
  Plus,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Layers,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { LanguageConfig, computeYoastSeoAnalysis } from '../lib/cmsStore';

export interface GroupVariationItem {
  id: string;
  lang: string;
  title: string;
  slug: string;
  contentHtml?: string;
  focusKeyphrase?: string;
  seoTitle?: string;
  seoDescription?: string;
}

interface LanguageVariationsSidebarProps {
  currentLang: string;
  currentId: string;
  currentTitle: string;
  translationGroupId: string;
  languages: LanguageConfig[];
  allGroupItems: GroupVariationItem[];
  itemType: 'Page' | 'Blog Post';
  onSwitchItem: (targetId: string) => void;
  onCreateVariation: (targetLangCode: string) => void;
  onCloneAllMissing?: () => void;
}

export const LanguageVariationsSidebar: React.FC<LanguageVariationsSidebarProps> = ({
  currentLang,
  currentId,
  currentTitle,
  translationGroupId,
  languages,
  allGroupItems,
  itemType,
  onSwitchItem,
  onCreateVariation,
  onCloneAllMissing
}) => {
  const enabledLangs = languages.filter((l) => l.enabled);
  const totalLangs = enabledLangs.length;

  const existingMap = new Map<string, GroupVariationItem>();
  allGroupItems.forEach((item) => {
    existingMap.set(item.lang.toLowerCase(), item);
  });

  const readyCount = enabledLangs.filter((l) => existingMap.has(l.code.toLowerCase())).length;
  const missingLangs = enabledLangs.filter((l) => !existingMap.has(l.code.toLowerCase()));
  const completionPercentage = totalLangs > 0 ? Math.round((readyCount / totalLangs) * 100) : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
      {/* Header Banner */}
      <div className="p-4 bg-slate-900 text-white space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider font-mono">
              Language Variations
            </h3>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              readyCount === totalLangs
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            }`}
          >
            {readyCount} / {totalLangs} Ready
          </span>
        </div>

        <p className="text-[11px] text-slate-300 leading-snug">
          Create & switch language versions of this {itemType.toLowerCase()} right from the sidebar. All connect automatically with the frontend language switcher.
        </p>

        {/* Progress Bar */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-[10px] font-mono text-slate-400">
            <span>Translation Coverage</span>
            <span className="font-bold text-white">{completionPercentage}%</span>
          </div>
          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                completionPercentage === 100 ? 'bg-emerald-400' : 'bg-blue-500'
              }`}
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Linked Translation Group Info */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <span className="truncate">Group: #{translationGroupId}</span>
        <span className="text-slate-400">Polylang Sync</span>
      </div>

      {/* Language Variations List */}
      <div className="p-3 space-y-2.5 max-h-[520px] overflow-y-auto">
        {enabledLangs.map((lang) => {
          const variation = existingMap.get(lang.code.toLowerCase());
          const isCurrent = variation && variation.id === currentId;

          if (isCurrent) {
            return (
              <div
                key={lang.code}
                className="p-3 rounded-lg border-2 border-blue-600 bg-blue-50/60 shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg leading-none">{lang.flag}</span>
                    <span className="text-xs font-bold text-slate-900 uppercase">
                      {lang.code}
                    </span>
                    <span className="text-[11px] text-slate-600 font-medium">
                      · {lang.nativeName}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white uppercase tracking-wider">
                    Editing Now
                  </span>
                </div>

                <div className="text-xs font-semibold text-slate-900 truncate">
                  {currentTitle || 'Untitled Page'}
                </div>

                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-0.5 border-t border-blue-200/60">
                  <span className="truncate">/{variation.slug}</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                  </span>
                </div>
              </div>
            );
          }

          if (variation) {
            // Existing variation (not currently editing)
            const seo = computeYoastSeoAnalysis(
              variation.title,
              variation.slug,
              variation.contentHtml || '',
              {
                focusKeyphrase: variation.focusKeyphrase,
                seoTitle: variation.seoTitle,
                seoDescription: variation.seoDescription
              }
            );

            return (
              <div
                key={lang.code}
                className="p-3 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg leading-none">{lang.flag}</span>
                    <span className="text-xs font-bold text-slate-800 uppercase">
                      {lang.code}
                    </span>
                    <span className="text-[11px] text-slate-500">· {lang.name}</span>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                      seo.overallScore === 'good'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : seo.overallScore === 'ok'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    SEO {seo.overallScore}
                  </span>
                </div>

                <div className="text-xs font-medium text-slate-800 truncate">
                  {variation.title}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-[10px] font-mono text-slate-400 truncate max-w-[140px]">
                    /{variation.slug}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSwitchItem(variation.id)}
                    className="px-2.5 py-1 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-md flex items-center gap-1 cursor-pointer transition-colors"
                    title={`Switch editor to edit ${lang.name} variation`}
                  >
                    <span>Switch & Edit</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          }

          // Missing variation
          return (
            <div
              key={lang.code}
              className="p-3 rounded-lg border border-dashed border-amber-300 bg-amber-50/40 space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg leading-none">{lang.flag}</span>
                  <span className="text-xs font-bold text-slate-800 uppercase">
                    {lang.code}
                  </span>
                  <span className="text-[11px] text-slate-600">· {lang.nativeName}</span>
                </div>
                <span className="text-[10px] font-medium text-amber-700 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                  Missing
                </span>
              </div>

              <p className="text-[11px] text-slate-500 leading-tight">
                No {lang.name} translation created yet for this page.
              </p>

              <button
                type="button"
                onClick={() => onCreateVariation(lang.code)}
                className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title={`Duplicate current page layout and create ${lang.name} variation`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Create {lang.code.toUpperCase()} Variation</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Bottom Batch Actions */}
      {missingLangs.length > 0 && onCloneAllMissing && (
        <div className="p-3 bg-slate-50 border-t border-slate-200">
          <button
            type="button"
            onClick={onCloneAllMissing}
            className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            title="Duplicate this page layout to all missing target languages at once"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Clone to All Missing ({missingLangs.length})</span>
          </button>
          <p className="text-[10px] text-slate-500 text-center mt-1.5 leading-tight">
            Creates clones under this translation group so you can translate each one sequentially.
          </p>
        </div>
      )}
    </div>
  );
};

export default LanguageVariationsSidebar;
