import path from "path";
import { readFile, stat } from "fs/promises";
import "@tensorflow/tfjs-node";
import { Human } from "@vladmandic/human";
import { createRequire } from "module";
import { blue, gray, red, yellow } from "yoctocolors";

const require = createRequire(import.meta.url);
const humanEntry = require.resolve("@vladmandic/human");
const humanPackageDir = path.join(path.dirname(humanEntry), "..");
const modelPath = `file://${path.join(humanPackageDir, "models")}`;
const human = new Human({
  backend: "tensorflow",
  modelBasePath: modelPath,
  face: {
    enabled: true,
    detector: { rotation: true, return: true, maxDetected: 20 },
    mesh: { enabled: true },
    description: { enabled: true },
  },
});

const FACE_SIMILARITY_THRESHOLD = 0.5;

/** Human `FaceResult.score` is an overall 0–1 style quality; we persist it for auto-tag confidence. */
function clamp01(n: number): number {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function detectorConfidence(score: number | undefined): number {
  if (score == null || Number.isNaN(score)) return 0.65;
  return clamp01(score);
}

/**
 * Human + tfjs-node are not safe for concurrent `detect()` on the same singleton; parallel
 * uploads (or overlap with bulk indexing) can yield "squeeze ... got null". Run detection
 * strictly one-at-a-time.
 */
const faceDetectChain = {
  tail: Promise.resolve() as Promise<unknown>,
};

const MIN_IMAGE_BYTES = 24;
const MAX_FACE_DETECT_IMAGE_BYTES = 40 * 1024 * 1024;

export interface FaceInImage {
  imageId: string;
  descriptor: number[];
  box?: { x: number; y: number; width: number; height: number };
  /** From Human `FaceResult.score` when present; drives stored auto-tag confidence. */
  detectorScore?: number | null;
}

type HumanInstance = InstanceType<typeof Human>;

function facesFromDetectResult(
  result: Awaited<ReturnType<HumanInstance["detect"]>>,
  imageId: string,
): FaceInImage[] {
  const faces: FaceInImage[] = [];
  for (const f of result.face) {
    if (!f.embedding) continue;
    const box = f.box;
    faces.push({
      imageId,
      descriptor: Array.from(f.embedding),
      box: box
        ? { x: box[0], y: box[1], width: box[2], height: box[3] }
        : undefined,
      detectorScore: typeof f.score === "number" ? f.score : null,
    });
  }
  return faces;
}

async function detectFacesFromBuffer(
  human: HumanInstance,
  buffer: Buffer,
  imageId: string,
): Promise<FaceInImage[]> {
  const tf = human.tf;
  const tensor = tf.node.decodeImage(buffer, 3);

  try {
    const result = await human.detect(tensor);
    return facesFromDetectResult(result, imageId);
  } catch (err) {
    console.info();
    console.error(red("Face extraction failed"));
    console.error(red((err as Error).stack ?? "Unknown error"));
    return [];
  } finally {
    tf.dispose(tensor);
  }
}

export async function extractFacesFromImage(
  imagePath: string,
  imageId: string,
): Promise<FaceInImage[]> {
  const work = async (): Promise<FaceInImage[]> => {
    let fileStats: Awaited<ReturnType<typeof stat>> | null = null;
    try {
      fileStats = await stat(imagePath);
    } catch (err) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code !== "ENOENT") {
        console.error(
          { err, imagePath, imageId },
          "Face extraction: stat failed",
        );
      }
    }
    if (fileStats == null || !fileStats.isFile()) {
      console.error(red("Face extraction skipped: missing file"));
      console.error(`${gray("[IMAGE ID]")} ${blue(imageId)}`);
      console.error(`${gray("[IMAGE PATH]")} ${blue(imagePath)}`);

      return [];
    }
    if (fileStats.size < MIN_IMAGE_BYTES) {
      return [];
    }
    if (fileStats.size > MAX_FACE_DETECT_IMAGE_BYTES) {
      console.warn(
        {
          imageId,
          imagePath,
          size: fileStats.size,
          maxBytes: MAX_FACE_DETECT_IMAGE_BYTES,
        },
        "Face extraction skipped: file too large",
      );

      console.warn(yellow("Face extraction skipped: missing file"));
      console.warn(`${gray("[IMAGE ID]")} ${blue(imageId)}`);
      console.warn(`${gray("[IMAGE PATH]")} ${blue(imagePath)}`);
      console.warn(`${gray("[IMAGE SIZE]")} ${blue(String(fileStats.size))}`);
      console.error(
        `${gray("[MAX BYTES]")} ${blue(String(MAX_FACE_DETECT_IMAGE_BYTES))}`,
      );

      return [];
    }
    const buffer = await readFile(imagePath);
    if (buffer.length < MIN_IMAGE_BYTES) {
      return [];
    }
    if (process.env.BDD_FACE_DETECT_OFF === "1") {
      return [];
    }
    return detectFacesFromBuffer(human, buffer, imageId);
  };

  const scheduled = faceDetectChain.tail.then(() => work());
  faceDetectChain.tail = scheduled.catch((err) => {
    console.error(
      { err, imageId, imagePath },
      "Face extraction chain step failed",
    );
  });
  return scheduled;
}

export interface ImagePersonEntry {
  personId: number;
  box?: { x: number; y: number; width: number; height: number };
  confidence: number;
}

interface ClusterFace {
  imageId: string;
  box?: { x: number; y: number; width: number; height: number };
  confidence: number;
}

type FaceCluster = { id: number; descriptor: number[]; faces: ClusterFace[] };

function clusterFacesWithConfidence(
  faces: FaceInImage[],
  similarityFn: (a: number[], b: number[]) => number,
): FaceCluster[] {
  return faces.reduce<FaceCluster[]>((clusters, face) => {
    const best = clusters.reduce<{ idx: number; sim: number } | null>(
      (pick, cluster, idx) => {
        const sim = similarityFn(face.descriptor, cluster.descriptor);
        if (sim <= FACE_SIMILARITY_THRESHOLD) return pick;
        if (pick == null || sim > pick.sim) return { idx, sim };
        return pick;
      },
      null,
    );

    if (best == null) {
      const dc = detectorConfidence(face.detectorScore ?? undefined);
      return [
        ...clusters,
        {
          id: clusters.length + 1,
          descriptor: [...face.descriptor],
          faces: [{ imageId: face.imageId, box: face.box, confidence: dc }],
        },
      ];
    }

    const matched = clusters[best.idx]!;
    const prevCount = matched.faces.length;
    const n = prevCount + 1;
    const descriptor = matched.descriptor.map(
      (value, i) => (value * prevCount + face.descriptor[i]!) / n,
    );
    const dc = detectorConfidence(face.detectorScore ?? undefined);
    const next: FaceCluster = {
      id: matched.id,
      descriptor,
      faces: [
        ...matched.faces,
        {
          imageId: face.imageId,
          box: face.box,
          confidence: best.sim * dc,
        },
      ],
    };
    return clusters.map((cluster, i) => (i === best.idx ? next : cluster));
  }, []);
}

/** Cosine-style similarity between two face descriptors (same as clustering). */
export async function getFaceSimilarityFn(): Promise<
  (a: number[], b: number[]) => number
> {
  return (a, b) => human.match.similarity(a, b);
}

export async function clusterAllFaces(
  faces: FaceInImage[],
): Promise<Map<string, ImagePersonEntry[]>> {
  const similarityFn = (a: number[], b: number[]) =>
    human.match.similarity(a, b);
  const clusters = clusterFacesWithConfidence(faces, similarityFn);
  const imageToEntries = new Map<string, ImagePersonEntry[]>();

  for (const cluster of clusters) {
    for (const { imageId, box, confidence } of cluster.faces) {
      const existing = imageToEntries.get(imageId) ?? [];
      if (!existing.some((e) => e.personId === cluster.id)) {
        existing.push({ personId: cluster.id, box, confidence });
        imageToEntries.set(imageId, existing);
      }
    }
  }

  return imageToEntries;
}
