---
name: frontend-quality-orchestrator
description: Orquestra criação, alteração, revisão, polish e auditoria de frontend neste projeto. Deve ser usada para tarefas envolvendo UI, UX, HTML, CSS, componentes, páginas, styling, responsividade, design system, implementação de Figma, revisão visual, acessibilidade ou pedidos para profissionalizar/remover aparência de IA.
---

# Frontend Quality Orchestrator

Use this as the default entry point for frontend work in this SevenUp landing page project.

This project is an existing static HTML/CSS landing page. Do not redesign it by default. Preserve the current SevenUp identity: warm clinical elegance, real imagery, cream/brown/taupe palette, oversized editorial typography, and restrained interactions.

## Required Context

Before meaningful frontend work, read:

- `docs/frontend/PRODUCT.md`
- `docs/frontend/DESIGN.md`
- `docs/frontend/FRONTEND_PLAYBOOK.md`

For audits, also read:

- `docs/frontend/BASELINE_AUDIT.md`

Use the code as source of truth when docs and implementation disagree.

## Source Priority

1. Explicit user request.
2. Figma supplied for the task.
3. Existing CSS variables, class families, section patterns, and assets.
4. `docs/frontend/PRODUCT.md`.
5. `docs/frontend/DESIGN.md`.
6. Strong existing sections in the product.
7. Local design skills.
8. Model defaults.

Generic recommendations from a design skill never override the actual product identity.

## Natural Routing

The user should not need to invoke skills by name.

- Build/new UI: use project context, existing patterns, UI UX Pro Max for design gaps, frontend-design for new aesthetic direction, then implement and validate.
- Figma implementation: use Figma MCP first, adapt the design to existing HTML/CSS patterns, and do not paste generated Figma code blindly.
- Polish/professionalize: use Impeccable critique/layout/typeset/polish as lenses, then fix relevant issues while preserving content and behavior.
- "Cara de IA", "genérico", "vibe coded", "AI slop": use unslop-ui scanner and Impeccable distill/quieter/polish concepts, but preserve SevenUp's real identity.
- Audit/review: audit first, classify findings, and do not redesign silently.
- Accessibility: apply semantic HTML, focus-visible, keyboard, touch target, contrast, reduced motion, form states, and Vercel Web Design Guidelines.

## Implementation Rules

- Prefer `reuse > compose > extend > create`.
- Do not introduce a framework, component library, Tailwind, build system, or runtime dependency unless the user asks or the need is concrete.
- Keep small requests small.
- For HTML/CSS edits, stay near the relevant section file when possible.
- Use existing tokens in `styles/global.css`.
- Preserve user or prior local changes; check `git status --short` before edits.
- For Figma work, load the Figma design-to-code guidance before `get_design_context`.
- Validate visually on desktop and mobile for layout changes when possible.

## Local Tools

Useful local skills:

- `.agents/skills/impeccable`
- `.agents/skills/ui-ux-pro-max`
- `.agents/skills/unslop-ui`
- `.agents/skills/web-design-guidelines`
- `.agents/skills/frontend-design`

Useful scanner:

```bash
python3 .agents/skills/unslop-ui/scripts/devibe_scan.py index.html --json
python3 .agents/skills/unslop-ui/scripts/devibe_scan.py styles --json
```

Do not scan `.agents` as product UI; that produces false positives from the tools themselves.

## Output Expectations

After completing frontend work, summarize:

- what changed;
- where it changed;
- what validation ran;
- any remaining risk or manual check.

Keep the explanation short unless the user asks for a full report.
