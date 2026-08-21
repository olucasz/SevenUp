# SevenUp Frontend Baseline Audit

Date: 2026-08-20

Scope: current static landing page, `index.html`, `styles/global.css`, and `styles/sections/*.css`.

This is a baseline, not a redesign proposal. No visual fixes are required by this file.

## Stack Snapshot

- Framework: none.
- Language: HTML and CSS.
- Package manager: none detected.
- Build system: none detected.
- Routes: single static page with anchor navigation.
- UI library: none.
- CSS solution: plain CSS split by section.
- Tailwind: not present.
- Design tokens: CSS variables in `styles/global.css`.
- Dark mode: none.
- Icons: mostly image/SVG assets; FAQ plus icon drawn in CSS.
- Figma: MCP configured as `figma`, enabled, URL `https://mcp.figma.com/mcp`.
- Tests/lint/formatter: none detected.
- Browser/E2E tooling: none detected.
- Agent instructions: no `AGENTS.md` existed before this setup.
- Existing local change before setup: `styles/sections/reviews.css` was modified from the reviews refinement.

## Installed Frontend Skills

- `.agents/skills/impeccable`
- `.agents/skills/ui-ux-pro-max`
- `.agents/skills/unslop-ui`
- `.agents/skills/web-design-guidelines`
- `.agents/skills/frontend-design`
- `.agents/skills/frontend-quality-orchestrator`

## Scanner Results

Command:

```bash
python3 .agents/skills/unslop-ui/scripts/devibe_scan.py index.html --json
python3 .agents/skills/unslop-ui/scripts/devibe_scan.py styles --json
```

Results:

- `index.html`: clean, no tells detected.
- `styles`: mostly clean, minor tells.
- Findings in app code: 2 medium `rounded-everything` findings in `styles/sections/about.css` lines 140 and 154.

Triage:

- These two findings are decorative oval background shapes, not generic pill/card UI. Treat as acceptable unless future visual review shows they feel accidental.
- A full project scan including `.agents/skills` reports many false positives from scanner/skill implementation files. Exclude `.agents` when evaluating product UI.

## P0 - Blocking

None identified in this setup pass.

## P1 - High Priority

- No production form handling or validation behavior is present. The form uses `action="#"`, button `type="button"`, and no error/success/loading states.
- Some font weights used in CSS (`200`, `450`, `500`) do not have matching local `@font-face` declarations, so rendering may depend on browser synthesis or fallback behavior.
- No formal build/lint/test pipeline exists. This is acceptable for a small static page, but production readiness depends on manual/browser QA.

## P2 - Improvements

- Header CSS has duplicated `.site-header` blocks and one block temporarily sets `position: relative` before another resets fixed behavior.
- Several CSS comments and abandoned rules remain, such as commented borders and image-radius lines.
- `about-section__eyebrow` contains a desktop `font-size: 40000px` and a notebook `margin-left: px`; currently the eyebrow markup is commented out, but these rules are hazardous if re-enabled.
- Accessibility can be improved with clearer form validation, privacy-policy link target, and more complete keyboard/focus review.
- Motion/transitions do not currently include a `prefers-reduced-motion` override.

## P3 - Taste / Preference

- Section line-heights are intentionally tight and Figma-like, but some body copy may benefit from future readability passes on smaller screens.
- The visual language relies heavily on large type and strong color bands; preserve this, but validate every new section against mobile rhythm.
- Border radius is mostly restrained, with intentionally large decorative ovals in About.

## Consistency

Strengths:

- Strong palette consistency through CSS variables.
- Section-specific CSS organization is easy to scan.
- Real imagery is used throughout and supports the clinic identity.
- Mobile breakpoints are present for all major sections.

Risks:

- Repeated one-off measurements and hand-tuned values can drift.
- No shared component abstraction exists, so similar controls may diverge if new sections are added quickly.

## Hierarchy And Layout

Strengths:

- Hero and section headings have strong editorial hierarchy.
- Services use a clear alternating image/copy rhythm.
- Location and appointment sections create clear conversion points.

Risks:

- Some large type blocks are fragile on narrow screens and need visual QA after text changes.
- The page has no automated layout regression checks.

## Typography

Strengths:

- Distinct brand typography, not generic startup typography.
- Consistent display/body split.

Risks:

- Missing declared font faces for some weights.
- Tight line-height may become cramped with copy edits.

## Spacing

Strengths:

- Good section separation and image rhythm.
- Mobile gutters are mostly consistent around 18-24px.

Risks:

- No formal spacing scale; use existing section rhythm as the standard.

## Responsiveness

Strengths:

- Dedicated mobile rules exist for all sections.
- Services stack in a sensible image-first pattern.

Risks:

- Header mobile hides nav entirely; no mobile menu behavior exists.
- Long Portuguese copy must be checked after edits.

## Accessibility

Strengths:

- Semantic sections, headings, nav, footer, form labels, `address`, and native `details`.
- Global `:focus-visible` is present.

Risks:

- Form submit flow is not functional.
- Some links use `href="#"` placeholders.
- No explicit reduced-motion handling.
- No automated accessibility audit configured.

## Design-System Reuse

There is no separate design-system layer. Reuse currently means using:

- CSS variables in `styles/global.css`.
- Existing section class families.
- Existing typography and color patterns.
- Existing image framing and responsive breakpoints.

## AI Design Tells

Product files are mostly clean according to `unslop-ui`.

Avoid future drift into:

- generic card grids;
- AI-purple gradients;
- gradient text;
- emoji icons;
- excessive pills;
- stock abstract illustrations;
- generic cream/sage spa defaults.

## Quick Wins

- Add `prefers-reduced-motion` handling for transitions.
- Remove or fix dead/hazardous CSS declarations.
- Add real form submit behavior and validation states when backend/contact flow is defined.
- Add actual social URLs and privacy policy link when available.

## Structural

- Decide whether this static site needs a small build/lint pipeline before production.
- Consider a lightweight visual QA checklist for each section instead of adding a heavy framework.

## Design Debt

- Hand-tuned CSS values are currently manageable, but new work should document reusable patterns instead of adding arbitrary one-off numbers.
- Current section styling is expressive; avoid normalizing it into generic component-library defaults.

## Accessibility Debt

- Form flow and status messaging.
- Link placeholders.
- Reduced motion.
- Automated checks TBD.

## License / Security Notes From Installers

- `unslop-ui`: installer reported Gen Safe, Socket 0 alerts, Snyk Low Risk.
- `web-design-guidelines`: installer reported Gen Safe, Socket 0 alerts, Snyk Med Risk.
- `frontend-design`: installer reported Gen Safe, Socket 0 alerts, Snyk Low Risk.
- Impeccable was installed via its CLI; no installer risk table was emitted in the successful output.
- UI UX Pro Max was installed via `uipro-cli`; no installer risk table was emitted.
- No secrets or tokens were added by this setup.
