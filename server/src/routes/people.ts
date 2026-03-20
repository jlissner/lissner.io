import { Router } from "express";
import { asyncHandler } from "../middleware/async-handler.js";
import {
  createPersonBodySchema,
  mergePersonBodySchema,
  personIdParamsSchema,
  personMediaQuerySchema,
  reviewQueueQuerySchema,
  updatePersonBodySchema,
} from "../validation/people-schemas.js";
import {
  createPersonNamed,
  deletePersonById,
  getPersonMediaPreview,
  getReviewQueue,
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
  })
);

peopleRouter.get("/review/queue", (req, res) => {
  const q = reviewQueueQuerySchema.parse(req.query);
  const limit = q.limit ?? 100;
  res.json(getReviewQueue(limit));
});

peopleRouter.get(
  "/:id/merge-suggestions",
  asyncHandler(async (req, res) => {
    const { id } = personIdParamsSchema.parse(req.params);
    const suggestions = await getMergeSuggestionsForPerson(id);
    res.json({ suggestions });
  })
);

peopleRouter.get("/:id/media", (req, res) => {
  const { id } = personIdParamsSchema.parse(req.params);
  const q = personMediaQuerySchema.parse(req.query);
  const limit = q.limit ?? 100;
  res.json(getPersonMediaPreview(id, limit));
});

peopleRouter.get("/", (_req, res) => {
  res.json(listPeopleSummary());
});

peopleRouter.post("/", (req, res) => {
  const body = createPersonBodySchema.parse(req.body);
  const created = createPersonNamed(body.name);
  res.status(201).json(created);
});

peopleRouter.delete("/:id", (req, res) => {
  const { id } = personIdParamsSchema.parse(req.params);
  const result = deletePersonById(id);
  if (!result.ok) {
    res.status(404).json({ error: "Person not found" });
    return;
  }
  res.json({ deleted: id });
});

peopleRouter.post("/:id/merge", (req, res) => {
  const { id: mergeFromId } = personIdParamsSchema.parse(req.params);
  const body = mergePersonBodySchema.parse(req.body);
  const result = mergePeople(mergeFromId, body.mergeInto);
  if (result.ok) {
    res.json({ merged: result.merged, into: result.into });
    return;
  }
  if (result.reason === "invalid_ids") {
    res.status(400).json({ error: "mergeInto (person ID) required" });
    return;
  }
  if (result.reason === "merge_into_self") {
    res.status(400).json({ error: "Cannot merge a person into themselves" });
    return;
  }
  res.status(404).json({ error: "Person not found" });
});

peopleRouter.put("/:id", (req, res) => {
  const { id } = personIdParamsSchema.parse(req.params);
  const body = updatePersonBodySchema.parse(req.body);
  res.json(renamePerson(id, body.name));
});
