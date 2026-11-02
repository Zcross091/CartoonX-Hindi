import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

test('AES-256-GCM stream decryptor algorithm', async (t) => {
  // Test with actual live video ID
  const videoCode = '62chy0gez3px';
  const url = `https://bysekoze.com/api/videos/${videoCode}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
      'Referer': `https://bysekoze.com/e/${videoCode}`,
      'Accept': 'application/json'
    }
  });

  assert.equal(res.status, 200, 'Video metadata should return 200');
  const data = await res.json();
  const playback = data.playback;
  assert.ok(playback, 'Playback object should exist');
  assert.equal(playback.algorithm, 'AES-256-GCM', 'Algorithm should be AES-256-GCM');

  const b64urlDecode = (str) => {
    let s = str.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4 !== 0) s += '=';
    return Buffer.from(s, 'base64');
  };

  const v = parseInt(playback.version, 10);
  const part1 = b64urlDecode(playback.key_parts[v - 1]);
  const part2 = b64urlDecode(playback.key_parts[31 - v - 1]);
  const key = Buffer.concat([part1, part2]);

  assert.equal(key.length, 32, 'AES-256 key must be 32 bytes');

  const iv = b64urlDecode(playback.iv);
  const rawPayload = b64urlDecode(playback.payload);
  const authTag = rawPayload.subarray(rawPayload.length - 16);
  const ciphertext = rawPayload.subarray(0, rawPayload.length - 16);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

  const streamInfo = JSON.parse(decrypted.toString('utf8'));
  assert.ok(Array.isArray(streamInfo.sources), 'Sources must be an array');
  assert.ok(streamInfo.sources.length > 0, 'At least one stream source must exist');
  assert.ok(streamInfo.sources[0].url.includes('.m3u8'), 'Source URL should be an HLS m3u8 playlist');
});

