# ToPay Enterprise

### Production-Grade Merchant Onboarding & Transaction Settlement Engine

ToPay Enterprise is a high-throughput, secure financial middleware pipeline engineered on **Spring Boot 3.4.1**, **Java 26**, and **PostgreSQL**. The platform provides automated institutional merchant underwriting (KYC state machines), idempotent multi-channel refund processing, and server-side transaction ledger pagination designed to handle high-density data workloads ($100k+$ records) with minimal memory allocation overhead.

---

## 🏛️ System Architecture

```
                       🖥️ React 18 / Vite Client
                                   │
                                   ▼ [HTTPS / CORS Boundary]
        ┌─────────────────────────────────────────────────────────────┐
        │            SPRING SECURITY ADAPTER (RBAC GATEWAY)           │
        └─────────────────────────────────────────────────────────────┘
                                   │
                  ┌────────────────┴────────────────┐
                  ▼                                 ▼
   ┌──────────────────────────────┐  ┌──────────────────────────────┐
   │  MERCHANT ONBOARDING ENGINE  │  │   ADMINISTRATIVE CONTROLS    │
   ├──────────────────────────────┤  ├──────────────────────────────┤
   │ 1. Legal Entity Profile      │  │ • Automated Queue Management │
   │ 2. Malware Sandbox (BYTEA)   │  │ • State Diff Serialization   │
   │ 3. Escrow Account Validation │  │ • JWT Session Impersonation  │
   │ 4. Deterministic State Lock  │  │ • Immutable Audit Trails     │
   └──────────────────────────────┘  └──────────────────────────────┘
                  │                                 │
                  └────────────────┬────────────────┘
                                   ▼
        ┌─────────────────────────────────────────────────────────────┐
        │                 DATA ACCESS LAYER (JPA / SQL)               │
        ├─────────────────────────────────────────────────────────────┤
        │  • Forward-Only JDBC Fetch Cursors for Stream Exports       │
        │  • Non-Streaming BYTEA Structures for Document Isolation    │
        └─────────────────────────────────────────────────────────────┘

```

---

## 🚀 Core Capabilities

### 📋 1. Deterministic Merchant Underwriting State Machine

Manages corporate risk-assessment and compliance through a strict four-stage isolation sequence:

* **Stage 1 (Profile Isolation):** Captures metadata configurations. Mutations are structurally locked once the status advances beyond `DRAFT`.
* **Stage 2 (Secure Cryptographic Vault):** Processes multi-part `PAN` and `GST` attachments. Assets are written directly to PostgreSQL `BYTEA` blocks rather than old `oid` streaming vectors, eliminating connection-pool tie-ups during multi-part chunk handling.
* **Stage 3 (Escrow Routing):** Parses and sanitizes bank allocation patterns (Account and IFSC values) against strict formatting rules.
* **Stage 4 (Signatory Declaration):** Binds executive board parameters, terminates write accessibility for the tenant, and transitions the global state to `SUBMITTED`.

### 📊 2. Enterprise Ledger Windowing & High-Performance Data Streaming

* **Optimized Native Pagination:** Offloads record aggregation directly to PostgreSQL utilizing explicit native queries (`findPaginatedTransactions`). This prevents application-tier heap exhaustion and scales predictably under heavy table contention.
* **Zero-Buffer CSV Streaming:** The `/reports` distribution engine skips in-memory row compiling. By executing inside a read-only transaction boundary with a forward-only JDBC fetch cursor, database records stream straight into the out-bound network socket wrapper via a `PrintWriter` pipeline.
* **Materialized KPI Processing:** The metric systems aggregate day-to-day processing volumes and system-wide success statistics via optimized mathematical projections (`SUM`/`COUNT`) rather than downloading multi-row entity sets into memory.

###  3. Financial Controls & Security Infrastructure

* **Atomic Idempotency Protocol:** Protects concurrent refund paths (`/{transactionId}/refund`) against race conditions and dual-delivery anomalies via time-bounded concurrent validation lookups (`Idempotency-Key` headers).
* **Granular RBAC Enforcements:** Implements methodical method-level interception leveraging declarative Spring Security statements (`@PreAuthorize`) paired with distinct functional authorities (`transaction:read`, `refund:create`).
* **Audit-Log Serialization:** Intercepts administrative modifications to log point-in-time entity delta graphs. Uses an object-mapping pipeline to stringify `Pre-State` and `Post-State` environments into an immutable system audit trail.

---

## 🛣️ API Directory Blueprint

### Onboarding Workflows (`/api/v1/onboarding/`)

* `POST /step1-business` - Establishes institutional baseline profile parameters.
* `POST /step2-upload` - Accepts multi-part document matrices into the scanning pipeline.
* `POST /step3-bank` - Binds settlement escrow metadata definitions to the tenant.
* `POST /step4-directors` - Commits corporate signatory fields and executes profile state closure.

### Settlement & Ledger Operations (`/api/v1/merchant/transactions/`)

* `GET /` - Resolves server-side filtered transaction ledger page sets.
* `POST /{transactionId}/refund` - Processes an split-second idempotent refund adjustment.
* `GET /metrics` | `GET /kpis` - Computes and renders real-time performance indicators.
* `GET /reports` - Streams the comprehensive data register out as a tabular CSV attachment.

### Corporate Controls Operations (`/api/v1/admin/management/`)

* `GET /merchants/queue` - Polls the verification register for records marked `SUBMITTED`.
* `POST /merchants/{merchantId}/review` - Applies lifecycle modifications (`APPROVE`/`REJECT`).
* `GET /merchants/{merchantId}/diff-view` - Pulls historical audit properties side-by-side.
* `POST /merchants/{merchantId}/action` - Executes manual override utilities (`BLOCK`, `UNBLOCK`, `TRIGGER_SETTLEMENT`).

---

##  Data Infrastructure Configuration

To migrate legacy relational databases utilizing explicit streaming pointers over to ToPay's high-performance `BYTEA` storage, execute this schema update script:

