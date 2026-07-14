import type { Metadata, Viewport } from "next";
import "./globals.css";
import Link from "next/link";
import { Activity, Home, Search, CalendarPlus, FileDown } from "lucide-react";

export const metadata: Metadata = {
  title: "MedX Reports — View & Download Lab Reports",
  description: "Access your pathology reports instantly. Book home collection, check test pricing, and download verified reports.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "MedX Reports" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#2563eb",
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/favicon.ico" />
      </head>
      <body>
        {/* Desktop Navbar */}
        <nav className="navbar">
          <div className="container">
            <Link href="/" className="logo">
              <Activity color="var(--primary)" size={24} />
              Med<span>X</span>
            </Link>
            <div className="nav-links">
              <Link href="/catalog" className="nav-link">Tests & Pricing</Link>
              <Link href="/book" className="nav-link">Home Collection</Link>
              <Link href="/portal" className="btn btn-primary btn-sm">Download Report</Link>
            </div>
          </div>
        </nav>

        {/* Page Content */}
        {children}

        {/* Mobile Bottom Navigation */}
        <nav className="bottom-nav">
          <Link href="/">
            <Home size={22} />
            Home
          </Link>
          <Link href="/catalog">
            <Search size={22} />
            Pricing
          </Link>
          <Link href="/book">
            <CalendarPlus size={22} />
            Book
          </Link>
          <Link href="/portal">
            <FileDown size={22} />
            Reports
          </Link>
        </nav>

        {/* Desktop Footer */}
        <footer className="footer">
          <div className="container">
            <div className="footer-grid">
              <div>
                <div className="logo" style={{ color: "white", marginBottom: 12 }}>
                  <Activity color="var(--primary)" size={20} />
                  Med<span style={{ color: "var(--primary)" }}>X</span>
                </div>
                <p style={{ color: "#94a3b8", fontSize: 13 }}>
                  Accurate. Trusted. On time.<br />
                  Your neighbourhood diagnostic lab.
                </p>
              </div>
              <div>
                <div className="footer-title">Quick Links</div>
                <ul className="footer-links">
                  <li><Link href="/catalog">Test Catalog</Link></li>
                  <li><Link href="/book">Home Collection</Link></li>
                  <li><Link href="/portal">Download Reports</Link></li>
                </ul>
              </div>
              <div>
                <div className="footer-title">Contact</div>
                <ul className="footer-links">
                  <li>+91 98765 43210</li>
                  <li>lab@medx.example</li>
                </ul>
              </div>
            </div>
            <div style={{ borderTop: "1px solid #334155", paddingTop: 20, textAlign: "center", color: "#475569", fontSize: 13 }}>
              &copy; {new Date().getFullYear()} MedX Diagnostic Lab
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
