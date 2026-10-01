# Premier Cleaners Fact Ledger

Status: final-integration source audit for the current static site. BUSINESS.md remains the authority; this ledger maps published claim families to source sections and records omissions that must stay unresolved until the client confirms them.

## Published Claim Families

| Claim family | Public use | Source |
| --- | --- | --- |
| Business identity | Premier Cleaners, commercial cleaning and janitorial context | BUSINESS.md sections 1, 14, 24 |
| Geography | Rochester-area and Greater Rochester language only | BUSINESS.md sections 1, 24, 28 |
| Phone | Visible phone number and `tel:+15853406868` links | BUSINESS.md sections 1, 17, 36 |
| Hours | `7 AM-9 PM` with no days attached | BUSINESS.md section 1 |
| Accountability | Direct communication with Donald or the person responsible for the account | BUSINESS.md sections 3-6, 13, 24, 32-34 |
| Service approach | Conversation, facility walk-through, custom scope, service launch expectations, ongoing accountability | BUSINESS.md sections 13, 17-18, 33, 36 |
| Services | Commercial Janitorial Cleaning, Medical / Clinical Facility Cleaning, Floor Care | BUSINESS.md section 14 |
| Clinical context | Professional healthcare environments such as medical, dental, laboratory, clinical, and healthcare facilities | BUSINESS.md sections 11-12, 14, 24 |
| Floor care | Planned commercial floor maintenance shaped by flooring, traffic, and facility expectations | BUSINESS.md section 14 |
| Images and alt text | Real facility/work-detail images described from visible details, including the hallway's light walls, glass doors, and wood-look flooring; no worker identity, client name, compliance, material-treatment, or endorsement claims | repository-research.md, docs/asset-manifest.md, BUSINESS.md sections 37, 49-51 |
| SEO metadata | Unique page titles/descriptions with natural Rochester commercial cleaning intent | BUSINESS.md sections 1, 44-47, 50 |

## Explicit Omissions

- Email, domain, business address, exact days for hours, exact suburbs or cities served beyond Greater Rochester.
- Donald's last name, confirmed portrait, direct quote, founder story, credentials, years in business, years of experience.
- Insurance, bonding, licenses, certifications, training, background checks, hospital-grade products, OSHA, HIPAA, infection-control, regulated waste, biohazard, terminal cleaning, operating-room cleaning.
- Testimonials, reviews, star ratings, awards, client names, client logos, client counts, employee counts, project counts, retention rates.
- Prices, discounts, free quote or free walk-through terms, minimum account size, contracts, response-time guarantees, satisfaction guarantees, 24/7 or emergency availability.
- Extra unconfirmed services from BUSINESS.md section 15, including standalone office cleaning, day porter, post-construction, move-in/move-out, windows, disinfection programs, one-time deep cleaning, carpet extraction, stripping/refinishing, restocking, and specialty cleaning.

## Audit Notes

- Public pages contain no structured data because address, domain, logo, and fuller local-business facts are unconfirmed.
- Public pages contain no visible development placeholders in this integration pass.
- The public output no longer includes the generated asset manifest; derivative provenance is retained in docs instead.
- The performance helper is an optional lab-evidence tool; its browser/CDP requirement is documented in README.md separately from ordinary preview and source checks.
