# CartoonX AnimeToonHindi Plugin 🎬

A high-performance scraper and streaming resolver plugin for the **CartoonX** video player. This plugin scrapes cartoon releases from [store.animetoonhindi.com](https://store.animetoonhindi.com/), automatically resolves multi-step link shorteners (`codedew.com/zipper`), and extracts direct byte-range playable MP4 stream links (360p, 720p, 1080p) from Razorshell / JuicyCodes servers.

---

## 🚀 Features

- **Automated Toon List Processing**: Scrapes all cartoons listed in `toonname.txt` with smart typo-handling (e.g. `ben to alien force` ➔ `ben 10 alien force`).
- **Real-time File Watcher**: Watches `toonname.txt` continuously. Whenever you add a new cartoon line, it detects the change and automatically scrapes the new cartoon into `streams.json`!
- **Multi-Step Link Shortener Bypass**: Seamlessly bypasses `codedew.com/zipper` 3-step verification loops while maintaining session cookies and proper headers.
- **Direct Multi-Quality MP4 Streaming**: Connects directly to the video backend (`argon.razorshell.space` and `groovy.monster`) to provide raw MP4 video streams supporting HTTP 206 Partial Content and seeking across:
  - ⚡ `1080P FHD`
  - 📺 `720P HD`
  - 📱 `360P SD`
- **Zero-Dependency Core**: Built with modern native Node.js APIs (`fetch`, `crypto`, `fs`). No extra `npm install` required!
- **CartoonX Player Integration**: Includes TypeScript interfaces and a bridge module (`lib/animetoon.ts`) ready to plug into CartoonX's API routes (`/api/catalog`, `/api/show/[slug]`, `/api/stream/[code]`).

---

## 📁 Directory Structure

```text
Plugin/
├── toonname.txt       # The list of cartoon names to scrape
├── streams.json       # Generated persistent database of shows & stream links
├── index.js           # Self-contained Node.js CLI & library runner
├── package.json       # Package configuration & npm scripts
├── tsconfig.json      # TypeScript configuration
├── README.md          # Documentation
└── src/
    ├── index.ts       # Public TypeScript API export
    ├── scraper.ts     # Store search & post parser engine
    ├── resolver.ts    # Codedew zipper link bypass & shortener resolver
    ├── extractor.ts   # Razorshell direct MP4 stream extractor
    ├── toonWatcher.ts # Real-time toonname.txt watcher & batch scraper
    └── types.ts       # TypeScript type definitions
```

---

## 🛠️ Usage & Commands

### 1. Scrape all toons from `toonname.txt`
Reads all lines from `toonname.txt`, searches for the highest quality Hindi releases, resolves stream links, and saves them into `streams.json`:
```bash
node Plugin/index.js scrape
# or using npm
npm run scrape --prefix Plugin
```

### 2. Real-Time Watch Mode (Auto-Scrapes Added Toons)
Keeps running in the background and watches `toonname.txt`. As soon as you save a new cartoon in `toonname.txt`, it automatically scrapes it and appends it to `streams.json`:
```bash
node Plugin/index.js watch
```

### 3. Search and scrape an individual cartoon
```bash
node Plugin/index.js search "Ben 10"
node Plugin/index.js search "Doraemon"
```

### 4. Resolve direct stream links for any Video ID
```bash
node Plugin/index.js resolve av7MTPK0ZOUo2eS
```

### 5. Health Check Test
Verifies end-to-end connectivity with the store and streaming servers:
```bash
node Plugin/index.js test
```

---

## 📝 Configuring `toonname.txt`

Simply add cartoon names line by line in `Plugin/toonname.txt`:
```text
ben 10 classic
doraemon
shin chan
courage the cowardly dog
ben 10 alien force
ben 10 ultimate alien
oggy and the cockroaches
motu patlu
slugterra
pokemon
naruto
```
> Lines starting with `#` or empty lines are ignored. Placeholders like `etc` are automatically filtered out.

---

## 🧩 Programmatic Integration with CartoonX

Import the plugin into your Next.js application or backend service:

```typescript
import { AnimeToonPlugin, extractStreamQualities } from './Plugin/src';

const plugin = new AnimeToonPlugin({
  toonFilePath: './Plugin/toonname.txt',
  dbPath: './Plugin/streams.json'
});

// 1. Search cartoons
const results = await plugin.search('Ben 10');

// 2. Scrape full show catalog
const show = await plugin.getShow(results[0].url);

// 3. Resolve direct MP4 stream qualities
const qualities = await plugin.resolveStreams(show.episodes[0].videoId);
// Returns:
// [
//   { quality: '1080p', label: '1080P FHD', size: '273.09 MB', url: 'https://...', mimeType: 'video/mp4' },
//   { quality: '720p', label: '720P HD', size: '123.03 MB', url: 'https://...', mimeType: 'video/mp4' },
//   { quality: '360p', label: '360P SD', size: '60.15 MB', url: 'https://...', mimeType: 'video/mp4' }
// ]
```

---

## 📊 Database Output Format (`streams.json`)

The output database contains structured show metadata with episode details and direct stream links:

```json
{
  "version": "1.0.0",
  "updatedAt": "2026-11-03T18:45:00.000Z",
  "shows": {
    "doraemon": {
      "id": "16591",
      "title": "Doraemon Season 20 Episodes Hindi MultiQuality",
      "character": "Doraemon",
      "poster": "https://image.tmdb.org/t/p/w500/...",
      "totalEpisodes": 25,
      "episodes": [
        {
          "id": "k2tUjmwf8QjIZXZ-1-1",
          "episodeNumber": 1,
          "seasonNumber": 1,
          "title": "S1E1 - Episode 1",
          "videoId": "k2tUjmwf8QjIZXZ",
          "watchUrl": "https://argon.razorshell.space/embed/k2tUjmwf8QjIZXZ",
          "downloadUrl": "https://argon.razorshell.space/downlead/k2tUjmwf8QjIZXZ/",
          "sources": [
            {
              "quality": "720p",
              "label": "720P HD",
              "size": "116.31 MB",
              "url": "https://wfbrcpgcgcwjrqh.groovy.monster/download/...",
              "mimeType": "video/mp4"
            }
          ]
        }
      ]
    }
  }
}
```

