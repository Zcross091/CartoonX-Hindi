'use client';

import React, { useState } from 'react';
import { 
  Tv, 
  X, 
  Download, 
  CheckCircle2, 
  Sparkles, 
  Apple, 
  ShieldCheck, 
  ArrowRight,
  ExternalLink,
  HelpCircle,
  HardDrive
} from 'lucide-react';

interface TVDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TVDownloadModal: React.FC<TVDownloadModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'android' | 'apple'>('android');
  const [downloadingPlatform, setDownloadingPlatform] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDirectDownload = (platform: 'android' | 'apple', url: string, filename: string) => {
    setDownloadingPlatform(platform);

    // Direct instant download without navigating away
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setDownloadingPlatform(null);
    }, 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl glass-panel rounded-3xl border border-slate-700/80 p-6 sm:p-8 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top glowing ambient gradient */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-36 bg-gradient-to-r from-amber-500/20 via-pink-500/20 to-indigo-500/20 blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 p-0.5 shadow-lg shadow-orange-500/20">
            <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
              <Tv className="w-6 h-6 text-amber-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Download CartoonX for TV
              </h2>
              <span className="bg-pink-500/20 text-pink-400 border border-pink-500/30 text-[10px] font-black px-2 py-0.5 rounded-full">
                TV Apps (बड़ी स्क्रीन)
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Direct instant download. Enjoy Hindi cartoons and anime on your living room TV!
            </p>
          </div>
        </div>

        {/* Platform Tabs */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-900/90 rounded-2xl border border-slate-800 mb-6">
          <button
            onClick={() => setActiveTab('android')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
              activeTab === 'android'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Tv className="w-4 h-4 text-emerald-300" />
            <span>Android TV / Google TV</span>
          </button>

          <button
            onClick={() => setActiveTab('apple')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
              activeTab === 'apple'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Apple className="w-4 h-4 text-blue-300" />
            <span>Apple TV (tvOS)</span>
          </button>
        </div>

        {/* Android TV Card */}
        {activeTab === 'android' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 shadow-inner">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-emerald-400 font-extrabold text-base">
                      CartoonX Android TV (Signed APK)
                    </span>
                    <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-md">
                      v1.0.0
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-sm">
                    Compatible with Sony Bravia, Mi TV, OnePlus TV, Realme, Fire TV Stick, Nvidia Shield & Google TV.
                  </p>
                  <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <ShieldCheck className="w-3.5 h-3.5" /> Keystore Signed
                    </span>
                    <span>•</span>
                    <span>Size: ~5.4 MB</span>
                    <span>•</span>
                    <span>Direct .APK</span>
                  </div>
                </div>

                {/* Direct Download Button */}
                <button
                  onClick={() => handleDirectDownload('android', '/api/download/android', 'CartoonX-AndroidTV-v1.0.0.apk')}
                  disabled={downloadingPlatform === 'android'}
                  className="flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl font-black text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 shadow-xl shadow-emerald-500/25 transition-all duration-200 whitespace-nowrap cursor-pointer"
                >
                  <Download className={`w-5 h-5 ${downloadingPlatform === 'android' ? 'animate-bounce' : ''}`} />
                  <span>
                    {downloadingPlatform === 'android' ? 'Starting Direct Download...' : 'Direct Download (APK)'}
                  </span>
                </button>
              </div>
            </div>

            {/* Installation Instructions */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs space-y-2">
              <h4 className="font-extrabold text-slate-300 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-emerald-400" />
                <span>How to Install on your Android TV:</span>
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-slate-400 pl-1">
                <li>Click <strong>Direct Download</strong> above to save <code className="text-emerald-300">CartoonX-AndroidTV.apk</code>.</li>
                <li>Transfer the APK to a USB PenDrive or send via <strong className="text-slate-300">"Send Files to TV"</strong> app from Play Store.</li>
                <li>Open the APK on your TV and click <strong className="text-slate-300">Install</strong>. All future updates install automatically in-app!</li>
              </ol>
            </div>
          </div>
        )}

        {/* Apple TV Card */}
        {activeTab === 'apple' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-950/40 via-slate-900 to-slate-900 border border-blue-500/30 shadow-inner">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-blue-400 font-extrabold text-base">
                      CartoonX Apple TV (tvOS Bundle)
                    </span>
                    <span className="bg-blue-500/20 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-md">
                      v1.0.0
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-sm">
                    Native Swift application for Apple TV HD & Apple TV 4K (tvOS 15.0+).
                  </p>
                  <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1 text-blue-400">
                      <ShieldCheck className="w-3.5 h-3.5" /> tvOS Verified
                    </span>
                    <span>•</span>
                    <span>Size: ~3.8 MB</span>
                    <span>•</span>
                    <span>Direct .ZIP</span>
                  </div>
                </div>

                {/* Direct Download Button */}
                <button
                  onClick={() => handleDirectDownload('apple', '/api/download/apple', 'CartoonX-AppleTV-tvOS-v1.0.0.zip')}
                  disabled={downloadingPlatform === 'apple'}
                  className="flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl font-black text-sm bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 active:scale-95 text-white shadow-xl shadow-blue-500/25 transition-all duration-200 whitespace-nowrap cursor-pointer"
                >
                  <Download className={`w-5 h-5 ${downloadingPlatform === 'apple' ? 'animate-bounce' : ''}`} />
                  <span>
                    {downloadingPlatform === 'apple' ? 'Starting Direct Download...' : 'Direct Download (ZIP)'}
                  </span>
                </button>
              </div>
            </div>

            {/* Installation Instructions */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs space-y-2">
              <h4 className="font-extrabold text-slate-300 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-blue-400" />
                <span>How to Install on Apple TV:</span>
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-slate-400 pl-1">
                <li>Click <strong>Direct Download</strong> to save the <code className="text-blue-300">CartoonX-AppleTV-tvOS.zip</code> package.</li>
                <li>Unzip and sideload using <strong className="text-slate-300">Xcode</strong> (Devices and Simulators) or <strong className="text-slate-300">Apple Configurator</strong>.</li>
                <li>Enjoy smooth 60fps Hindi streaming directly on Apple TV!</li>
              </ol>
            </div>
          </div>
        )}

        {/* Footer Note */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Direct CDN stream • No GitHub account required
          </span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white font-bold"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

