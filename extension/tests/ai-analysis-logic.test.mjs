import test from "node:test";
import assert from "node:assert/strict";

import { buildFolderAnalysisInput } from "../shared/ai-analysis.js";

test("buildFolderAnalysisInput uses selected folder videos only", () => {
  const input = buildFolderAnalysisInput(
    {
      folders: [
        { id: 3, name: "Watch Later", description: "", deletedAt: null },
        { id: 9, name: "Other", description: "", deletedAt: null },
      ],
      videos: [
        {
          id: 11,
          title: "Live set",
          uploader: "TLRK",
          description: "concert recording",
          publishAt: 100,
          deletedAt: null,
        },
        {
          id: 12,
          title: "Studio cut",
          uploader: "TLRK",
          description: "album version",
          publishAt: 101,
          deletedAt: null,
        },
        {
          id: 13,
          title: "Other folder video",
          uploader: "Else",
          description: "elsewhere",
          publishAt: 102,
          deletedAt: null,
        },
      ],
      folderItems: [
        { folderId: 3, videoId: 11, addedAt: 1 },
        { folderId: 3, videoId: 12, addedAt: 2 },
        { folderId: 9, videoId: 13, addedAt: 3 },
      ],
      videoTags: [],
      tags: [],
    },
    3,
  );

  assert.equal(input.folderName, "Watch Later");
  assert.equal(input.videos.length, 2);
  assert.deepEqual(
    input.videos.map((video) => video.videoId),
    [11, 12],
  );
});
