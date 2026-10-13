import React from 'react';
import AkatsukiCloud from '../assets/AkatsukiCloud';
import { ExternalLink, Terminal, Shield, Zap, Sparkles } from 'lucide-react';

export const Footer = () => {
  return (
    <footer className="w-full bg-black border-t border-red-950/40 text-zinc-400 text-xs py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Col 1: Brand Info */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-3">
              <AkatsukiCloud size={32} />
              <span className="text-base font-black tracking-widest text-white uppercase font-mono">
                AKATSUKI
              </span>
            </div>
            <p className="text-zinc-400 text-xs leading-relaxed max-w-md">
              High-performance intra-college job marketplace and student opportunity engine.
              Powered by official college ERP authentication, job-centric direct messaging, and sub-millisecond async Rust architecture.
            </p>
            <p className="text-[11px] text-red-400/90 italic font-mono">
              "True peace is created when peer talent unites."
            </p>
          </div>

          {/* Col 2: Architecture */}
          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-red-500" />
              <span>Technology Stack</span>
            </h4>
            <ul className="space-y-2 text-[11px]">
              <li className="flex items-center gap-1.5 text-zinc-300">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span>Backend: Rust 1.99 + Axum 0.7</span>
              </li>
              <li className="flex items-center gap-1.5 text-zinc-300">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span>Storage: SQLite WAL High Concurrency</span>
              </li>
              <li className="flex items-center gap-1.5 text-zinc-300">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span>Real-Time: Tokio Broadcast WebSockets</span>
              </li>
              <li className="flex items-center gap-1.5 text-zinc-300">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span>Frontend: React + Vite + Custom CSS</span>
              </li>
            </ul>
          </div>

          {/* Col 3: Visuals & Citations */}
          <div>
            <h4 className="text-white text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-red-500" />
              <span>Aesthetics & Sources</span>
            </h4>
            <ul className="space-y-2 text-[11px]">
              <li>
                <a
                  href="https://in.pinterest.com/search/pins/?q=akatsuki%20aesthetic%20dark%20crimson"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-red-400 transition-colors flex items-center gap-1"
                >
                  <span>Pinterest Akatsuki Aesthetics</span>
                  <ExternalLink className="w-3 h-3 text-zinc-500" />
                </a>
              </li>
              <li>
                <a
                  href="https://in.pinterest.com/search/pins/?q=akatsuki%20members%20pfp%20dark"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-red-400 transition-colors flex items-center gap-1"
                >
                  <span>10 Member Avatars Collection</span>
                  <ExternalLink className="w-3 h-3 text-zinc-500" />
                </a>
              </li>
              <li>
                <a
                  href="https://erp.mit.asia"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-red-400 transition-colors flex items-center gap-1"
                >
                  <span>MIT ERP Gateway API</span>
                  <ExternalLink className="w-3 h-3 text-zinc-500" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <p>© 2026 Akatsuki Campus Work Engine. Built for students, labs & peer founders.</p>
          <div className="flex items-center gap-4 text-zinc-500">
            <span>Status: All Services Operational</span>
            <span>•</span>
            <span className="text-emerald-400">REST: Port 5000</span>
            <span>•</span>
            <span className="text-red-400">WS: Port 5000</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
