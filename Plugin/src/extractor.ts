/**
 * Direct MP4 Stream Link Extractor (Razorshell / JuicyCodes)
 */

import { QualityOption } from './types';
import { fetchWithHeaders } from './resolver';

export async function extractStreamQualities(videoId: string): Promise<QualityOption[]> {
  if (!videoId || typeof videoId !== 'string') return [];

  const downleadUrl = `https://argon.razorshell.space/downlead/${encodeURIComponent(videoId)}/`;

  try {
    const res = await fetchWithHeaders(downleadUrl, {
      headers: {
        Referer: 'https://codedew.com/cdn/liptron.php/',
      },
    });

    if (!res.ok) {
      return [];
    }

    const html = await res.text();

    // Extract juicyData configuration
    const dataMatch = html.match(/window\.juicyData\s*=\s*(\{[\s\S]*?\})(?:;|\s*<\/script>)/);
    if (!dataMatch) {
      return [];
    }

    const juicy = JSON.parse(dataMatch[1]);
    const token = juicy.data?.token;
    const linksRoute = juicy.data?.routes?.links;

    if (!token || !linksRoute) {
      return [];
    }

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

    if (!apiRes.ok) {
      return [];
    }

    const data = await apiRes.json();
    if (!data.success || !Array.isArray(data.qualities)) {
      return [];
    }

    const qualities: QualityOption[] = [];
    for (const q of data.qualities) {
      const label = (q.label || '').toUpperCase();
      let quality: '360p' | '480p' | '720p' | '1080p' = '720p';
      if (label.includes('1080')) quality = '1080p';
      else if (label.includes('720')) quality = '720p';
      else if (label.includes('480')) quality = '480p';
      else if (label.includes('360')) quality = '360p';

      qualities.push({
        quality,
        label: q.label || quality.toUpperCase(),
        size: q.size || '',
        url: q.link,
        mimeType: 'video/mp4',
      });
    }

    return qualities;
  } catch (err) {
    return [];
  }
}

