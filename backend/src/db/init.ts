import { sqlite } from "./client.js";

export function initDb() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS folders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      deleted_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bvid TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      cover_url TEXT NOT NULL,
      uploader TEXT NOT NULL,
      description TEXT NOT NULL,
      partition TEXT NOT NULL,
      publish_at INTEGER,
      bvid_url TEXT NOT NULL,
      is_invalid INTEGER NOT NULL DEFAULT 0,
      deleted_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS folder_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      folder_id INTEGER NOT NULL,
      video_id INTEGER NOT NULL,
      added_at INTEGER NOT NULL,
      UNIQUE(folder_id, video_id),
      FOREIGN KEY(folder_id) REFERENCES folders(id) ON DELETE CASCADE,
      FOREIGN KEY(video_id) REFERENCES videos(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL DEFAULT 'custom',
      created_at INTEGER NOT NULL,
      archived_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS video_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      video_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      UNIQUE(video_id, tag_id),
      FOREIGN KEY(video_id) REFERENCES videos(id) ON DELETE CASCADE,
      FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_folder_items_folder_id ON folder_items(folder_id);
    CREATE INDEX IF NOT EXISTS idx_folder_items_video_id ON folder_items(video_id);
    CREATE INDEX IF NOT EXISTS idx_videos_partition ON videos(partition);
    CREATE INDEX IF NOT EXISTS idx_video_tags_video_id ON video_tags(video_id);
    CREATE INDEX IF NOT EXISTS idx_video_tags_tag_id ON video_tags(tag_id);

    CREATE VIRTUAL TABLE IF NOT EXISTS video_fts USING fts5(
      title,
      description,
      uploader,
      partition,
      bvid UNINDEXED,
      content='videos',
      content_rowid='id',
      tokenize='unicode61'
    );

    CREATE TRIGGER IF NOT EXISTS videos_ai AFTER INSERT ON videos BEGIN
      INSERT INTO video_fts(rowid, title, description, uploader, partition, bvid)
      VALUES (new.id, new.title, new.description, new.uploader, new.partition, new.bvid);
    END;

    CREATE TRIGGER IF NOT EXISTS videos_ad AFTER DELETE ON videos BEGIN
      INSERT INTO video_fts(video_fts, rowid, title, description, uploader, partition, bvid)
      VALUES ('delete', old.id, old.title, old.description, old.uploader, old.partition, old.bvid);
    END;

    CREATE TRIGGER IF NOT EXISTS videos_au AFTER UPDATE ON videos BEGIN
      INSERT INTO video_fts(video_fts, rowid, title, description, uploader, partition, bvid)
      VALUES ('delete', old.id, old.title, old.description, old.uploader, old.partition, old.bvid);
      INSERT INTO video_fts(rowid, title, description, uploader, partition, bvid)
      VALUES (new.id, new.title, new.description, new.uploader, new.partition, new.bvid);
    END;

    DELETE FROM video_tags
    WHERE tag_id IN (
      SELECT id FROM tags WHERE name IN ('uncategorized', '未分类')
    );

    DELETE FROM tags WHERE name IN ('uncategorized', '未分类');
  `);

  const folderColumns = sqlite.prepare("PRAGMA table_info(folders)").all() as Array<{ name: string }>;
  if (!folderColumns.some((column) => column.name === "sort_order")) {
    sqlite.exec("ALTER TABLE folders ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0");
  }

  if (!folderColumns.some((column) => column.name === "deleted_at")) {
    sqlite.exec("ALTER TABLE folders ADD COLUMN deleted_at INTEGER");
  }

  const videoColumns = sqlite.prepare("PRAGMA table_info(videos)").all() as Array<{ name: string }>;
  if (!videoColumns.some((column) => column.name === "deleted_at")) {
    sqlite.exec("ALTER TABLE videos ADD COLUMN deleted_at INTEGER");
  }

  const tagColumns = sqlite.prepare("PRAGMA table_info(tags)").all() as Array<{ name: string }>;
  if (!tagColumns.some((column) => column.name === "archived_at")) {
    sqlite.exec("ALTER TABLE tags ADD COLUMN archived_at INTEGER");
  }

  const folderRows = sqlite
    .prepare("SELECT id FROM folders WHERE deleted_at IS NULL ORDER BY sort_order ASC, updated_at DESC, id ASC")
    .all() as Array<{ id: number }>;

  const reorderFolderStmt = sqlite.prepare("UPDATE folders SET sort_order = ? WHERE id = ?");
  const reorderFoldersTx = sqlite.transaction((rows: Array<{ id: number }>) => {
    rows.forEach((row, index) => {
      reorderFolderStmt.run(index, row.id);
    });
  });

  reorderFoldersTx(folderRows);
}
