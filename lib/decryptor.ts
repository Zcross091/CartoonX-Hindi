import crypto from 'crypto';

export interface StreamSource {
  quality: string;
  label: string;
  mime_type: string;
  url: string;
  bitrate_kbps?: number;
  height?: number;
  size_bytes?: number;
}

export interface DecryptedStreamResult {
  sources: StreamSource[];
  tracks: Array<{
    language?: string;
    title?: string;
    url?: string;
    kind?: string;
  }>;
  poster_url?: string;
  duration?: number;
  title?: string;
}

/**
 * Decrypts AES-256-GCM playback payload from Rare Toon India's video hosts
 * (bysekoze.com, filemoon, etc.) to extract raw 1080p/720p HLS master playlist URLs.
 */
export async function resolveStreamSources(videoCode: string): Promise<DecryptedStreamResult> {
  const metaUrl = `https://bysekoze.com/api/videos/${videoCode}`;
  
  const res = await fetch(metaUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': `https://bysekoze.com/e/${videoCode}`,
      'Accept': 'application/json, text/plain, */*'
    }
  });

  if (!res.ok) {
    throw new Error(`Video host responded with HTTP status ${res.status}`);
  }

  const data = await res.json();
  const playback = data.playback;

  if (!playback || !playback.key_parts || !playback.iv || !playback.payload) {
    throw new Error('Playback payload is missing or not encrypted properly');
  }

  const b64urlDecode = (str: string): Buffer => {
    let s = str.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4 !== 0) s += '=';
    return Buffer.from(s, 'base64');
  };

  const v = parseInt(playback.version, 10);
  if (isNaN(v) || v < 1 || v > 30) {
    throw new Error(`Unsupported playback encryption version: ${playback.version}`);
  }

  // Key assembly algorithm: part at index (v - 1) and index (31 - v - 1)
  const part1 = b64urlDecode(playback.key_parts[v - 1]);
  const part2 = b64urlDecode(playback.key_parts[31 - v - 1]);
  const key = Buffer.concat([part1, part2]);

  if (key.length !== 32) {
    throw new Error(`Invalid AES-256 key length: ${key.length} bytes (expected 32)`);
  }

  const iv = b64urlDecode(playback.iv);
  const rawPayload = b64urlDecode(playback.payload);

  // In AES-256-GCM, the last 16 bytes are the authentication tag
  const authTag = rawPayload.subarray(rawPayload.length - 16);
  const ciphertext = rawPayload.subarray(0, rawPayload.length - 16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  const streamInfo = JSON.parse(decrypted.toString('utf8'));

  return {
    sources: streamInfo.sources || [],
    tracks: streamInfo.tracks || [],
    poster_url: data.poster_url || streamInfo.poster_url,
    duration: data.duration_seconds || 0,
    title: data.title || ''
  };
}

