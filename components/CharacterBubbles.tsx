'use client';

import React from 'react';
import Link from 'next/link';

interface Character {
  name: string;
  hindiName: string;
  emoji: string;
  bgGradient: string;
  query: string;
}

const CHARACTERS: Character[] = [
  { name: 'Doraemon', hindiName: 'डोरेमोन', emoji: '🔔', bgGradient: 'from-blue-500 to-cyan-400', query: 'Doraemon' },
  { name: 'Shinchan', hindiName: 'शिनचैन', emoji: '🎈', bgGradient: 'from-red-500 to-amber-400', query: 'Shinchan' },
  { name: 'Bandbudh & Budbak', hindiName: 'बड़बड़ और बुड़बक', emoji: '🎒', bgGradient: 'from-emerald-500 to-teal-400', query: 'Bandbudh' },
  { name: 'Pokemon', hindiName: 'पोकेमोन', emoji: '⚡', bgGradient: 'from-amber-400 to-yellow-500', query: 'Pokemon' },
  { name: 'Naruto (Hindi)', hindiName: 'नारुतो', emoji: '🍥', bgGradient: 'from-orange-500 to-amber-500', query: 'Naruto' },
  { name: 'Disney Toons', hindiName: 'डिज्नी', emoji: '🏰', bgGradient: 'from-purple-500 to-indigo-500', query: 'Disney' },
  { name: 'All Movies', hindiName: 'फिल्में', emoji: '🍿', bgGradient: 'from-pink-500 to-rose-400', query: 'Movie' }
];

interface CharacterBubblesProps {
  activeCharacter?: string;
  onSelect?: (char: string) => void;
}

export const CharacterBubbles: React.FC<CharacterBubblesProps> = ({
  activeCharacter,
  onSelect
}) => {
  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-sm font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <span>Choose Your Favorite Hero</span>
          <span className="text-amber-400">✨</span>
        </h3>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 scrollbar-none snap-x">
        {CHARACTERS.map((char) => {
          const isSelected = activeCharacter === char.query;

          const content = (
            <div
              className={`flex-shrink-0 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border transition-all duration-200 snap-start active:scale-95 cursor-pointer ${
                isSelected
                  ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-lg shadow-amber-400/25 scale-105 font-black'
                  : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700/60 text-white font-bold hover:border-slate-500'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-xl bg-gradient-to-tr ${char.bgGradient} flex items-center justify-center text-lg shadow-sm`}
              >
                {char.emoji}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs leading-tight font-extrabold">{char.name}</span>
                <span className={`text-[10px] leading-tight ${isSelected ? 'text-slate-800 font-semibold' : 'text-slate-400'}`}>
                  {char.hindiName}
                </span>
              </div>
            </div>
          );

          if (onSelect) {
            return (
              <button
                key={char.name}
                onClick={() => onSelect(isSelected ? '' : char.query)}
                className="focus:outline-none"
              >
                {content}
              </button>
            );
          }

          return (
            <Link key={char.name} href={`/search?q=${encodeURIComponent(char.query)}`}>
              {content}
            </Link>
          );
        })}
      </div>
    </section>
  );
};

