'use client';

import React, { useState } from 'react';
import { 
  Settings, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Trash2, 
  Sparkles, 
  Check, 
  HardDrive, 
  Info,
  Tv,
  ArrowUpCircle,
  RefreshCw
} from 'lucide-react';
import { useSettingsStore } from '@/lib/store';
import { db } from '@/lib/db';
import { ParentalModal } from '@/components/ParentalModal';

export default function SettingsPage() {
  const {
    parentalPin,
    isParentalEnabled,
    isParentalLocked,
    preferredQuality,
    kidsMode,
    autoplayNext,
    setParentalPin,
    setParentalEnabled,
    setPreferredQuality,
    setKidsMode,
    setAutoplayNext,
    lockParental
  } = useSettingsStore();

  const [showPinModal, setShowPinModal] = useState(false);
  const [pinModalMode, setPinModalMode] = useState<'set' | 'verify'>('set');
  const [statusMessage, setStatusMessage] = useState('');
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  const flashMessage = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(''), 3500);
  };

  const handleToggleParental = () => {
    if (isParentalEnabled) {
      setPinModalMode('verify');
      setShowPinModal(true);
    } else {
      setPinModalMode('set');
      setShowPinModal(true);
    }
  };

  const handleClearHistory = async () => {
    if (confirm('Clear all watch history?')) {
      await db.history.clear();
      flashMessage('Watch history cleared!');
    }
  };

  const handleClearFavorites = async () => {
    if (confirm('Clear all saved favorites?')) {
      await db.favorites.clear();
      flashMessage('Favorites cleared!');
    }
  };

  const handleCheckUpdate = () => {
    setIsCheckingUpdate(true);
    flashMessage('Checking for latest updates...');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('check-for-updates'));
    }
    setTimeout(() => {
      setIsCheckingUpdate(false);
    }, 1500);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
          <Settings className="w-7 h-7 text-purple-400" />
          <span>App Settings (सेटिंग्स)</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 font-medium">
          Manage parental controls, in-app updates, download quality, and storage
        </p>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-2xl text-xs font-bold text-center">
          {statusMessage}
        </div>
      )}

      {/* 1. In-App Updates Card */}
      <div className="glass-panel rounded-3xl p-6 border border-amber-400/40 shadow-xl space-y-4 bg-gradient-to-tr from-amber-500/5 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ArrowUpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">In-App Updates (ऐप अपडेट)</h3>
              <p className="text-xs text-slate-400">
                Downloads and updates the app in-place without deleting your data
              </p>
            </div>
          </div>

          <button
            onClick={handleCheckUpdate}
            disabled={isCheckingUpdate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black bg-amber-400 hover:bg-amber-300 text-slate-950 transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
            <span>{isCheckingUpdate ? 'Checking...' : 'Check for Update'}</span>
          </button>
        </div>
        <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
          <span>Current Version: <strong>v1.0.0 (Release Signed)</strong></span>
          <span className="text-emerald-400 font-bold">Auto-Updater Active</span>
        </div>
      </div>

      {/* 2. Parental Controls */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-700/60 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Parental PIN Lock</h3>
              <p className="text-xs text-slate-400">
                {isParentalEnabled
                  ? 'PIN protection active for system settings & storage'
                  : 'Protect settings and limits with a 4-digit PIN'}
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleParental}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              isParentalEnabled
                ? 'bg-emerald-500 text-slate-950 shadow-md'
                : 'bg-slate-800 text-slate-300 hover:text-white border border-slate-700'
            }`}
          >
            {isParentalEnabled ? 'Enabled (Active)' : 'Enable PIN'}
          </button>
        </div>

        {isParentalEnabled && (
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs font-bold">
            <span className="text-slate-400">Status: Protected</span>
            <button
              onClick={() => {
                setParentalPin(null);
                setParentalEnabled(false);
                flashMessage('Parental PIN disabled');
              }}
              className="text-rose-400 hover:text-rose-300 underline"
            >
              Remove PIN
            </button>
          </div>
        )}
      </div>

      {/* 3. Download Quality Preferences */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-700/60 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-base">Default Download Quality</h3>
            <p className="text-xs text-slate-400">
              Controls the default resolution when saving cartoons for offline play
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {[
            { id: '720p', label: '720p HD', desc: 'Recommended default', tag: 'Balanced' },
            { id: '1080p', label: '1080p Full HD', desc: 'Crystal-clear video', tag: 'Best' },
            { id: '480p', label: '480p Data Saver', desc: 'Fastest download', tag: 'Minimal Space' }
          ].map((q) => {
            const isSelected = preferredQuality === q.id;

            return (
              <button
                key={q.id}
                onClick={() => {
                  setPreferredQuality(q.id as any);
                  flashMessage(`Default quality set to ${q.id}`);
                }}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? 'bg-amber-400/10 border-amber-400 shadow-md text-white'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-sm text-white">{q.label}</span>
                  {isSelected && <Check className="w-4 h-4 text-amber-400 stroke-[3]" />}
                </div>
                <p className="text-xs text-slate-400">{q.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Playback Preferences */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-700/60 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-white text-base">Auto-play Next Episode</h3>
            <p className="text-xs text-slate-400">
              Automatically prompt and play the next cartoon episode when current ends
            </p>
          </div>
          <button
            onClick={() => setAutoplayNext(!autoplayNext)}
            className={`w-12 h-7 rounded-full p-1 transition-colors ${
              autoplayNext ? 'bg-amber-400' : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-slate-950 transition-transform ${
                autoplayNext ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 5. Storage & Cache Management */}
      <div className="glass-panel rounded-3xl p-6 border border-slate-700/60 shadow-xl space-y-4">
        <h3 className="font-extrabold text-white text-base">Storage Management</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleClearHistory}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>Clear Watch History</span>
          </button>
          <button
            onClick={handleClearFavorites}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs border border-slate-700"
          >
            <Trash2 className="w-4 h-4 text-pink-400" />
            <span>Clear Favorites</span>
          </button>
        </div>
      </div>

      {/* 6. About & Source Attributions */}
      <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-white font-black text-sm">
          <Tv className="w-4 h-4 text-amber-400" />
          <span>CartoonX v1.0.0 (Release Signed)</span>
        </div>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Cartoons and anime are sourced & streamed from{' '}
          <a
            href="https://raretoonindia.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-400 hover:underline font-bold"
          >
            Rare Toon India
          </a>
          . All rights belong to their respective copyright owners.
        </p>
      </div>

      {/* PIN Modal */}
      {showPinModal && (
        <ParentalModal
          isOpen={showPinModal}
          onClose={() => setShowPinModal(false)}
          mode={pinModalMode}
          onSuccess={() => {
            if (pinModalMode === 'set') {
              flashMessage('Parental PIN setup successfully!');
            } else {
              setParentalPin(null);
              setParentalEnabled(false);
              flashMessage('Parental PIN disabled');
            }
          }}
        />
      )}
    </div>
  );
}
