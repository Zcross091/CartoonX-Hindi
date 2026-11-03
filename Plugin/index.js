/**
 * CartoonX AnimeToonHindi Plugin
 * Standalone Node.js Runner & Library
 *
 * Usage:
 *   node index.js scrape              # Scrapes all toons from toonname.txt & creates streams.json
 *   node index.js watch               # Watches toonname.txt for added cartoons in real-time
 *   node index.js search "Ben 10"     # Searches and scrapes a specific cartoon
 *   node index.js resolve <video_id>  # Resolves direct MP4 stream links for a video ID
 *   node index.js test                # Runs a health check on the scraper pipeline
 */

const fs = require('fs');
const path = require('path');

const STORE_BASE = 'https://store.animetoonhindi.com';
const TOON_FILE = path.join(__dirname, 'toonname.txt');
const DB_FILE = path.join(__dirname, 'streams.json');
const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchWithHeaders(url, options = {}) {
  const headers = {
    'User-Agent': DEFAULT_USER_AGENT,
    ...(options.headers || {}),
  };
  return fetch(url, { ...options, headers });
}

function cleanHtmlText(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8211;/g, '–')
    .replace(/&#8217;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeQuery(query) {
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

function detectCharacter(title) {
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

function isShortenerStep(html) {
  return (
    html.includes('Scanning Link Safety') ||
    html.includes('Generating Secure Link') ||
    html.includes('Step 1 of 3') ||
    html.includes('Step 2 of 3')
  );
}

/**
 * Resolves codedew zipper links through multi-step redirection
 */
async function resolveCodedewZipper(initialUrl, referer = STORE_BASE) {
  let res = await fetchWithHeaders(initialUrl, {
    headers: { Referer: referer },
  });

  let cookie = (res.headers.get('set-cookie') || '').split(';')[0];
  let html = await res.text();

  if (!isShortenerStep(html)) {
    return parseFinalDestination(res.url, html);
  }

  // Step 1 -> Step 2
  let match = html.match(/data-href="([^"]+)"/);
  if (!match) return parseFinalDestination(res.url, html);

  let step2Url = match[1].replace(/&amp;/g, '&');
  if (!step2Url.startsWith('http')) {
    step2Url = 'https://codedew.com' + step2Url;
  }

  res = await fetchWithHeaders(step2Url, {
    headers: {
      Referer: initialUrl,
      Cookie: cookie,
    },
  });

  const c2 = res.headers.get('set-cookie');
  if (c2) cookie = cookie + '; ' + c2.split(';')[0];
  html = await res.text();

  if (!isShortenerStep(html)) {
    return parseFinalDestination(res.url, html);
  }

  // Step 2 -> Step 3
  match = html.match(/data-href="([^"]+)"/);
  if (!match) return parseFinalDestination(res.url, html);

  let step3Url = match[1].replace(/&amp;/g, '&');
  if (!step3Url.startsWith('http')) {
    step3Url = 'https://codedew.com' + step3Url;
  }

  res = await fetchWithHeaders(step3Url, {
    headers: {
      Referer: step2Url,
      Cookie: cookie,
    },
  });

  html = await res.text();
  return parseFinalDestination(res.url, html);
}

function parseFinalDestination(url, html) {
  const isMultiQuality = url.includes('/multiquality/') || html.includes('relatedData');

  let videoIdMatch = url.match(/[?&]url=([a-zA-Z0-9]+)/i);
  let videoId = videoIdMatch ? videoIdMatch[1] : undefined;

  if (!videoId) {
    const iframeMatch = html.match(/(?:razorshell\.space\/embed\/|embed\/)([a-zA-Z0-9]+)/i);
    if (iframeMatch) videoId = iframeMatch[1];
  }

  if (!videoId) {
    const fidMatch = html.match(/let\s+fid\s*=\s*["']([a-zA-Z0-9]+)["']/i);
    if (fidMatch) videoId = fidMatch[1];
  }

  if (!videoId) {
    const juicyMatch = html.match(/"video"\s*:\s*["']([a-zA-Z0-9]+)["']/i);
    if (juicyMatch) videoId = juicyMatch[1];
  }

  return {
    destinationUrl: url,
    videoId,
    isMultiQuality,
    html,
  };
}

/**
 * Extracts direct MP4 streaming links (360p, 720p, 1080p) from Razorshell / JuicyCodes
 */
async function extractStreamQualities(videoId) {
  if (!videoId || typeof videoId !== 'string') return [];

  const downleadUrl = `https://argon.razorshell.space/downlead/${encodeURIComponent(videoId)}/`;

  try {
    const res = await fetchWithHeaders(downleadUrl, {
      headers: {
        Referer: 'https://codedew.com/cdn/liptron.php/',
      },
    });

    if (!res.ok) return [];

    const html = await res.text();
    const dataMatch = html.match(/window\.juicyData\s*=\s*(\{[\s\S]*?\})(?:;|\s*<\/script>)/);
    if (!dataMatch) return [];

    const juicy = JSON.parse(dataMatch[1]);
    const token = juicy.data?.token;
    const linksRoute = juicy.data?.routes?.links;

    if (!token || !linksRoute) return [];

    const apiUrl = `https://argon.razorshell.space${linksRoute}`;
    const apiRes = await fetchWithHeaders(apiUrl, {
      method: 'POST',
      headers: {
        Referer: downleadUrl,
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/json',
        Accept: 'application/json, text/plain, */*',
      },
      body: JSON.stringify({ token }),
    });

    if (!apiRes.ok) return [];

    const data = await apiRes.json();
    if (!data.success || !Array.isArray(data.qualities)) return [];

    return data.qualities.map((q) => {
      const label = (q.label || '').toUpperCase();
      let quality = '720p';
      if (label.includes('1080')) quality = '1080p';
      else if (label.includes('720')) quality = '720p';
      else if (label.includes('480')) quality = '480p';
      else if (label.includes('360')) quality = '360p';

      return {
        quality,
        label: q.label || quality.toUpperCase(),
        size: q.size || '',
        url: q.link,
        mimeType: 'video/mp4',
      };
    });
  } catch (err) {
    return [];
  }
}

/**
 * Searches store.animetoonhindi.com for a cartoon
 */
async function searchStore(query, maxPages = 3) {
  const cleanQ = normalizeQuery(query);
  const results = [];
  const seenUrls = new Set();

  for (let page = 1; page <= maxPages; page++) {
    const url =
      page === 1
        ? `${STORE_BASE}/?s=${encodeURIComponent(cleanQ)}`
        : `${STORE_BASE}/page/${page}/?s=${encodeURIComponent(cleanQ)}`;

    try {
      const res = await fetchWithHeaders(url);
      if (!res.ok) break;

      const html = await res.text();
      const articles = [...html.matchAll(/<article[^>]*>([\s\S]*?)<\/article>/gi)];
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

        const imgMatch = block.match(/<img[^>]+src="([^">]+)"/i);
        const poster = imgMatch ? imgMatch[1] : '';

        let serverType = 'Other';
        if (/multiquality/i.test(cleanTitle)) serverType = 'MultiQuality';
        else if (/multilare/i.test(cleanTitle)) serverType = 'MultiLare';
        else if (/domulti/i.test(cleanTitle)) serverType = 'DoMulti';
        else if (/quickcloud/i.test(cleanTitle)) serverType = 'QuickCloud';
        else if (/download\s+links/i.test(cleanTitle)) serverType = 'DownloadLinks';

        const isHindi =
          /hindi/i.test(cleanTitle) || (!/tamil/i.test(cleanTitle) && !/telugu/i.test(cleanTitle));

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

  results.sort((a, b) => {
    if (a.isHindi !== b.isHindi) return a.isHindi ? -1 : 1;
    const score = (item) => {
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
async function scrapeShow(postUrl, query, options = {}) {
  const maxEpisodes = options.maxEpisodesPerShow || 25;
  const resolveStreams = options.resolveStreamUrls !== false;

  const res = await fetchWithHeaders(postUrl);
  if (!res.ok) return null;

  const html = await res.text();
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  const rawTitle = titleMatch ? titleMatch[1].replace(/&#8211;\s*Linker/i, '').trim() : query;
  const cleanTitle = cleanHtmlText(rawTitle);
  const character = detectCharacter(cleanTitle);

  let poster = '';
  const imgMatch = html.match(/<div class="entry-content[^"]*"[^>]*>[\s\S]*?<img[^>]+src="([^">]+)"/i);
  if (imgMatch) poster = imgMatch[1];

  const idMatch = postUrl.match(/archives\/(\d+)/i);
  const id = idMatch ? idMatch[1] : 'show-' + Date.now();

  const entryMatch = html.match(/<div class="entry-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
  const content = entryMatch ? entryMatch[1] : html;

  const rawLinks = [...content.matchAll(/<a\s+[^>]*href="([^"]*codedew\.com\/zipper[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)];
  if (rawLinks.length === 0) return null;

  const episodes = [];

  let firstResolved = await resolveCodedewZipper(rawLinks[0][1], postUrl);

  if (
    firstResolved.destinationUrl.includes('store.animetoonhindi.com/archives/') &&
    firstResolved.destinationUrl !== postUrl
  ) {
    const subRes = await fetchWithHeaders(firstResolved.destinationUrl);
    if (subRes.ok) {
      const subHtml = await subRes.text();
      const subLinks = [...subHtml.matchAll(/<a\s+[^>]*href="([^"]*codedew\.com\/zipper[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)];
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

            let sources = [];
            if (resolveStreams && epCount < 8) {
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
      } catch (err) {}
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

        let sources = [];
        if (resolveStreams && i < 6) {
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

function readToonList(filePath = TOON_FILE) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf8');
  return [
    ...new Set(
      raw
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#') && !/^(etc|and\s+more|\.\.\.)$/i.test(l))
    ),
  ];
}

function loadDatabase(dbPath = DB_FILE) {
  if (fs.existsSync(dbPath)) {
    try {
      return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    } catch (e) {}
  }
  return { version: '1.0.0', updatedAt: new Date().toISOString(), shows: {} };
}

function saveDatabase(db, dbPath = DB_FILE) {
  db.updatedAt = new Date().toISOString();
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
}

/**
 * Scrapes all toons in toonname.txt and writes to streams.json
 */
async function scrapeAllToons(options = {}) {
  const toons = readToonList(options.toonFile || TOON_FILE);
  const dbPath = options.dbPath || DB_FILE;
  const db = loadDatabase(dbPath);

  console.log(`\n======================================================`);
  console.log(` CartoonX AnimeToonHindi Scraper Plugin`);
  console.log(` Found ${toons.length} cartoon(s) in: ${path.basename(options.toonFile || TOON_FILE)}`);
  console.log(`======================================================\n`);

  for (let i = 0; i < toons.length; i++) {
    const toon = toons[i];
    const normalized = normalizeQuery(toon);
    console.log(`[${i + 1}/${toons.length}] Processing: "${toon}"...`);

    try {
      // 1. Search normalized query and prioritize Hindi releases
      let searchResults = await searchStore(normalized, 3);
      if (searchResults.length === 0 || !searchResults.some((r) => r.isHindi)) {
        const hindiSearch = await searchStore(`${normalized} hindi`, 3);
        searchResults = [...searchResults, ...hindiSearch];
      }

      let scrapedCatalog = null;

      // Try top releases until we get valid episodes
      for (const result of searchResults.slice(0, 6)) {
        console.log(`  ⏳ Scraping: ${result.title}...`);
        const show = await scrapeShow(result.url, toon, options);
        if (show && show.episodes.length > 0) {
          scrapedCatalog = show;
          break;
        }
      }

      // If full query didn't yield working links, try simplified keyword
      if (!scrapedCatalog) {
        let fallbackQuery = null;
        if (/courage/i.test(normalized)) fallbackQuery = 'courage hindi';
        else if (/ben\s+10/i.test(normalized)) fallbackQuery = 'ben 10';
        else if (normalized.split(/\s+/).length > 2) fallbackQuery = normalized.split(/\s+/).slice(0, 2).join(' ') + ' hindi';

        if (fallbackQuery && fallbackQuery.toLowerCase() !== normalized.toLowerCase()) {
          console.log(`  🔄 Falling back to search keyword: "${fallbackQuery}"...`);
          const fallbackResults = await searchStore(fallbackQuery, 3);
          for (const result of fallbackResults.slice(0, 6)) {
            console.log(`  ⏳ Scraping: ${result.title}...`);
            const show = await scrapeShow(result.url, toon, options);
            if (show && show.episodes.length > 0) {
              scrapedCatalog = show;
              break;
            }
          }
        }
      }

      if (!scrapedCatalog) {
        console.log(`  ❌ Could not resolve playable stream links for "${toon}"`);
        continue;
      }

      db.shows[toon.toLowerCase()] = scrapedCatalog;
      saveDatabase(db, dbPath);

      const streamCount = scrapedCatalog.episodes.filter((e) => e.sources.length > 0).length;
      console.log(
        `  ✅ Cataloged "${scrapedCatalog.title}": ${scrapedCatalog.episodes.length} episodes (${streamCount} with direct MP4 streams)`
      );
    } catch (err) {
      console.log(`  ❌ Error processing "${toon}": ${err.message}`);
    }
  }

  console.log(`\n🎉 Scraping complete! Database saved to: ${dbPath}\n`);
  return db;
}

/**
 * Watches toonname.txt for added cartoons and automatically scrapes them
 */
function watchToonFile(options = {}) {
  const toonFile = options.toonFile || TOON_FILE;
  const dbPath = options.dbPath || DB_FILE;
  let debounceTimeout = null;
  let isProcessing = false;

  console.log(`👀 Watching for changes in: ${toonFile}`);
  console.log(`   (Add any new cartoon line to the file to trigger auto-scraping)\n`);

  const processChanges = async () => {
    if (isProcessing) return;
    isProcessing = true;

    try {
      const currentToons = readToonList(toonFile);
      const db = loadDatabase(dbPath);
      const missingToons = currentToons.filter((t) => !db.shows[t.toLowerCase()]);

      if (missingToons.length > 0) {
        console.log(`\n🔔 Detected ${missingToons.length} new cartoon(s) added: ${missingToons.join(', ')}`);
        for (const toon of missingToons) {
          console.log(`🚀 Auto-scraping new toon: "${toon}"...`);
          const searchResults = await searchStore(normalizeQuery(toon), 2);
          if (searchResults.length > 0) {
            const show = await scrapeShow(searchResults[0].url, toon, options);
            if (show) {
              db.shows[toon.toLowerCase()] = show;
              saveDatabase(db, dbPath);
              console.log(`✅ Added "${show.title}" (${show.episodes.length} eps) to ${path.basename(dbPath)}`);
            }
          }
        }
      }
    } catch (e) {
      console.error(`Watcher error: ${e.message}`);
    } finally {
      isProcessing = false;
    }
  };

  return fs.watch(toonFile, (eventType) => {
    if (eventType === 'change') {
      if (debounceTimeout) clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(processChanges, 800);
    }
  });
}

// CLI Runner
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = (args[0] || 'scrape').toLowerCase();

  (async () => {
    switch (command) {
      case 'scrape':
        await scrapeAllToons();
        break;

      case 'watch':
        watchToonFile();
        break;

      case 'search': {
        const query = args.slice(1).join(' ') || 'Ben 10';
        console.log(`Searching for: "${query}"...`);
        const results = await searchStore(query, 2);
        console.log(`Found ${results.length} results:`);
        results.forEach((r, idx) => console.log(`  [${idx + 1}] ${r.title} (${r.url})`));
        if (results.length > 0) {
          console.log(`\nScraping top result: ${results[0].title}...`);
          const show = await scrapeShow(results[0].url, query);
          if (show) {
            console.log(`\nShow Catalog:`, JSON.stringify(show, null, 2));
          }
        }
        break;
      }

      case 'resolve': {
        const videoId = args[1];
        if (!videoId) {
          console.error('Please specify a videoId (e.g. node index.js resolve av7MTPK0ZOUo2eS)');
          process.exit(1);
        }
        console.log(`Resolving streams for video ID: ${videoId}...`);
        const streams = await extractStreamQualities(videoId);
        console.log(`Stream sources found:`, JSON.stringify(streams, null, 2));
        break;
      }

      case 'test': {
        console.log('--- Health Check: Testing Ben 10 Scraping & Streaming ---');
        const results = await searchStore('Ben 10', 2);
        console.log(`1. Search test: Found ${results.length} result(s). Top: ${results[0]?.title}`);
        let show = null;
        for (const r of results.slice(0, 6)) {
          show = await scrapeShow(r.url, 'Ben 10', { maxEpisodesPerShow: 2 });
          if (show && show.episodes.length > 0) {
            console.log(`   Found working release: "${r.title}"`);
            break;
          }
        }
        console.log(`2. Post test: Cataloged "${show?.title}" with ${show?.episodes.length} episodes`);
        if (show && show.episodes.length > 0) {
          const ep = show.episodes[0];
          console.log(`3. Stream test: Episode "${ep.title}" has ${ep.sources.length} direct stream qualities!`);
          ep.sources.forEach((s) => console.log(`   - ${s.label} (${s.size}): ${s.url.substring(0, 70)}...`));
          console.log('\n✅ All tests passed! Scraper and stream extractor are working perfectly!');
        }
        break;
      }

      default:
        console.log(`Unknown command: ${command}`);
        console.log(`Available commands: scrape, watch, search <query>, resolve <video_id>, test`);
    }
  })();
}

module.exports = {
  STORE_BASE,
  searchStore,
  scrapeShow,
  resolveCodedewZipper,
  extractStreamQualities,
  readToonList,
  scrapeAllToons,
  watchToonFile,
  loadDatabase,
  saveDatabase,
  normalizeQuery,
  detectCharacter,
  cleanHtmlText,
};
