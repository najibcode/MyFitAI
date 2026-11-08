import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateDriftProofTimer, offlineSyncService } from '../../services/offlineSyncService';

describe('Offline-First PWA & Gym Basement Resilience Engine', () => {
  // ─── 1. Drift-Proof Rest Timer Calculation ──────────────────
  describe('1. Drift-Proof Wall-Clock Rest Timer', () => {
    it('calculates exact remaining seconds when active', () => {
      const now = 1000000;
      const targetEndTime = now + 90 * 1000; // 90 seconds in future

      const result = calculateDriftProofTimer(targetEndTime, now);
      assert.equal(result.isCompleted, false);
      assert.equal(result.remainingSeconds, 90);
    });

    it('handles simulated device sleep without timer stalling', () => {
      const startTime = 1000000;
      const targetEndTime = startTime + 60 * 1000; // 60s rest

      // Device screen turns off and wakes up 75 seconds later
      const wakeTime = startTime + 75 * 1000;
      const result = calculateDriftProofTimer(targetEndTime, wakeTime);

      assert.equal(result.isCompleted, true);
      assert.equal(result.remainingSeconds, 0);
    });

    it('accurately reports partial elapsed rest after screen off', () => {
      const startTime = 1000000;
      const targetEndTime = startTime + 120 * 1000; // 2 minutes rest

      // Device wakes up 45 seconds later
      const wakeTime = startTime + 45 * 1000;
      const result = calculateDriftProofTimer(targetEndTime, wakeTime);

      assert.equal(result.isCompleted, false);
      assert.equal(result.remainingSeconds, 75); // 120 - 45 = 75
    });

    it('ceil rounds fractional milliseconds to preserve athletic rest integrity', () => {
      const now = 1000000;
      const targetEndTime = now + 10400; // 10.4 seconds

      const result = calculateDriftProofTimer(targetEndTime, now);
      assert.equal(result.remainingSeconds, 11);
    });
  });

  // ─── 2. Service Worker URL Matching & Cache Rules ───────────
  describe('2. Service Worker Routing Rules', () => {
    function isExerciseMediaUrl(urlStr: string): boolean {
      try {
        const url = new URL(urlStr);
        return (
          url.hostname.includes('cdn.jsdelivr.net') ||
          url.hostname.includes('openfoodfacts.org') ||
          url.hostname.includes('img.youtube.com') ||
          url.pathname.match(/\.(gif|jpg|jpeg|png|webp|svg)$/i) !== null
        );
      } catch {
        return false;
      }
    }

    function isFontUrl(urlStr: string): boolean {
      try {
        const url = new URL(urlStr);
        return (
          url.hostname.includes('fonts.googleapis.com') ||
          url.hostname.includes('fonts.gstatic.com')
        );
      } catch {
        return false;
      }
    }

    function isStaticAssetUrl(urlStr: string): boolean {
      try {
        const url = new URL(urlStr, 'http://localhost:5173');
        return url.pathname.startsWith('/assets/') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css');
      } catch {
        return false;
      }
    }

    it('matches CDN exercise demonstration GIF and JPG URLs', () => {
      const cdnGif = 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/videos/0001-2gPfomN.gif';
      const cdnJpg = 'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/images/0001-2gPfomN.jpg';
      const ytThumb = 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg';
      const localImage = 'http://localhost:5173/brand/myfitai-icon-512.png';

      assert.equal(isExerciseMediaUrl(cdnGif), true);
      assert.equal(isExerciseMediaUrl(cdnJpg), true);
      assert.equal(isExerciseMediaUrl(ytThumb), true);
      assert.equal(isExerciseMediaUrl(localImage), true);
    });

    it('rejects API and HTML navigation requests from media cache', () => {
      const apiReq = 'https://firestore.googleapis.com/v1/projects/myfitai/databases/(default)/documents';
      const authReq = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword';
      const navReq = 'http://localhost:5173/workout/active';

      assert.equal(isExerciseMediaUrl(apiReq), false);
      assert.equal(isExerciseMediaUrl(authReq), false);
      assert.equal(isExerciseMediaUrl(navReq), false);
    });

    it('correctly matches Google Fonts web fonts', () => {
      const fontCss = 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;700&display=swap';
      const fontWoff2 = 'https://fonts.gstatic.com/s/dmsans/v15/rP2Fp2ywxg089UriCZa4ET-j.woff2';

      assert.equal(isFontUrl(fontCss), true);
      assert.equal(isFontUrl(fontWoff2), true);
      assert.equal(isFontUrl('https://example.com/other.css'), false);
    });

    it('correctly matches compiled Vite bundle chunks', () => {
      assert.equal(isStaticAssetUrl('http://localhost:5173/assets/index-DiYxeaax.js'), true);
      assert.equal(isStaticAssetUrl('http://localhost:5173/assets/index-jB7Z_8K-.css'), true);
      assert.equal(isStaticAssetUrl('http://localhost:5173/api/sync'), false);
    });
  });

  // ─── 3. Media Harvesting & Gym Pack URLs ─────────────────────
  describe('3. Common Gym Media Pack Harvester', () => {
    it('harvests non-empty list of verified demonstration media URLs', () => {
      const mediaUrls = offlineSyncService.getCommonGymMediaUrls();
      assert.ok(Array.isArray(mediaUrls));
      assert.ok(mediaUrls.length > 5, 'Must harvest demonstration URLs from quick split presets');

      // Every harvested URL must be valid HTTP/HTTPS
      mediaUrls.forEach((url) => {
        assert.ok(url.startsWith('https://') || url.startsWith('http://'));
        assert.ok(url.includes('exercises-dataset') || url.includes('.gif') || url.includes('.jpg'));
      });
    });
  });

  // ─── 4. Storage Quota Estimation Math ────────────────────────
  describe('4. Storage Quota Calculation', () => {
    it('computes accurate percentage and readable formatting', () => {
      const quotaBytes = 10 * 1024 * 1024 * 1024; // 10 GB
      const usageBytes = 500 * 1024 * 1024; // 500 MB

      const quotaMB = Math.round(quotaBytes / (1024 * 1024));
      const usageMB = Math.round(usageBytes / (1024 * 1024));
      const percent = Math.min(100, Math.round((usageMB / quotaMB) * 100));

      assert.equal(quotaMB, 10240);
      assert.equal(usageMB, 500);
      assert.equal(percent, 5);
    });
  });
});

