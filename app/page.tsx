import React from 'react';
import { getCatalog } from '@/lib/raretoon';
import { generateRecommendations } from '@/lib/recommendations';
import { HeroSpotlight } from '@/components/HeroSpotlight';
import { ContinueWatching } from '@/components/ContinueWatching';
import { CharacterBubbles } from '@/components/CharacterBubbles';
import { CartoonCard } from '@/components/CartoonCard';
import { Sparkles, Film, Flame } from 'lucide-react';

export const revalidate = 300; // Revalidate every 5 minutes

export default async function HomePage() {
  const { shows } = await getCatalog({ perPage: 28 });

  // Select spotlight show (e.g. Doraemon or latest movie)
  const spotlightShow = shows.find((s) => s.isMovie || s.character === 'Doraemon') || shows[0];

  // Generate recommendation sections
  const recommendationSections = generateRecommendations(shows, ['Doraemon', 'Shinchan']);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Hero Spotlight */}
      {spotlightShow && <HeroSpotlight show={spotlightShow} />}

      {/* 2. Continue Watching Shelf */}
      <ContinueWatching />

      {/* 3. Character Quick Filter Bubbles */}
      <CharacterBubbles />

      {/* 4. Recommendation Sections */}
      {recommendationSections.map((section, idx) => {
        if (!section.shows || section.shows.length === 0) return null;

        return (
          <section key={section.title} className="space-y-4">
            <div className="flex items-end justify-between px-1">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <span>{section.icon}</span>
                  <span>{section.title}</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 font-medium">
                  {section.subtitle}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
              {section.shows.map((show, showIdx) => (
                <CartoonCard
                  key={`${show.id}-${showIdx}`}
                  show={show}
                  priority={idx === 0 && showIdx < 4}
                />
              ))}
            </div>
          </section>
        );
      })}

      {/* 5. Complete Hindi Toons Catalog Grid */}
      <section className="pt-4 border-t border-slate-800">
        <div className="flex items-center justify-between mb-4 px-1">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Flame className="w-6 h-6 text-orange-500 fill-current" />
              <span>Full Hindi Toons Catalog</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 font-medium">
              Sourced directly from Rare Toon India
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 sm:gap-4">
          {shows.map((show) => (
            <CartoonCard key={show.id} show={show} />
          ))}
        </div>
      </section>
    </div>
  );
}

