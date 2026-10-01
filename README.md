# Premier Cleaners Static Site

> **Superseded in part (2026-10-01):** The owner input and owner follow-up of 2026-10-01 (docs/owner-input-2026-10-01.md, docs/owner-followup-2026-10-01.md), recorded in BUSINESS.md Revision #2, supersede this file's three-service, owner-portrait/visibility, review/testimonial, service-area and top-tier/big-city statements. Where they conflict, follow BUSINESS.md Revision #2.

Four-page static website for Premier Cleaners, a commercial cleaning company serving Greater Rochester. BUSINESS.md is the factual authority for copy, metadata, alt text, and future edits.

## Prerequisites

- Node.js 18 or newer. This workspace was tested with Node 24.19.0 and npm 11.17.0.
- PowerShell if regenerating image derivatives with `tools/build-assets.ps1`.

No npm dependencies are required.

The optional lab performance helper uses Chrome DevTools Protocol and requires a Node runtime with global WebSocket support. This workspace was tested with Node 24. The helper is separate from the main preview and source check commands.

## Preview

```powershell
npm run preview
```

The preview serves only `public/` at `http://127.0.0.1:4173/`. Directory routes such as `/services/`, `/about/`, and `/contact/` resolve to their `index.html` files. Unknown routes return `public/404.html` with HTTP status 404.

Run the deterministic checks:

```powershell
npm run check
```

Regenerate optimized photo derivatives:

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\build-assets.ps1
```

Optional local lab performance collection, after starting the preview and opening a Chromium session with CDP access:

```powershell
node scripts/lab-performance.mjs <browser-cdp-url> http://127.0.0.1:4173
```

The helper collects three cold-cache JavaScript-enabled samples for each main route at a 390x844 viewport, waits before scrolling, scrolls incrementally through the page, verifies image completion/current sources, and retains per-resource and navigation timing inventories in its JSON output. Missing or zero LCP, observer errors, incomplete images, exceeded budgets, or threshold failures return a nonzero exit code.

## Structure

- `public/` - deployable static output only.
- `public/index.html`, `public/services/index.html`, `public/about/index.html`, `public/contact/index.html` - main pages.
- `public/404.html` - branded recovery page.
- `public/assets/css/styles.css` - shared site styles.
- `public/assets/js/site.js` - small progressive navigation script.
- `public/assets/images/` - optimized web derivatives only; original photos stay outside public.
- `docs/` - design, copy, fact, placeholder, and asset-maintenance notes.
- `tools/build-assets.ps1` - dependency-free image derivative pipeline using Windows/.NET System.Drawing.
- `scripts/preview.mjs` - local static preview with real 404 status.
- `scripts/check-site.mjs` - deterministic source/link/asset/metadata/budget checks.
- `scripts/lab-performance.mjs` - optional CDP-based local lab performance collector for validator-style evidence.
- `validation-temp/` - validator-owned local review artifacts from prior browser/performance probes; this is outside `public/` and should be reviewed or excluded from production source tracking as appropriate.

## Cloudflare Pages

Use the no-framework/static HTML setup:

- Framework preset: None.
- Build command: `exit 0`.
- Build output directory: `public`.
- Deploy only after client approval; no production deploy was performed in this mission.

The public directory includes `404.html`, matching Cloudflare Pages custom not-found behavior, and `_headers` for small static security headers. Domain-dependent metadata, canonical URLs, sitemap URLs, and LocalBusiness structured data are intentionally omitted until the domain, address, logo, and full business facts are confirmed.

## Fact Maintenance

Before changing public copy, metadata, image alt text, or schema, check BUSINESS.md first. Current confirmed public facts are limited to the business name, commercial cleaning/janitorial category, Greater Rochester/Rochester-area service language, phone `585-340-6868`, hours `7 AM-9 PM`, Donald's direct involvement in client relationships, the walk-through/custom-scope process, and the three major services.

Do not publish unconfirmed claims about insurance, certifications, regulatory compliance, years in business, client names, testimonials, guarantees, response times, pricing, exact suburbs, address, email, domain, Donald's surname, or a confirmed portrait.

## Image Maintenance

Original photos remain in `assets/photos/` and must not be served directly. Regenerated web assets must normalize orientation, strip private metadata, avoid readable third-party branding, and avoid identifying any photographed person as Donald unless a confirmed owner portrait is supplied. Update `docs/asset-manifest.md` and regenerate `docs/asset-manifest.generated.json` after changing derivatives.

## Placeholders And Unknowns

There are currently zero visible public placeholders. Remaining exact unknowns before launch are:

- Email and domain.
- Business address.
- Exact days attached to the `7 AM-9 PM` hours.
- Exact cities/suburbs served beyond Greater Rochester.
- Donald's last name and confirmed portrait.
- Years in business or industry experience.
- Insurance, bonding, licenses, certifications, training, and background-check status.
- Testimonials, reviews, awards, client names/logos, and permission to publish healthcare relationships.
- Pricing, contract terms, free quote/free walk-through status, minimum account size, response times, guarantees, and emergency availability.
- Confirmation for extra services listed as unconfirmed in BUSINESS.md section 15.

## Launch Limitations

This is a static phone-led site with no production backend, no contact form, no mailto path, and no external deployment in this workspace. Browser validation uses local Chromium emulation; production hosting, real mobile devices, analytics, forms, domain setup, and field Core Web Vitals remain separate launch work.
