# Public Placeholder Audit

Status: final-integration placeholder enumeration for the current static output.

## Current Public Markers

Zero visible development placeholders are intentionally published in `public/`.

## Checked Patterns

The deterministic site check fails on public HTML matches for:

- `<placeholder>`
- `<company`
- `<confirm`
- `company email`
- `company address`
- `TODO`
- `FIXME`
- `mailto:`
- empty `href="#"`

## Remaining Unknowns

The unknowns are omitted from public pages and documented in README.md and docs/fact-ledger.md: email, domain, address, exact days, exact suburbs, Donald surname or portrait, proof items, certifications, insurance, pricing, guarantees, and extra services.

## Removal Rule

If a future development marker is added for client review, it must be readable escaped angle-bracket text, never a URL, image source, schema value, phone alternative, or hidden fact. It must be removed or replaced with confirmed information before launch.
