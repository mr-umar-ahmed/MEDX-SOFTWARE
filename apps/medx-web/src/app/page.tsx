"use client";

import Link from "next/link";
import { MessageCircle, Globe, History, Download, Smartphone, ArrowRight, Shield, Clock, FlaskConical } from "lucide-react";

export default function HomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="hero-mobile">
        <div className="container">
          <div style={{ display: "inline-flex", padding: "6px 14px", background: "var(--primary-light)", borderRadius: 99, fontSize: 12, fontWeight: 700, color: "var(--primary)", marginBottom: 16 }}>
            🔬 Trusted by 10,000+ patients
          </div>
          <h1>Your Lab Reports.<br /><span style={{ color: "var(--primary)" }}>Always Accessible.</span></h1>
          <p>View, download, and share your pathology reports from any device. No app installation needed.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 320, margin: "0 auto" }}>
            <Link href="/portal" className="btn btn-primary btn-block">
              <Download size={18} /> Download My Report
            </Link>
            <Link href="/book" className="btn btn-secondary btn-block">
              Book Home Collection
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="section" style={{ background: "var(--surface)" }}>
        <div className="container">
          <h2 className="section-title">How it works</h2>
          <p className="section-subtitle">Getting your reports has never been easier.</p>
          
          <div className="step-list">
            <div className="step-card">
              <div className="step-num">1</div>
              <div>
                <h3>📲 WhatsApp Delivery</h3>
                <p>Once your report is verified by our pathologist, it is instantly sent to your registered WhatsApp number as a PDF.</p>
              </div>
            </div>
            <div className="step-card">
              <div className="step-num">2</div>
              <div>
                <h3>🌐 Access Anytime Online</h3>
                <p>Open this website anytime and enter your Invoice Number + Phone to securely view and download all your reports.</p>
              </div>
            </div>
            <div className="step-card">
              <div className="step-num">3</div>
              <div>
                <h3>📋 Full Report History</h3>
                <p>All your past reports are stored securely. Compare previous results side-by-side and track your health trends over time.</p>
              </div>
            </div>
            <div className="step-card">
              <div className="step-num">4</div>
              <div>
                <h3>🖨️ Print or Share</h3>
                <p>Print a professional copy directly from your phone, or share the PDF with your doctor instantly via WhatsApp or email.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Add to Home Screen Guide */}
      <section className="section">
        <div className="container">
          <div className="install-banner">
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
              <Smartphone size={24} color="var(--primary)" />
              <h3>Add MedX to your Home Screen</h3>
            </div>
            <p>Make this website work like an app! Access your reports with one tap — no download required.</p>
            
            <div className="install-steps">
              <div className="install-step">
                <div className="num">1</div>
                Open this page in <b>Chrome</b> (Android) or <b>Safari</b> (iPhone)
              </div>
              <div className="install-step">
                <div className="num">2</div>
                Tap the <b>⋮ menu</b> (Chrome) or <b>Share ↑</b> button (Safari)
              </div>
              <div className="install-step">
                <div className="num">3</div>
                Select <b>"Add to Home Screen"</b> and tap <b>Add</b>
              </div>
              <div className="install-step">
                <div className="num">✓</div>
                Done! MedX will appear on your phone like a regular app
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Features */}
      <section className="section" style={{ background: "var(--surface)" }}>
        <div className="container">
          <h2 className="section-title">What you can do</h2>
          <p className="section-subtitle">Everything a patient needs, in one place.</p>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Link href="/catalog" style={{ textDecoration: "none" }}>
              <div className="card" style={{ textAlign: "center", padding: 20 }}>
                <FlaskConical size={28} color="var(--primary)" style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 14, fontWeight: 700 }}>Test Pricing</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Check test rates</div>
              </div>
            </Link>
            <Link href="/book" style={{ textDecoration: "none" }}>
              <div className="card" style={{ textAlign: "center", padding: 20 }}>
                <Clock size={28} color="var(--ok)" style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 14, fontWeight: 700 }}>Home Collection</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Book a visit</div>
              </div>
            </Link>
            <Link href="/portal" style={{ textDecoration: "none" }}>
              <div className="card" style={{ textAlign: "center", padding: 20 }}>
                <Download size={28} color="var(--warn)" style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 14, fontWeight: 700 }}>Download Report</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Get your PDF</div>
              </div>
            </Link>
            <Link href="/" style={{ textDecoration: "none" }}>
              <div className="card" style={{ textAlign: "center", padding: 20 }}>
                <Shield size={28} color="var(--danger)" style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 14, fontWeight: 700 }}>100% Secure</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>Encrypted data</div>
              </div>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
