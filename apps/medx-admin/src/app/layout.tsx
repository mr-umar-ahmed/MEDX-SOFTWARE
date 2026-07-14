import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { LayoutDashboard, Users, Building2, Ticket, Settings } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MedX Super Admin",
  description: "SaaS ERP & CRM for MedX Laboratory Software",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className} style={{ display: "flex", background: "var(--bg)", color: "var(--fg)", minHeight: "100vh", margin: 0 }}>
        
        {/* Sidebar */}
        <aside style={{ width: 280, background: "var(--surface)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: 24, borderBottom: "1px solid var(--border)" }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Med<span style={{ color: "var(--primary)" }}>X</span></h1>
            <p style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 0 0" }}>Super Admin ERP</p>
          </div>
          
          <nav style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 8, textDecoration: "none", color: "var(--fg)", fontWeight: 500 }} className="hover-bg">
              <LayoutDashboard size={20} color="var(--primary)" /> Overview
            </Link>
            <Link href="/crm" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 8, textDecoration: "none", color: "var(--fg)", fontWeight: 500 }} className="hover-bg">
              <Users size={20} color="var(--primary)" /> Sales CRM
            </Link>
            <Link href="/tenants" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 8, textDecoration: "none", color: "var(--fg)", fontWeight: 500 }} className="hover-bg">
              <Building2 size={20} color="var(--primary)" /> Deployed Labs
            </Link>
            <Link href="/support" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 8, textDecoration: "none", color: "var(--fg)", fontWeight: 500 }} className="hover-bg">
              <Ticket size={20} color="var(--primary)" /> Helpdesk
            </Link>
          </nav>
          
          <div style={{ padding: 24, borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--muted)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <Settings size={20} /> System Settings
            </div>
            &copy; 2026 MedX Systems Inc.
          </div>
        </aside>

        {/* Main Content */}
        <main style={{ flex: 1, padding: 32, overflowY: "auto" }}>
          {children}
        </main>

        <style dangerouslySetInnerHTML={{__html: `
          .hover-bg:hover { background: var(--border); }
        `}} />
      </body>
    </html>
  );
}
