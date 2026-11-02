'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Mic, MicOff, X, Sparkles, Frown } from 'lucide-react';
import { ShowSummary } from '@/lib/raretoon';
import { CartoonCard } from '@/components/CartoonCard';
import { CharacterBubbles } from '@/components/CharacterBubbles';

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<ShowSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeFilter, setActiveFilter] = useState('');

  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  const fetchResults = async (q: string, filter: string) => {
    setIsLoading(true);
    try {
      const searchTerm = filter ? `${q} ${filter}`.trim() : q;
      const res = await fetch(`/api/catalog?search=${encodeURIComponent(searchTerm)}&perPage=24`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.shows || []);
      }
    } catch (e) {
      console.error('Search failed:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    debounceTimeout.current = setTimeout(() => {
      fetchResults(query, activeFilter);
    }, 400);

    return () => {
      if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    };
  }, [query, activeFilter]);

  const toggleSpeechRecognition = () => {
    if (typeof window === 'undefined') return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech search is not supported on this browser. Please type your cartoon name.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'hi-IN';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setQuery(transcript);
        }
      };

      recognition.start();
    } catch (e) {
      console.error(e);
      setIsListening(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Search Header & Input */}
      <div className="max-w-3xl mx-auto space-y-4 text-center">
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Find Your Favorite Hindi Cartoons 🔍
        </h1>
        <p className="text-xs sm:text-sm text-slate-400">
          Type cartoon name or press the microphone to speak in Hindi or English
        </p>

        <div className="relative flex items-center">
          <div className="absolute left-4 text-slate-400">
            <Search className="w-5 h-5" />
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Doraemon, Shinchan, Pokemon, Movies..."
            className="w-full pl-12 pr-24 py-4 rounded-3xl bg-slate-800/90 border border-slate-700/80 text-white placeholder-slate-400 font-bold text-base sm:text-lg focus:outline-none focus:ring-4 focus:ring-amber-400/30 focus:border-amber-400 transition-all shadow-xl"
          />

          <div className="absolute right-3 flex items-center gap-1.5">
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-700/60 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={toggleSpeechRecognition}
              className={`p-2.5 rounded-2xl transition-all shadow-md ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse'
                  : 'bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold active:scale-95'
              }`}
              title="Voice Search (Speak cartoon name)"
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Quick Character Bubbles */}
      <CharacterBubbles
        activeCharacter={activeFilter}
        onSelect={(char) => setActiveFilter(char)}
      />

      {/* Results Header */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-lg font-black text-white">
          {isLoading ? (
            <span className="flex items-center gap-2 text-slate-400">
              <Sparkles className="w-4 h-4 animate-spin text-amber-400" />
              Searching Hindi toons...
            </span>
          ) : results.length > 0 ? (
            <span>Found {results.length} Cartoons</span>
          ) : (
            <span>No cartoons found</span>
          )}
        </h2>
      </div>

      {/* Results Grid */}
      {results.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
          {results.map((show) => (
            <CartoonCard key={show.id} show={show} />
          ))}
        </div>
      ) : !isLoading ? (
        <div className="py-16 text-center space-y-4 glass-panel rounded-3xl max-w-lg mx-auto p-8">
          <div className="w-16 h-16 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-400">
            <Frown className="w-8 h-8 text-amber-400" />
          </div>
          <h3 className="text-lg font-black text-white">No Cartoons Found</h3>
          <p className="text-xs text-slate-400">
            Try searching for popular terms like "Doraemon", "Shinchan", "Movie", or tap any hero bubble above!
          </p>
          <button
            onClick={() => {
              setQuery('Doraemon');
              setActiveFilter('');
            }}
            className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs shadow-md"
          >
            Show Doraemon Episodes
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="py-20 text-center space-y-3">
        <Sparkles className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
        <p className="text-sm text-slate-400">Loading Search...</p>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
