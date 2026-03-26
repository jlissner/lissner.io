import { Router } from "express";
import {
  addPersonToMediaTag,
  confirmFaceTag,
  reassignPersonInMediaTag,
  reassignToNewPerson,
  removePersonFromMediaTag,
} from "../../services/media-service.js";
import { parseWithSchema } from "../../validation/parse.js";
import {
  addPersonToMediaBodySchema,
  mediaIdParamSchema,
  mediaIdPersonIdParamSchema,
  reassignFaceBodySchema,
} from "../../validation/media-schemas.js";

export const mediaFacesRouter = Router();

mediaFacesRouter.delete("/:id/people/:personId", (req, res) => {
  const { id, personId } = parseWithSchema(mediaIdPersonIdParamSchema, req.params);
  const result = removePersonFromMediaTag(id, personId);
  if (result.ok) {
    res.status(204).send();
    return;
  }
  if (result.reason === "not_found") {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (result.reason === "bad_person") {
    res.status(400).json({ error: "Invalid person ID" });
    return;
  }
  if (result.reason === "not_tagged") {
    res.status(404).json({ error: "Person not tagged in this image" });
    return;
  }
  res.status(404).json({ error: "Not found" });
});

mediaFacesRouter.put("/:id/people/:personId", (req, res) => {
  const { id, personId: fromPersonId } = parseWithSchema(mediaIdPersonIdParamSchema, req.params);
  const { assignTo: toPersonId } = parseWithSchema(reassignFaceBodySchema, req.body);
  const result = reassignPersonInMediaTag(id, fromPersonId, toPersonId);
  if (result.ok) {
    res.json(result.body);
    return;
  }
  if (result.reason === "not_found") {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (result.reason === "bad_ids") {
    res.status(400).json({ error: "assignTo (person ID) required" });
    return;
  }
  if (result.reason === "same_person") {
    res.status(400).json({ error: "Cannot reassign to the same person" });
    return;
  }
  if (result.reason === "target_missing") {
    res.status(400).json({ error: "Target person not found" });
    return;
  }
  res.status(404).json({ error: "Person not tagged in this image" });
});

mediaFacesRouter.post("/:id/people/:personId/reassign-new", (req, res) => {
  const { id, personId: fromPersonId } = parseWithSchema(mediaIdPersonIdParamSchema, req.params);
  const result = reassignToNewPerson(id, fromPersonId);
  if (result.ok) {
    res.json(result.body);
    return;
  }
  if (result.reason === "not_found") {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (result.reason === "bad_person") {
    res.status(400).json({ error: "Invalid person ID" });
    return;
  }
  res.status(404).json({ error: "Person not tagged in this image" });
});

mediaFacesRouter.post("/:id/people/:personId/confirm", (req, res) => {
  const { id, personId } = parseWithSchema(mediaIdPersonIdParamSchema, req.params);
  const result = confirmFaceTag(id, personId);
  if (result.ok) {
    res.json({ confirmed: true });
    return;
  }
  if (result.reason === "not_found") {
    res.status(404).json({ error: "Not found" });
    return;
  }
  if (result.reason === "bad_person") {
    res.status(400).json({ error: "Invalid person ID" });
    return;
  }
  res.status(404).json({ error: "Person not tagged in this image" });
});

mediaFacesRouter.post("/:id/people", (req, res) => {
  const { id } = parseWithSchema(mediaIdParamSchema, req.params);
  const body = parseWithSchema(addPersonToMediaBodySchema, req.body);
  const result = addPersonToMediaTag({
    mediaId: id,
    personId: body.personId,
    box: body.box,
    createNew: body.createNew === true,
  });
  if (result.ok) {
    res.status(result.status).json(result.body);
    return;
  }
  if (result.status === 404) {
    res.status(404).json({ error: result.error });
    return;
  }
  res.status(400).json({ error: result.error });
});

