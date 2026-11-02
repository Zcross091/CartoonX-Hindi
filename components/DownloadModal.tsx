'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { DownloadCloud, Check, X, HardDrive, Sparkles, ShieldCheck } from 'lucide-react';
import { downloadManager } from '@/lib/downloadManager';
import { useSettingsStore } from '@/lib/store';
import { ParentalModal } from './ParentalModal';

interface DownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  episode: {
    videoCode: string;
    showSlug: string;
    showTitle: string;
    episodeNumber: number;
    episodeTitle: string;
    poster: string;
  };
}

export const DownloadModal: React.FC<DownloadModalProps> = ({
  isOpen,
  onClose,
  episode
}) => {
  const { preferredQuality, isParentalEnabled, isParentalLocked } = useSettingsStore();
  const [selectedQuality, setSelectedQuality] = useState<string>(preferredQuality || '720p');
  const [showPinModal, setShowPinModal] = useState(false);

  if (!isOpen) return null;

  const handleStartDownload = async () => {
    // If parental lock is enabled and active, ask for PIN
    if (isParentalEnabled && isParentalLocked) {
      setShowPinModal(true);
      return;
    }

    await downloadManager.startDownload({
      videoCode: episode.videoCode,
      showSlug: episode.showSlug,
      showTitle: episode.showTitle,
      episodeNumber: episode.episodeNumber,
      episodeTitle: episode.episodeTitle,
      poster: episode.poster,
      quality: selectedQuality
    });

    onClose();
  };

  const qualities = [
    { id: '1080p', label: '1080p Full HD', desc: 'Highest picture quality', size: '~200 MB', tag: 'Best Quality' },
    { id: '720p', label: '720p HD (Recommended)', desc: 'Sharp video, balanced size', size: '~120 MB', tag: 'Default', recommended: true },
    { id: '480p', label: '480p Data Saver', desc: 'Fastest download & storage saving', size: '~60 MB', tag: 'Fast' }
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
        <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-md w-full p-6 shadow-2xl relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Episode Header */}
          <div className="flex gap-4 items-center mb-6 pr-8">
            <div className="relative w-20 h-14 rounded-xl overflow-hidden bg-slate-800 flex-shrink-0 border border-slate-700">
              <Image
                src={episode.poster}
                alt={episode.episodeTitle}
                fill
                className="object-cover"
                unoptimized
              />
            </div>
            <div className="overflow-hidden">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                {episode.showTitle}
              </span>
              <h3 className="text-base font-extrabold text-white truncate">
                {episode.episodeTitle}
              </h3>
              <p className="text-xs text-slate-400">Offline Download for Kids</p>
            </div>
          </div>

          {/* Quality Options */}
          <div className="space-y-2.5 mb-6">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Select Video Quality
            </label>

            {qualities.map((q) => {
              const isSelected = selectedQuality === q.id;

              return (
                <button
                  key={q.id}
                  onClick={() => setSelectedQuality(q.id)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left ${
                    isSelected
                      ? 'bg-amber-400/10 border-amber-400 text-white shadow-md'
                      : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'border-amber-400 bg-amber-400' : 'border-slate-500'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm">{q.label}</span>
                        {q.recommended && (
                          <span className="bg-amber-400/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{q.desc}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-400">{q.size}</span>
                </button>
              );
            })}
          </div>

          {/* Action button */}
          <button
            onClick={handleStartDownload}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 hover:from-amber-300 hover:to-pink-400 text-slate-950 font-black text-base shadow-xl shadow-orange-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <DownloadCloud className="w-5 h-5" />
            <span>Start Download (डाउनलोड करें)</span>
          </button>
        </div>
      </div>

      {showPinModal && (
        <ParentalModal
          isOpen={showPinModal}
          onClose={() => setShowPinModal(false)}
          mode="verify"
          onSuccess={() => {
            setShowPinModal(false);
            handleStartDownload();
          }}
        />
      )}
    </>
  );
};

