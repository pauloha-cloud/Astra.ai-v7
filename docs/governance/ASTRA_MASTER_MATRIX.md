# Astra Learning AI — Master Matrix

> **Governance ID:** ASTRA-GOV-MM-001
> **Document Version:** 1.0
> **Baseline Date:** 2026-09-27
> **Owner:** Astra Architecture & Intelligence Council
> **Repository:** `pauloha-cloud/Astra.ai-v7`
> **Official Branch:** `main`
> **Baseline Source Commit:** `33b10aed12e2cc5cfe8ac7ff689728e328bef7e6`

## 1. Purpose

The Astra Master Matrix is the mandatory governance register for the material state of Astra Learning AI from DEV through PRD. It tracks completed work, pending work, environment impact, evidence, risks, gates, releases, rollback, and the next authorized action.

## 2. ASTRA-GOV-MM-001 — Mandatory Governance Rule

A material phase is not closed until its state transition and supporting evidence are reflected in this Matrix. No PRD deployment may proceed without review of applicable mandatory gates and explicit authorization.

The Matrix MUST NOT contain passwords, secret values, API keys, tokens, private keys, service-account credentials, payment data, or unnecessary personal data. Unverified assumptions MUST NOT be recorded as facts.

## 3. Status Model

Lifecycle: `PLANNED`, `UNDER REVIEW`, `APPROVED`, `IMPLEMENTING`, `TESTING`, `DEV DEPLOYED`, `DEV VALIDATING`, `DEV CORE VALIDATED`, `DEV READY`, `PRD READINESS`, `PRD APPROVED`, `PRD DEPLOYED`, `PRD VALIDATING`, `STABLE`, `BLOCKED`, `DEPRECATED`, `ROLLED BACK`, `CANCELLED`.

Validation: `PASS`, `PASS WITH RESERVATION`, `PARTIAL`, `PENDING`, `NOT AUDITED`, `FAILED`, `NOT APPLICABLE`.

## 4. Executive Status

| Area | DEV | PRD | Position |
|---|---|---|---|
| Architecture | PASS | NOT AUDITED | Existing architecture preserved |
| Git / GitHub / CI | PASS | NOT APPLICABLE | `main` is versioned source of truth |
| Google Cloud | PASS WITH RESERVATION | NOT AUDITED | DEV operational |
| Cloud Run | PASS | NOT AUDITED | DEV service operational |
| Firebase Authentication | PASS | NOT AUDITED | Candidate login validated |
| Firestore | PASS WITH RESERVATION | NOT AUDITED | Rules tests passed; deployed-state audit remains |
| AI | PASS WITH RESERVATION | NOT AUDITED | Existing Vertex/Gemini strategy preserved |
| DPR4-R002 | DEV CORE VALIDATED | BLOCKED | Council gates remain |
| Security | PARTIAL | NOT AUDITED | Broader readiness pending |
| Observability / SRE | PARTIAL | NOT AUDITED | Broader SRE baseline pending |
| FinOps | PARTIAL | NOT AUDITED | Accounting/budgets incomplete |
| Backup / DR | PENDING | NOT AUDITED | Production DR pending |
| Production Readiness | PENDING | BLOCKED | DEV Council closure first |
| Go-Live | NOT APPLICABLE | BLOCKED | No PRD authorization |

**DPR4-R002: DEV CORE VALIDATED — COUNCIL GATES PENDING.**

## 5. Environment Registry

| ID | Environment | Project | Purpose | State |
|---|---|---|---|---|
| ENV-001 | LEGACY | `modelo-animal-mvp-489520` | Migration/reference only | DEPRECATED / REFERENCE |
| ENV-002 | DEV | `astra-learning-ai-dev` | Development and validation | ACTIVE |
| ENV-003 | PRD | `astra-learning-ai-prd` | Planned production | NOT AUDITED / NOT AUTHORIZED |

## 6. Architecture Baseline

| ID | Layer | Technology | State |
|---|---|---|---|
| ARCH-001 | Frontend | React + Vite | ACTIVE |
| ARCH-002 | Backend | Node.js + Express + TypeScript | ACTIVE |
| ARCH-003 | Runtime | Google Cloud Run | ACTIVE |
| ARCH-004 | Authentication | Firebase Authentication | ACTIVE |
| ARCH-005 | Database | Cloud Firestore | ACTIVE |
| ARCH-006 | AI | Vertex AI / Gemini via `@google/genai` | ACTIVE |
| ARCH-007 | Payments | Stripe | ACTIVE |
| ARCH-008 | Source control | GitHub | ACTIVE |

Preserve existing architecture unless evidence justifies change. Avoid premature microservices. Do not change provider, SDK, model, database, authentication, region, or deploy strategy without diagnosis, impact analysis, and explicit approval.

## 7. GCP Matrix

| ID | Control | DEV | PRD |
|---|---|---|---|
| GCP-001 | Project | PASS | NOT AUDITED |
| GCP-002 | Project number `520231585118` | PASS | NOT AUDITED |
| GCP-003 | Runtime region `us-west2` | PASS | NOT AUDITED |
| GCP-004 | Billing | NOT AUDITED | NOT AUDITED |
| GCP-005 | Enabled APIs | PARTIAL | NOT AUDITED |
| GCP-006 | IAM | PARTIAL | NOT AUDITED |
| GCP-007 | Secret Manager integration | PASS | NOT AUDITED |
| GCP-008 | Cloud Logging | PASS | NOT AUDITED |
| GCP-009 | Monitoring / alerts | PENDING | NOT AUDITED |
| GCP-010 | Budgets / quotas | NOT AUDITED | NOT AUDITED |
| GCP-011 | Cloud Run source deployment | PASS | NOT AUDITED |
| GCP-012 | Cloud Tasks / Pub/Sub | NOT APPLICABLE | NOT APPLICABLE |
| GCP-013 | GKE | NOT APPLICABLE | NOT APPLICABLE |
| GCP-014 | Infrastructure as Code | PLANNED | PLANNED |

## 8. Cloud Run Matrix

DEV service `astra-learning-ai-dev`, region `us-west2`, runtime SA `astra-runtime-dev@astra-learning-ai-dev.iam.gserviceaccount.com`, CPU 1, memory 1 GiB, concurrency 20, timeout 3600s, max scale 2, startup CPU boost enabled.

DPR4-R002 candidate: revision `astra-learning-ai-dev-dpr4r002-33b10ae`, tag `dpr4r002gates`, 0% normal traffic at validation, image digest `sha256:e332b6bdcd2ce0106fe0b87003206b962350382e2260226abf5b71dea5ab0e58`.

Rollback baseline: revision `astra-learning-ai-dev-dpr4f007-b330e77`, 100% normal traffic at validation, image digest `sha256:fd417f42be3c41ca0524797311ecb2a5e9acbcb919134549b5d7f2533abe19f1`.

## 9. Firebase Authentication

| ID | Control | DEV | PRD |
|---|---|---|---|
| AUTH-001 | Firebase integration | PASS | NOT AUDITED |
| AUTH-002 | Authentication flow | PASS | NOT AUDITED |
| AUTH-003 | Browser API-key restrictions | PASS | NOT AUDITED |
| AUTH-004 | Candidate referrer restriction | PASS | NOT AUDITED |
| AUTH-005 | Candidate login | PASS | NOT AUDITED |
| AUTH-006 | Auth regression in tested candidate | PASS | PENDING |

## 10. Firestore / Data

| ID | Control | DEV | PRD |
|---|---|---|---|
| FS-001 | Dedicated DEV Firestore | PASS | NOT AUDITED |
| FS-002 | User-isolation rules | PASS WITH RESERVATION | PENDING |
| FS-003 | Billing frontend read-only principle | APPROVED | PENDING |
| FS-004 | Trusted backend writes | APPROVED | PENDING |
| FS-005 | Undefined-field sanitation | PENDING | PENDING |
| FS-006 | Automated rules tests | PASS — 56/56 recorded | PENDING |
| FS-007 | Published-rules audit | PENDING | NOT AUDITED |
| FS-008 | Index inventory | NOT AUDITED | NOT AUDITED |
| FS-009 | Backup / DR | PENDING | PENDING |
| FS-010 | Data migration requirement | UNDER REVIEW | NOT AUDITED |

## 11. AI / Product Intelligence

| ID | Control | State |
|---|---|---|
| AI-001 | Existing provider strategy | ACTIVE |
| AI-002 | `@google/genai` | ACTIVE |
| AI-003 | Backend-only AI credentials | APPROVED |
| AI-004 | Structured output | PENDING |
| AI-005 | Model routing | PLANNED |
| AI-006 | Tutor / Quiz / Flashcards / Mind Map | ACTIVE / EVOLVING |
| AI-007 | Voice Tutor | PLANNED / EVOLVING |
| AI-008 | RAG | PLANNED / EVOLVING |
| AI-009 | Formal AI evaluation | PLANNED |
| AI-010 | Token/cost accounting | PENDING |

## 12. Integration Matrix

| ID | Integration | DEV | PRD |
|---|---|---|---|
| INT-001 | Existing YouTube resolver | ACTIVE | NOT AUDITED |
| INT-002 | Supadata native transcript | DEV CORE VALIDATED | BLOCKED |
| INT-003 | Gemini / Vertex AI | ACTIVE | NOT AUDITED |
| INT-004 | Stripe | NOT FULLY AUDITED | NOT AUDITED |
| INT-005 | Firebase Authentication | ACTIVE | NOT AUDITED |

## 13. DPR / ADR Register

| ID | Subject | State | PRD |
|---|---|---|---|
| DPR4-R002 | Supadata native transcript fallback | DEV CORE VALIDATED — COUNCIL GATES PENDING | BLOCKED |
| DPR4-R002-A4-P1.5 | Supadata native candidate | APPROVED / IMPLEMENTED DEV | NOT AUTHORIZED |
| FUTURE | Model routing | PLANNED | NOT STARTED |
| FUTURE | RAG architecture | PLANNED | NOT STARTED |
| FUTURE | Voice architecture | PLANNED | NOT STARTED |
| FUTURE | Async workers / queues | METRICS-DRIVEN | NOT APPLICABLE |
| FUTURE | Multi-region | SCALE ROADMAP | NOT APPLICABLE |

## 14. DPR4-R002 Detailed Register

Constraints: DEV only; server-side YouTube transcript acquisition; existing resolver first; Supadata native fallback only; Supadata failure -> metadata fallback; no AI/Whisper fallback; no frontend key; no new microservice/schema migration; no PRD authorization.

Source history: PR #23 merged at `3054da40370a669c0eae2c6585a6a6d4796805b7`; PR #24 merged at `33b10aed12e2cc5cfe8ac7ff689728e328bef7e6`.

Recorded automated gates: Supadata 6/6, resolver 6/6, request logging 12/12, rate-limit 12/12, Firestore rules 56/56; total 92/92. TypeScript/lint PASS, production build PASS, `git diff --check` PASS.

Real DEV candidate evidence: primary classified `youtube_transcript_disabled_or_unavailable` with duration 868ms; Supadata native succeeded with duration 3583ms. Candidate login and downstream behavior succeeded.

The reviewed structured query did not explicitly expose `mode=transcript`; deterministic tests establish code behavior, which is distinct from explicit runtime mode observability.

### Council acceptance

| Dimension | Status |
|---|---|
| Golden real DEV fallback | PASS |
| Primary-success isolation | PASS — deterministic |
| Supadata unavailable -> metadata fallback | PASS — deterministic |
| Error classification | PASS |
| Build/lint/tests | PASS |
| Candidate auth regression | PASS |
| No PRD change executed in DPR4-R002 scope | PASS |
| Secret safety | PASS WITH RESERVATION |
| Partial transcript | PENDING |
| Long transcript | PENDING |
| PT integrated evidence | PENDING |
| EN integrated evidence | PENDING |
| ES integrated sentinel | PENDING |
| Native-call accounting | PARTIAL |

Do not promote DPR4-R002 to `DEV READY` until mandatory pending gates are evidenced or formally waived.

## 15. Security

| ID | Control | DEV | PRD |
|---|---|---|---|
| SEC-001 | Backend-only secrets | PASS WITH RESERVATION | PENDING |
| SEC-002 | Secret Manager | PASS | PENDING |
| SEC-003 | Runtime least privilege | PARTIAL | NOT AUDITED |
| SEC-004 | Browser-key restrictions | PASS | NOT AUDITED |
| SEC-005 | Firestore isolation | PASS WITH RESERVATION | PENDING |
| SEC-006 | No leakage observed in reviewed artifacts/logs | PASS WITH RESERVATION | PENDING |
| SEC-007 | SAST / dependency scanning / DAST | PENDING | PENDING |
| SEC-008 | API security / penetration testing | PENDING | PENDING |
| SEC-009 | Threat model | PENDING | PENDING |
| SEC-010 | AI security controls | PENDING | PENDING |
| SEC-011 | Incident response | PENDING | PENDING |

## 16. Observability / SRE

| ID | Capability | DEV | PRD |
|---|---|---|---|
| OBS-001 | Cloud Logging | PASS | NOT AUDITED |
| OBS-002 | Structured request events | PASS | NOT AUDITED |
| OBS-003 | Error classification | PASS | PENDING |
| OBS-004 | Provider latency | PASS WITH RESERVATION | PENDING |
| OBS-005 | Rate limiting | PASS | PENDING |
| OBS-006 | Explicit structured transcript mode | PENDING | PENDING |
| OBS-007 | Dashboards / alerting | PENDING | PENDING |
| OBS-008 | SLI/SLOs | PLANNED | PLANNED |
| OBS-009 | Synthetic checks | PLANNED | PLANNED |
| OBS-010 | Incident runbook | PENDING | PENDING |

## 17. FinOps

| ID | Control | DEV | PRD |
|---|---|---|---|
| FIN-001 | Billing inventory | NOT AUDITED | NOT AUDITED |
| FIN-002 | Budgets / alerts | NOT AUDITED | PENDING |
| FIN-003 | AI token accounting | PENDING | PENDING |
| FIN-004 | Supadata native-call accounting | PARTIAL | PENDING |
| FIN-005 | Supadata recurring PRD spend | NOT APPLICABLE | BLOCKED |
| FIN-006 | Cost per study/user/plan | PLANNED | PLANNED |
| FIN-007 | Abuse/cost protection | PARTIAL | PENDING |
| FIN-008 | Cost-aware model routing | PLANNED | PLANNED |

## 18. Privacy / Compliance

Privacy Policy PT/EN/ES and Supadata disclosure are recorded as PASS for the DEV code/build scope. Data minimization, processor inventory, retention, deletion, log retention, terms, and LGPD/GDPR operational readiness remain PENDING/NOT AUDITED for production readiness.

## 19. Product / AI Quality

Summary, Tutor, Quiz, Flashcards, Mind Map and Extra Questions remain active/evolving and require formal quality/pedagogical evaluation before production readiness. YouTube ingestion is `DEV CORE VALIDATED` for DPR4-R002 scope. Document ingestion remains NOT AUDITED in this Matrix. PT/EN/ES integrated acceptance evidence remains PENDING.

## 20. Migration Register

| ID | Activity | State |
|---|---|---|
| MIG-001 | Legacy project identified | COMPLETE |
| MIG-002 | Dedicated DEV project | COMPLETE |
| MIG-003 | DEV Firestore | COMPLETE |
| MIG-004 | Legacy read-only inventory | PARTIAL / CONTINUING |
| MIG-005 | Real writes/rules audit | PARTIAL / CONTINUING |
| MIG-006 | DEV Firebase / Cloud Run / secrets | OPERATIONAL / MIGRATION CLOSURE PENDING |
| MIG-007 | Residual legacy dependency audit | PENDING |
| MIG-008 | PRD baseline | BLOCKED |
| MIG-009 | Production data-migration decision | PENDING |
| MIG-010 | Legacy decommission | BLOCKED |

## 21. Scale Roadmap

Phase 1 (~1,000 users): validate product/security/stability/cost; observability, rate limiting, plan limits, cost alerts; keep managed/simple architecture.

Phase 2 (~10,000): only when metrics justify, separate frontend/API/workers and introduce Cloud Tasks/Pub/Sub, retry, idempotency, DLQ, and Cloud Run tuning.

Phase 3 (~100,000): when justified, evaluate domain services, IaC, SLOs, DR, canary, BigQuery, advanced FinOps, and provisioned Vertex AI capacity.

## 22. Master Gate Matrix

| Gate | Domain | State |
|---|---|---|
| G0 | Architecture / Governance | PASS — CURRENT BASELINE |
| G1 | Git / source integrity | PASS |
| G2 | Build | PASS for DPR4-R002 baseline |
| G3 | Automated tests | PASS for DPR4-R002 baseline |
| G4 | DEV deployment | PASS |
| G5 | DEV core runtime validation | PASS |
| G5A | DPR4-R002 Council acceptance | PENDING |
| G6 | Security readiness | PENDING |
| G7 | Data / Firestore readiness | PENDING |
| G8 | AI quality | PENDING |
| G9 | Observability / SRE | PENDING |
| G10 | FinOps | PENDING |
| G11 | Privacy / compliance | PENDING |
| G12 | Load / performance | PENDING |
| G13 | Backup / DR | PENDING |
| G14 | PRD infrastructure | NOT AUDITED |
| G15 | PRD secrets / IAM | NOT AUDITED |
| G16 | PRD Firebase / Firestore | NOT AUDITED |
| G17 | Rollback rehearsal | PENDING |
| G18 | Production GO / NO-GO | BLOCKED |
| G19 | PRD deployment | BLOCKED |
| G20 | PRD validation | BLOCKED |
| G21 | Stable production | BLOCKED |

**Current next gate: G5A — close/audit DPR4-R002 Council acceptance evidence.**

## 23. Release Register

| ID | Env | Commit | Revision | State |
|---|---|---|---|---|
| REL-DEV-001 | DEV | pre-DPR4-R002 | `astra-learning-ai-dev-dpr4f007-b330e77` | ROLLBACK BASELINE |
| REL-DEV-002 | DEV | `3054da4...` | `astra-learning-ai-dev-dpr4r002-3054da4` | SUPERSEDED |
| REL-DEV-003 | DEV | `33b10aed...` | `astra-learning-ai-dev-dpr4r002-33b10ae` | CORE VALIDATED |
| REL-PRD-001 | PRD | — | — | BLOCKED |

## 24. Rollback Register

DPR4-R002 rollback: disable/remove Supadata path -> existing resolver -> metadata fallback. DEV Cloud Run rollback baseline is preserved. No DPR4-R002 database/schema or frontend data migration is required. Exact PRD rollback procedure remains PENDING.

## 25. Risk & Technical Debt

| ID | Description | Severity | State |
|---|---|---|---|
| RISK-001 | DPR4-R002 Council evidence incomplete | HIGH | OPEN |
| RISK-002 | PRD infrastructure not audited | HIGH | OPEN |
| RISK-003 | Supadata recurring PRD spend not authorized | HIGH | OPEN |
| RISK-004 | PRD IAM/secrets/security baseline not audited | HIGH | OPEN |
| RISK-005 | Production backup/DR not closed | HIGH | OPEN |
| RISK-006 | Integrated partial/long/PT/EN/ES evidence incomplete | MEDIUM | OPEN |
| DEBT-001 | Explicit transcript-mode runtime observability incomplete | LOW | OPEN |
| DEBT-002 | Vite production bundle warning >500 kB | MEDIUM | OPEN / OUTSIDE DPR4-R002 |
| DEBT-003 | Complete Supadata call accounting not evidenced | MEDIUM | OPEN |

## 26. Open Actions

P0: close/audit partial, long, PT, EN, ES sentinel and native-call-accounting evidence; then obtain formal Council closure of DPR4-R002.

P1 after Council closure/authorization: Fase 7A PRD read-only inventory; audit PRD existence/state; establish IAM/secrets, Firebase/Firestore, FinOps, monitoring, backup/DR and rollback baselines.

P2: evaluate explicit transcript-mode observability and frontend bundle optimization separately.

## 27. Mandatory Update Triggers

Update this Matrix for material DPR/ADR changes, architecture changes, GCP/Firebase/Firestore/IAM/secret-reference changes, material PR merges, CI gate changes, DEV/PRD deployments, readiness changes, material security incidents, rollbacks, FinOps exposure changes, stable releases, and material risks/debts.

Minor cosmetic/typo changes do not require an independent Matrix state transition.

## 28. Mandatory Matrix Impact Report

```text
MASTER MATRIX IMPACT

Items updated:
<IDs>

Status transitions:
<old> -> <new>

New evidence:
<evidence>

New risks:
<IDs or none>

Resolved risks:
<IDs or none>

Next gate:
<gate>

Matrix update required:
YES / NO
```

## 29. Production Authorization Rule

No PRD deployment may be authorized while an applicable mandatory production gate is `FAILED`, `NOT AUDITED`, or `BLOCKED`, unless the Council records an explicit waiver with affected gate, risk, justification, accountable owner, mitigation, and review/expiration date.

A waiver does not convert missing evidence into `PASS`.

## 30. Change Log

| Date | Version | Change |
|---|---|---|
| 2026-09-27 | 1.0 | Established ASTRA-GOV-MM-001 and initial baseline |
| 2026-09-27 | 1.0 | Registered DEV architecture/GCP/Firebase/Firestore state |
| 2026-09-27 | 1.0 | Registered DPR4-R002 implementation, tests, deployment and runtime evidence |
| 2026-09-27 | 1.0 | Corrected DPR4-R002 to `DEV CORE VALIDATED — COUNCIL GATES PENDING` |
| 2026-09-27 | 1.0 | Registered pending partial/long/PT/EN/ES/call-accounting gates |
| 2026-09-27 | 1.0 | Established DEV-to-PRD Master Gate Matrix |
| 2026-09-27 | 1.0 | Set G5A Council acceptance as next gate |

## 31. Current Checkpoint

```text
Repository: pauloha-cloud/Astra.ai-v7
Official branch: main
Baseline source commit: 33b10aed12e2cc5cfe8ac7ff689728e328bef7e6

DEV project: astra-learning-ai-dev
DEV Cloud Run service: astra-learning-ai-dev
DEV region: us-west2
Validated candidate: astra-learning-ai-dev-dpr4r002-33b10ae

DPR4-R002:
DEV CORE VALIDATED — COUNCIL GATES PENDING

Overall Astra:
PRODUCTION READINESS INCOMPLETE

PRD:
NOT READY / NOT AUTHORIZED

Current gate:
G5A — DPR4-R002 FORMAL COUNCIL ACCEPTANCE

Next:
CLOSE/AUDIT REMAINING DEV COUNCIL GATES

After closure:
FASE 7A — PRD READ-ONLY INVENTORY
```

---

**End of Astra Master Matrix v1.0**
