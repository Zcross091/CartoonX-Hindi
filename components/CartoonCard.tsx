'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Play, Heart, Film, Tv } from 'lucide-react';
import { ShowSummary } from '@/lib/raretoon';
import { db } from '@/lib/db';

interface CartoonCardProps {
  show: ShowSummary;
  priority?: boolean;
}

export const CartoonCard: React.FC<CartoonCardProps> = ({ show, priority = false }) => {
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    db.favorites.get(show.slug).then((fav) => {
      setIsFavorite(!!fav);
    });
  }, [show.slug]);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isFavorite) {
      await db.favorites.delete(show.slug);
      setIsFavorite(false);
    } else {
      await db.favorites.put({
        id: show.slug,
        title: show.title,
        poster: show.poster,
        character: show.character,
        isMovie: show.isMovie,
        addedAt: Date.now()
      });
      setIsFavorite(true);
    }
  };

  return (
    <Link
      href={`/show/${show.slug}`}
      className="group relative flex flex-col rounded-3xl overflow-hidden glass-card hover:border-amber-400/50 transition-all duration-300 hover:shadow-xl hover:shadow-amber-500/10 hover:-translate-y-1.5 focus:outline-none focus:ring-4 focus:ring-amber-400/40"
    >
      {/* Poster Image Container */}
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-slate-800">
        <Image
          src={show.poster}
          alt={show.title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          priority={priority}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          unoptimized
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

        {/* Character / Category Badge */}
        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
          <span className="bg-slate-900/80 backdrop-blur-md text-amber-300 font-extrabold text-[10px] px-2.5 py-1 rounded-full border border-amber-400/30 shadow-md">
            {show.character}
          </span>
          {show.isMovie ? (
            <span className="bg-rose-500/80 backdrop-blur-md text-white font-extrabold text-[10px] px-2 py-1 rounded-full flex items-center gap-1 shadow-md">
              <Film className="w-2.5 h-2.5" /> Movie
            </span>
          ) : (
            <span className="bg-blue-600/80 backdrop-blur-md text-white font-extrabold text-[10px] px-2 py-1 rounded-full flex items-center gap-1 shadow-md">
              <Tv className="w-2.5 h-2.5" /> Series
            </span>
          )}
        </div>

        {/* Favorite Heart Button */}
        <button
          onClick={toggleFavorite}
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-all duration-200 z-10 ${
            isFavorite
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40 scale-110'
              : 'bg-slate-900/60 text-slate-300 hover:text-white hover:bg-slate-900/90'
          }`}
          title={isFavorite ? 'Remove from My Toons' : 'Add to My Toons'}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>

        {/* Hover Play Button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-slate-950 shadow-2xl shadow-orange-500/50 scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-7 h-7 fill-current ml-1" />
          </div>
        </div>

        {/* Hindi Badge */}
        <div className="absolute bottom-3 right-3 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-md shadow-md">
          हिंदी डब
        </div>
      </div>

      {/* Title & Info */}
      <div className="p-3.5 flex flex-col flex-1 justify-between bg-slate-900/90">
        <h4 className="font-extrabold text-white text-sm line-clamp-2 leading-snug group-hover:text-amber-300 transition-colors">
          {show.title}
        </h4>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400 font-medium">
          <span>Rare Toons India</span>
          <span className="text-emerald-400 font-bold">1080p HD</span>
        </div>
      </div>
    </Link>
  );
};

