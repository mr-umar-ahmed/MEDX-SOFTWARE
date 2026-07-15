# MedX Diagnostic Software Suite: Comprehensive User & Developer Guide

Welcome to the official documentation for the **MedX Diagnostic Software Suite**. This guide covers the three main modules of the system:
1. **MedX Desktop App (LIMS)**: Offline-first pathology lab management application.
2. **MedX Patient Portal & Marketing Website**: Public web portal for bookings and secure report downloads.
3. **MedX SaaS Super Admin ERP**: Cloud control panel for managing software licenses, billing, sales, and support.

This manual is divided into **User Guides** (for non-technical operators and lab admins) and **Developer Guides** (for engineers extending or maintaining the software).

---

# Part 1: MedX Desktop App (Pathology LIMS)

The MedX Desktop App is an offline-first laboratory information management system (LIMS) designed to run inside pathology labs to handle registrations, billing, sample collection, machine interfacing, report generation, and lab analytics.

---

## 1.1 User Guide (Lab Staff & Admins)

### Installation & System Startup
1. **System Requirements**: Windows 10/11 (64-bit), 4GB RAM minimum, SQLite3 (included).
2. **Installation**: Double-click the `MedX-Pathology-LIMS-Setup.exe` installer. It will automatically install to your local user directory.
3. **First-time Activation**:
   - On startup, the app loads into the **Starter (Free)** tier.
   - Go to **Settings** (bottom left sidebar) ➔ Enter your **License Key** (obtained from the MedX Sales team) ➔ Click **Activate**. This will instantly unlock **Pro** or **Enterprise** features.
4. **Auto-Updates**: The desktop app checks for updates automatically on startup. If an update is found, it downloads in the background, and a button labeled `Restart & Install Update` will appear at the bottom of the sidebar.

### Front Desk Workflow
* **New Registration (Billing)**:
  - Click `＋ New Registration` on the Dashboard or navigate to `New Order` in the sidebar.
  - Search for an existing patient by name or phone, or click `New Patient` to create a profile.
  - Choose a **Referral Doctor** and set the priority (`Routine`, `Urgent`, `Stat`).
  - Add tests or pre-bundled test packages (Panels) from the search bar (e.g., CBC, LFT, Lipid Profile).
  - Apply discounts (flat or percent), configure GST, enter the paid amount, select the payment mode (Cash, Card, UPI), and click **Register Order**.
* **Estimates**: If a patient wants to check test prices before registering, create a quotation under `Estimates` and print it.
* **Token Queue & Display**:
  - The `Queue / Tokens` module automatically issues a queue number for walk-in patients.
  - Open the `Counter Display` (URL: `/display`) on a secondary TV screen in the waiting room to announce token numbers.

### Lab & Pathology Workflow
1. **Sample Tracking (`🧪 Samples`)**:
   - Once a registration is complete, the sample goes into the queue.
   - Print thermal barcodes for test tubes directly from the patient’s order view.
   - Mark samples as **Collected** when blood/urine is drawn.
2. **Result Entry (`⌨ Results`)**:
   - Technicians enter numerical or qualitative values for each test.
   - Normal ranges are dynamically shown next to input fields. Values outside the normal range are highlighted.
3. **Verification (`✅ Verification`)**:
   - Pathologists view completed results.
   - They click **Verify** to digitally sign off on the report, which locks editing and changes the order status to `reported`.
   - Verified reports can immediately be printed, saved as PDFs, or synced to the patient portal.

### Doctor Referral & Commissions
- **Doctor List**: Register reference doctors and assign specific commission percentages.
- **Commissions Tracker**: Computes commissions due to doctors at the end of the month based on referrals. Payouts can be logged directly.
- **MOU & Corporate Billing**: Set custom, discounted price sheets for corporate clients or collection centers.

### Quality Control & Machine Interfacing (Enterprise Only)
- **Machine Interfacing**:
  - Connect diagnostic equipment directly via **Serial (COM)** ports or **TCP/IP** networks.
  - Raw analyzer outputs (HL7/ASTM formats) are received and can be mapped automatically to patient records to prevent typing errors.
- **Interactive QC & LJ Charts**: 
  - Log control runs (Level 1 Normal, Level 2 High, Level 3 Low) with targets (Mean and Standard Deviation).
  - Visualize control trends instantly using the interactive, zero-dependency **Levey-Jennings (LJ) SVG Charts** showing deviation lanes from Mean up to $\pm 3\text{SD}$.
  - Values are automatically evaluated against the **Westgard Rules Engine** (flagging $1_{3s}$ rejection, $2_{2s}$ rejection, $R_{4s}$ rejection, $10_x$ rejection, and $1_{2s}$ warnings) to monitor test accuracy.
- **SOP Viewer**: Access digital Standard Operating Procedures guidelines directly in the workspace.

### LAN Multi-Counter Synchronization (Pro / Enterprise)
- **Settings Configuration**: Labs running Pro or Enterprise subscriptions can connect up to 3 PCs (Pro) or unlimited PCs (Enterprise) on the same local area network.
- **Host vs Client Roles**:
  - **Host Mode**: Sets up this PC as the central server listening on Port **8095**.
  - **Client Mode**: Connects to the Host PC's local IP address (e.g., `192.168.1.10`). All database mutations are transparently synchronized in real-time.

---

## 1.2 Developer Guide (Desktop Engineers)

### Tech Stack
* **Runtime**: Electron
* **Frontend**: React 19, TypeScript, Vite
* **Database**: SQLite3 (native node module) with fallback JSON file persistence
* **State Management**: Zustand
* **Packaging**: Electron Builder (NSIS installers + Portable builds)

### Architecture & Process Model
* **Main Process (`electron/main.ts`)**: Handles native desktop interactions, SQLite operations, serial/TCP communication with diagnostic instruments, and checks for updates via `electron-updater`.
* **LAN Sync Socket Server**: Electron main launches a raw TCP socket server on port `8095` in Host mode. Client processes connect and communicate via Line-Delimited JSON (NDJSON) packets.
* **State Propagation**: Changes written to `medx-store-v1` are broadcast to local renderers using Electron IPC `medx-broadcast` channels, triggering Zustand to force-reload state.
* **Renderer Process**: The React application runs in a chromium instance. It utilizes `HashRouter` for routing to prevent issues with filesystem paths in production.
* **Preload Script (`electron/preload.ts`)**: Exposes safe, restricted APIs to the React renderer via `contextBridge` to prevent security vulnerabilities.

### Licensing & Cryptographic Verification
* The licensing uses asymmetric ECDSA (Elliptic Curve Digital Signature Algorithm) with a `P-256` curve.
* The license token is a base64-encoded string: `payload.signature`.
* **Renderer Verification**: When the app starts, it decodes the payload, imports the embedded public key, and verifies the signature locally without requiring internet access.
* **License Heartbeat**: An asynchronous background check runs in `isRouteAllowed` and settings pages. If the computer is connected to the internet, it pings the admin panel endpoint (`/api/heartbeat`) to check if the license key has been revoked remotely.
* **Heartbeat unknown_key Guard**: Heartbeat replies carrying `unknown_key` status do NOT deactivate the client (offline-first resilience). Only explicit `revoked` or `device_limit` payloads cause lockout.

---

# Part 2: MedX Patient Marketing Website & Portal

* **Live URL**: [https://medx-web-one.vercel.app/](https://medx-web-one.vercel.app/)

The public-facing website helps patients book home collection appointments, search the test catalog, and download verified pathology reports.

---

## 2.1 User Guide (Patients)

### Website Sections
1. **Home / Landing Page**: Modern visual page showcasing lab highlights, home sample collection services, and trust metrics.
2. **Test Catalog**: Browse all available diagnostic tests with transparent pricing.
3. **Book Appointment**: Schedule a home-collection appointment by providing name, phone, chosen tests, and slot preference.
4. **Patient Portal**:
   - Enter your **Invoice Number** (e.g. `MEDX-2610-0012`) and registered **Phone Number**.
   - If the pathology report is verified, it is displayed in a clean, professional, print-friendly layout. Click **Print / Save PDF** to download it immediately.

---

## 2.2 Developer Guide (Web Engineers)

### Tech Stack & Layout
* **Framework**: Next.js 16 (App Router)
* **Styling**: Pure CSS (utilizing CSS variables, flexbox, grid, glassmorphism, and responsive breakpoints). Tailwind has been stripped to maintain clean CSS performance.
* **Animations**: `framer-motion` for page transitions and modern micro-interactions.

### Sync & Portal Mechanics
* **Cloud Sync Endpoint (`/api/sync`)**: Receives JSON payloads from the Desktop Sync Engine. The endpoint writes sync logs to a JSON data store.
* **Server Action (`verifyAndFetchReport`)**: Located in `app/portal/actions.ts`. When a patient attempts to access their report, this server-side function validates that the phone number matches the order, checks if the status is marked as `reported`, and returns the test lines.

---

# Part 3: MedX SaaS Super Admin ERP

* **Live URL**: [https://medx-admin-lac.vercel.app/](https://medx-admin-lac.vercel.app/)

The Super Admin ERP is the command center for you, the software owner, to manage your leads, active lab clients, key generations, and customer support.

---

## 3.1 User Guide (SaaS Admins)

### Admin Core Features
1. **Overview Dashboard**:
   - View Monthly Recurring Revenue (MRR), total active labs, and expiring licenses.
   - Track pending support tickets and recent lab onboarding timelines.
2. **Sales CRM**:
   - Track prospective lab clients through a visual pipeline: `New`, `Contacted`, `Demo Scheduled`, `Closed Won`.
   - Store client email, contact person, phone number, and potential contract value.
3. **Deployed Labs & License Generator**:
   - Browse the master list of all diagnostic centers using MedX.
   - Click `Generate License Key` ➔ Enter the lab's name ➔ Select the subscription tier (`Starter`, `Pro`, or `Enterprise`) ➔ Click **Generate**.
   - Copy the resulting secure key and send it to your client to activate their offline desktop app.
4. **Operations Audit Trail**:
   - View a comprehensive, immutable log of all actions taken by administrators (such as key generation, plan updates, extensions, and deactivations) at the `/audit` tab.
5. **Helpdesk**: Respond to technical setup queries and support tickets raised by active labs.

---

## 3.2 Developer Guide (SaaS ERP Engineers)

### Tech Stack
* **Framework**: Next.js 16 (App Router)
* **Icons**: `lucide-react`
* **Storage**: Private Vercel Blob store (`medx-db` bucket)
* **Styling**: Consistent visual aesthetics imported from `medx-web`'s glassmorphism style rules.

### Key Generator & License Signing
* To issue keys, the admin panel encodes license properties (Lab Name, Expiry, Tier) and signs them using the private counterpart of the ECDSA `P-256` key.
* The heartbeat endpoint `/api/heartbeat` logs incoming pings containing device IDs and hostnames. If a license has been disabled in the admin backend, the endpoint responds with `{ active: false }`, prompting the client's desktop app to restrict access.

### Automation & Integrations
* **Daily Cron Audit (`/api/cron`)**: Run via standard Vercel Cron schedulers. It audits all active licenses daily. Expiring licenses ($\le 15$ days) receive admin notice warnings, and licenses unpaid past the 7-day grace period are auto-revoked.
* **Razorpay Payments Webhook (`/api/webhooks/razorpay`)**: Receives automated `payment.captured` webhooks. If the payment payload includes a matching `licenseKey` in its notes, the API dynamically extends the validity of the license by $N$ days and appends a transaction log in the ledger.
* **Audit Trail Storage (`admin-audit/`)**: Every mutation in the database triggers a JSON logging hook writing audit records to Vercel Blob store under a timestamped document. These are parsed and displayed securely at `/audit`.

---

# Summary of Developer Directory Structures

```
MEDX-SOFTWARE/
├── apps/
│   ├── medx-app/             # Electron + React (Offline LIMS Desktop Client)
│   │   ├── electron/         # Desktop Main Process, Preload, and SQLite schemas
│   │   └── src/              # Desktop App React Components, UI, Zustand Store
│   ├── medx-web/             # Next.js (Patient Portal & Lab Marketing Website)
│   └── medx-admin/           # Next.js (SaaS Super Admin CRM & License Panel)
```
