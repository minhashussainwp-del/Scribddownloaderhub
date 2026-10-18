# Sidebar Page Language Variations & Frontend Language Switcher Integration

An integrated multi-language variation system with a dedicated right-hand sidebar panel in the page editor, allowing creators to ready a page in English and immediately create, clone, and switch to targeted language variations with 1 click, all dynamically connected to the frontend language switcher.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were confirmed through Phase 1 interactive clarification:

- **Confirmed Decision 1 (Panel Location)**: Embedded as a dedicated, sticky right-hand sidebar panel (`w-80`) inside the page editor, providing immediate visibility and 1-click access to all language variations without leaving the editing session.
- **Confirmed Decision 2 (Initialization)**: When adding a new language variation from the sidebar, the system auto-duplicates the current page's layout, headline, content, and switcher sections, so creators can immediately translate text without recreating page structure.
- **Confirmed Decision 3 (Frontend Fallback)**: If a visitor switches language to one that does not yet have an active translation for that specific custom page, the application serves the default English version accompanied by a subtle, non-intrusive translation banner notice.

---

## 1. Overview & Core Concept

### What It Does
- **Editor Sidebar Variations Hub**: When editing any Custom Page (or Blog Post or Static Home Page), a dedicated **"Language Variations & Polylang Sync"** right-side panel displays the entire family of language translations.
- **Sequence Workflow**: The creator readies the primary page (e.g., English `en`). From the sidebar, every target language (e.g., Urdu `ur`, Spanish `es`, Hindi `hi`, Arabic `ar`, etc.) is listed with its status (`Ready & Linked` or `+ Create Variation`).
- **1-Click Clone & Switch**: Clicking `+ Create Variation` immediately duplicates the page under the same `translationGroupId`, sets its language and slug, and hot-swaps the editor into the new language variation without losing the workflow sequence.
- **Frontend Switcher Synchronization**: When a visitor clicks the language dropdown switcher (e.g., switching from 🇺🇸 EN to 🇵🇰 UR or 🇪🇸 ES), the site automatically looks up the matching page within the same `translationGroupId` and renders it smoothly. If unavailable, it serves the default version with an informative notice.

### Target Audience & Persona
- Content managers, multilingual webmasters, and site administrators managing internationalized landing pages, terms, legal pages, and guides.

### Key Value
- Replaces disconnected page creation with a unified, sequential sidebar workflow that eliminates broken links between translations and guarantees seamless frontend language switching.

---

## 2. User Experience & Visual Design

### Key User Flows

```
[Primary Page Editor (EN)]
         │
         ▼
[Right Sidebar: "Language Variations"]
   ├─ 🇺🇸 EN (Current Active)
   ├─ 🇵🇰 UR (+ Create Variation / Duplicate) ──► [Auto-Clone & Hot-Swap Editor]
   ├─ 🇪🇸 ES (+ Create Variation / Duplicate) ──► [Auto-Clone & Hot-Swap Editor]
   └─ 🇮🇳 HI (Linked & Ready - Click to Edit) ──► [Direct Switch]
         │
         ▼
[Frontend Visitor Changes Language via 🇺🇸 EN ⌄]
   ├─ If Matching Page Exists ──► Smoothly display translated page & URL
   └─ If Missing ───────────────► Display default version with subtle translation notice
```

### Visual Identity & Theme
- **Sidebar Architecture**: A clean, high-density right-side column (`w-72` to `w-80`, `border-l border-slate-200 bg-slate-50/70 p-4`) alongside the main editor viewport.
- **Language Variation Rows**:
  - Flag + Language Code + Native Name (`🇺🇸 EN · English`, `🇵🇰 UR · اردو`).
  - Active indicator for the currently edited variation (`Editing Now` badge).
  - Quick action buttons: `Edit`, `Preview`, `Duplicate`, or `+ Add Translation`.
  - Yoast SEO Traffic Light score pill (`Good`, `OK`, `Needs Improvement`) per variation.
- **Frontend Fallback Banner**: Quiet, refined banner in slate/blue (`bg-blue-50/80 border border-blue-200 text-blue-900`) indicating: *"This page is not yet available in [Language]. Showing standard English version."*

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Shared Translation Group ID (`translationGroupId`)**
  - *Chosen Approach*: Grouping related page variations using a persistent `translationGroupId` UUID.
  - *Why*: Allows the frontend router and language dropdown to instantly look up corresponding translated slugs when switching languages.
  - *Alternatives Considered*: Loose slug matching (fragile when translated slugs have different localized names).

- **Decision 2: Sequential Sidebar Editing with Autosave Confirmation**
  - *Chosen Approach*: When switching between language variations in the sidebar, prompt/save current changes automatically before loading the target variation into state.
  - *Why*: Prevents accidental loss of edits and keeps the creator in a continuous writing rhythm.

- **Decision 3: Universal Support across Custom Pages & Static Homepages**
  - *Chosen Approach*: Apply the variation sidebar both to Custom Pages (`/p/:slug`) and the Homepage Switcher Sections, ensuring full coverage.
  - *Why*: Matches user request to target all homepage and page languages sequentially.

---

## 4. Technical Architecture & Data Strategy

### System Component & Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Admin Page Editor Canvas                        │
├──────────────────────────────────────────┬─────────────────────────────┤
│               Main Editor                │  Right Variations Sidebar   │
│                                          │                             │
│  - Page Title & Slug Input               │  Language Variations Hub    │
│  - WordPress Rich Text Editor            │  ├─ 🇺🇸 EN (Active)        │
│  - Content Switcher Section Tabs         │  ├─ 🇵🇰 UR (Linked)        │
│  - Yoast SEO Suite Metabox               │  ├─ 🇪🇸 ES [+ Create]      │
│                                          │  ├─ 🇮🇳 HI [+ Create]      │
│                                          │  └─ Auto-Clone Helper       │
└──────────────────────────────────────────┴─────────────────────────────┘
                                  │
                                  ▼
               ┌──────────────────────────────────────┐
               │         CMS Store (cmsStore)         │
               │  - pages: CustomPageItem[]           │
               │  - translationGroupId linking        │
               │  - activeLanguage state              │
               └──────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Frontend Page Rendering                         │
│                                                                        │
│  User switches language via header dropdown (🇺🇸 EN -> 🇵🇰 UR)           │
│  Router query: pages.find(p => p.translationGroupId === currentGroup   │
│                            && p.lang === targetLang)                   │
│  ├── Found: Render localized variation URL & content                  │
│  └── Not Found: Render default EN page with localized fallback notice  │
└────────────────────────────────────────────────────────────────────────┘
```

### Data Model Enhancements
- `CustomPageItem`: Confirm `translationGroupId: string`, `lang: string`, `isDefaultLang?: boolean`.
- Sidebar Helper Functions:
  - `getTranslationGroupPages(groupId: string): CustomPageItem[]`
  - `createPageVariation(sourcePage: CustomPageItem, targetLang: string): CustomPageItem`
  - `resolveLocalizedPageRoute(currentSlug: string, targetLang: string): string`
