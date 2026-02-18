import { and, count, desc, eq, isNull, like, notInArray } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { db } from "../db/client.js";
import { tags, videoTags } from "../db/schema.js";

const listTagsQuerySchema = z.object({
  type: z.enum(["system", "custom"]).optional(),
  search: z.string().trim().optional(),
  includeArchived: z.coerce.boolean().default(false),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50)
});

const createTagSchema = z.object({
  name: z.string().min(1).max(40),
  type: z.enum(["system", "custom"]).default("custom")
});

const updateTagSchema = z.object({
  name: z.string().min(1).max(40)
});

const tagParamsSchema = z.object({
  id: z.coerce.number().int().positive()
});

const HIDDEN_TAG_NAMES = ["uncategorized", "\u672a\u5206\u7c7b"] as const;

function isTagNameConflict(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const sqliteCode = (error as Error & { code?: string }).code;
  if (sqliteCode === "SQLITE_CONSTRAINT_UNIQUE" || sqliteCode === "SQLITE_CONSTRAINT") {
    return error.message.includes("tags.name") || error.message.includes("tags_name_unique");
  }

  return false;
}

function fetchTagWithUsage(id: number) {
  return db
    .select({
      id: tags.id,
      name: tags.name,
      type: tags.type,
      archivedAt: tags.archivedAt,
      createdAt: tags.createdAt,
      usageCount: count(videoTags.id)
    })
    .from(tags)
    .leftJoin(videoTags, eq(videoTags.tagId, tags.id))
    .where(eq(tags.id, id))
    .groupBy(tags.id)
    .get();
}

function findTagByNameCaseInsensitive(name: string) {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return null;

  const rows = db
    .select({
      id: tags.id,
      name: tags.name,
      type: tags.type,
      archivedAt: tags.archivedAt
    })
    .from(tags)
    .all();

  return rows.find((row) => row.name.trim().toLowerCase() === normalized) ?? null;
}

export const tagRoutes: FastifyPluginAsync = async (app) => {
  app.get("/tags", async (request) => {
    const query = listTagsQuerySchema.parse(request.query);
    const offset = (query.page - 1) * query.pageSize;

    const baseCondition = and(
      notInArray(tags.name, [...HIDDEN_TAG_NAMES]),
      query.includeArchived ? undefined : isNull(tags.archivedAt)
    );
    const condition =
      query.type && query.search
        ? and(baseCondition, eq(tags.type, query.type), like(tags.name, `%${query.search}%`))
        : query.type
          ? and(baseCondition, eq(tags.type, query.type))
          : query.search
            ? and(baseCondition, like(tags.name, `%${query.search}%`))
            : baseCondition;

    const rows = db
      .select({
        id: tags.id,
        name: tags.name,
        type: tags.type,
        archivedAt: tags.archivedAt,
        createdAt: tags.createdAt,
        usageCount: count(videoTags.id)
      })
      .from(tags)
      .leftJoin(videoTags, eq(videoTags.tagId, tags.id))
      .where(condition)
      .groupBy(tags.id)
      .orderBy(desc(tags.createdAt), desc(tags.id))
      .limit(query.pageSize)
      .offset(offset)
      .all();

    const totalRow = db
      .select({ value: count() })
      .from(tags)
      .where(condition)
      .get();

    return {
      items: rows,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total: totalRow?.value ?? 0
      }
    };
  });

  app.post("/tags", async (request, reply) => {
    const body = createTagSchema.parse(request.body);
    const normalizedName = body.name.trim();
    const now = Date.now();

    if (!normalizedName) {
      return reply.badRequest("Tag name cannot be empty");
    }

    if (HIDDEN_TAG_NAMES.includes(normalizedName.toLowerCase() as (typeof HIDDEN_TAG_NAMES)[number])) {
      return reply.badRequest("Tag name is reserved");
    }

    const existing = findTagByNameCaseInsensitive(normalizedName);
    if (existing) {
      const shouldUnarchive = existing.archivedAt !== null;
      if (shouldUnarchive || existing.type !== body.type) {
        db.update(tags)
          .set({
            type: body.type,
            archivedAt: null
          })
          .where(eq(tags.id, existing.id))
          .run();
      }

      const existed = fetchTagWithUsage(existing.id);
      if (existed) {
        return reply.code(200).send(existed);
      }
      return reply.internalServerError("Create tag failed");
    }

    try {
      const inserted = db
        .insert(tags)
        .values({
          name: normalizedName,
          type: body.type,
          createdAt: now
        })
        .run();

      const id = Number(inserted.lastInsertRowid);
      const saved = fetchTagWithUsage(id);
      if (!saved) {
        return reply.internalServerError("Create tag failed");
      }

      return reply.code(201).send(saved);
    } catch (error) {
      request.log.error({ err: error }, "Create tag failed");
      if (isTagNameConflict(error)) {
        const existedByConflict = findTagByNameCaseInsensitive(normalizedName);
        if (existedByConflict) {
          const existed = fetchTagWithUsage(existedByConflict.id);
          if (existed) {
            return reply.code(200).send(existed);
          }
        }
      }
      return reply.internalServerError("Create tag failed");
    }
  });

  app.patch("/tags/:id", async (request, reply) => {
    const params = tagParamsSchema.parse(request.params);
    const body = updateTagSchema.parse(request.body);
    const normalizedName = body.name.trim();

    if (!normalizedName) {
      return reply.badRequest("Tag name cannot be empty");
    }

    const existing = db.select().from(tags).where(eq(tags.id, params.id)).get();
    if (!existing) {
      return reply.notFound("Tag not found");
    }
    if (existing.type !== "custom") {
      return reply.badRequest("Only custom tags can be updated");
    }
    if (HIDDEN_TAG_NAMES.includes(normalizedName.toLowerCase() as (typeof HIDDEN_TAG_NAMES)[number])) {
      return reply.badRequest("Tag name is reserved");
    }

    const duplicate = findTagByNameCaseInsensitive(normalizedName);
    if (duplicate && duplicate.id !== params.id) {
      return reply.conflict("Tag name already exists");
    }

    try {
      db.update(tags)
        .set({ name: normalizedName })
        .where(eq(tags.id, params.id))
        .run();

      const updated = fetchTagWithUsage(params.id);
      if (!updated) {
        return reply.notFound("Tag not found");
      }

      return updated;
    } catch (error) {
      request.log.error({ err: error }, "Update tag failed");
      if (isTagNameConflict(error)) {
        return reply.conflict("Tag name already exists");
      }
      return reply.internalServerError("Update tag failed");
    }
  });

  app.delete("/tags/:id", async (request, reply) => {
    const params = tagParamsSchema.parse(request.params);
    const existing = db.select().from(tags).where(eq(tags.id, params.id)).get();
    if (!existing) {
      return reply.notFound("Tag not found");
    }
    if (existing.type !== "custom") {
      return reply.badRequest("Only custom tags can be deleted");
    }

    db.update(tags)
      .set({ archivedAt: Date.now() })
      .where(eq(tags.id, params.id))
      .run();
    return reply.code(204).send();
  });
};
