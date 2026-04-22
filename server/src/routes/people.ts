import { Router } from "express";
import { sendApiError } from "../lib/api-error.js";
import { asyncHandler } from "../middleware/async-handler.js";
import { parseWithSchema } from "../validation/parse.js";
import {
  createPersonBodySchema,
  mergePersonBodySchema,
  personIdParamsSchema,
  personMediaQuerySchema,
  updatePersonBodySchema,
} from "../validation/people-schemas.js";
import {
  createPersonNamed,
  deletePersonById,
  getPersonMediaPreview,
  listPeopleSummary,
  mergePeople,
  renamePerson,
} from "../services/people-service.js";
import { getMergeSuggestionsForPerson } from "../services/person-merge-suggestions.js";
import { runFaceMatchBatch } from "../services/person-face-match.js";

export const peopleRouter = Router();

peopleRouter.post(
  "/match-faces",
  asyncHandler(async (_req, res) => {
    const result = await runFaceMatchBatch();
    res.json(result);
  }),
);

peopleRouter.get(
  "/:id/merge-suggestions",
  asyncHandler(async (req, res) => {
    const { id } = parseWithSchema(personIdParamsSchema, req.params);
    const suggestions = await getMergeSuggestionsForPerson(id);
    res.json({ suggestions });
  }),
);

peopleRouter.get("/:id/media", (req, res) => {
  const { id } = parseWithSchema(personIdParamsSchema, req.params);
  const q = parseWithSchema(personMediaQuerySchema, req.query);
  const limit = q.limit ?? 100;
  res.json(getPersonMediaPreview(id, limit));
});

peopleRouter.get("/", (_req, res) => {
  res.json(listPeopleSummary());
});

peopleRouter.post("/", (req, res) => {
  const body = parseWithSchema(createPersonBodySchema, req.body);
  const created = createPersonNamed(body.name);
  res.status(201).json(created);
});

peopleRouter.delete("/:id", (req, res) => {
  const { id } = parseWithSchema(personIdParamsSchema, req.params);
  const result = deletePersonById(id);
  if (!result.ok) {
    sendApiError(res, 404, "Person not found", "person_not_found");
    return;
  }
  res.json({ deleted: id });
});

peopleRouter.post("/:id/merge", (req, res) => {
  const { id: mergeFromId } = parseWithSchema(personIdParamsSchema, req.params);
  const body = parseWithSchema(mergePersonBodySchema, req.body);
  const result = mergePeople(mergeFromId, body.mergeInto);
  if (result.ok) {
    res.json({ merged: result.merged, into: result.into });
    return;
  }
  if (result.reason === "invalid_ids") {
    sendApiError(
      res,
      400,
      "mergeInto (person ID) required",
      "merge_invalid_ids",
    );
    return;
  }
  if (result.reason === "merge_into_self") {
    sendApiError(
      res,
      400,
      "Cannot merge a person into themselves",
      "merge_into_self",
    );
    return;
  }
  sendApiError(res, 404, "Person not found", "person_not_found");
});

peopleRouter.put("/:id", (req, res) => {
  const { id } = parseWithSchema(personIdParamsSchema, req.params);
  const body = parseWithSchema(updatePersonBodySchema, req.body);
  res.json(renamePerson(id, body.name));
});
