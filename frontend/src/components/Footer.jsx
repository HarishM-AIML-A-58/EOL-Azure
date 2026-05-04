import React from 'react';
import { ShieldCheck } from 'lucide-react';

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-card text-card-foreground">
      <div className="container-fluid px-6 py-10 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

          {/* Brand */}
          <div className="col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img src="/LT.png" alt="L&T Logo" className="h-8 w-auto brightness-0" />
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tight">L&T-CORe</span>
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-widest">EOL Platform</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Automates FFF analysis to prevent costly line-down situations by managing End-of-Life component risks across enterprise supply chains.
            </p>
          </div>

          {/* Platform links */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-widest text-slate-800">Platform</h4>
            <ul className="space-y-2">
              <li><a href="/dashboard" className="text-sm text-muted-foreground hover:text-primary transition-colors">Dashboard</a></li>
              <li><a href="/analysis"  className="text-sm text-muted-foreground hover:text-primary transition-colors">Part Analysis</a></li>
              <li><a href="/reports"   className="text-sm text-muted-foreground hover:text-primary transition-colors">Reports</a></li>
              <li><a href="/history"   className="text-sm text-muted-foreground hover:text-primary transition-colors">History</a></li>
            </ul>
          </div>

          {/* Support links */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-widest text-slate-800">Support</h4>
            <ul className="space-y-2">
              <li><a href="/help"    className="text-sm text-muted-foreground hover:text-primary transition-colors">Help Center</a></li>
              <li><a href="/docs"    className="text-sm text-muted-foreground hover:text-primary transition-colors">Documentation</a></li>
              <li><a href="/contact" className="text-sm text-muted-foreground hover:text-primary transition-colors">Contact Support</a></li>
              <li><a href="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">Privacy Policy</a></li>
            </ul>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-xs text-muted-foreground">
            &copy; {currentYear} Larsen &amp; Toubro — Component Obsolescence &amp; Resilience Engine.
          </p>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold tracking-widest uppercase">
            <ShieldCheck className="h-3 w-3 text-primary" />
            <span>Global Quality Standards</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
