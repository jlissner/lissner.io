import { Router } from "express";
import { sendApiError } from "../../lib/api-error.js";
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
    sendApiError(res, 404, "Not found", "not_found");
    return;
  }
  if (result.reason === "bad_person") {
    sendApiError(res, 400, "Invalid person ID", "face_invalid_person");
    return;
  }
  if (result.reason === "not_tagged") {
    sendApiError(res, 404, "Person not tagged in this image", "face_not_tagged");
    return;
  }
  sendApiError(res, 404, "Not found", "not_found");
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
    sendApiError(res, 404, "Not found", "not_found");
    return;
  }
  if (result.reason === "bad_ids") {
    sendApiError(res, 400, "assignTo (person ID) required", "face_bad_assign_to");
    return;
  }
  if (result.reason === "same_person") {
    sendApiError(res, 400, "Cannot reassign to the same person", "face_same_person");
    return;
  }
  if (result.reason === "target_missing") {
    sendApiError(res, 400, "Target person not found", "face_target_missing");
    return;
  }
  sendApiError(res, 404, "Person not tagged in this image", "face_not_tagged");
});

mediaFacesRouter.post("/:id/people/:personId/reassign-new", (req, res) => {
  const { id, personId: fromPersonId } = parseWithSchema(mediaIdPersonIdParamSchema, req.params);
  const result = reassignToNewPerson(id, fromPersonId);
  if (result.ok) {
    res.json(result.body);
    return;
  }
  if (result.reason === "not_found") {
    sendApiError(res, 404, "Not found", "not_found");
    return;
  }
  if (result.reason === "bad_person") {
    sendApiError(res, 400, "Invalid person ID", "face_invalid_person");
    return;
  }
  sendApiError(res, 404, "Person not tagged in this image", "face_not_tagged");
});

mediaFacesRouter.post("/:id/people/:personId/confirm", (req, res) => {
  const { id, personId } = parseWithSchema(mediaIdPersonIdParamSchema, req.params);
  const result = confirmFaceTag(id, personId);
  if (result.ok) {
    res.json({ confirmed: true });
    return;
  }
  if (result.reason === "not_found") {
    sendApiError(res, 404, "Not found", "not_found");
    return;
  }
  if (result.reason === "bad_person") {
    sendApiError(res, 400, "Invalid person ID", "face_invalid_person");
    return;
  }
  sendApiError(res, 404, "Person not tagged in this image", "face_not_tagged");
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
    res.status(201).json({ personId: result.personId });
    return;
  }
  if (result.reason === "not_found") {
    sendApiError(res, 404, "Not found", "not_found");
    return;
  }
  if (result.reason === "box_required") {
    sendApiError(res, 400, "box { x, y, width, height } required", "face_box_required");
    return;
  }
  if (result.reason === "person_required") {
    sendApiError(res, 400, "personId required when not createNew", "face_person_required");
    return;
  }
  sendApiError(res, 400, "Person not found", "face_person_unknown");
});

