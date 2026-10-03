import test from 'node:test';
import assert from 'node:assert/strict';

import { CONTENT_SCRIPT_MATCHES } from '../shared/content-matches.js';
import {
  containsFavoriteActionKeyword,
  extractFavoriteFolderIdFromUrl,
  isActionSyncPageUrl,
  isCollectorUiUrl,
  normalizeBvidToken,
  extractBvidFromAny,
  extractAidFromAny,
  extractBangumiSeasonId,
  extractAudioId,
  isSpecialMediaUrl,
} from '../utils/bili-action-sync.js';

test('content script matches include favorites pages for Bilibili->local action sync', () => {
  assert.ok(CONTENT_SCRIPT_MATCHES.includes('https://space.bilibili.com/*/favlist*'));
  assert.ok(CONTENT_SCRIPT_MATCHES.includes('https://www.bilibili.com/list/ml*'));
});

test('content script matches special media pages', () => {
  assert.ok(CONTENT_SCRIPT_MATCHES.includes('https://www.bilibili.com/bangumi/play/*'));
  assert.ok(CONTENT_SCRIPT_MATCHES.includes('https://www.bilibili.com/audio/*'));
  assert.ok(CONTENT_SCRIPT_MATCHES.includes('https://bilibili.com/bangumi/play/*'));
  assert.ok(CONTENT_SCRIPT_MATCHES.includes('https://bilibili.com/audio/*'));
});

test('collector UI supports video, Bangumi, and audio pages', () => {
  assert.equal(isCollectorUiUrl('https://www.bilibili.com/video/BV1xx411c7mD'), true);
  assert.equal(isCollectorUiUrl('https://www.bilibili.com/list/watchlater?bvid=BV1xx411c7mD'), true);
  assert.equal(isCollectorUiUrl('https://www.bilibili.com/video/av412935552'), true);
  assert.equal(isCollectorUiUrl('https://www.bilibili.com/list/ml47438371?oid=1&bvid=BV1xx411c7mD'), true);
  assert.equal(isCollectorUiUrl('https://t.bilibili.com/123456789'), true);
  assert.equal(isCollectorUiUrl('https://www.bilibili.com/bangumi/play/ss123'), true);
  assert.equal(isCollectorUiUrl('https://www.bilibili.com/audio/au456'), true);
  assert.equal(isCollectorUiUrl('https://bilibili.com/audio/au456'), true);
  assert.equal(isCollectorUiUrl('https://space.bilibili.com/123/favlist'), false);
});

test('action sync page detection covers favorites pages', () => {
  assert.equal(isActionSyncPageUrl('https://www.bilibili.com/video/BV1xx411c7mD'), true);
  assert.equal(isActionSyncPageUrl('https://bilibili.com/video/BV1xx411c7mD'), true);
  assert.equal(isActionSyncPageUrl('https://space.bilibili.com/123/favlist?fid=456'), true);
  assert.equal(isActionSyncPageUrl('https://www.bilibili.com/list/ml123456'), true);
  assert.equal(isActionSyncPageUrl('https://www.bilibili.com/read/cv328714'), true);
  assert.equal(isActionSyncPageUrl('https://www.bilibili.com/bangumi/play/ss123'), true);
  assert.equal(isActionSyncPageUrl('https://www.bilibili.com/audio/au456'), true);
  assert.equal(isActionSyncPageUrl('https://bilibili.com/audio/au456'), true);
});

test('special media URL parsers return stable identifiers', () => {
  assert.equal(extractBangumiSeasonId('https://www.bilibili.com/bangumi/play/ss123?from_spmid=1'), 'ss123');
  assert.equal(extractBangumiSeasonId('https://www.bilibili.com/video/BV1xx411c7mD'), '');
  assert.equal(extractAudioId('https://www.bilibili.com/audio/au456'), 'au456');
  assert.equal(extractAudioId('https://www.bilibili.com/audio/au456/'), 'au456');
  assert.equal(isSpecialMediaUrl('https://www.bilibili.com/bangumi/play/ss123'), true);
  assert.equal(isSpecialMediaUrl('https://www.bilibili.com/audio/au456'), true);
  assert.equal(isSpecialMediaUrl('https://www.bilibili.com/video/BV1xx411c7mD'), false);
});

test('bvid parser is case-insensitive and preserves BV + suffix case', () => {
  assert.equal(normalizeBvidToken('bv1ab411c7md'), 'BV1ab411c7md');
  assert.equal(extractBvidFromAny('/video/bV1ab411c7md?p=2'), 'BV1ab411c7md');
  assert.equal(extractBvidFromAny('https://www.bilibili.com/video/BV1xx411c7mD'), 'BV1xx411c7mD');
  assert.equal(extractBvidFromAny('no-bvid-here'), '');
  assert.equal(extractAidFromAny('https://www.bilibili.com/video/av412935552'), 412935552);
  assert.equal(extractAidFromAny('https://www.bilibili.com/list/ml47438371?oid=412935552'), 412935552);
});

test('favorite folder id parser supports space/favlist and list/ml urls', () => {
  assert.equal(extractFavoriteFolderIdFromUrl('https://space.bilibili.com/1/favlist?fid=999'), 999);
  assert.equal(extractFavoriteFolderIdFromUrl('https://space.bilibili.com/1/favlist?media_id=888'), 888);
  assert.equal(extractFavoriteFolderIdFromUrl('https://www.bilibili.com/list/ml777777'), 777777);
  assert.equal(extractFavoriteFolderIdFromUrl('https://www.bilibili.com/video/BV1xx411c7mD'), 0);
});

test('favorite action keyword matcher handles zh/en actions and ignores folder noun', () => {
  assert.equal(containsFavoriteActionKeyword('收藏'), true);
  assert.equal(containsFavoriteActionKeyword('取消收藏'), true);
  assert.equal(containsFavoriteActionKeyword('移除'), true);
  assert.equal(containsFavoriteActionKeyword('复制到'), true);
  assert.equal(containsFavoriteActionKeyword('move to folder'), true);
  assert.equal(containsFavoriteActionKeyword('收藏夹'), false);
  assert.equal(containsFavoriteActionKeyword('我的收藏夹列表'), false);
});
