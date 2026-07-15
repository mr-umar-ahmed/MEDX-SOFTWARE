"use client";

import Link from "next/link";
import {
  MessageCircle, History, Download, Smartphone, ArrowRight,
  ShieldCheck, FlaskConical, Home as HomeIcon, BadgeCheck,
} from "lucide-react";

export default function HomePage() {
  return (
    <main>
      {/* ===== Hero ===== */}
      <section className="hero">
        <div className="hero-aurora" />
        <div className="container">
          <div className="hero-badge anim-up">
            <span className="dot" /> Verified reports · Trusted by 10,000+ patients
          </div>
          <h1 className="anim-up anim-d1">
            Your lab reports,<br />
            <span className="grad-text">beautifully simple.</span>
          </h1>
          <p className="sub anim-up anim-d2">
            View, download, and share verified pathology reports from any device —
            the moment your lab releases them. No app installation needed.
          </p>
          <div className="hero-cta anim-up anim-d3">
            <Link href="/portal" className="btn btn-primary">
              <Download size={18} /> Get My Report
            </Link>
            <Link href="/book" className="btn btn-secondary">
              Book Home Collection <ArrowRight size={16} />
            </Link>
          </div>

          {/* Floating verified-report preview */}
          <div className="report-preview glass anim-up anim-d4">
            <div className="rp-head">
              <div>
                <div className="rp-title">Complete Blood Count</div>
                <div className="rp-sub">INV-2627-0042 · Verified by pathologist</div>
              </div>
              <span className="chip chip-ok"><BadgeCheck size={13} /> Report Ready</span>
            </div>
            <div className="rp-row">
              <span className="rp-name">Hemoglobin</span>
              <span className="rp-bar warn"><i /></span>
              <span className="rp-val" style={{ color: "var(--danger)" }}>11.2 ▼</span>
            </div>
            <div className="rp-row">
              <span className="rp-name">WBC Count</span>
              <span className="rp-bar"><i /></span>
              <span className="rp-val">7.4</span>
            </div>
            <div className="rp-row">
              <span className="rp-name">Platelets</span>
              <span className="rp-bar"><i /></span>
              <span className="rp-val">2.6 L</span>
            </div>
          </div>

          {/* Stats */}
          <div className="stats-strip">
            <div className="stat-box anim-up anim-d2"><div className="n">10k+</div><div className="l">Reports Delivered</div></div>
            <div className="stat-box anim-up anim-d2"><div className="n">60s</div><div className="l">Avg. Download Time</div></div>
            <div className="stat-box anim-up anim-d3"><div className="n">100%</div><div className="l">Pathologist Verified</div></div>
            <div className="stat-box anim-up anim-d3"><div className="n">24/7</div><div className="l">Online Access</div></div>
          </div>
        </div>
      </section>

      {/* ===== Bento features ===== */}
      <section className="section" style={{ background: "var(--surface)" }}>
        <div className="container">
          <span className="section-eyebrow">Everything in one place</span>
          <h2 className="section-title">Built around your convenience</h2>
          <p className="section-subtitle">From booking a sample pickup to comparing last year&apos;s results — it all happens here.</p>

          <div className="bento">
            <Link href="/portal" className="bento-card">
              <div className="bento-icon"><Download size={22} /></div>
              <h3>Instant Report Downloads</h3>
              <p>Enter your invoice number and registered phone to securely view and download every report as a professional PDF — print-ready, doctor-ready.</p>
              <span className="bento-cta">Open report portal <ArrowRight size={14} /></span>
            </Link>
            <Link href="/book" className="bento-card">
              <div className="bento-icon teal"><HomeIcon size={22} /></div>
              <h3>Home Sample Collection</h3>
              <p>Book a certified phlebotomist to collect samples at your doorstep. Your request lands directly in the lab&apos;s scheduling system within minutes.</p>
              <span className="bento-cta">Book a visit <ArrowRight size={14} /></span>
            </Link>
            <Link href="/catalog" className="bento-card">
              <div className="bento-icon violet"><FlaskConical size={22} /></div>
              <h3>Transparent Test Pricing</h3>
              <p>Browse every test and health package with upfront prices from registered labs near you — no surprises at the billing counter.</p>
              <span className="bento-cta">See tests &amp; pricing <ArrowRight size={14} /></span>
            </Link>
            <div className="bento-card">
              <div className="bento-icon amber"><History size={22} /></div>
              <h3>Complete Report History</h3>
              <p>Every past report stays securely linked to your phone number. Track your health trends and share full history with your doctor in one tap.</p>
              <span className="bento-cta" style={{ color: "var(--muted)" }}><ShieldCheck size={14} /> Encrypted &amp; private</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== How it works ===== */}
      <section className="section">
        <div className="container">
          <span className="section-eyebrow">How it works</span>
          <h2 className="section-title">Report to phone in four steps</h2>
          <p className="section-subtitle">Getting your reports has never been easier.</p>

          <div className="step-list">
            <div className="step-card">
              <div className="step-num">1</div>
              <div>
                <h3>Sample collected</h3>
                <p>Visit the lab or book a home collection — your sample gets a barcoded ID the moment it&apos;s registered.</p>
              </div>
            </div>
            <div className="step-card">
              <div className="step-num">2</div>
              <div>
                <h3>Pathologist verifies</h3>
                <p>Results are entered, machine-checked against reference ranges, and signed off by a qualified pathologist.</p>
              </div>
            </div>
            <div className="step-card">
              <div className="step-num">3</div>
              <div>
                <h3><MessageCircle size={15} style={{ verticalAlign: "-2px" }} /> WhatsApp delivery</h3>
                <p>The verified PDF report is sent straight to your registered WhatsApp number by your lab.</p>
              </div>
            </div>
            <div className="step-card">
              <div className="step-num">4</div>
              <div>
                <h3>Access forever</h3>
                <p>Come back here anytime — invoice number + phone gives you your full, secure report history.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Add to Home Screen ===== */}
      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <div className="install-banner">
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4, position: "relative" }}>
              <Smartphone size={24} color="#38bdf8" />
              <h3>Add MedX to your Home Screen</h3>
            </div>
            <p>Make this website work like an app! Access your reports with one tap — no download required.</p>

            <div className="install-steps">
              <div className="install-step">
                <div className="num">1</div>
                <span>Open this page in <b>Chrome</b> (Android) or <b>Safari</b> (iPhone)</span>
              </div>
              <div className="install-step">
                <div className="num">2</div>
                <span>Tap the <b>⋮ menu</b> (Chrome) or <b>Share ↑</b> button (Safari)</span>
              </div>
              <div className="install-step">
                <div className="num">3</div>
                <span>Select <b>&quot;Add to Home Screen&quot;</b> and tap <b>Add</b></span>
              </div>
              <div className="install-step">
                <div className="num">✓</div>
                <span>Done! MedX will appear on your phone like a regular app</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Final CTA ===== */}
      <section className="section text-center" style={{ paddingTop: 8 }}>
        <div className="container">
          <h2 className="section-title">Your report is waiting.</h2>
          <p className="section-subtitle" style={{ maxWidth: 480, margin: "0 auto 24px" }}>
            Grab your invoice number and registered phone — your verified results are less than a minute away.
          </p>
          <Link href="/portal" className="btn btn-primary" style={{ minWidth: 260 }}>
            <Download size={18} /> Download My Report
          </Link>
        </div>
      </section>
    </main>
  );
}
