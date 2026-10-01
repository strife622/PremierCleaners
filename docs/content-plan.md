# Premier Cleaners Content Plan

Status: strategy artifact for mission-001. This is the durable IA, UX, and copy blueprint for the four-page static site. BUSINESS.md remains the authority for facts; this plan is intentionally conservative where proof is missing.

## Delivered Integration Note

The final public copy keeps internal cautions out of visitor-facing HTML. Home now describes the service focus directly as commercial janitorial cleaning, medical and clinical facility cleaning, and floor care; Services uses visitor-facing scope notes; About keeps Donald's role text-led and places work-detail photography in a general accountability section. The corrective pass also aligns hallway alt text with the actual image, keeps below-fold photography lazy-loaded, compresses the mobile Home summary/photo sequence, and turns later Donald modules into practical contact prompts rather than repeated profile-style panels. Remaining unknowns are omitted from public pages and enumerated in README.md and docs/fact-ledger.md.

## Source Ledger

Use these source families for copy and review:

| Claim family | Supported by | Allowed public use |
| --- | --- | --- |
| Business name, commercial cleaning/janitorial industry, Rochester/Greater Rochester, phone, hours | BUSINESS.md section 1 | Use name, commercial cleaning, Rochester/Greater Rochester, `585-340-6868`, and `7 AM-9 PM`. Do not invent days, exact address, email, domain, or suburbs. |
| Premium commercial positioning | BUSINESS.md sections 2-3, 19-20, 28-29, 39-40, 54-55 | Use serious/professional/top-tier positioning. Do not imply cheap, tiny, limited, or artificially enormous. |
| Direct accountability and access to Donald/responsible person | BUSINESS.md sections 3-6, 24, 32-34 | Use direct communication, accessible responsible person, Donald involvement, and personal accountability. Do not invent Donald's surname, quote, biography, response time, or portrait identity. |
| Flexibility and custom scopes | BUSINESS.md sections 4, 13, 18, 24, 32-33 | Use facility walk-through, learned priorities, tailored cleaning scope, and ability to adapt as needs change. Do not promise "anything," same-team visits, contract terms, or guaranteed schedule changes. |
| Primary service categories | BUSINESS.md section 14 | Use exactly three major categories: Commercial Janitorial Cleaning, Medical / Clinical Facility Cleaning, Floor Care. Treat task examples as potential scope discussion, not universal inclusions. |
| Healthcare/clinical experience | BUSINESS.md sections 11-12, 14, 24 | Use broad healthcare/clinical/professional facility language carefully. Do not publish named clients, hospital-grade protocols, HIPAA, OSHA, infection-control certification, biohazard, terminal cleaning, or regulated waste claims. |
| CTA journey | BUSINESS.md sections 13, 17-18, 30, 33, 36 | Use call, request/talk about a walk-through, conversation, facility walk-through, custom plan, ongoing relationship. Do not create fake forms or fake mailto links. |
| Trust and proof | BUSINESS.md sections 23, 25, 48, 51 | Omit unavailable proof. No testimonials, reviews, years, insurance, certifications, employee counts, project counts, client logos, awards, star ratings, or guarantees unless confirmed later. |
| Visual and image use | BUSINESS.md sections 37-43, 49-52 plus repository-research.md | Use inspected real assets only. Do not identify photographed people as Donald or clients. Do not use competitor photos/copy. |

## Sitewide Information Architecture

Primary routes:

- `/` - Home
- `/services/` - Services
- `/about/` - About
- `/contact/` - Contact

Navigation labels:

- Home
- Services
- About
- Contact

Global CTAs:

- Primary: Request a Walk-Through
- Secondary: Call 585-340-6868

Footer content:

- Premier Cleaners
- Commercial cleaning for Greater Rochester
- Phone: 585-340-6868
- Hours: 7 AM-9 PM
- Links to Home, Services, About, Contact
- Launch note only in nonproduction docs: email, address, exact days, and domain are unconfirmed.

Do not add:

- Nonworking contact form.
- Mailto link using a placeholder email.
- Specific suburb list.
- Client logos or names.
- Review/testimonial section with placeholder quotes.
- Extra service pages.

## Cross-Page Visitor Journey

Visitor questions and planned answers:

| Visitor question | Where answered | Planned answer |
| --- | --- | --- |
| What do they do? | Home first viewport, Services hero | Commercial cleaning and janitorial service for professional facilities. |
| Where do they work? | Home first viewport, footer, Contact | Greater Rochester / Rochester-area. Exact suburbs stay unlisted. |
| Are they serious enough for my facility? | Home hero, service sections, real photos | Premium, professional commercial presentation with real facility and work-detail photography. |
| What makes them different? | Home accountability section, About | Direct access to Donald or the person responsible, flexible plans, relationship-based accountability. |
| What services are actually offered? | Services, Home overview | Commercial Janitorial Cleaning, Medical / Clinical Facility Cleaning, Floor Care. |
| What happens when I contact them? | Home process, Contact | Conversation, facility walk-through, tailored scope, service launch, ongoing accountability. |
| How do I start? | All pages | Request a walk-through or call 585-340-6868. |

## Mobile Priority

At 390x844, Home must show:

- Premier Cleaners.
- "Greater Rochester commercial cleaning" or equivalent location/service line.
- "Commercial cleaning. Personal accountability."
- A short support line with direct communication or responsible-person accountability.
- "Request a Walk-Through."
- "Call 585-340-6868."

Mobile content order:

1. Brand and contact path.
2. Commercial cleaning / Greater Rochester / accountability.
3. Services overview.
4. Why Premier / accountability.
5. Process.
6. Donald/responsible-contact module.
7. Photos and supporting proof-by-process.
8. Final CTA.

Do not let photography consume the first mobile viewport before the message and contact path.

## Home Page Plan

Purpose: Establish commercial capability, Greater Rochester relevance, direct accountability, and the next step within about 10 seconds.

Metadata:

- Title: `Commercial Cleaning in Rochester, NY | Premier Cleaners`
- Description: `Professional commercial cleaning for Rochester-area facilities with flexible service, responsive communication, and direct accountability. Call Premier Cleaners at 585-340-6868.`

Section hierarchy and planned copy:

1. Hero

   - Eyebrow: `Greater Rochester commercial cleaning`
   - H1: `Commercial cleaning. Personal accountability.`
   - Body: `Professional cleaning for Rochester-area facilities with flexible service, direct communication, and someone responsible for getting it right.`
   - Primary CTA: `Request a Walk-Through`
   - Secondary CTA: `Call 585-340-6868`
   - Source: BUSINESS.md sections 1, 2, 3, 6, 17, 28, 31.

2. Immediate proof-by-clarity strip

   - Items:
     - `Commercial facilities`
     - `Greater Rochester`
     - `Three focused service categories`
     - `Direct accountability`
   - Note: These are not badges or statistics. Do not add years, insured, certified, client count, or review language.
   - Source: BUSINESS.md sections 1, 14, 24, 25.

3. Services overview

   - Heading: `Cleaning programs built around the facility.`
   - Intro: `Premier focuses on commercial janitorial cleaning, medical and clinical facility cleaning, and floor care. The right scope depends on the building, priorities, schedule, and standards.`
   - Service summaries:
     - `Commercial Janitorial Cleaning` - `Recurring cleaning programs for commercial facilities, shaped around the spaces and priorities that matter most in the building.`
     - `Medical / Clinical Facility Cleaning` - `Cleaning support for professional healthcare environments such as medical, dental, laboratory, and clinical settings where consistency and attention to detail matter.`
     - `Floor Care` - `Planned commercial floor maintenance that helps keep high-use flooring from becoming a visible problem.`
   - CTA: `View Services`
   - Source: BUSINESS.md sections 14, 35.

4. Accountability section

   - Heading: `You should know who is responsible.`
   - Body: `If something needs attention, the answer should not be a ticket queue or a chain of handoffs. Premier's advantage is direct communication with Donald or the person responsible for the account, clear expectations, and follow-through when priorities change.`
   - Supporting points:
     - `Direct access` - `You know who is responsible for your facility and how to reach them.`
     - `Flexible plans` - `The cleaning plan can adapt as the facility and priorities change.`
     - `Proactive care` - `The goal is to notice recurring needs before the client has to keep repeating them.`
   - Source: BUSINESS.md sections 4, 5, 9, 24, 32.

5. Process section

   - Heading: `We learn the building before we build the plan.`
   - Steps:
     - `01 Talk about the facility` - `A prospective client contacts Premier and discusses the facility, current arrangement, frustrations, schedule, expectations, and priorities.`
     - `02 Walk the space` - `Donald personally walks the facility to understand how it operates, not just to measure square footage.`
     - `03 Define the scope` - `The cleaning scope is built around layout, traffic, frequency, operating hours, priority areas, and client preferences.`
     - `04 Start with clear expectations` - `Premier assigns the work and establishes expectations for the service.`
     - `05 Stay accountable` - `After service begins, Donald remains engaged with the customer experience and clients can communicate changing needs directly.`
   - Source: BUSINESS.md sections 13, 18, 33.

6. Facility experience and photos

   - Heading: `Real work in professional facilities.`
   - Body: `Premier brings commercial cleaning experience to professional and healthcare-related facilities where consistency, presentation, and attention to detail matter.`
   - Photo roles:
     - Hallway or clinical interior for professional facility context.
     - Elevator/handrail or bathroom sink detail for real work and shirt branding.
     - Floor-care photo for floor care.
   - Source: BUSINESS.md sections 11, 12, 23, 24, 37, 49; repository-research.md.

7. Donald / responsible contact module

   - Heading: `An accountable person behind the work.`
   - Body: `Donald is directly involved in client relationships and the customer experience, giving clients a clear responsible person without a corporate support chain.`
   - CTA: `Talk About Your Facility`
   - Source: BUSINESS.md sections 5, 13, 24, 34.

8. Final CTA

   - Heading: `Tell us what your facility needs.`
   - Body: `Call Premier or request a walk-through. We'll learn the building, understand what is working and what is not, and build the cleaning plan around the facility.`
   - Actions: `Request a Walk-Through`, `Call 585-340-6868`
   - Source: BUSINESS.md sections 17, 18, 36.

## Services Page Plan

Purpose: Explain confirmed capability without creating a fake service catalog.

Metadata:

- Title: `Commercial Cleaning Services in Rochester, NY | Premier Cleaners`
- Description: `Commercial janitorial cleaning, medical and clinical facility cleaning, and floor care for Rochester-area facilities, planned around each building's needs.`

Hero:

- H1: `Commercial cleaning services built around the facility.`
- Body: `Premier focuses on three major service categories and builds each scope around the building, schedule, priorities, and expectations discussed during the walk-through.`
- Source: BUSINESS.md sections 13, 14, 35.

Service sections:

1. Commercial Janitorial Cleaning

   - Planned copy: `Recurring cleaning programs for commercial facilities. The exact scope depends on the building and may account for common areas, offices, restrooms, breakrooms, hard floors, high-touch surfaces, trash and recycling, and other priorities defined with the client.`
   - Caution: Do not promise every listed task or frequency for every contract.
   - Source: BUSINESS.md section 14.

2. Medical / Clinical Facility Cleaning

   - Planned copy: `Cleaning for professional healthcare environments such as dental offices, medical offices, laboratories, clinics, and healthcare facilities where consistency and attention to detail matter.`
   - Caution: Pair with a production-safe sentence such as `Specific protocols and specialty requirements should be discussed directly during the walk-through.` Do not claim hospital-grade products, OSHA, HIPAA, bloodborne pathogen certification, infection-control certification, terminal cleaning, operating-room cleaning, biohazard handling, or regulated medical waste services.
   - Source: BUSINESS.md sections 11, 12, 14.

3. Floor Care

   - Planned copy: `Scheduled maintenance for commercial flooring, positioned as preventive care rather than waiting until floors look neglected. The specific plan should be defined around the flooring, traffic, and facility expectations.`
   - Caution: Do not publish carpet extraction or stripping/refinishing as confirmed services unless Donald confirms them, because section 15 withholds those items.
   - Source: BUSINESS.md sections 14, 15.

Supporting section:

- Heading: `No generic package.`
- Copy: `The walk-through is where Premier learns how the building operates, what gets missed, and what standard the facility needs to maintain. The service plan should come from that conversation.`
- Source: BUSINESS.md sections 13, 18, 33.

Final CTA:

- `Request a Walk-Through`
- `Call 585-340-6868`

## About Page Plan

Purpose: Make the accountability philosophy concrete through Donald's role without inventing biography.

Metadata:

- Title: `About Premier Cleaners | Commercial Cleaning in Rochester, NY`
- Description: `Premier Cleaners pairs professional commercial cleaning with direct accountability, flexible service, and personal attention for Greater Rochester facilities.`

Section hierarchy and planned copy:

1. Hero

   - H1: `Cleaning is the service. Accountability is the difference.`
   - Body: `Premier is built around a simple idea: clients should know what is expected, what is being cleaned, and who is responsible for getting it right.`
   - Source: BUSINESS.md sections 5, 6, 34.

2. Donald's role

   - Heading: `Donald stays visible in the relationship.`
   - Body: `Donald is directly involved in client relationships and the customer experience. That visible responsibility makes Premier's accountability more concrete.`
   - Caution: Do not use a portrait unless confirmed. Do not write a quote, origin story, surname, credentials, or years in business.
   - Source: BUSINESS.md sections 1, 5, 13, 24, 34.

3. How Premier should feel to clients

   - Points:
     - `Professional enough for demanding facilities.`
     - `Personal enough that concerns do not disappear into a system.`
     - `Flexible enough to build around the building, not a package.`
   - Source: BUSINESS.md sections 2, 3, 4, 20, 32.

4. Working relationship

   - Copy: `The goal is not to make the client manage the cleaning company. The goal is clear communication, a scope everyone understands, and a relationship where changing needs can be discussed directly.`
   - Source: BUSINESS.md sections 4, 9, 13, 24.

5. CTA

   - `Talk About Your Facility`
   - `Call 585-340-6868`

## Contact Page Plan

Purpose: Make starting a real conversation easy without fake form behavior.

Metadata:

- Title: `Contact Premier Cleaners | Rochester Commercial Cleaning`
- Description: `Call Premier Cleaners at 585-340-6868 to discuss commercial cleaning, a facility walk-through, or a cleaning plan for a Greater Rochester facility.`

Section hierarchy and planned copy:

1. Hero

   - H1: `Tell us about your facility.`
   - Body: `Talk with Premier about the building, what is working, what is not, and what kind of cleaning relationship would make the facility easier to manage.`
   - Source: BUSINESS.md sections 17, 18, 36.

2. Contact actions

   - Phone: `585-340-6868`
   - Phone href: `tel:+15853406868`
   - Hours: `7 AM-9 PM`
   - Service area: `Greater Rochester`
   - Caution: Do not list days, exact address, email, domain, or suburbs.
   - Source: BUSINESS.md section 1.

3. What to discuss

   - Items:
     - Facility type and current cleaning arrangement.
     - Frustrations and recurring problem areas.
     - Schedule and priority spaces.
     - Expectations and special considerations.
   - Source: BUSINESS.md section 13.

4. Walk-through expectation

   - Copy: `Premier learns the space before defining the scope. The walk-through is where the building's layout, traffic, priorities, and expectations become the cleaning plan.`
   - Source: BUSINESS.md sections 13, 18.

5. No fake form

   - Implementation note: If no backend or confirmed email exists, do not render a submission form. Use phone-led contact and optional noninteractive review markers only outside production launch content.
   - Source: BUSINESS.md sections 36, 48.

## Asset Mapping

| Asset | Planned role | Copy/alt guardrail |
| --- | --- | --- |
| `assets/photos/CleanedHallway.jpg` | Home or services architectural/facility image | Describe the visible light walls, glass doors, and wood-look flooring after orientation/crop check. No client, material-treatment, or location claim. |
| `assets/photos/Cleaningelevatorhandles.jpg` | Work-detail image for accountability/process | Describe visible handrail/elevator cleaning and Premier shirt. Do not identify the worker. |
| `assets/photos/CleanedDentistArea.jpg` | Clinical/professional facility context | Describe as a clinical or dental-style interior only if visible after crop. No compliance or client proof. |
| `assets/photos/Floorpolishing.jpg` | Floor Care service image | Describe visible floor-care work. Do not identify worker. |
| `assets/photos/Floorpolishing2.jpg` | Optional floor/equipment crop | Crop out upper third-party branding before publishing. |
| `assets/photos/VacuumingFloor.jpg` | Optional janitorial detail | Use tight tool/floor crop; avoid distracting personal details. |
| `assets/photos/Cleaningbathroomsink.jpg` | Optional janitorial detail | Describe visible restroom/sink cleaning. Do not use to imply a specific client. |

Avoid initial launch use:

- `assets/photos/cleaningwindows.png` - readable UR Medicine identity; window cleaning unconfirmed.
- `assets/photos/DryMoppingthefloor.jpg` - third-party faces/logo/newspaper text.
- `assets/photos/cleraningaroundATM.jpg` - busy notices/security context.
- `assets/photos/DeepVacuumCleaning.jpg` - extraction-like equipment; carpet extraction unconfirmed.

## Fact Omissions And Missing Proof Ledger

Must remain omitted or visibly marked for internal review only:

- Donald last name.
- Confirmed Donald portrait.
- Email.
- Domain.
- Business address.
- Exact days for 7 AM-9 PM hours.
- Exact suburbs/cities served beyond Greater Rochester.
- Years in business or years of experience.
- Insurance, bonding, licenses, certifications, training, background checks.
- Client names, client logos, testimonials, reviews, star ratings.
- Named healthcare clients or permission to publish healthcare relationships.
- Hospital-grade protocols, HIPAA, OSHA, infection-control, bloodborne pathogen, terminal cleaning, biohazard, regulated waste.
- Response times, guarantees, prices, discounts, minimum account size, free quotes, free walk-throughs, contract terms.
- Same cleaner/team visits.
- Extra services in BUSINESS.md section 15, including standalone office cleaning, day porter, post-construction, move-in/move-out, education, industrial, retail, restaurant, windows, disinfection programs, one-time deep cleaning, carpet extraction, stripping/refinishing, emergency/short-notice cleaning, restocking, and specialty cleaning.

Production rule: omission is better than believable filler.

## Copy Tone Rules

Use:

- Direct, confident sentences.
- Facility, account, scope, walk-through, responsible person, direct communication, flexible plan.
- "Donald" when discussing owner/public-face accountability.
- "Greater Rochester" and "Rochester-area" for geography.

Avoid:

- "Sparkling clean every time."
- "Experience the Premier difference."
- "World-class," "best-in-class," "unparalleled," or similar empty adjectives.
- "Family-owned," "locally owned," "fully insured," "certified," or "trusted by" unless confirmed.
- Competitor names in public copy.
- Any wording that attacks large providers by name.

## Future Implementation Feasibility Notes

- Four pages can be built with static HTML, shared CSS, minimal JS, and optimized real photos under `public/`.
- Home first viewport is feasible on 390x844 if text and CTAs precede photography.
- Contact is feasible without a backend because phone is confirmed.
- About is feasible without a portrait by using a responsible-contact module and clear Donald copy.
- Services is feasible with exactly three categories; do not create thin service pages or extra catalog entries.
- Real-photo use is feasible only after orientation correction, metadata stripping, crop review, and alt-text review.

## Strategy Target Checklist

VAL-STRATEGY-001:

- Uses completed competitor and asset findings.
- Defines original palette, typography, composition, image direction, motion, and interaction details.
- Explains commercial credibility first and concrete accountability second.
- Names competitor non-copy distinctions.
- Avoids invented proof and unsupported identity claims.

VAL-STRATEGY-002:

- Documents Home, Services, About, Contact purpose and hierarchy.
- Defines mobile-first Home requirements, including the 390x844 first viewport.
- Defines cross-page CTA journey.
- Provides planned page copy tied to BUSINESS.md sections.
- Records unsupported facts and omissions.
- Keeps all necessary page messages in scope for later implementation.
