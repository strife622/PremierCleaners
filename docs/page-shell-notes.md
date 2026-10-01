# Page Shell Notes

Status: final-integration notes for the static site. These notes are outside `public/` and are not launch copy.

## Current Route State

- `/` is the integrated Home page with editorial split hero, real hallway photography, structured service rows, process, facility photography, Donald/responsible-contact copy, and final CTA.
- `/services/` contains the three confirmed major service categories with anchors: `#commercial-janitorial`, `#medical-clinical`, and `#floor-care`, plus the `#custom-scope` walk-through section.
- `/about/` explains accountability philosophy and Donald's visible role. Unidentified work photography is kept in a general work-detail section, not used as a Donald portrait.
- `/contact/` is phone-led with `585-340-6868`, `tel:+15853406868`, Greater Rochester, and `7 AM-9 PM`. There is no fake form, placeholder email, or unconfirmed address.
- `public/404.html` is a branded recovery page. The Node preview in `scripts/preview.mjs` serves it with HTTP 404 for unknown routes.

## Shared Hooks

- Header: `.site-header`, `.header-inner`, `.wordmark`, `.site-nav`, `.nav-toggle`, `.header-phone`.
- Layout: `.wrap`, `.section`, `.section-head`, `.page-hero`, `.page-grid`, `.page-card`.
- CTAs: `.button`, `.button.dark`, `.text-link`, `.cta-row`.
- Home-specific foundations: `.hero`, `.quick-strip`, `.service-grid`, `.difference-list`, `.process`, `.photo-mosaic`, `.owner-card`, `.final-cta`.

The mobile navigation is progressive enhancement. With JavaScript disabled, the nav remains visible instead of hidden behind the button.

## Copy Guardrails Preserved

- Use only Commercial Janitorial Cleaning, Medical / Clinical Facility Cleaning, and Floor Care as the confirmed major service categories.
- Do not add standalone office cleaning, windows, extraction, stripping/refinishing, emergency cleaning, certifications, insurance, years, reviews, client names, exact suburbs, address, email, domain, or guarantees unless confirmed later.
- Do not identify any photographed person as Donald.
- Keep phone-led conversion at `tel:+15853406868`; no fake form and no placeholder `mailto`.
