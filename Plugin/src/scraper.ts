/**
 * AnimeToonHindi Scraper Engine
 */

import { fetchWithHeaders, resolveCodedewZipper } from './resolver';
import { extractStreamQualities } from './extractor';
import {
  ShowSearchResult,
  ShowStreamCatalog,
  EpisodeStreamInfo,
  ScraperOptions,
} from './types';

const STORE_BASE = 'https://store.animetoonhindi.com';

/**
 * Normalizes cartoon names and corrects common typos
 */
export function normalizeQuery(query: string): string {
  let q = query.trim();
  if (/ben\s*to\s*alien/i.test(q)) {
    q = 'ben 10 alien force';
  } else if (/ben\s*(?:10|ten)\s*classic/i.test(q)) {
    q = 'ben 10';
  } else if (/ben\s*ten/i.test(q)) {
    q = 'ben 10';
  } else if (/courage/i.test(q)) {
    q = 'courage';
  }
  return q;
}

/**
 * Detects cartoon character category
 */
export function detectCharacter(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('ben 10') || t.includes('ben10')) return 'Ben 10';
  if (t.includes('doraemon')) return 'Doraemon';
  if (t.includes('shin chan') || t.includes('shinchan') || t.includes('shin-chan')) return 'Shinchan';
  if (t.includes('courage')) return 'Courage the Cowardly Dog';
  if (t.includes('oggy')) return 'Oggy and the Cockroaches';
  if (t.includes('motu') || t.includes('patlu')) return 'Motu Patlu';
  if (t.includes('slugterra')) return 'Slugterra';
  if (t.includes('pokemon')) return 'Pokemon';
  if (t.includes('naruto')) return 'Naruto';
  if (t.includes('kiteretsu')) return 'Kiteretsu';
  return 'Cartoons';
}

/**
 * Clean text from HTML tags and entities
 */
export function cleanHtmlText(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8211;/g, '–')
    .replace(/&#8217;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Searches store.animetoonhindi.com for a given cartoon query
 */
export async function searchStore(
  query: string,
  options: { maxPages?: number } = {}
): Promise<ShowSearchResult[]> {
  const cleanQ = normalizeQuery(query);
  const maxPages = options.maxPages || 3;
  const results: ShowSearchResult[] = [];
  const seenUrls = new Set<string>();

  for (let page = 1; page <= maxPages; page++) {
    const url =
      page === 1
        ? `${STORE_BASE}/?s=${encodeURIComponent(cleanQ)}`
        : `${STORE_BASE}/page/${page}/?s=${encodeURIComponent(cleanQ)}`;

    try {
      const res = await fetchWithHeaders(url);
      if (!res.ok) break;

      const html = await res.text();
      const articles = Array.from(html.matchAll(/<article[^>]*>([\s\S]*?)<\/article>/gi));
      if (articles.length === 0) break;

      for (const art of articles) {
        const block = art[1];
        const titleMatch =
          block.match(/<h2[^>]*class="entry-title"[^>]*><a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/h2>/i) ||
          block.match(/<a\s+href="([^"]+)"\s+title="([^"]+)"/i);

        if (!titleMatch) continue;

        const postUrl = titleMatch[1];
        if (seenUrls.has(postUrl)) continue;
        seenUrls.add(postUrl);

        const rawTitle = titleMatch[2] || titleMatch[1];
        const cleanTitle = cleanHtmlText(rawTitle);

        // Extract thumbnail
        const imgMatch = block.match(/<img[^>]+src="([^">]+)"/i);
        const poster = imgMatch ? imgMatch[1] : '';

        // Detect server type
        let serverType = 'Other';
        if (/multiquality/i.test(cleanTitle)) serverType = 'MultiQuality';
        else if (/multilare/i.test(cleanTitle)) serverType = 'MultiLare';
        else if (/domulti/i.test(cleanTitle)) serverType = 'DoMulti';
        else if (/quickcloud/i.test(cleanTitle)) serverType = 'QuickCloud';
        else if (/download\s+links/i.test(cleanTitle)) serverType = 'DownloadLinks';

        const isHindi =
          /hindi/i.test(cleanTitle) || (!/tamil/i.test(cleanTitle) && !/telugu/i.test(cleanTitle));

        // Extract post ID
        const idMatch = postUrl.match(/archives\/(\d+)/i);
        const id = idMatch ? idMatch[1] : postUrl;

        results.push({
          id,
          title: cleanTitle,
          url: postUrl,
          poster,
          character: detectCharacter(cleanTitle),
          serverType,
          isHindi,
        });
      }
    } catch (e) {
      break;
    }
  }

  // Sort: prioritize Hindi and MultiQuality
  results.sort((a, b) => {
    if (a.isHindi !== b.isHindi) return a.isHindi ? -1 : 1;
    const score = (item: ShowSearchResult) => {
      if (item.serverType === 'MultiQuality') return 5;
      if (item.serverType === 'MultiLare') return 4;
      if (item.serverType === 'DoMulti') return 3;
      if (item.serverType === 'DownloadLinks') return 2;
      return 1;
    };
    return score(b) - score(a);
  });

  return results;
}

/**
 * Scrapes a show post and resolves its episodes and stream links
 */
export async function scrapeShow(
  postUrl: string,
  query: string,
  options: ScraperOptions = {}
): Promise<ShowStreamCatalog | null> {
  const maxEpisodes = options.maxEpisodesPerShow || 25;
  const resolveStreams = options.resolveStreamUrls !== false;

  const res = await fetchWithHeaders(postUrl);
  if (!res.ok) return null;

  const html = await res.text();
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  const rawTitle = titleMatch ? titleMatch[1].replace(/&#8211;\s*Linker/i, '').trim() : query;
  const cleanTitle = cleanHtmlText(rawTitle);
  const character = detectCharacter(cleanTitle);

  // Extract poster
  let poster = '';
  const imgMatch = html.match(/<div class="entry-content[^"]*"[^>]*>[\s\S]*?<img[^>]+src="([^">]+)"/i);
  if (imgMatch) poster = imgMatch[1];

  const idMatch = postUrl.match(/archives\/(\d+)/i);
  const id = idMatch ? idMatch[1] : 'show-' + Date.now();

  // Find all codedew zipper links in content
  const entryMatch = html.match(/<div class="entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  const content = entryMatch ? entryMatch[1] : html;

  const rawLinks = Array.from(content.matchAll(/<a\s+[^>]*href="([^"]*codedew\.com\/zipper[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi));
  if (rawLinks.length === 0) {
    return null;
  }

  const episodes: EpisodeStreamInfo[] = [];

  // Try to see if the first link is or resolves to a MultiQuality page containing full series metadata
  let firstResolved = await resolveCodedewZipper(rawLinks[0][1], postUrl);

  // If first link led to another archive on store.animetoonhindi.com (e.g. an aggregated show page)
  if (
    firstResolved.destinationUrl.includes('store.animetoonhindi.com/archives/') &&
    firstResolved.destinationUrl !== postUrl
  ) {
    const subRes = await fetchWithHeaders(firstResolved.destinationUrl);
    if (subRes.ok) {
      const subHtml = await subRes.text();
      const subLinks = Array.from(subHtml.matchAll(/<a\s+[^>]*href="([^"]*codedew\.com\/zipper[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi));
      if (subLinks.length > 0) {
        firstResolved = await resolveCodedewZipper(subLinks[0][1], firstResolved.destinationUrl);
      }
    }
  }

  // Case A: Multiquality Series Page with structured relatedData
  if (firstResolved.isMultiQuality && firstResolved.html) {
    const s0 = firstResolved.html;
    const relatedMatch = s0.match(/let\s+relatedData\s*=\s*(\{[\s\S]*?\});/);

    if (relatedMatch) {
      try {
        const related = JSON.parse(relatedMatch[1]);
        let epCount = 0;

        for (const seasonKey of Object.keys(related)) {
          const seasonObj = related[seasonKey];
          const seasonNo = seasonObj.season_no || 1;
          const epList = seasonObj.episodes || [];

          for (let i = 0; i < epList.length; i++) {
            if (epCount >= maxEpisodes) break;
            const ep = epList[i];
            const videoId = ep.id;
            const epNum = i + 1;
            const epTitle = ep.ep_name ? `S${seasonNo}E${epNum} - ${ep.ep_name}` : `Episode ${epNum}`;

            let sources: any[] = [];
            if (resolveStreams && epCount < 10) {
              // Resolve stream qualities for up to first 10 episodes in batch to be fast & robust
              sources = await extractStreamQualities(videoId);
            }

            episodes.push({
              id: `${videoId}-${seasonNo}-${epNum}`,
              episodeNumber: epNum,
              seasonNumber: seasonNo,
              title: epTitle,
              videoId,
              watchUrl: `https://argon.razorshell.space/embed/${videoId}`,
              downloadUrl: `https://argon.razorshell.space/downlead/${videoId}/`,
              sources,
              resolvedAt: new Date().toISOString(),
            });
            epCount++;
          }
          if (epCount >= maxEpisodes) break;
        }
      } catch (err) {
        // Fallback to direct links parsing below
      }
    }
  }

  // Case B: Direct episode zipper links
  if (episodes.length === 0) {
    const limit = Math.min(rawLinks.length, maxEpisodes);
    for (let i = 0; i < limit; i++) {
      const linkTuple = rawLinks[i];
      const zipperUrl = linkTuple[1];
      const linkText = cleanHtmlText(linkTuple[2]);

      const numMatch = linkText.match(/E(?:pisode\s*|p\s*)?(\d+)/i) || linkText.match(/(\d+)/);
      const epNum = numMatch ? parseInt(numMatch[1], 10) : i + 1;
      const seasonMatch = linkText.match(/S(?:eason\s*)?(\d+)/i);
      const seasonNo = seasonMatch ? parseInt(seasonMatch[1], 10) : 1;

      try {
        const resolved = await resolveCodedewZipper(zipperUrl, postUrl);
        const videoId = resolved.videoId;
        if (!videoId) continue;

        let sources: any[] = [];
        if (resolveStreams && i < 8) {
          sources = await extractStreamQualities(videoId);
        }

        episodes.push({
          id: `${videoId}-${seasonNo}-${epNum}`,
          episodeNumber: epNum,
          seasonNumber: seasonNo,
          title: linkText.length > 3 ? linkText : `Episode ${epNum}`,
          videoId,
          watchUrl: `https://argon.razorshell.space/embed/${videoId}`,
          downloadUrl: `https://argon.razorshell.space/downlead/${videoId}/`,
          sources,
          resolvedAt: new Date().toISOString(),
        });
      } catch (err) {
        continue;
      }
    }
  }

  if (episodes.length === 0) return null;

  return {
    id,
    title: cleanTitle,
    query,
    character,
    sourceUrl: postUrl,
    poster: poster || 'https://static.tvmaze.com/uploads/images/original_untouched/6/16288.jpg',
    backdrop: 'https://static.tvmaze.com/uploads/images/original_untouched/225/563589.jpg',
    categories: [character, 'Hindi Dubbed', 'AnimeToonHindi'],
    totalEpisodes: episodes.length,
    episodes,
    updatedAt: new Date().toISOString(),
  };
}
