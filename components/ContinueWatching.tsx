'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Play, RotateCcw, X, Clock } from 'lucide-react';
import { db, WatchHistoryItem } from '@/lib/db';

export const ContinueWatching: React.FC = () => {
  const [historyItems, setHistoryItems] = useState<WatchHistoryItem[]>([]);

  const loadHistory = async () => {
    const items = await db.history.orderBy('lastWatched').reverse().toArray();
    // Only show items that have between 3% and 95% progress
    const active = items.filter((item) => item.progress > 2 && item.progress < 95);
    setHistoryItems(active);
  };

  useEffect(() => {
    loadHistory();
    const interval = setInterval(loadHistory, 3000);
    return () => clearInterval(interval);
  }, []);

  const removeHistoryItem = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    await db.history.delete(id);
    loadHistory();
  };

  if (historyItems.length === 0) return null;

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <section className="mb-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <RotateCcw className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              Continue Watching
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                जारी रखें
              </span>
            </h2>
            <p className="text-xs text-slate-400">Resume right where you left off</p>
          </div>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 snap-x scrollbar-none">
        {historyItems.map((item) => (
          <Link
            key={item.id}
            href={`/watch/${item.id}?time=${Math.floor(item.currentTime)}&slug=${item.showSlug}`}
            className="group relative flex-shrink-0 w-64 sm:w-72 rounded-2xl overflow-hidden glass-card hover:border-amber-400/50 transition-all duration-200 snap-start hover:shadow-xl hover:-translate-y-1"
          >
            {/* Thumbnail */}
            <div className="relative aspect-video w-full bg-slate-800 overflow-hidden">
              <Image
                src={item.poster}
                alt={item.episodeTitle}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                unoptimized
              />
              <div className="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/20 transition-colors" />

              {/* Center Play Button */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Play className="w-6 h-6 fill-current ml-0.5" />
                </div>
              </div>

              {/* Remove button */}
              <button
                onClick={(e) => removeHistoryItem(e, item.id)}
                className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-slate-400 hover:text-white hover:bg-rose-500 transition-colors"
                title="Remove from Continue Watching"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Timestamp badge */}
              <div className="absolute bottom-3 right-2 bg-slate-900/90 text-slate-200 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                <Clock className="w-2.5 h-2.5 text-amber-400" />
                <span>{formatSeconds(item.currentTime)} / {formatSeconds(item.duration)}</span>
              </div>

              {/* Progress Bar */}
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-r-full"
                  style={{ width: `${Math.min(100, Math.max(0, item.progress))}%` }}
                />
              </div>
            </div>

            {/* Info */}
            <div className="p-3 bg-slate-900/95">
              <h4 className="font-extrabold text-white text-xs truncate group-hover:text-amber-300 transition-colors">
                {item.episodeTitle || item.showTitle}
              </h4>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                {item.showTitle}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
};

