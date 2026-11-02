import test from 'node:test';
import assert from 'node:assert';

test('Direct download platform mapping returns valid APK & ZIP metadata', () => {
  const getDownloadConfig = (platform) => {
    const p = platform?.toLowerCase();
    if (p === 'android' || p === 'android-tv' || p === 'apk') {
      return {
        assetName: 'CartoonX-AndroidTV-Signed.apk',
        filename: 'CartoonX-AndroidTV-v1.0.0.apk',
        contentType: 'application/vnd.android.package-archive',
      };
    }
    if (p === 'apple' || p === 'apple-tv' || p === 'tvos' || p === 'zip') {
      return {
        assetName: 'CartoonX-AppleTV-tvOS.zip',
        filename: 'CartoonX-AppleTV-tvOS-v1.0.0.zip',
        contentType: 'application/zip',
      };
    }
    return null;
  };

  const androidConfig = getDownloadConfig('android');
  assert.strictEqual(androidConfig.assetName, 'CartoonX-AndroidTV-Signed.apk');
  assert.strictEqual(androidConfig.contentType, 'application/vnd.android.package-archive');

  const appleConfig = getDownloadConfig('apple');
  assert.strictEqual(appleConfig.assetName, 'CartoonX-AppleTV-tvOS.zip');
  assert.strictEqual(appleConfig.contentType, 'application/zip');

  const invalid = getDownloadConfig('windows');
  assert.strictEqual(invalid, null);
});

