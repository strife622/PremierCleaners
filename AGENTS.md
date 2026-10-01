# Project operational guidance

## Source and scope

Read BUSINESS.md completely before writing site text or major visuals. It is the primary business and brand authority. Current mission: missions/mission-001/mission.md. Existing research lives at ../repository-research.md and ../competitor-research.md; reuse it. Preserve original BUSINESS.md and assets/photos; never invent missing facts or identify photographed people as Donald.

## Working conventions

Product root is C:/src/PremierCleaners. Serve/deploy public/ only; keep docs, original photos, tooling and orchestration outside public/. Semantic HTML, shared CSS, minimal JS, buildless unless justified. Use supplied premier-site-work skill for work tasks. You are not alone: preserve others' changes and honor task dependencies/ownership.

Only write within this workspace and this returned Zenith project directory. Tool installs/caches/profile/evidence must stay in those boundaries. Do not modify unrelated repositories or initialize Tidus home. No remote, push, external deploy, staging unrelated files or final git commit. Do not edit runtime cursor files.

Use apply_patch for text-file edits. Evidence should contain literal readable commands and resolved paths, not unexpanded variable prefixes or accidentally escaped control characters. Preserve historical evidence; corrected candidate checks belong in fresh task-specific artifacts.

For npm commands, use the project-local cache at ../npm-cache under harnessRoot (NPM_CONFIG_CACHE is provided by the project runtime launcher for subsequent workers). Direct `node scripts/preview.mjs` and `node scripts/check-site.mjs` commands avoid npm wrapper bookkeeping when appropriate; document the actual supported operator commands accurately.

## Business constraints

Only the three supported major services are definitive; potential task/frequency examples and section 15 are unconfirmed. Never infer compliance, specialty medical services, insurance, certifications, guarantees, same-team visits, pricing, years/counts or named client permission. Broad healthcare experience may be used carefully. No invented email/domain/suburbs/address/days, owner quote or portrait identity. Phone is 585-340-6868; hours 7 AM-9 PM with days unknown. Omissions are preferable to believable filler. Review placeholders must be escaped/readable, never URLs or facts, and documented for removal before launch.

## Evidence and browser ownership

Read ../browser-setup.md before browser work and ../nojs-validation.md for genuine JavaScript-disabled setup guidance (source-supported, still requires live proof). One browser session only; serialize UI workers/validators. Source scrutiny may run independently without opening browser. All UI verdicts require fresh screenshots viewed, real navigation/keyboard interaction, console/network observations and per-target evidence. No copied worker screenshot may substitute for validator collection. Reduced motion and no-JS behavior must be exercised. Close browser when done; start helpers hidden and bind local preview to 127.0.0.1.

Before performance collection or reviewing a worker performance helper, read ../performance-validation.md. Full incremental scroll/lazy-load coverage, retained per-resource inventory and valid observed LCP are required; aggregate-only output or missing/zero measurements do not prove the contract.

## Copy-plan interpretation

The first docs/content-plan.md draft contains some editorial instructions inside entries labelled Body or service summary (for example website should, available materials, and without overstating unconfirmed compliance). These are not production copy. Review this issue via mission decisions/006-strategy-copy-review.md; implementing workers must write direct visitor-facing sentences from confirmed BUSINESS facts and keep internal instructions separate. Final copy/document consistency remains required.

All final workers and validators must inspect current candidate text/images against the concrete draft findings in missions/mission-001/decisions/010-public-copy-method.md and the bounded second-render findings in 011-second-render-review.md. These are leads for fresh verification, not verdicts to copy: record which were corrected and which persist. Include actual depicted image details in alt/caption accuracy and visual identity implication, not only prohibited marketing terms.

Decision015 records parent live320px reproduction after W05: headline accountability splits with a lone final y, while suspected service-text clipping was disproved with an unannotated screenshot and text bounds. Check current candidate; do not fix annotation artifacts or accept document scrollWidth alone as proof of good narrow typography. Parent performance threshold review is in evidence/parent-performance-threshold-review.md; compare raw measurements, not rounded summaries.

Decision020 superseded W06's narrow-fit claim after genuine classic-scrollbar/200% failures. Decisions021-023 now reconcile the completed W07 correction, its disclosed shared Home/About min-content effects, and independent final V08/V09 proof. Consult decision023 for current acceptance and complete assertion evidence; earlier findings remain historical, not unresolved by default. Preserve real enlargement, actual-width testing, approved broader design and completed research. Future workers must request attention before expanding assigned ownership.

## Handoff

Before inner-page and final-integration work, read missions/mission-001/decisions/008-first-render-quality-review.md and 009-refinement-direction.md. The initial Home screenshots had competent clarity but material originality/typographic-refinement concerns and leaked editorial text. An independent visual reviewer corroborated those findings; decision009 records the adopted editorial refinement direction. Treat these as open quality findings until corrected and shown in fresh evidence; later workers must not assume the first rendered foundation is the final visual standard. True no-JS validation must disable JavaScript in the browser, not only block the external script while inline scripts still run.

Report changed files, per-target checks/evidence, missing facts, limitations and frictions through end_node. Do not weaken contracts or use unsupported content to satisfy an empty design section. Do not silently treat missing evidence as a pass.

W04's completed handoff mislabels several assertion IDs (for example its FACT-002 paragraph discusses assets and its UX-004 paragraph discusses Contact). Validators must use the actual contract files and task target list as the oracle, not its per-target headings. The original hallway alt and copper small-text color persisted at the parent source check immediately after W04 cleared. Worker contrast samples did not cover those copper labels; record fresh complete coverage rather than accepting the sampled summary. Performance helper limitations remain governed by ../performance-validation.md.
