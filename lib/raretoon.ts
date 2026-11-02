export interface Episode {
  id: string;
  episodeNumber: number;
  title: string;
  videoCode: string;
  watchUrl: string;
  downloadUrl?: string;
}

export interface ShowSummary {
  id: number;
  title: string;
  slug: string;
  poster: string;
  categories: string[];
  character: string;
  isMovie: boolean;
  date: string;
  excerpt: string;
}

export interface ShowDetail extends ShowSummary {
  content: string;
  synopsis: string;
  episodes: Episode[];
  genres: string[];
  language: string;
  network?: string;
  year?: string;
}

const WP_API_BASE = 'https://raretoonindia.in/wp-json/wp/v2';

// In-memory cache for fast response times
const cache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string): T | null {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiry) {
    cache.delete(key);
    return null;
  }
  return item.data as T;
}

function setCache(key: string, data: any, ttl = CACHE_TTL_MS) {
  cache.set(key, { data, expiry: Date.now() + ttl });
}

function detectCharacter(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('doraemon')) return 'Doraemon';
  if (t.includes('shinchan') || t.includes('shin chan') || t.includes('shin-chan')) return 'Shinchan';
  if (t.includes('pokemon')) return 'Pokemon';
  if (t.includes('naruto')) return 'Naruto';
  if (t.includes('bandbudh') || t.includes('budbak')) return 'Bandbudh & Budbak';
  if (t.includes('bheem') || t.includes('chhota bheem')) return 'Chhota Bheem';
  if (t.includes('motu') || t.includes('patlu')) return 'Motu Patlu';
  if (t.includes('disney')) return 'Disney';
  if (t.includes('ben 10') || t.includes('ben10')) return 'Ben 10';
  if (t.includes('dragon ball') || t.includes('goku')) return 'Dragon Ball';
  return 'Toon Heroes';
}

function extractPoster(post: any): string {
  // 1. Featured image if present
  if (post._embedded?.['wp:featuredmedia']?.[0]?.source_url) {
    return post._embedded['wp:featuredmedia'][0].source_url;
  }

  // 2. First image in content
  const content = post.content?.rendered || '';
  const imgMatch = content.match(/<img[^>]+(?:src|data-src)="([^">]+)"/i);
  if (imgMatch && imgMatch[1]) {
    return imgMatch[1];
  }

  // 3. Fallback kid-friendly themed poster
  const char = detectCharacter(post.title?.rendered || '');
  if (char === 'Doraemon') return 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80';
  if (char === 'Shinchan') return 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80';
  if (char === 'Pokemon') return 'https://images.unsplash.com/photo-1613771404784-3a5686aa2be3?w=600&auto=format&fit=crop&q=80';
  return 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80';
}

function cleanHtmlText(html: string): string {
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
 * Parses episodes and video codes out of post HTML content.
 */
export function parseEpisodes(html: string, showTitle: string): Episode[] {
  const episodes: Episode[] = [];
  
  // Strategy 1: Find episode sections like "Episode 01 – Name", followed by QuickWatch/Download links
  const episodeBlocks = html.split(/(?:Episode\s*\d+|EP\s*\d+)/i);
  const epHeaders = html.match(/(?:Episode\s*\d+|EP\s*\d+)[^<]*/gi) || [];

  if (epHeaders.length > 0 && episodeBlocks.length > 1) {
    for (let i = 0; i < epHeaders.length; i++) {
      const headerText = epHeaders[i].trim();
      const block = episodeBlocks[i + 1] || '';
      
      // Match video code from bysekoze or filemoon link
      const codeMatch = block.match(/(?:bysekoze\.com|filemoon\.(?:in|sx|to)|vidhide[^/]*|streamwish[^/]*)\/(?:d|e|download)\/([a-zA-Z0-9]+)/i);
      if (codeMatch && codeMatch[1]) {
        const code = codeMatch[1];
        const numMatch = headerText.match(/\d+/);
        const epNum = numMatch ? parseInt(numMatch[0], 10) : i + 1;
        const cleanTitle = cleanHtmlText(headerText);

        episodes.push({
          id: `${code}-${epNum}`,
          episodeNumber: epNum,
          title: cleanTitle.length > 3 ? cleanTitle : `Episode ${epNum}`,
          videoCode: code,
          watchUrl: `https://bysekoze.com/e/${code}`,
          downloadUrl: `https://bysekoze.com/download/${code}`
        });
      }
    }
  }

  // Strategy 2: If no structured episode headers, extract all video links directly
  if (episodes.length === 0) {
    const linkRegex = /href="https?:\/\/(?:bysekoze\.com|filemoon\.(?:in|sx|to)|vidhide[^/]*|streamwish[^/]*)\/(?:d|e|download)\/([a-zA-Z0-9]+)"/gi;
    let match;
    const seenCodes = new Set<string>();
    let count = 1;

    while ((match = linkRegex.exec(html)) !== null) {
      const code = match[1];
      if (!seenCodes.has(code)) {
        seenCodes.add(code);
        const isMovie = showTitle.toLowerCase().includes('movie');
        episodes.push({
          id: `${code}-${count}`,
          episodeNumber: count,
          title: isMovie ? `${cleanHtmlText(showTitle)} (Full Movie)` : `Episode ${count}`,
          videoCode: code,
          watchUrl: `https://bysekoze.com/e/${code}`,
          downloadUrl: `https://bysekoze.com/download/${code}`
        });
        count++;
      }
    }
  }

  return episodes;
}

/**
 * Fetches cartoon catalog from Rare Toon India with pagination and category filtering.
 */
export async function getCatalog(params?: {
  page?: number;
  perPage?: number;
  search?: string;
  categorySlug?: string;
}): Promise<{ shows: ShowSummary[]; total: number; totalPages: number }> {
  const page = params?.page || 1;
  const perPage = params?.perPage || 16;
  const search = params?.search ? encodeURIComponent(params.search) : '';
  const cacheKey = `catalog_${page}_${perPage}_${search}_${params?.categorySlug || 'all'}`;

  const cached = getCached<{ shows: ShowSummary[]; total: number; totalPages: number }>(cacheKey);
  if (cached) return cached;

  let url = `${WP_API_BASE}/posts?page=${page}&per_page=${perPage}&_fields=id,title,slug,excerpt,featured_media,date,content`;
  if (search) {
    url += `&search=${search}`;
  }

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
    },
    next: { revalidate: 300 }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch catalog from source: ${res.status}`);
  }

  const total = parseInt(res.headers.get('x-wp-total') || '0', 10);
  const totalPages = parseInt(res.headers.get('x-wp-totalpages') || '1', 10);
  const posts = await res.json();

  const shows: ShowSummary[] = posts.map((post: any) => {
    const rawTitle = post.title?.rendered || '';
    const cleanTitle = cleanHtmlText(rawTitle);
    const isMovie = cleanTitle.toLowerCase().includes('movie');
    const character = detectCharacter(cleanTitle);

    return {
      id: post.id,
      title: cleanTitle,
      slug: post.slug,
      poster: extractPoster(post),
      categories: [character, isMovie ? 'Movies' : 'TV Series', 'Hindi Dubbed'],
      character,
      isMovie,
      date: post.date,
      excerpt: cleanHtmlText(post.excerpt?.rendered || '')
    };
  });

  const result = { shows, total, totalPages };
  setCache(cacheKey, result);
  return result;
}

/**
 * Fetches show details and parses all episodes.
 */
export async function getShowBySlug(slug: string): Promise<ShowDetail | null> {
  const cacheKey = `show_${slug}`;
  const cached = getCached<ShowDetail>(cacheKey);
  if (cached) return cached;

  const res = await fetch(`${WP_API_BASE}/posts?slug=${encodeURIComponent(slug)}&_fields=id,title,slug,content,excerpt,featured_media,date`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
    },
    next: { revalidate: 300 }
  });

  if (!res.ok) return null;
  const posts = await res.json();
  if (!Array.isArray(posts) || posts.length === 0) return null;

  const post = posts[0];
  const rawTitle = post.title?.rendered || '';
  const cleanTitle = cleanHtmlText(rawTitle);
  const content = post.content?.rendered || '';
  const isMovie = cleanTitle.toLowerCase().includes('movie');
  const character = detectCharacter(cleanTitle);
  const episodes = parseEpisodes(content, cleanTitle);

  // Extract metadata from content
  const langMatch = content.match(/Language:\s*&nbsp;([^<\n]+)/i);
  const networkMatch = content.match(/Network:\s*&nbsp;([^<\n]+)/i);
  const yearMatch = content.match(/Year:\s*&nbsp;([^<\n]+)/i);
  const synopsisMatch = content.match(/Synopsis:\s*&nbsp;([^<\n]+)/i) || content.match(/Plot:\s*&nbsp;([^<\n]+)/i);

  const detail: ShowDetail = {
    id: post.id,
    title: cleanTitle,
    slug: post.slug,
    poster: extractPoster(post),
    categories: [character, isMovie ? 'Movies' : 'TV Series', 'Hindi Dubbed'],
    character,
    isMovie,
    date: post.date,
    excerpt: cleanHtmlText(post.excerpt?.rendered || ''),
    content,
    synopsis: synopsisMatch ? cleanHtmlText(synopsisMatch[1]) : cleanHtmlText(post.excerpt?.rendered || ''),
    episodes,
    genres: ['Animation', 'Comedy', 'Adventure', 'Kids & Family'],
    language: langMatch ? cleanHtmlText(langMatch[1]) : 'Hindi Dubbed',
    network: networkMatch ? cleanHtmlText(networkMatch[1]) : 'Cartoon Network / Hungama',
    year: yearMatch ? cleanHtmlText(yearMatch[1]) : undefined
  };

  setCache(cacheKey, detail);
  return detail;
}

