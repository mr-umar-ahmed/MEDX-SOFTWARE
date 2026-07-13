# MedX — Features & Plan Split

This is the product's feature master list, mapped across the three plans. It is derived from:
- the MedX landing page (the promises we already made publicly), and
- a scan of what Indian pathology-lab software actually ships today (CrelioHealth/LiveHealth,
  Birlamedisoft, MocDoc, Suntech LIMS, LabSmart, eLab, CREsoft, Attune, and typical desktop LIS).

**Legend:** ✅ included · ➕ add-on · — not in this plan
**Cost rule reminder:** anything marked 💰 would cost the *admin* money at scale, so it is only ever
enabled through the **lab's own free account** (WhatsApp/Gmail) or reserved for **Enterprise**.

---

## PLAN 1 — STARTER  (₹7,999 one-time · ₹0 admin cost · fully offline)

> "Everything a single lab needs to run every day, with zero dependence on the internet."

### Patient & front desk
- ✅ Patient registration (name, age/DOB, sex, phone, address, ABHA field optional)
- ✅ Auto patient ID + returning-patient lookup (by phone/name)
- ✅ **Token / queue system** with counter display (from landing)
- ✅ Referring doctor master (add/select doctor, clinic)
- ✅ Multi-language UI labels (English + Hindi to start; regional packs later)

### Test catalog & orders
- ✅ **Diagnostic test catalog** (curated common tests with Indian reference ranges by age/sex;
  full 3,000-name directory available as send-out/referral entries)
- ✅ Test panels/profiles (CBC, LFT, KFT, Lipid, Thyroid, etc.)
- ✅ Per-lab price list editing; custom tests
- ✅ Order creation (select tests → order)

### Billing (GST-compliant)
- ✅ **GST invoice** — CGST/SGST/IGST auto by state, HSN 999316, FY-based invoice numbering
- ✅ Discounts (₹ / %), concessions, free-camp billing
- ✅ Part-payment & due tracking; payment modes (cash/UPI/card)
- ✅ Cancel/refund with reason + audit
- ✅ Print invoice (A4 + thermal/58mm receipt), reprint

### Samples & workflow
- ✅ Accession/sample number generation
- ✅ **Barcode label printing** (sample labels)
- ✅ Sample status tracking (collected → received → in-process → reported)

### Results & reports
- ✅ **Result entry** with auto **abnormal-value flagging** (H/L vs age/sex range)
- ✅ Report templates (numeric, descriptive, culture/AST)
- ✅ **A4 report** with lab letterhead, doctor signature block, verified stamp
- ✅ Pathologist verify/lock step (results locked after verification)
- ✅ Report reprint & PDF export to disk

### Delivery (₹0 — uses the lab's own accounts)
- ✅ **One-click WhatsApp** — opens WhatsApp Web/Desktop with the patient, message pre-filled,
  PDF attached (lab's own number → zero cost) 💰-free
- ✅ Email report via the lab's own Gmail/SMTP 💰-free
- ✅ Print

### Admin (in-app, for the lab owner)
- ✅ Users & roles (owner / receptionist / technician / pathologist)
- ✅ Day book / collection register; basic expense entry
- ✅ **Automatic local backup** (scheduled to a folder / USB) + restore
- ✅ Basic dashboard (today: patients, revenue, dues, pending reports)
- ✅ Works on LAN? — single-PC in Starter (multi-counter LAN is Pro)

### License
- ✅ License-key activation, offline grace period, daily heartbeat to admin

---

## PLAN 2 — PRO  (₹14,999 + ₹499/mo · still ~₹0 admin cost)

> "Everything in Starter, plus the features that make a busy lab faster." Everything below is
> **additive** to Starter.

### Multi-user & scale
- ✅ **Multi-counter LAN mode** — several reception/reporting PCs share one lab database over the
  local network (one PC acts as host; ₹0, no cloud)
- ✅ Advanced role permissions & per-user audit trail

### Patient portal & delivery
- ✅ **QR Patient Portal** (from landing) — QR on every report/invoice → patient sees history &
  trend graphs (HbA1c, lipids) & books next test. Hosted on **free tier**; only report *links/metadata*
  go online, kept minimal to stay free. 💰-controlled
- ✅ **Automated** WhatsApp/SMS on verify (lab connects *their own* WhatsApp Business API / DLT-SMS
  credentials — cost is the lab's, not the admin's) 💰-lab-pays
- ✅ Trend graphs & cumulative reports for repeat patients

### Productivity
- ✅ **Home-collection / phlebotomist module** (visit scheduling, collection list, route)
- ✅ **Inventory / reagent stock** (stock in/out, low-stock alerts, expiry)
- ✅ **Referral / outsourced-lab tracking** (tests sent to bigger labs, cost vs charge, status)
- ✅ **Instrument/analyzer interfacing** (LIS) — read results from analyzers (ASTM/HL7/serial)
  to cut manual typing (huge time saver; the #1 reason labs upgrade)
- ✅ **Doctor commission** automation (per-test/%/slab, monthly statement, payout register)
  — directly kills the "commissions on paper" pain from the landing
- ✅ Advanced MIS/analytics (revenue by test/doctor/period, TAT reports, referral analytics)
- ✅ Histopathology/cytology **narrative report editor** with saved templates & snippets
- ✅ Camp/organization/corporate billing batches

---

## PLAN 3 — ENTERPRISE  (₹35,000 + ₹1,499/mo · the best of everything)

> "Everything in Pro, plus multi-branch, accreditation, and integrations." Additive to Pro.

### Multi-branch & cloud
- ✅ **Multi-branch / franchise** — one dashboard across cities, consolidated MIS,
  inter-branch sample transfer, branch-level P&L (opt-in cloud sync)
- ✅ **Cloud sync & central backup** (this is the one place admin may bear small cost — priced in)
- ✅ B2B / franchise partner portal; per-branch price lists

### Accreditation & compliance
- ✅ **NABL Quality Module** (from landing) — equipment calibration due-dates, daily **IQC** logs
  with **Westgard-rule** flagging, temperature monitoring, SOP document store, internal-audit
  checklist (ISO 15189), EQAS tracking
- ✅ **ABDM / ABHA** integration (M1) — capture & verify ABHA at registration, Care-Context linking
  for HIP, consent management
- ✅ Full audit trail & e-sign compliance

### Insurance, integrations, intelligence
- ✅ **TPA / insurance billing** (from landing) — hospital-attached, ward-linked billing,
  pre-auth, package/rate-list mapping
- ✅ Multi-department routing & pathologist digital sign-off across departments
- ✅ **Doctor portal** (referring doctors log in to see their patients' reports & commission)
- ✅ **API access** / webhooks for hospital HIS integration
- ✅ AI assists (report interpretation hints, delta-check, smart reference-range suggestions) —
  optional, runs against low-cost/opt-in service

---

## Cross-cutting: how each promise from the landing page is kept

| Landing promise | Plan | How |
|-----------------|------|-----|
| QR Patient Portal | Pro | Free-tier hosted report links + in-app QR on PDF |
| WhatsApp + Email one-click | Starter | Lab's own WhatsApp/Gmail (₹0). Automated = Pro (lab's API) |
| Works without internet | Starter | Local SQLite is source of truth; sync is optional |
| 3000+ tests pre-loaded | Starter | Catalog package; common tests have ranges, rest are send-outs |
| GST-compliant billing | Starter | CGST/SGST/IGST, HSN 999316, FY numbering |
| Queue + Token | Starter | Token module + counter display |
| NABL Quality Module | Enterprise | QC/Westgard/calibration/SOP/audit |
| ABDM (M1) | Enterprise | ABHA capture + care-context + consent |
| Multi-branch | Enterprise | Cloud sync + consolidated dashboard |
| Home collection | Pro | Phlebotomist module |
| Sample tracking / barcodes | Starter | Accession + barcode labels |
| Doctor commission | Pro | Commission engine + statements |

---

## Admin-Panel-controlled feature flags

Every capability above is gated by an **entitlement flag** delivered on the license heartbeat, so the
admin can turn any feature on/off per lab from the Admin Panel without reinstalling — e.g. enable a
Pro feature as a trial, disable a feature for a non-paying lab, or ship a new feature dark and switch
it on remotely. The kill-switch (license expired/revoked) is the same mechanism.
