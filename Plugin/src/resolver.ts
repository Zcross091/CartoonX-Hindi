/**
 * Codedew Zipper Link Bypass & Video ID Resolver
 */

export interface ResolvedLink {
  destinationUrl: string;
  videoId?: string;
  isMultiQuality: boolean;
  html?: string;
}

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function isShortenerStep(html: string): boolean {
  return (
    html.includes('Scanning Link Safety') ||
    html.includes('Generating Secure Link') ||
    html.includes('Step 1 of 3') ||
    html.includes('Step 2 of 3')
  );
}

export async function fetchWithHeaders(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = {
    'User-Agent': DEFAULT_USER_AGENT,
    ...(options.headers || {}),
  };
  return fetch(url, { ...options, headers });
}

/**
 * Resolves a codedew zipper link (e.g., https://codedew.com/zipper/?url=...)
 * by automatically traversing the shortener redirection steps.
 */
export async function resolveCodedewZipper(
  initialUrl: string,
  referer = 'https://store.animetoonhindi.com/'
): Promise<ResolvedLink> {
  let res = await fetchWithHeaders(initialUrl, {
    headers: { Referer: referer },
  });

  let cookie = (res.headers.get('set-cookie') || '').split(';')[0];
  let html = await res.text();

  // If already at final destination
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

function parseFinalDestination(url: string, html: string): ResolvedLink {
  const isMultiQuality = url.includes('/multiquality/') || html.includes('relatedData');

  // Video ID detection strategies:
  // 1. From URL query: ?url=abc123xyz
  let videoIdMatch = url.match(/[?&]url=([a-zA-Z0-9]+)/i);
  let videoId = videoIdMatch ? videoIdMatch[1] : undefined;

  // 2. From iframe embed: /embed/abc123xyz
  if (!videoId) {
    const iframeMatch = html.match(/(?:razorshell\.space\/embed\/|embed\/)([a-zA-Z0-9]+)/i);
    if (iframeMatch) videoId = iframeMatch[1];
  }

  // 3. From JavaScript variables: let fid = "..." or window.juicyData.video = "..."
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

