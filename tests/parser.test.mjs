import test from 'node:test';
import assert from 'node:assert/strict';

function parseEpisodes(html, showTitle) {
  const episodes = [];
  const episodeBlocks = html.split(/(?:Episode\s*\d+|EP\s*\d+)/i);
  const epHeaders = html.match(/(?:Episode\s*\d+|EP\s*\d+)[^<]*/gi) || [];

  if (epHeaders.length > 0 && episodeBlocks.length > 1) {
    for (let i = 0; i < epHeaders.length; i++) {
      const headerText = epHeaders[i].trim();
      const block = episodeBlocks[i + 1] || '';
      const codeMatch = block.match(/(?:bysekoze\.com|filemoon\.(?:in|sx|to)|vidhide[^/]*|streamwish[^/]*)\/(?:d|e|download)\/([a-zA-Z0-9]+)/i);
      if (codeMatch && codeMatch[1]) {
        const code = codeMatch[1];
        const numMatch = headerText.match(/\d+/);
        const epNum = numMatch ? parseInt(numMatch[0], 10) : i + 1;
        episodes.push({
          episodeNumber: epNum,
          title: headerText,
          videoCode: code
        });
      }
    }
  }
  return episodes;
}

test('Episode HTML parser extracts episodes correctly', (t) => {
  const sampleHtml = `
    <p><strong>Episode 01 – The First Adventure</strong></p>
    <p><a href="https://bysekoze.com/d/abc123code">QuickWatch</a> | <a href="https://bysekoze.com/download/abc123code">Download</a></p>
    <p><strong>Episode 02 – Gadget Madness</strong></p>
    <p><a href="https://bysekoze.com/d/xyz789code">QuickWatch</a> | <a href="https://bysekoze.com/download/xyz789code">Download</a></p>
  `;

  const episodes = parseEpisodes(sampleHtml, 'Doraemon Season 1');
  assert.equal(episodes.length, 2, 'Should extract 2 episodes');
  assert.equal(episodes[0].episodeNumber, 1);
  assert.equal(episodes[0].videoCode, 'abc123code');
  assert.equal(episodes[1].episodeNumber, 2);
  assert.equal(episodes[1].videoCode, 'xyz789code');
});

