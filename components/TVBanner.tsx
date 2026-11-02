'use client';

import React, { useState } from 'react';
import { 
  Tv, 
  Download, 
  Sparkles, 
  Apple, 
  Info
} from 'lucide-react';
import { TVDownloadModal } from './TVDownloadModal';

export const TVBanner: React.FC = () => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="relative overflow-hidden rounded-3xl glass-panel border border-slate-700/60 p-6 sm:p-8 shadow-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 text-white">
        {/* Decorative Ambient Background Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-amber-500/10 via-pink-500/10 to-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Left Text & Badge */}
          <div className="space-y-3 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black text-[11px] px-3 py-1 rounded-full flex items-center gap-1 shadow-md">
                <Sparkles className="w-3.5 h-3.5" /> New: Big Screen Experience
              </span>
              <span className="bg-slate-800 text-slate-300 font-bold text-[11px] px-2.5 py-1 rounded-full border border-slate-700">
                1080p 60FPS TV Apps
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
              Watch Hindi Cartoons on your <span className="text-amber-400">Android TV</span> & <span className="text-blue-400">Apple TV</span>
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
              Experience Doraemon, Shinchan, Pokemon, and Naruto with TV remote navigation, in-app updates, and zero ads. Download directly now!
            </p>
          </div>

          {/* Right Direct Download Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {/* Direct Android TV Button */}
            <a
              href="https://github.com/Zcross091/CartoonX-Hindi/releases/latest/download/CartoonX-AndroidTV-Signed.apk"
              download="CartoonX-AndroidTV-Signed.apk"
              className="flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-2xl font-black text-xs sm:text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-95 text-slate-950 shadow-lg shadow-emerald-500/25 transition-all duration-200 cursor-pointer"
            >
              <Tv className="w-4 h-4 text-slate-950" />
              <span>Direct Download Android TV (APK)</span>
              <Download className="w-3.5 h-3.5 ml-0.5" />
            </a>

            {/* Direct Apple TV Button */}
            <a
              href="https://github.com/Zcross091/CartoonX-Hindi/releases/latest/download/CartoonX-AppleTV-tvOS.zip"
              download="CartoonX-AppleTV-tvOS.zip"
              className="flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-2xl font-black text-xs sm:text-sm bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 active:scale-95 text-white shadow-lg shadow-blue-500/25 transition-all duration-200 cursor-pointer"
            >
              <Apple className="w-4 h-4 text-white" />
              <span>Direct Download Apple TV (ZIP)</span>
              <Download className="w-3.5 h-3.5 ml-0.5" />
            </a>

            {/* Guide Button */}
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center justify-center gap-1.5 px-4 py-3.5 rounded-2xl font-bold text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all cursor-pointer"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Install Guide</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      <TVDownloadModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
};
