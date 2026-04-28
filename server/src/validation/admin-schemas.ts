import { z } from "zod";

const dataExplorerSearchSchema = z.string().trim().max(500).optional();

const recordUnknownSchema = z.record(z.string(), z.unknown());

export const tableParamSchema = z.object({
  table: z.string().trim().min(1),
});

export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const sqlBodySchema = z.object({
  query: z.string().trim().min(1, "query (string) required"),
});

export const dataExplorerRowsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  q: dataExplorerSearchSchema,
});

export const dataExplorerSchemaQuerySchema = z.object({
  q: dataExplorerSearchSchema,
});

export const dataExplorerInsertBodySchema = recordUnknownSchema;

export const dataExplorerUpdateBodySchema = z
  .object({
    pk: recordUnknownSchema,
  })
  .and(recordUnknownSchema);

export const dataExplorerDeleteBodySchema = z.object({
  pk: recordUnknownSchema,
});

export const whitelistCreateBodySchema = z.object({
  email: z.string().trim().min(1, "Email required"),
  isAdmin: z.boolean().optional().default(false),
  personId: z.preprocess((value) => {
    if (value == null || value === "") return undefined;
    return value;
  }, z.coerce.number().int().positive().optional()),
});

export const peopleDirectoryPersonIdParamsSchema = z.object({
  personId: z.coerce.number().int().positive(),
});

export const peopleDirectoryCreateBodySchema = z.object({
  name: z.string().trim().min(1, "Name required"),
  email: z
    .preprocess((value) => {
      if (value == null || value === "") return undefined;
      return value;
    }, z.string().trim().min(1).optional())
    .optional(),
  isAdmin: z.boolean().optional().default(false),
});

export const peopleDirectoryUpdateBodySchema = z.object({
  name: z.string().trim().min(1, "Name required"),
  email: z
    .preprocess((value) => {
      if (value == null || value === "") return undefined;
      return value;
    }, z.string().trim().min(1).optional())
    .optional(),
  isAdmin: z.boolean().optional().default(false),
});

export const userPeopleBodySchema = z.object({
  personIds: z.array(z.coerce.number().int().positive()).default([]),
});

export const dbRestoreBodySchema = z.object({
  key: z.string().trim().min(1, "key required"),
});
