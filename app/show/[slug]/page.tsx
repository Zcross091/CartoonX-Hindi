'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  Play, 
  DownloadCloud, 
  Heart, 
  Film, 
  Tv, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  ArrowLeft,
  Calendar,
  Radio
} from 'lucide-react';
import { ShowDetail, Episode } from '@/lib/raretoon';
import { db } from '@/lib/db';
import { DownloadModal } from '@/components/DownloadModal';

export default function ShowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [show, setShow] = useState<ShowDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [downloadingEpisode, setDownloadingEpisode] = useState<Episode | null>(null);
  const [downloadedCodes, setDownloadedCodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!slug) return;

    fetch(`/api/show/${slug}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        setShow(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });

    // Check favorite status
    db.favorites.get(slug).then((fav) => setIsFavorite(!!fav));

    // Check completed downloads
    db.downloads.where('status').equals('completed').toArray().then((items) => {
      setDownloadedCodes(new Set(items.map((i) => i.videoCode)));
    });
  }, [slug]);

  const toggleFavorite = async () => {
    if (!show) return;
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

  if (isLoading) {
    return (
      <div className="py-24 text-center space-y-4">
        <Sparkles className="w-10 h-10 text-amber-400 animate-spin mx-auto" />
        <h3 className="text-lg font-black text-white">Loading Cartoon Episodes...</h3>
      </div>
    );
  }

  if (!show) {
    return (
      <div className="py-24 text-center space-y-4 glass-panel rounded-3xl max-w-md mx-auto p-8">
        <h3 className="text-xl font-black text-white">Cartoon Not Found</h3>
        <p className="text-xs text-slate-400">
          We couldn't locate this cartoon show from Rare Toon India.
        </p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-2.5 rounded-2xl bg-amber-400 text-slate-950 font-black text-sm"
        >
          Back to Home
        </button>
      </div>
    );
  }

  const firstEpisode = show.episodes[0];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white font-bold text-sm bg-slate-800/60 px-4 py-2 rounded-2xl border border-slate-700/60 hover:bg-slate-800 transition-all"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back (वापस जाएं)</span>
      </button>

      {/* Hero Banner Header */}
      <div className="relative rounded-3xl overflow-hidden glass-panel border border-slate-700/60 p-6 sm:p-8 flex flex-col md:flex-row gap-6 md:gap-8 items-start shadow-2xl">
        {/* Poster */}
        <div className="relative w-40 sm:w-56 aspect-[3/4] rounded-2xl overflow-hidden bg-slate-800 flex-shrink-0 border border-slate-700 shadow-xl mx-auto md:mx-0">
          <Image
            src={show.poster}
            alt={show.title}
            fill
            priority
            className="object-cover"
            unoptimized
          />
          <div className="absolute top-2 left-2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-md shadow-md">
            हिंदी
          </div>
        </div>

        {/* Info & Metadata */}
        <div className="flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-blue-600/80 text-white font-extrabold text-xs px-3 py-1 rounded-full border border-blue-400/30">
              {show.character}
            </span>
            {show.isMovie ? (
              <span className="bg-rose-500/80 text-white font-extrabold text-xs px-3 py-1 rounded-full flex items-center gap-1">
                <Film className="w-3 h-3" /> Full Movie
              </span>
            ) : (
              <span className="bg-indigo-600/80 text-white font-extrabold text-xs px-3 py-1 rounded-full flex items-center gap-1">
                <Tv className="w-3 h-3" /> TV Series
              </span>
            )}
            <span className="bg-emerald-500/20 text-emerald-300 font-extrabold text-xs px-3 py-1 rounded-full border border-emerald-500/30">
              {show.episodes.length} Episodes
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight">
            {show.title}
          </h1>

          {/* Quick metadata badges */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-400">
            {show.year && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>{show.year}</span>
              </div>
            )}
            {show.network && (
              <div className="flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-pink-400" />
                <span>{show.network}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <span>{show.language}</span>
            </div>
          </div>

          {/* Synopsis */}
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl font-medium">
            {show.synopsis || show.excerpt || 'Enjoy Hindi dubbed cartoon entertainment with crystal-clear 1080p quality on CartoonX!'}
          </p>

          {/* Main Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            {firstEpisode && (
              <Link
                href={`/watch/${firstEpisode.videoCode}?slug=${show.slug}&ep=${firstEpisode.episodeNumber}`}
                className="flex items-center gap-2 bg-gradient-to-r from-amber-400 via-orange-500 to-pink-500 hover:from-amber-300 hover:to-pink-400 text-slate-950 font-black text-sm sm:text-base px-6 py-3.5 rounded-2xl shadow-xl shadow-orange-500/20 active:scale-95 transition-all"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Play Ep 1 (शुरू करें)</span>
              </Link>
            )}

            <button
              onClick={toggleFavorite}
              className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl border font-bold text-sm active:scale-95 transition-all ${
                isFavorite
                  ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/30'
                  : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
              <span>{isFavorite ? 'Saved in My Toons' : 'Add to My Toons'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Episode List Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Episodes ({show.episodes.length})</span>
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md">
                सभी एपिसोड
              </span>
            </h2>
            <p className="text-xs text-slate-400">Stream in 1080p HD or download for offline viewing</p>
          </div>
        </div>

        {show.episodes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {show.episodes.map((ep) => {
              const isDownloaded = downloadedCodes.has(ep.videoCode);

              return (
                <div
                  key={ep.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl glass-card border border-slate-700/60 hover:border-amber-400/50 transition-all group"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-black text-sm text-amber-400 flex-shrink-0 border border-slate-700">
                      {ep.episodeNumber}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-sm text-white truncate group-hover:text-amber-300 transition-colors">
                        {ep.title}
                      </h4>
                      <p className="text-[11px] text-slate-400">Hindi Audio • 1080p</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Watch Button */}
                    <Link
                      href={`/watch/${ep.videoCode}?slug=${show.slug}&ep=${ep.episodeNumber}`}
                      className="p-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black transition-colors shadow-sm active:scale-95"
                      title="Watch Episode"
                    >
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </Link>

                    {/* Download Button */}
                    {isDownloaded ? (
                      <Link
                        href="/downloads"
                        className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors"
                        title="Downloaded (Click to Open in Downloads)"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </Link>
                    ) : (
                      <button
                        onClick={() => setDownloadingEpisode(ep)}
                        className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors active:scale-95"
                        title="Download for Offline Watching"
                      >
                        <DownloadCloud className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center glass-panel rounded-2xl p-6">
            <p className="text-slate-400 text-sm">Episodes are being indexed from Rare Toon India.</p>
          </div>
        )}
      </section>

      {/* Download Modal */}
      {downloadingEpisode && (
        <DownloadModal
          isOpen={!!downloadingEpisode}
          onClose={() => setDownloadingEpisode(null)}
          episode={{
            videoCode: downloadingEpisode.videoCode,
            showSlug: show.slug,
            showTitle: show.title,
            episodeNumber: downloadingEpisode.episodeNumber,
            episodeTitle: downloadingEpisode.title,
            poster: show.poster
          }}
        />
      )}
    </div>
  );
}

