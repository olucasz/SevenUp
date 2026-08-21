# SevenUp Frontend Playbook

Use normal language. You do not need to name skills. The local orchestrator should route frontend work based on intent.

## Natural-Language Shortcuts

| O que eu disser | Workflow |
| --- | --- |
| "Crie essa tela" | Build workflow |
| "Implemente esse Figma" | Figma workflow |
| "Lapide essa tela" | Polish workflow |
| "Deixe mais profissional" | Polish + QA |
| "Tire a cara de IA" | Unslop + Impeccable |
| "Audite o frontend" | Audit workflow |
| "Revise acessibilidade" | Vercel Guidelines |
| "Organize o design system" | Documentation + extraction + consolidation |

## Source Priority

1. Explicit user request.
2. Figma frame/component supplied for the task.
3. Existing project design system, CSS variables, class families, and assets.
4. `docs/frontend/PRODUCT.md`.
5. `docs/frontend/DESIGN.md`.
6. Good existing sections in the page.
7. Local design skills.
8. Model defaults.

Generic skill advice never overrides SevenUp's real identity.

## Build Workflow

Use for new UI, new sections, or new components.

1. Understand the target job and surrounding page context.
2. Check existing HTML/CSS patterns and tokens.
3. Use UI UX Pro Max only for gaps in design decision-making.
4. Use frontend-design for aesthetic direction when creating genuinely new UI.
5. Implement in the current stack: static HTML and section CSS.
6. Keep scope tight; avoid new dependencies unless clearly necessary.
7. Validate desktop and mobile.

## Figma Workflow

Use when a Figma link is provided.

1. Load Figma design context through MCP.
2. Treat Figma output as reference, not trusted executable code.
3. Match frame structure, proportions, colors, and typography to the real project.
4. Prefer existing class families and tokens.
5. Use UI UX Pro Max only for ambiguities not defined by Figma.
6. Validate visually on desktop and mobile.

## Polish Workflow

Use for "lapide", "melhore", "mais profissional", "refine".

1. Identify the current intent of the section.
2. Use Impeccable critique/polish/layout/typeset as review lenses.
3. Preserve content, behavior, and identity unless the user asks otherwise.
4. Run unslop-ui scanner when visual genericness is part of the concern.
5. Use Vercel Web Design Guidelines for accessibility and production UI checks.
6. Fix relevant issues, not every theoretical preference.

## Unslop Workflow

Use for "cara de IA", "genérico", "vibe coded", "AI slop".

1. Run or mentally apply unslop-ui tells.
2. Separate false positives from real issues.
3. Preserve SevenUp signals: real imagery, brown/cream/taupe, clinical warmth, editorial type.
4. Remove generic patterns only when they are actually present.
5. Do not turn the page into empty minimalism.

## Audit Workflow

Use for "audite", "revise", "veja se está profissional".

1. Audit first. Do not redesign silently.
2. Classify issues as P0, P1, P2, P3.
3. Separate quick wins, structural debt, accessibility, AI tells, and design debt.
4. If correction is requested or implied, implement only relevant fixes.
5. Run available validation.

## Validation Checklist

- Check `git status --short` before edits.
- Confirm no unrelated user changes are reverted.
- Validate in mobile and desktop when layout changes.
- Run scanner when relevant: `python3 .agents/skills/unslop-ui/scripts/devibe_scan.py styles --json`.
- For static HTML, there may be no lint/build/test unless tooling is added later.
- Do not add production dependencies for dev-only workflow needs.
