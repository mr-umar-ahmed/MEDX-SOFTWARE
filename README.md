# MedX — Pathology Lab Software for India

> **What we are building** — the master context. Read this first. Any developer, agent, or
> collaborator who joins this project should be able to understand the entire product from this file.

---

## 1. The one-line pitch

**MedX is offline-first pathology lab software for Indian diagnostic labs — it runs on any
Windows PC (even old, low-spec ones), works without internet, and is sold with a one-time
license by a single admin (the owner of this repo).**

Two products live in this repo:

1. **MedX Lab Software** (`apps/medx-app`) — the desktop application the lab staff use every day.
2. **MedX Admin Panel** (`apps/medx-admin`) — the web dashboard the *seller/admin* uses to
   issue licenses, manage labs & payments, and remotely control features.

There are **only these two platforms**. Nothing else.

---

## 2. Who it is for

- **End users:** small-to-medium Indian pathology labs. Staff are **often not digitally literate.**
  The admin (repo owner) installs & configures each lab remotely over **AnyDesk**.
- **Admin/seller:** the repo owner. Sells one-time licenses + optional monthly add-ons, manages
  everything from the Admin Panel.
- **Patients & referring doctors:** receive reports over WhatsApp/print and (higher plans) via a
  QR patient portal.

Everything is **India-first**: GST billing, rupee pricing, Indian reference ranges, ABHA/ABDM
readiness, WhatsApp delivery, DLT-SMS. **No foreign tax systems, no foreign payment rails, no
US/EU-only assumptions.**

---

## 3. The hard constraints (these drive every technical decision)

| # | Constraint | Consequence |
|---|-----------|-------------|
| C1 | **Must work on low-spec PCs** (2–4 GB RAM, old Windows incl. 7/8/10/11) | Lightweight desktop app, local DB, no heavy cloud calls |
| C2 | **Must work offline** (power cuts, BSNL outages) — "lil internet is ok" | Local SQLite is the source of truth; network is optional |
| C3 | **₹0 running cost to the admin for Plan 1 & Plan 2** | No per-lab cloud storage/compute. Data stays on the lab's PC. Delivery uses the *lab's own* WhatsApp/Gmail. Only a tiny daily license check touches the cloud (free tier). |
| C4 | **Fully controllable from the Admin Panel** | App fetches license status + feature entitlements + a kill-switch on a daily heartbeat |
| C5 | **Users are not digitally literate** | Dead-simple UI, big buttons, Hindi/regional labels, guided flows, sensible defaults |
| C6 | **Sold as a product, not a toy** | Real data integrity, backups, GST-valid invoices, audit trail |

> **The central design resolution:** the lab software is a **local-first desktop app**. Patient and
> report data never leave the lab's computer unless the lab is on a plan that explicitly enables
> cloud sync / patient portal. The admin's servers only ever hold *licensing & account metadata* —
> which is tiny and fits comfortably in a cloud free tier, keeping admin cost at ~₹0.

---

## 4. Architecture at a glance

```
┌─────────────────────────────────────────────┐        ┌──────────────────────────────┐
│  LAB'S WINDOWS PC  (offline-first)            │        │  ADMIN / CLOUD (free tier)    │
│                                               │        │                              │
│  MedX Lab Software (Electron desktop app)     │        │  MedX Admin Panel            │
│   • React UI (renderer)                       │        │   (Next.js on Vercel)        │
│   • Local SQLite DB  ◀── source of truth      │        │                              │
│   • PDF/label/barcode generation (local)      │        │  Firebase (free tier)        │
│   • WhatsApp/email via lab's OWN account      │        │   • Auth (admin login)       │
│                                               │        │   • Firestore: licenses,     │
│         │  daily license heartbeat (tiny)     │        │     labs, payments, flags    │
│         └──────────  HTTPS  ───────────────────────────▶   • Feature-flag + killswitch │
│         ◀───────  entitlements + status  ─────────────    │                              │
└─────────────────────────────────────────────┘        └──────────────────────────────┘
```

- **Lab app stack:** Electron + React + TypeScript + Vite + **better-sqlite3** (local DB).
- **Admin stack:** Next.js + Firebase (Auth + Firestore), deployed on Vercel.
- **Why Electron (not Tauri):** no Rust toolchain required, bundles its own Chromium so it runs on
  old Windows without a WebView2 dependency, and produces a single `.exe` installer — ideal for
  AnyDesk installs on machines we don't control. (Revisit Tauri only if RAM becomes a real problem.)

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full technical design.

---

## 5. The three plans (money model)

| Plan | Positioning | Price (from landing) | Cloud cost to admin |
|------|-------------|----------------------|---------------------|
| **Starter** | Everything a single lab needs daily | ₹7,999 one-time | **₹0** |
| **Pro** | Productivity boosters | ₹14,999 + ₹499/mo | **₹0** (tiny free-tier only) |
| **Enterprise** | The best of everything, multi-branch | ₹35,000 + ₹1,499/mo | Small (cloud sync opt-in) |

Feature-by-feature split is in [`docs/FEATURES-AND-PLANS.md`](docs/FEATURES-AND-PLANS.md).
The guiding rule: **Plan 1 & 2 never cost the admin money** — anything that would incur per-lab
cloud cost (real-time sync, hosted patient portal at scale, outbound WhatsApp API, SMS) is either
routed through the *lab's own* free accounts or reserved for Enterprise.

---

## 6. Repo layout

```
MEDX-SOFTWARE/
├── README.md                  ← you are here (the context)
├── docs/
│   ├── ARCHITECTURE.md        ← technical design, data flow, security, licensing
│   ├── FEATURES-AND-PLANS.md  ← every feature, mapped to a plan
│   └── ROADMAP.md             ← build order, milestones, status
├── apps/
│   ├── medx-app/              ← the desktop lab software (Electron+React+SQLite)
│   └── medx-admin/            ← the admin web panel (Next.js+Firebase)  [added later]
└── packages/
    └── catalog/               ← the diagnostic test catalog (data + types), shared
```

---

## 7. How we work

**Production mindset: build → test → move forward.** Every vertical slice must actually run and be
verified before we move on. No dead scaffolding. Commit working software.

Current status and next steps are always in [`docs/ROADMAP.md`](docs/ROADMAP.md).
