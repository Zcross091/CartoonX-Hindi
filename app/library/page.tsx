'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Bookmark, 
  History, 
  Trash2, 
  Play, 
  Heart, 
  Clock, 
  Sparkles,
  DownloadCloud
} from 'lucide-react';
import { db, WatchHistoryItem, FavoriteItem } from '@/lib/db';

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<'history' | 'favorites'>('history');
  const [historyList, setHistoryList] = useState<WatchHistoryItem[]>([]);
  const [favoritesList, setFavoritesList] = useState<FavoriteItem[]>([]);

  const loadData = async () => {
    const h = await db.history.orderBy('lastWatched').reverse().toArray();
    const f = await db.favorites.orderBy('addedAt').reverse().toArray();
    setHistoryList(h);
    setFavoritesList(f);
  };

  useEffect(() => {
    loadData();
  }, []);

  const clearHistory = async () => {
    if (confirm('Are you sure you want to clear your watch history?')) {
      await db.history.clear();
      loadData();
    }
  };

  const removeHistoryItem = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    await db.history.delete(id);
    loadData();
  };

  const removeFavorite = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    await db.favorites.delete(id);
    loadData();
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <Bookmark className="w-7 h-7 text-pink-400" />
            <span>My Toon Library (लाइब्रेरी)</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            Saved favorites and complete episode watch history
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 bg-slate-900/80 p-1.5 rounded-2xl border border-slate-700/60 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === 'history'
                ? 'bg-amber-400 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Watch History ({historyList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('favorites')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === 'favorites'
                ? 'bg-pink-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Heart className="w-4 h-4" />
            <span>My Favorites ({favoritesList.length})</span>
          </button>
        </div>
      </div>

      {/* History Tab View */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-400">
              Shows resume automatically from where you left off
            </span>
            {historyList.length > 0 && (
              <button
                onClick={clearHistory}
                className="flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-3 py-1.5 rounded-xl transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear History</span>
              </button>
            )}
          </div>

          {historyList.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {historyList.map((item) => (
                <Link
                  key={item.id}
                  href={`/watch/${item.id}?time=${Math.floor(item.currentTime)}&slug=${item.showSlug}`}
                  className="group relative flex flex-col rounded-2xl overflow-hidden glass-card border border-slate-700/60 hover:border-amber-400/50 transition-all hover:shadow-xl hover:-translate-y-1"
                >
                  <div className="relative aspect-video w-full bg-slate-800 overflow-hidden">
                    <Image
                      src={item.poster}
                      alt={item.episodeTitle}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/20 transition-colors" />

                    {/* Center play icon */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Play className="w-6 h-6 fill-current ml-0.5" />
                      </div>
                    </div>

                    {/* Delete button */}
                    <button
                      onClick={(e) => removeHistoryItem(e, item.id)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 text-slate-400 hover:text-white hover:bg-rose-500 transition-colors"
                      title="Remove from History"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Progress bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-800">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-orange-500"
                        style={{ width: `${Math.min(100, Math.max(0, item.progress))}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-3 bg-slate-900/90 flex flex-col justify-between flex-1">
                    <div>
                      <h4 className="font-extrabold text-white text-xs truncate group-hover:text-amber-300 transition-colors">
                        {item.episodeTitle || item.showTitle}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {item.showTitle}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-800 font-medium">
                      <span>{formatTime(item.currentTime)} / {formatTime(item.duration)}</span>
                      <span className="text-amber-400 font-bold">{item.progress}% watched</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center glass-panel rounded-3xl max-w-md mx-auto p-8 space-y-4">
              <History className="w-12 h-12 text-slate-500 mx-auto" />
              <h3 className="text-lg font-black text-white">No Watch History Yet</h3>
              <p className="text-xs text-slate-400">
                Start watching Doraemon, Shinchan, or Hindi movies to keep track of your progress!
              </p>
              <Link
                href="/"
                className="inline-block px-6 py-2.5 rounded-2xl bg-amber-400 text-slate-950 font-black text-xs"
              >
                Explore Cartoons
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Favorites Tab View */}
      {activeTab === 'favorites' && (
        <div className="space-y-4">
          {favoritesList.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
              {favoritesList.map((fav) => (
                <div
                  key={fav.id}
                  className="group relative flex flex-col rounded-3xl overflow-hidden glass-card border border-slate-700/60 hover:border-pink-500/50 transition-all hover:shadow-xl hover:-translate-y-1.5"
                >
                  <Link href={`/show/${fav.id}`} className="relative aspect-[3/4] w-full bg-slate-800 overflow-hidden">
                    <Image
                      src={fav.poster}
                      alt={fav.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80" />

                    <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-amber-300 font-extrabold text-[10px] px-2 py-0.5 rounded-full border border-amber-400/30">
                      {fav.character}
                    </div>

                    {/* Remove favorite button */}
                    <button
                      onClick={(e) => removeFavorite(e, fav.id)}
                      className="absolute top-3 right-3 p-2 rounded-full bg-rose-500 text-white shadow-md hover:scale-110 transition-transform"
                      title="Remove from Favorites"
                    >
                      <Heart className="w-4 h-4 fill-current" />
                    </button>
                  </Link>

                  <div className="p-3 bg-slate-900/90 flex-1 flex flex-col justify-between">
                    <h4 className="font-extrabold text-white text-xs line-clamp-2 leading-snug group-hover:text-pink-300 transition-colors">
                      {fav.title}
                    </h4>
                    <Link
                      href={`/show/${fav.id}`}
                      className="mt-2.5 py-1.5 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 font-bold text-xs text-center border border-pink-500/30"
                    >
                      View Episodes
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-20 text-center glass-panel rounded-3xl max-w-md mx-auto p-8 space-y-4">
              <Heart className="w-12 h-12 text-pink-500 mx-auto" />
              <h3 className="text-lg font-black text-white">No Favorites Added Yet</h3>
              <p className="text-xs text-slate-400">
                Click the heart icon on any cartoon card to save it here for quick access!
              </p>
              <Link
                href="/"
                className="inline-block px-6 py-2.5 rounded-2xl bg-pink-500 text-white font-black text-xs"
              >
                Browse Toons
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

