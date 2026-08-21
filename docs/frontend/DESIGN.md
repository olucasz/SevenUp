# SevenUp Frontend Design Context

This document records the current design before future improvements. Do not replace this visual language with generic generated UI unless explicitly requested.

## Visual Language

- Personality: warm clinical elegance, organic premium, human care, local sophistication.
- Minimalism: restrained but expressive; not flat utilitarian minimalism.
- Density: large editorial sections with real imagery and focused copy.
- Contrast: cream/dark/brown section contrast with softer taupe social proof.
- General style: image-led landing page, oversized display type, muted earth palette, subtle borders, simple interactions.

## Typography

Tokens:

- `--font-display: "Tosh A", system-ui, sans-serif`
- `--font-body: "Area Normal", system-ui, sans-serif`

Loaded font faces:

- `Tosh A` light 300
- `Tosh A` regular 400
- `Area Normal` light 300

Observed usage:

- Display headings use `Tosh A`, usually 300 to 500 weight.
- Body copy uses `Area Normal`, often 200 to 300 in CSS even though only 300 is declared locally.
- Hero headline uses very large display type, tight line-height around `0.82` to `0.96`.
- Section titles commonly use clamp ranges from roughly `46px` mobile to `132px` desktop.
- Body copy is compact: line-height often `1.04` to `1.25`.
- Letter spacing should remain `0`; avoid negative tracking except when matching Figma evidence.

Rules:

- Keep hero-scale type only for true hero/section statements.
- Keep compact body text readable; do not let low line-height cause crowding on mobile.
- Do not introduce generic Inter/Roboto/Geist typography unless the brand direction changes.

## Colors

CSS variables from `styles/global.css`:

- `--seven-cream: #fff7ea`
- `--seven-nav-cream: #ece5d9`
- `--seven-brown: #60321c`
- `--seven-dark: #1e140f`
- `--seven-dark-card: #150d0a`
- `--seven-ink: #231813`
- `--seven-taupe: #c1ab91`
- `--seven-muted: #d9d9d9`

Color behavior:

- Cream is the primary light surface.
- Brown is the main brand/action color and major section background.
- Dark brown/near black is used for strong trust/form/about sections.
- Taupe is used for testimonials/social proof.
- Text is usually ink on light/taupe and cream on brown/dark.

Avoid:

- Purple/blue gradients.
- Random accent colors per feature.
- Generic spa sage/cream palette unless grounded in SevenUp assets.
- Gradient text.

## Spacing

The project uses hand-tuned section spacing with `clamp()` and responsive media queries, not a formal spacing scale.

Common patterns:

- Desktop horizontal gutters: `28px`, `56px`, `96px`, or `calc(100% - Npx)`.
- Main content widths: about `980px`, `1056px`, `1080px`, `1120px`, `1180px`, `1198px`.
- Mobile gutters: usually `18px`, `20px`, `22px`, or `24px`.
- Section vertical padding: often `54px` to `108px`, with large hero/intro blocks.

Rules:

- Preserve the measured editorial rhythm.
- Use stable dimensions for fixed image bands and tools.
- Prefer adjusting existing section CSS over adding nested layout wrappers.

## Radius

Patterns:

- Most image frames are square or lightly rounded.
- CTA/form elements use moderate radii such as `10px`, `12px`, `13px`, `14px`.
- FAQ cards use `16px`.
- Appointment card uses larger `38px` desktop and `22px` mobile.
- About decorative ovals use `999px`; these are intentional background shapes, not card/button defaults.

Avoid:

- Turning every section into rounded cards.
- Excessive pills unless the shape is a deliberate brand/decorative element.

## Shadows

Shadows are sparse:

- Hero CTA: soft brown shadow.
- About portrait: subtle large shadow.
- Most hierarchy relies on color, typography, image scale, borders, and spacing.

Avoid using shadows to compensate for unclear hierarchy.

## Layout

Stack:

- Static HTML in `index.html`.
- CSS split by section under `styles/sections/`.
- `styles/global.css` imports section CSS and defines tokens/base reset.

Containers:

- Full-width sections with constrained inner widths.
- Header uses a three-column nav with centered logo on desktop.
- Mobile hides nav links and centers the logo.

Major section patterns:

- Home: two image panels, centered oversized headline and brand mark.
- Hero: centered copy, three-image horizontal gallery, centered CTA.
- Services: alternating two-column image/copy rows; mobile stacks image then content.
- Clinic: intro with watermark plus two image grid rows.
- About: dark heading band plus cream bio/photo split.
- Reviews: taupe band with testimonial rows.
- Location: map with overlapping address card and footer heading/hours.
- Appointment: dark form card.
- FAQ: dark brown accordion list.
- Footer: three-column nav/social.

Breakpoints:

- Main mobile breakpoint: `max-width: 768px`.
- Notebook adjustments: `max-width: 1366px`.
- Some large-screen polish: `min-width: 1500px`.
- Small mobile special case in home: `max-width: 374px`.

## Components

There is no component framework. Reusable patterns are class families:

- `site-header`, `site-nav`, `site-footer`
- `home-hero`
- `hero-section`
- `services-section`, `service-item`
- `clinic-section`
- `about-section`
- `reviews-section`, `review-card`
- `location-section`
- `appointment-section`, `appointment-form`
- `faq-section`, `faq-item`

Before adding new primitives, reuse or extend these patterns.

## Interaction

Current interactions:

- Anchor navigation.
- CTA hover translate/shadow/opacity.
- Service links hover translate.
- Location route hover translate.
- Appointment fields focus border/background.
- FAQ uses native `details`/`summary`.
- Footer links hover translate.

Focus:

- Global `:focus-visible` outline uses `var(--seven-brown)`.

Missing or partial:

- No explicit disabled/loading/error states for the form.
- No `prefers-reduced-motion` handling for transitions.
- No client-side validation behavior.

## Product-Specific Patterns

- Real photography carries trust and subject matter.
- Earthy clinical palette: cream, ink, brown, taupe.
- Oversized organic display typography rather than startup UI typography.
- Botanical/brand watermark graphics are used as atmospheric context.
- Copy emphasizes safety, natural results, multidisciplinarity, and local clinic presence.

## Anti-Patterns

- SaaS dashboard aesthetic.
- Generic card grids for every content group.
- Hero plus three feature cards by reflex.
- Purple/blue gradients, glow, glassmorphism, gradient text.
- Random icon sets or emoji icons.
- Overly rounded/pill UI everywhere.
- Replacing real images with stock-like abstract decoration.
- Making the page too beige/sage generic without the SevenUp brown/ink contrast.
- Adding new dependencies for simple static interactions.
