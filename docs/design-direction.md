# Premier Cleaners Design Direction

> **Superseded in part (2026-10-01):** The owner input and owner follow-up of 2026-10-01 (docs/owner-input-2026-10-01.md, docs/owner-followup-2026-10-01.md), recorded in BUSINESS.md Revision #2, supersede this file's three-service, owner-portrait/visibility, review/testimonial, service-area and top-tier/big-city statements. Where they conflict, follow BUSINESS.md Revision #2.

Status: strategy artifact for mission-001. This document defines the visual and experience direction only. It does not authorize unsupported business claims, extra services, copied competitor material, or production placeholders.

## Delivered Integration Note

The current public implementation follows the decision 009 refinement direction: Home uses a solid navy editorial text field beside naturally colored hallway photography, the Home service overview uses ruled rows instead of default cards, and the About page separates Donald-specific accountability copy from unidentified worker photography. The corrective integration also keeps mobile service indices in a fixed no-wrap column, gives the central accountability section h2-level visual weight, uses compact mobile summary/photo compositions, and presents Donald modules as text-led responsible-contact blocks rather than placeholder profile tiles. The deployed output remains static HTML/CSS with one small navigation script, real photo derivatives only, and no visible public placeholders.

## Source Basis

- BUSINESS.md sections 1-6, 19-20, 28-30, 37-43, and 50-55 define the brand target: top-tier commercial cleaning for Greater Rochester with direct accountability and a human relationship.
- repository-research.md confirms the current repo has 13 original photos, no standalone logo, no confirmed Donald portrait, and real navy/yellow Premier shirt evidence.
- competitor-research.md provides market context only: ABM for enterprise confidence, CleanCraft for regional polish, Coverall for structured commercial focus, Janitronics for mature regional positioning with rendered-visual limits. Do not copy competitor wording, graphics, colors, photo treatment, section shapes, or CTAs.

## Strategic Impression

The first read should be "serious commercial provider" before it becomes "personally accountable." Premier should not look tiny, cheap, cute, or like a consumer cleaning template. The differentiator is not smallness; it is clear access to Donald or the person responsible for the account.

Use this sequence in visual hierarchy:

1. Commercial capability.
2. Greater Rochester relevance.
3. Clear contact path.
4. Direct accountability and flexible plans.
5. Donald's involvement and real working relationship.

## Visual Thesis

Premium commercial services with human warmth. The design should feel capable of representing a major-city facility services firm while staying specific to Premier's real photos, navy/yellow shirts, and owner-accountability positioning.

Avoid:

- Repeated card grids as the default section answer.
- Badge-heavy proof without actual proof.
- Cleaning icons as the main identity system.
- Cute sparkle language or commodity service tropes.
- Big decorative curves inspired by competitor layouts.
- Overstated scale, guarantees, certifications, years, metrics, or client names.

## Palette

The palette is grounded in the real work shirts: navy fabric with yellow Premier lettering, softened by warm facility neutrals.

Use:

- Deep navy: `#12213D` for headers, footer, primary text on light surfaces, and selected dark bands.
- Workshirt navy: `#1D2F5F` for secondary dark surfaces and brand accents.
- Premier yellow: `#F4C51E` for high-attention details, small rules, CTA fills, focus accents, and selected active states.
- Warm white: `#F8F5EF` for page background.
- Paper: `#FFFCF6` for content fields that need slightly brighter contrast.
- Stone: `#D8D1C4` for rules, separators, and quiet borders.
- Warm gray: `#6E6A62` for secondary copy.
- Facility wood/copper accent: `#92552F` used sparingly to echo elevator and interior warmth while meeting normal-text contrast on warm light surfaces.
- Deep ink: `#111827` for body text when the context needs maximum readability.

Rules:

- Navy and warm white should do most of the work.
- Yellow should feel precise, not loud: thin rules, counters, underlines, CTA details, focus rings.
- Do not build a one-note blue site; use warm neutrals and real photo colors to counterbalance navy.
- Do not use gradients as the main brand device.

## Typography

Use a strong sans-serif system with an editorial stance and no heavy dependency.

Recommended implementation:

- Headings: system sans stack, `font-family: Inter, "Segoe UI", Arial, sans-serif` if a local or system-safe approach is used. If web fonts are introduced later, keep total font transfer under the mission budget and use a serious grotesk or humanist sans.
- Body: `font-family: "Segoe UI", Arial, sans-serif`.
- Numerals, process labels, and small metadata: same sans family, uppercase only for short labels.

Scale:

- Mobile hero headline: 42-50px line-height near 0.95-1.02, responsive with clamp but not viewport-width scaling alone.
- Desktop hero headline: 72-96px, short lines, no letter-spacing tricks.
- Section headings: 34-52px desktop, 28-36px mobile.
- Body copy: 17-19px desktop, 16-18px mobile.
- Small labels: 12-14px with moderate weight, letter spacing no more than 0.06em where uppercase labels are used.

Voice in type:

- Use large confident type for the few claims that matter.
- Pair it with concise body copy rather than dense paragraphs.
- Avoid pill labels and badge stacks unless they carry real navigation or evidence.

## Layout And Spacing

Overall composition should feel editorial, structured, and varied. Use a 12-column desktop grid and deliberate mobile stacking.

Spacing:

- Desktop outer margin: 48-72px.
- Tablet outer margin: 32-48px.
- Mobile outer margin: 20px, with 320px checks.
- Section rhythm: 80-128px desktop vertical spacing, 56-80px mobile.
- Max text measure: 62ch for body prose; hero copy tighter at 46-54ch.

Composition rules:

- Use full-width bands and unframed layouts, not cards inside cards.
- Services may use a three-column structured comparison on desktop, but the first service overview should not read as generic cards only.
- Use large text blocks, offset image crops, process lanes, and source-note-like micro details to create variety.
- Use vertical rules, numbered steps, and aligned metadata to imply precision.
- Keep navigation proportionate; this is a four-page site, not an enterprise portal.

## Homepage First Viewport

At 390x844, the first screen must show all of the following without scrolling past the first viewport:

- Premier Cleaners brand name or wordmark.
- Commercial cleaning.
- Greater Rochester or Rochester-area location.
- Accountability message.
- Phone action or clearly visible call action.
- Walk-through/contact action or direct path to contact.

Mobile hero layout:

- Top nav: compact wordmark, phone link, menu button if needed.
- Hero text first, not a photo-first mobile crop.
- Suggested hierarchy:
  - Eyebrow: "Greater Rochester commercial cleaning"
  - H1: "Commercial cleaning. Personal accountability."
  - Support: "Professional cleaning for Rochester-area facilities with flexible service, direct communication, and someone responsible for getting it right."
  - CTA row: "Request a Walk-Through" and "Call 585-340-6868"
  - A narrow real-photo strip or cropped work detail can appear at the bottom edge of the viewport if it does not push the message out.

## Page-Level Composition

Home:

- Editorial hero with large headline and immediate CTAs.
- A compact "what you know right away" strip: commercial cleaning, Greater Rochester, three service categories, accountable contact. Do not include fake metrics.
- Services overview with three categories only.
- Accountability section with the direct-access idea as the lead, then flexibility and proactive care.
- Process section using a precise horizontal or vertical lane: conversation -> walk-through -> tailored scope -> service launch -> ongoing accountability.
- Donald section as text-led until a confirmed portrait exists. Use Donald's name and role, not a fake portrait.
- Real-photo mosaic near the middle or lower page to show actual work without pretending identities.
- Final CTA.

Services:

- Capability-first headline.
- Three major sections only: Commercial Janitorial Cleaning, Medical / Clinical Facility Cleaning, Floor Care.
- Each service gets a distinct purpose, who it fits, how scope is tailored, and what not to overclaim.
- End with custom scope process and phone/walk-through CTA.

About:

- Lead with accountability philosophy, not chronology.
- Donald is named as the public face and relationship owner where supported.
- Use unconfirmed portrait guidance instead of identifying any existing worker as Donald.
- Explain how the company should feel to clients: clear responsibility, accessible communication, facility-specific plans.

Contact:

- Make phone the primary conversion path.
- No fake form unless a working handler is implemented later.
- Show phone, hours 7 AM-9 PM, Greater Rochester.
- Do not show email, address, exact days, domain, or specific suburbs unless confirmed.

## Image Direction

Use real photos, but crop and caption conservatively.

Priority assets:

- `assets/photos/CleanedHallway.jpg`: premium architectural/facility signal. Use for hero support or a services/process visual after orientation correction. Watch tilt and crop for clean verticals.
- `assets/photos/Cleaningelevatorhandles.jpg`: strongest accountability/work-detail image with real navy/yellow shirt. Use as a work-detail crop; do not identify the person.
- `assets/photos/CleanedDentistArea.jpg`: clinical interior context. Use to support medical/clinical service broadly, not compliance or named client proof.
- `assets/photos/Floorpolishing.jpg`: real floor-care action and shirt branding. Use for floor care after orientation and crop refinement.
- `assets/photos/Floorpolishing2.jpg`: useful floor/equipment detail only if cropped to remove upper third-party branding.
- `assets/photos/VacuumingFloor.jpg`: tool/floor detail; use tight lower crop if needed.
- `assets/photos/Cleaningbathroomsink.jpg`: janitorial detail with clear shirt branding; supporting only.

Avoid or defer:

- `assets/photos/cleaningwindows.png`: readable UR Medicine identity and window cleaning is not confirmed.
- `assets/photos/DryMoppingthefloor.jpg`: third-party faces/logo/newspaper text.
- `assets/photos/cleraningaroundATM.jpg`: busy notices/security setting.
- `assets/photos/DeepVacuumCleaning.jpg`: extraction-like equipment; carpet extraction is not confirmed.

Image production rules:

- Preserve originals.
- Normalize EXIF orientation on large JPEGs before export.
- Strip metadata from web derivatives.
- Use responsive sources and dimensions to avoid layout shift.
- Alt text must describe the visible image and avoid unsupported identity, proof, compliance, or client-name claims.
- If no confirmed owner portrait exists, use typographic treatment for Donald rather than a substitute person photo.

## Motion And Interaction

Motion should communicate precision and responsiveness, never delay content.

Allowed details:

- Subtle text reveal on first paint after content is already available.
- Image mask reveal on scroll, disabled with `prefers-reduced-motion`.
- CTA hover: yellow rule slides or inverts cleanly, with no bounce.
- Navigation active state: small yellow rule or left-edge marker.
- Process lane: the current step highlights on hover/focus.

Uncommon details to implement purposefully:

1. "Accountability line": a thin yellow line that visually connects the hero CTA to the process lane, then to the final contact CTA. It should feel like a quiet throughline, not decoration.
2. "Responsible contact panel": on Home/About/Contact, a compact text-led module naming Donald's role and the direct-accountability idea, with no portrait until one is confirmed.

Do not use:

- Autoplay video.
- Heavy parallax.
- Cursor gimmicks.
- Continuous animation.
- JS-dependent access to key copy or navigation.

## Navigation And CTA Style

Navigation:

- Four primary links: Home, Services, About, Contact.
- Text wordmark is acceptable because no logo file exists.
- Phone link should be visible on desktop and highly available on mobile.
- Active state should be clear without relying on color alone.

CTAs:

- Primary: "Request a Walk-Through"
- Secondary: "Call 585-340-6868"
- Supporting: "Talk About Your Facility" or "Build Your Cleaning Plan" when context calls for softer language.

CTA styling:

- Primary button can use navy fill on light surfaces or yellow fill on dark surfaces.
- Secondary call action can be text-plus-rule, not another heavy button everywhere.
- Avoid urgent consumer language.

## Competitor Non-Copy Distinctions

- From CleanCraft: learn regional polish and strong commercial structure, but do not use turquoise/green curves, two-tier nav, overlapping photo panels as a signature, or dense proof claims Premier does not have.
- From ABM: learn typographic confidence, hierarchy, and early CTA clarity, but do not mimic sweeping orange/blue graphics, enterprise video posture, or oversized corporate architecture.
- From Coverall: learn clear commercial/service categorization, but avoid franchise/protocol visual language and quote-form pressure.
- From Janitronics: use only text-level market expectation and regional maturity, because rendered visual review was blocked by Cloudflare verification.

## Accessibility And Performance Implications

- Semantic landmarks and headings are part of the design, not an implementation afterthought.
- Keep contrast strong: navy text on warm white, white text on navy, yellow not used as body text on light backgrounds.
- Focus indicators use a high-contrast dark outline on light surfaces and a yellow outline on dark surfaces, with supplemental halo treatment.
- Touch targets should be at least 44px.
- No JS should be required for core navigation or page content.
- Respect `prefers-reduced-motion`.
- Image choices should stay within the mission performance budget; do not ship original multi-MB photos. Below-fold Home, Services, and About imagery should lazy-load while the high-priority Home hero remains eager.

## Launch Unknowns That Affect Design

- Confirmed Donald portrait.
- Donald last name.
- Email/domain/address.
- Exact days for 7 AM-9 PM hours.
- Insurance, bonding, certifications, training, years in business, testimonials, named clients, client logos, service counts, and reviews.
- Permission to use any identifiable client location, logo, or signage.

Until confirmed, omit these from production page design or present them only as readable development review markers outside the public launch content.
