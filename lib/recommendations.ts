import { ShowSummary } from './raretoon';

export interface RecommendationSection {
  title: string;
  subtitle: string;
  icon: string;
  shows: ShowSummary[];
}

export function generateRecommendations(
  allShows: ShowSummary[],
  watchedCharacters: string[]
): RecommendationSection[] {
  const sections: RecommendationSection[] = [];

  // 1. If watched Doraemon or Shinchan, prioritize corresponding character shelf
  if (watchedCharacters.length > 0) {
    const favoriteChar = watchedCharacters[0];
    const charShows = allShows.filter((s) => s.character === favoriteChar);
    if (charShows.length > 0) {
      sections.push({
        title: `Because You Love ${favoriteChar}`,
        subtitle: `More thrilling episodes and movies with ${favoriteChar}!`,
        icon: '⭐',
        shows: charShows.slice(0, 8)
      });
    }
  }

  // 2. Hindi Movies Special
  const movies = allShows.filter((s) => s.isMovie);
  if (movies.length > 0) {
    sections.push({
      title: '🎬 Hindi Cartoon Blockbusters',
      subtitle: 'Full-length movie adventures in Hindi dubbed audio',
      icon: '🍿',
      shows: movies.slice(0, 8)
    });
  }

  // 3. Doraemon & Shinchan Specials
  const doraemonShinchan = allShows.filter(
    (s) => s.character === 'Doraemon' || s.character === 'Shinchan'
  );
  if (doraemonShinchan.length > 0) {
    sections.push({
      title: '✨ Doraemon & Shinchan Fun House',
      subtitle: 'Unstoppable comedy and magical gadgets',
      icon: '🚀',
      shows: doraemonShinchan.slice(0, 8)
    });
  }

  // 4. Action & Toon Heroes (Bandbudh, Naruto, Pokemon, Dragon Ball)
  const actionToons = allShows.filter(
    (s) => s.character === 'Naruto' || s.character === 'Pokemon' || s.character === 'Bandbudh & Budbak'
  );
  if (actionToons.length > 0) {
    sections.push({
      title: '🔥 Super Toon Adventures',
      subtitle: 'Epic battles, awesome ninjas, and prankster buddies',
      icon: '⚡',
      shows: actionToons.slice(0, 8)
    });
  }

  // 5. Suggested for All Kids (mixed popular)
  sections.push({
    title: '🎈 Suggested For You',
    subtitle: 'Hand-picked Hindi cartoons popular with kids across India',
    icon: '💖',
    shows: allShows.slice(0, 10)
  });

  return sections;
}

