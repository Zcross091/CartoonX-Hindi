'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { VideoPlayer } from '@/components/VideoPlayer';
import { db } from '@/lib/db';
import { ShowDetail, Episode } from '@/lib/raretoon';
import { Sparkles, AlertCircle, ArrowLeft, DownloadCloud, Play } from 'lucide-react';
import Link from 'next/link';

function WatchContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const videoCode = params.code as string;
  const showSlug = searchParams.get('slug') || '';
  const initialTime = parseInt(searchParams.get('time') || '0', 10);
  const epNumber = parseInt(searchParams.get('ep') || '1', 10);

  const [streamData, setStreamData] = useState<any>(null);
  const [offlineBlobUrl, setOfflineBlobUrl] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState<ShowDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!videoCode) return;

    let blobUrlCreated: string | null = null;

    const loadStream = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const downloaded = await db.downloads.get(videoCode);
        if (downloaded && downloaded.blobData) {
          blobUrlCreated = URL.createObjectURL(downloaded.blobData);
          setOfflineBlobUrl(blobUrlCreated);
          setIsLoading(false);
          return;
        }

        const res = await fetch(`/api/stream/${videoCode}`);
        if (!res.ok) {
          throw new Error('Failed to decrypt video stream from server');
        }

        const data = await res.json();
        setStreamData(data);
      } catch (err: any) {
        console.error('Stream load error:', err);
        setError(err.message || 'Error loading cartoon video');
      } finally {
        setIsLoading(false);
      }
    };

    loadStream();

    if (showSlug) {
      fetch(`/api/show/${showSlug}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => setShowDetail(data))
        .catch(console.error);
    }

    return () => {
      if (blobUrlCreated) {
        URL.revokeObjectURL(blobUrlCreated);
      }
    };
  }, [videoCode, showSlug]);

  const currentEpIndex = showDetail?.episodes.findIndex((e) => e.videoCode === videoCode) ?? -1;
  const currentEpisode = showDetail?.episodes[currentEpIndex];
  const nextEpisode = currentEpIndex !== -1 && showDetail && currentEpIndex + 1 < showDetail.episodes.length
    ? showDetail.episodes[currentEpIndex + 1]
    : null;

  const handleNextEpisode = () => {
    if (nextEpisode) {
      router.push(`/watch/${nextEpisode.videoCode}?slug=${showSlug}&ep=${nextEpisode.episodeNumber}`);
    }
  };

  const bestSource = streamData?.sources?.[0]?.proxiedUrl || streamData?.sources?.[0]?.url;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <button
          onClick={() => (showSlug ? router.push(`/show/${showSlug}`) : router.back())}
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white font-bold text-sm bg-slate-800/60 px-4 py-2 rounded-2xl border border-slate-700/60 hover:bg-slate-800 transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Episodes (एपिसोड सूची)</span>
        </button>

        {offlineBlobUrl && (
          <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black px-3 py-1.5 rounded-xl">
            Watching Offline (बिना इंटरनेट)
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="relative aspect-video w-full rounded-3xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center gap-3">
          <Sparkles className="w-10 h-10 text-amber-400 animate-spin" />
          <p className="text-white font-black text-sm">Decrypting 1080p Stream from Rare Toon India...</p>
        </div>
      ) : error ? (
        <div className="relative aspect-video w-full rounded-3xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center p-6 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500" />
          <h3 className="text-lg font-black text-white">Stream Unavailable</h3>
          <p className="text-xs text-slate-400 max-w-md">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 rounded-2xl bg-amber-400 text-slate-950 font-black text-xs"
          >
            Retry Playback
          </button>
        </div>
      ) : (
        <VideoPlayer
          streamUrl={bestSource}
          blobUrl={offlineBlobUrl || undefined}
          title={showDetail?.title || streamData?.title || 'Cartoon Episode'}
          episodeTitle={currentEpisode?.title || `Episode ${epNumber}`}
          episodeNumber={epNumber}
          showSlug={showSlug}
          videoCode={videoCode}
          poster={showDetail?.poster || streamData?.poster_url || ''}
          initialTime={initialTime}
          hasNextEpisode={!!nextEpisode}
          onNextEpisode={handleNextEpisode}
          onBack={() => router.back()}
        />
      )}

      <div className="glass-panel rounded-3xl p-6 border border-slate-700/60 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wider">
            {showDetail?.character || 'Hindi Cartoon'} • Hindi Dubbed
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
            {currentEpisode?.title || streamData?.title || `Episode ${epNumber}`}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {showDetail?.title || 'Rare Toons India Collection'}
          </p>
        </div>

        {nextEpisode && (
          <button
            onClick={handleNextEpisode}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-sm shadow-xl active:scale-95 transition-all"
          >
            <span>Next: {nextEpisode.title}</span>
            <Play className="w-4 h-4 fill-current ml-1" />
          </button>
        )}
      </div>

      {showDetail && showDetail.episodes.length > 1 && (
        <section className="space-y-3 pt-4">
          <h3 className="text-base font-black text-white">More Episodes</h3>
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-none">
            {showDetail.episodes.map((ep) => {
              const isCurrent = ep.videoCode === videoCode;

              return (
                <Link
                  key={ep.id}
                  href={`/watch/${ep.videoCode}?slug=${showSlug}&ep=${ep.episodeNumber}`}
                  className={`flex-shrink-0 flex items-center gap-2.5 px-4 py-3 rounded-2xl border transition-all ${
                    isCurrent
                      ? 'bg-amber-400 text-slate-950 border-amber-400 font-black shadow-lg scale-105'
                      : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700/60 text-white font-bold'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black ${
                    isCurrent ? 'bg-slate-950 text-amber-400' : 'bg-slate-700 text-slate-300'
                  }`}>
                    {ep.episodeNumber}
                  </span>
                  <span className="text-xs max-w-[150px] truncate">{ep.title}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

export default function WatchPage() {
  return (
    <Suspense fallback={
      <div className="py-20 text-center space-y-3">
        <Sparkles className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
        <p className="text-sm text-slate-400">Loading Cartoon Player...</p>
      </div>
    }>
      <WatchContent />
    </Suspense>
  );
}
