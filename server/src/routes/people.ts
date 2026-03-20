import { Router } from "express";
import * as db from "../db/media.js";

export const peopleRouter = Router();

peopleRouter.get("/review/queue", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string, 10) || 100, 500);
  const items = db.getFacesNeedingReview(limit);
  const names = db.getPersonNames();
  const enriched = items.map((item) => {
    const others = db.getImagePeople(item.mediaId).filter((id) => id !== item.personId);
    return {
      ...item,
      otherPeopleInPhoto: others.map((id) => ({ id, name: names.get(id) ?? `Person ${id}` })),
    };
  });
  res.json(enriched);
});

peopleRouter.get("/:id/media", (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id < 1) {
    res.status(400).json({ error: "Invalid person ID" });
    return;
  }
  const limit = Math.min(Math.max(1, parseInt(req.query.limit as string, 10) || 100), 500);
  const media = db.getMediaForPerson(id, limit);
  res.json(
    media.map((m) => ({
      id: m.id,
      mimeType: m.mimeType,
      x: m.x,
      y: m.y,
      width: m.width,
      height: m.height,
      backedUp: !!m.backedUpAt,
    }))
  );
});

peopleRouter.get("/", (_req, res) => {
  const ids = db.getAllPersonIds();
  const names = db.getPersonNames();
  const people = ids.map((id) => ({
    id,
    name: names.get(id) ?? `Person ${id}`,
    photoCount: db.getMediaCountForPerson(id),
  }));
  res.json(people);
});

peopleRouter.post("/", (req, res) => {
  const name = req.body?.name;
  if (typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "Name required" });
    return;
  }
  const id = db.createPerson(name.trim());
  res.status(201).json({ id, name: name.trim() });
});

peopleRouter.delete("/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id < 1) {
    res.status(400).json({ error: "Invalid person ID" });
    return;
  }
  const allIds = db.getAllPersonIds();
  if (!allIds.includes(id)) {
    res.status(404).json({ error: "Person not found" });
    return;
  }
  db.deletePerson(id);
  res.json({ deleted: id });
});

peopleRouter.post("/:id/merge", (req, res) => {
  const mergeFromId = parseInt(req.params.id, 10);
  if (isNaN(mergeFromId) || mergeFromId < 1) {
    res.status(400).json({ error: "Invalid person ID" });
    return;
  }
  const keepId = parseInt(String(req.body?.mergeInto ?? ""), 10);
  if (isNaN(keepId) || keepId < 1) {
    res.status(400).json({ error: "mergeInto (person ID) required" });
    return;
  }
  if (mergeFromId === keepId) {
    res.status(400).json({ error: "Cannot merge a person into themselves" });
    return;
  }
  const allIds = db.getAllPersonIds();
  if (!allIds.includes(mergeFromId) || !allIds.includes(keepId)) {
    res.status(404).json({ error: "Person not found" });
    return;
  }
  db.mergePeople(keepId, mergeFromId);
  res.json({ merged: mergeFromId, into: keepId });
});

peopleRouter.put("/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id) || id < 1) {
    res.status(400).json({ error: "Invalid person ID" });
    return;
  }
  const name = req.body?.name;
  if (typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "Name required" });
    return;
  }
  db.setPersonName(id, name.trim());
  res.json({ id, name: name.trim() });
});
