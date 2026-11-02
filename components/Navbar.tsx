'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Search, 
  Bookmark, 
  DownloadCloud, 
  Settings, 
  Tv, 
  Sparkles, 
  ShieldCheck, 
  Lock
} from 'lucide-react';
import { useSettingsStore } from '@/lib/store';
import { ParentalModal } from './ParentalModal';
import { TVDownloadModal } from './TVDownloadModal';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { isParentalEnabled, isParentalLocked, lockParental } = useSettingsStore();
  const [showPinModal, setShowPinModal] = useState(false);
  const [showTVModal, setShowTVModal] = useState(false);

  const navLinks = [
    { href: '/', label: 'Home', hindiLabel: 'होम', icon: Home, color: 'text-blue-400' },
    { href: '/search', label: 'Search', hindiLabel: 'खोजें', icon: Search, color: 'text-yellow-400' },
    { href: '/library', label: 'My Toons', hindiLabel: 'लाइब्रेरी', icon: Bookmark, color: 'text-pink-400' },
    { href: '/downloads', label: 'Downloads', hindiLabel: 'ऑफलाइन', icon: DownloadCloud, color: 'text-emerald-400' },
    { href: '/settings', label: 'Settings', hindiLabel: 'सेटिंग्स', icon: Settings, color: 'text-purple-400' },
  ];

  return (
    <>
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-700/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-pink-500 to-amber-400 p-0.5 shadow-md shadow-pink-500/20 group-hover:scale-105 transition-transform duration-300">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                <Tv className="w-7 h-7 text-amber-400 group-hover:animate-bounce-slow" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-white group-hover:text-amber-300 transition-colors">
                  Cartoon<span className="text-pink-500">X</span>
                </span>
                <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-[11px] px-2 py-0.5 rounded-full shadow-sm">
                  हिंदी
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Desi Kids Streaming Hub
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-2">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl font-bold text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/30 scale-105'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : link.color}`} />
                  <span>{link.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-semibold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {link.hindiLabel}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Parental Status / Badge */}
          <div className="flex items-center gap-3">
            {isParentalEnabled ? (
              <button
                onClick={() => {
                  if (isParentalLocked) {
                    setShowPinModal(true);
                  } else {
                    lockParental();
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                  isParentalLocked
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}
                title={isParentalLocked ? 'Click to Unlock Settings' : 'Settings Unlocked (Click to Lock)'}
              >
                {isParentalLocked ? (
                  <>
                    <Lock className="w-3.5 h-3.5 text-rose-400" />
                    <span>Locked</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Parent PIN</span>
                  </>
                )}
              </button>
            ) : null}

            {/* TV Apps Direct Download Trigger */}
            <button
              onClick={() => setShowTVModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs bg-gradient-to-r from-amber-500/20 via-pink-500/20 to-indigo-500/20 hover:from-amber-500/30 hover:to-indigo-500/30 text-amber-300 border border-amber-500/40 shadow-sm active:scale-95 transition-all cursor-pointer"
              title="Download CartoonX for Android TV & Apple TV"
            >
              <Tv className="w-3.5 h-3.5 text-amber-400" />
              <span>TV Apps</span>
              <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-[9px] px-1.5 py-0.2 rounded-md shadow-sm">
                Direct
              </span>
            </button>

            <div className="hidden sm:flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-300 px-3 py-1.5 rounded-xl text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Kids Safe Mode</span>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-panel border-t border-slate-700/60 pb-safe">
        <div className="grid grid-cols-5 h-16">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex flex-col items-center justify-center gap-0.5 transition-all ${
                  isActive ? 'text-amber-400 scale-105' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-amber-400 animate-bounce-slow' : ''}`} />
                <span className="text-[10px] font-bold tracking-tight">
                  {link.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* TV Apps Download Modal */}
      <TVDownloadModal
        isOpen={showTVModal}
        onClose={() => setShowTVModal(false)}
      />

      {/* Parental PIN Modal */}
      {showPinModal && (
        <ParentalModal
          isOpen={showPinModal}
          onClose={() => setShowPinModal(false)}
          mode="verify"
        />
      )}
    </>
  );
};

