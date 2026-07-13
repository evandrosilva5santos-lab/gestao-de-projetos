# START INC. Design System

**START INC.** is a Growth, Marketing and AI company that helps businesses scale through high-performance digital strategies, branding, automation and technology. It designs complete digital ecosystems — paid media, websites, landing pages, CRM integrations, AI and sales automation — to create predictable customer acquisition and business growth.

**Target audience:** small and medium businesses, medical clinics, law firms, local businesses, B2B companies, service providers, and companies scaling with marketing and AI.

**Core values:** clarity, performance, simplicity, premium experience, data-driven decisions, conversion first.

**Positioning:** feel closer to Stripe, Linear, Notion, Apple and Framer than to a traditional marketing agency. Generate trust first, authority second, conversion third. Avoid generic marketing-agency visuals and stock-photo feeling; favor real business scenarios — dashboards, automation, AI, strategy, measurable growth.

## Sources provided

This design system started from a brand brief (no codebase or Figma file was attached) plus the following uploaded assets, kept in `assets/logos/`:
- `uploads/[criativo] logo - start-inc-horizontal-azul-1.png` — horizontal lockup, blue (full wordmark; used as `assets/logos/start-inc-horizontal-blue.png`). The plain `-azul.png` / `- cópia.png` variants export with the "START Inc." wordmark missing (a broken export) and were not used.
- `uploads/[criativo] logo - start-inc-vertical-azul-branco.png` — vertical lockup, blue + white wordmark
- `uploads/[criativo] logo - start-inc-vertical-azul-v2.png` — vertical lockup, blue wordmark
- `uploads/[criativo] logo - start-inc-negativa.png` — negative (white) mark, for dark backgrounds
- `uploads/[criativo] logo - start-inc-simbolo-azul.png` — symbol only (the "S" rocket mark)
- `uploads/[criativo] imagem - start-inc-proposta-bni.png` — a photo of a team member with an award plaque; kept in `assets/` for reference only, not used as a brand asset (it's an event photo, not on-brand imagery)

Because no component library or codebase was attached, all React components in `components/` are an **intentional, from-scratch standard set** sized to the brief's listed sections (Navbar, Hero, Services, Testimonials, Portfolio, Statistics, CTA, Forms, Pricing, FAQ, Footer) — see "Intentional additions" below.

**The real website.** `ui_kits/website/` and `templates/website-homepage/` were later rebuilt to recreate START INC.'s actual live site, [startcompanydigital.com](https://startcompanydigital.com/), replacing the earlier invented copy. The user also pointed at `github.com/JCodesMore/ai-website-cloner-template` — that repo is a generic Next.js + shadcn/ui scaffold with a `/clone-website` agent skill for AI-driven site cloning, not the target site's own source, and it isn't runnable in this environment (no Node/Next.js execution here). Its *approach* (inspect the live page, extract real copy/structure/assets, rebuild faithfully, no invented content) was followed manually: the live page was fetched and read directly, and every heading, stat, testimonial, team member, and footer detail below is copied verbatim from it. **Real photography could not be retrieved into this project** — the live site's images (CEO/team photos, client logos, branding portfolio, testimonial headshots) live at `startcompanydigital.com/wp-content/uploads/...` and would need to be uploaded by the user to replace the current placeholder tiles/avatars in `ui_kits/website/`.

## Index

- `styles.css` — root stylesheet, imports everything below. Link this one file.
- `tokens/` — `colors.css`, `typography.css`, `spacing.css`, `effects.css` (shadows/motion), `fonts.css` (Poppins + Rubik via Google Fonts — os do site real)
- `base.css` — minimal element resets or leave to consumers
- `guidelines/` — foundation specimen cards (Colors, Type, Spacing, Brand groups) shown in the Design System tab
- `assets/logos/` — all provided logo lockups
- `components/core/` — Button, Badge, Card, Tag
- `components/forms/` — Input, Select, Checkbox, Radio, Switch
- `components/feedback/` — Toast, Tooltip, Dialog
- `components/navigation/` — Navbar, Tabs
- `ui_kits/website/` — recreation of the real startcompanydigital.com homepage (Navbar → Hero → Serviços → Branding portfolio → CTA → Sobre Nós → Missão → Marcas/Clientes → Equipe → Depoimentos → Contato → Blog → Newsletter → Footer); source of truth for the sections
- `templates/website-homepage/` — the same homepage packaged as a template for consuming projects
- `SKILL.md` — portable skill definition for use in Claude Code

## Components

Core: **Button** (primary/secondary/ghost/dark), **Badge** (status pills), **Card** (premium surface), **Tag** (removable filter chip).
Forms: **Input**, **Select**, **Checkbox**, **Radio**, **Switch**.
Feedback: **Toast**, **Tooltip**, **Dialog**.
Navigation: **Navbar** (sticky/translucent), **Tabs** (underline).

### Intentional additions
No component source was attached, so this is a standard from-scratch set rather than a recreation. Every family maps directly to a section the brief calls out (Forms → Input/Select/Checkbox/Radio/Switch; Navbar → Navbar/Tabs) plus small utility primitives (Badge, Tag, Tooltip, Toast, Dialog) needed to build the premium marketing-site feel referenced (Stripe/Linear/Notion/Apple/Framer) without inventing exotic patterns.

## Iconography

No icon font, sprite sheet, or SVG set was provided. **Lucide** icons are used via CDN (`https://unpkg.com/lucide@latest`) as the closest match to the thin, geometric, single-weight icon style implied by the brand's clean/minimal direction — this is a **substitution, flagged for the user**. No emoji, no unicode glyphs as icons. If START INC. has an existing icon set, replace the Lucide references in `ui_kits/website/` with it.

## Content fundamentals

The real site's copy is Brazilian Portuguese, direct-response in structure (numbered stats, testimonials with star ratings, urgency CTAs like "AINDA HOJE!"), and more assertive/sales-forward than the brief's Stripe/Linear-inspired tone below — that gap is worth flagging to the user. The voice guidance below was derived from the brief's stated philosophy ("premium, minimal, conversion-focused, highly strategic") before the real copy was available; treat it as the aspirational direction for *new* copy, while `ui_kits/website/` intentionally preserves the real site's actual (more traditional agency) voice verbatim.

- **Address:** second person ("you/your business"), first person plural for the company ("we design," "our team") — a strategic partner speaking to an owner/operator, not a vendor pitching a stranger.
- **Casing:** sentence case everywhere — headlines, buttons, nav labels. No ALL CAPS except tiny eyebrow labels/badges (e.g. "SERVICES", tracked wide, 11–12px) used sparingly as a section kicker.
- **Sentence rhythm:** short, declarative headlines (4–8 words) paired with one calm supporting sentence. Avoid stacked adjectives and hype ("revolutionary," "game-changing," "10x"). Let specificity do the convincing — numbers, mechanisms, outcomes.
- **Vocabulary:** "systems," "ecosystems," "predictable growth," "strategy," "automation," "acquisition," not "hacks," "secrets," "explode your sales." Sounds like an operator, not an ad.
- **Emoji:** never. **Exclamation points:** avoid; confidence doesn't need punctuation.
- **CTAs:** action + low-friction framing — "Book a strategy call," "See how it works," "Talk to our team" — never "Buy now" or "Sign up now!!!"
- **Proof over hype:** prefer a concrete metric or client type over a superlative. "Built for clinics, law firms and B2B teams" beats "the best marketing agency."

Example headline pair (used in the UI kit hero):
> "Growth engineered, not guessed." / "We combine paid media, AI and automation into one system built to convert."

## Visual foundations

**Extracted from the live site (Elementor kit post-2167 in the saved page HTML) — this is the real brand, replacing the earlier brief-derived values.**

- **Color:** navy `#1D274E` (kit primary — headings, dark sections), button blue `#054B8D` (kit accent — all CTAs), light blue `#0093E0` (kit secondary — nav links, gradients), sky highlight `#54C3FE`. Text is `#292929` (also the footer/testimonials background); grays `#787878` (muted), `#A7A7A7`, `#D9D9D9` (borders), `#F8F8F8` (alt sections). Section rhythm: white → `#F8F8F8` → dark (`#292929` footer, navy hero com foto de fundo).
- **Type:** Poppins for ALL headings and UI — display weight **900** (hero 70px/1.2, giant numerals 90–300px), section titles 35px/600, kit "primary" heading 25px/800 **uppercase**, kit "secondary" 22px/700 uppercase. Body is **Rubik 15px/1.7** — small, quiet, readable. The contrast display-900 vs body-400 is the core typographic move.
- **Buttons:** solid `#054B8D`, **30px pill radius**, Poppins 13px/600, padding ~14×22px. Site CTAs frequently ALL-CAPS ("ENTRE EM CONTATO", "FALE COM NOSSO TIME DE ESPECIALISTAS").
- **Cards:** service cards use the gradient `linear-gradient(270deg, #0093E0 0%, #0C5CB8 100%)` with a sharp **3px radius** and no shadow; white content cards sit on `#F8F8F8`. Radii geral: 3px (cards) a 10px, 30px pill só em botões — o site é mais "sharp" que o brief sugeria.
- **Backgrounds:** hero uses a full-bleed photographic background (dark, com overlay); depoimentos e footer em `#292929`; demais seções alternam branco/`#F8F8F8`.
- **Animation:** Elementor defaults — 300ms eases, hover grow (scale 1.1) em ícones/botões, entrance fades. Nada de bounce.
- **Imagery:** fotografia real (CEO, equipe, clientes, festival) + mockups de branding em grid; carrossel de 19 logos de clientes; selos de certificação (Google Partner, Meta Business Partner, Active Campaign) no footer.
- **Layout:** conteúdo max ~1140px (Elementor default), grid 12 col desktop.

## Fonts

Primary: **Poppins** (todos os títulos, botões, UI — pesos 400–900, display em 900). Secondary: **Rubik** (corpo de texto, 15px/1.7). Ambas exatas do site real, carregadas do Google Fonts via `tokens/fonts.css`. (O brief original pedia Manrope + Inter, mas o site real usa Poppins + Rubik — o site venceu.)
