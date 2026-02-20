import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const folders = sqliteTable(
  "folders",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    description: text("description"),
    remoteMediaId: integer("remote_media_id"),
    sortOrder: integer("sort_order").notNull().default(0),
    deletedAt: integer("deleted_at", { mode: "number" }),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    updatedAt: integer("updated_at", { mode: "number" }).notNull()
  },
  (table) => ({
    folderNameUnique: uniqueIndex("folders_name_unique").on(table.name),
    folderRemoteMediaUnique: uniqueIndex("folders_remote_media_unique").on(table.remoteMediaId)
  })
);

export const videos = sqliteTable(
  "videos",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    bvid: text("bvid").notNull(),
    title: text("title").notNull(),
    coverUrl: text("cover_url").notNull(),
    uploader: text("uploader").notNull(),
    description: text("description").notNull(),
    partition: text("partition").notNull(),
    publishAt: integer("publish_at", { mode: "number" }),
    bvidUrl: text("bvid_url").notNull(),
    isInvalid: integer("is_invalid", { mode: "boolean" }).notNull().default(false),
    deletedAt: integer("deleted_at", { mode: "number" }),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    updatedAt: integer("updated_at", { mode: "number" }).notNull()
  },
  (table) => ({
    bvidUnique: uniqueIndex("videos_bvid_unique").on(table.bvid)
  })
);

export const folderItems = sqliteTable(
  "folder_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    folderId: integer("folder_id")
      .notNull()
      .references(() => folders.id, { onDelete: "cascade" }),
    videoId: integer("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    addedAt: integer("added_at", { mode: "number" }).notNull()
  },
  (table) => ({
    folderVideoUnique: uniqueIndex("folder_items_folder_video_unique").on(table.folderId, table.videoId)
  })
);

export const tags = sqliteTable(
  "tags",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    type: text("type", { enum: ["system", "custom"] }).notNull().default("custom"),
    createdAt: integer("created_at", { mode: "number" }).notNull(),
    archivedAt: integer("archived_at", { mode: "number" })
  },
  (table) => ({
    tagNameUnique: uniqueIndex("tags_name_unique").on(table.name)
  })
);

export const videoTags = sqliteTable(
  "video_tags",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    videoId: integer("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" })
  },
  (table) => ({
    videoTagUnique: uniqueIndex("video_tags_video_tag_unique").on(table.videoId, table.tagId)
  })
);
