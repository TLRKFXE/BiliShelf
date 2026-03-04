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
} from '../utils/bili-action-sync.js';

test('content script matches include favorites pages for Bilibili->local action sync', () => {
  assert.ok(CONTENT_SCRIPT_MATCHES.includes('https://space.bilibili.com/*/favlist*'));
  assert.ok(CONTENT_SCRIPT_MATCHES.includes('https://www.bilibili.com/list/ml*'));
});

test('collector UI only runs on video/watchlater pages', () => {
  assert.equal(isCollectorUiUrl('https://www.bilibili.com/video/BV1xx411c7mD'), true);
  assert.equal(isCollectorUiUrl('https://www.bilibili.com/list/watchlater?bvid=BV1xx411c7mD'), true);
  assert.equal(isCollectorUiUrl('https://space.bilibili.com/123/favlist'), false);
});

test('action sync page detection covers favorites pages', () => {
  assert.equal(isActionSyncPageUrl('https://www.bilibili.com/video/BV1xx411c7mD'), true);
  assert.equal(isActionSyncPageUrl('https://space.bilibili.com/123/favlist?fid=456'), true);
  assert.equal(isActionSyncPageUrl('https://www.bilibili.com/list/ml123456'), true);
});

test('bvid parser is case-insensitive and preserves BV + suffix case', () => {
  assert.equal(normalizeBvidToken('bv1ab411c7md'), 'BV1ab411c7md');
  assert.equal(extractBvidFromAny('/video/bV1ab411c7md?p=2'), 'BV1ab411c7md');
  assert.equal(extractBvidFromAny('https://www.bilibili.com/video/BV1xx411c7mD'), 'BV1xx411c7mD');
  assert.equal(extractBvidFromAny('no-bvid-here'), '');
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
