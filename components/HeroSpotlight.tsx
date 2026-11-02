'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Play, Info, Sparkles, Film, Star } from 'lucide-react';
import { ShowSummary } from '@/lib/raretoon';

interface HeroSpotlightProps {
  show: ShowSummary;
}

export const HeroSpotlight: React.FC<HeroSpotlightProps> = ({ show }) => {
  return (
    <div className="relative w-full rounded-3xl overflow-hidden glass-panel border border-slate-700/60 shadow-2xl mb-8 group">
      {/* Background Image with Cinematic Vignette */}
      <div className="relative h-[340px] sm:h-[420px] w-full bg-slate-950 overflow-hidden">
        <Image
          src={show.poster}
          alt={show.title}
          fill
          priority
          className="object-cover object-top opacity-60 filter blur-[1px] group-hover:scale-105 transition-transform duration-700"
          unoptimized
        />

        {/* Dynamic Multi-stop Gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent w-full md:w-3/4" />

        {/* Content Container */}
        <div className="absolute inset-0 p-6 sm:p-10 flex flex-col justify-end max-w-2xl">
          {/* Tags */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-xs px-3 py-1 rounded-full flex items-center gap-1 shadow-md">
              <Sparkles className="w-3.5 h-3.5" /> #1 Trending in India
            </span>
            <span className="bg-blue-600/80 backdrop-blur-md text-white font-extrabold text-xs px-3 py-1 rounded-full border border-blue-400/30">
              {show.character}
            </span>
            <span className="bg-slate-800/80 backdrop-blur-md text-emerald-400 font-extrabold text-xs px-3 py-1 rounded-full border border-emerald-400/30 flex items-center gap-1">
              <Star className="w-3 h-3 fill-current" /> Hindi Dubbed Full HD
            </span>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight mb-2 tracking-tight drop-shadow-md">
            {show.title}
          </h1>

          {/* Excerpt */}
          <p className="text-xs sm:text-sm text-slate-300 font-medium line-clamp-2 mb-6 max-w-xl leading-relaxed">
            {show.excerpt || 'Watch full episodes and movies of your favorite cartoons in Hindi audio directly on CartoonX!'}
          </p>

          {/* CTA Buttons */}
          <div className="flex items-center gap-3">
            <Link
              href={`/show/${show.slug}`}
              className="flex items-center gap-2.5 bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 hover:from-amber-300 hover:to-pink-400 text-slate-950 font-black text-sm sm:text-base px-6 py-3.5 rounded-2xl shadow-xl shadow-orange-500/25 active:scale-95 transition-all duration-200"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Watch Now (अभी देखें)</span>
            </Link>

            <Link
              href={`/show/${show.slug}`}
              className="flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700/80 backdrop-blur-md text-white font-bold text-sm sm:text-base px-5 py-3.5 rounded-2xl border border-slate-700/60 active:scale-95 transition-all duration-200"
            >
              <Info className="w-4 h-4 text-slate-400" />
              <span>Episodes</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

