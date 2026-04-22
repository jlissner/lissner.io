import path from "path";
import { createRequire } from "module";
import { readFile, stat } from "fs/promises";
import { logger } from "./logger.js";

const require = createRequire(import.meta.url);

// Load tfjs-node before Human (required for Node.js backend)
await import("@tensorflow/tfjs-node");

const Human = require("@vladmandic/human").default as new (config?: object) => {
  tf: {
    node: { decodeImage: (buf: Buffer, channels?: number) => unknown };
    dispose: (t: unknown) => void;
  };
  detect: (input: unknown) => Promise<{
    face: Array<{
      box: [number, number, number, number];
      embedding?: number[];
    }>;
  }>;
  match: { similarity: (a: number[], b: number[]) => number };
};

const humanSingleton = { instance: null as InstanceType<typeof Human> | null };

export async function getHuman() {
  if (humanSingleton.instance) return humanSingleton.instance;
  const humanEntry = require.resolve("@vladmandic/human");
  const humanPackageDir = path.join(path.dirname(humanEntry), "..");
  const modelPath = `file://${path.join(humanPackageDir, "models")}`;
  humanSingleton.instance = new Human({
    backend: "tensorflow",
    modelBasePath: modelPath,
    face: {
      enabled: true,
      detector: { rotation: true, return: true, maxDetected: 20 },
      mesh: { enabled: true },
      description: { enabled: true },
    },
  });
  return humanSingleton.instance;
}

const FACE_SIMILARITY_THRESHOLD = 0.5;

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
    });
  }
  return faces;
}

async function detectFacesFromBuffer(
  human: HumanInstance,
  buffer: Buffer,
  imageId: string,
  imagePath: string,
): Promise<FaceInImage[]> {
  const tf = human.tf;
  const tensor = (() => {
    try {
      return tf.node.decodeImage(buffer, 3);
    } catch (err) {
      logger.error({ err, imageId, imagePath }, "Face extraction failed");
      return null;
    }
  })();
  if (tensor == null) {
    return [];
  }
  try {
    const result = await human.detect(tensor);
    return facesFromDetectResult(result, imageId);
  } catch (err) {
    logger.error({ err, imageId, imagePath }, "Face extraction failed");
    return [];
  } finally {
    try {
      tf.dispose(tensor);
    } catch {
      /* ignore dispose errors */
    }
  }
}

export async function extractFacesFromImage(
  imagePath: string,
  imageId: string,
): Promise<FaceInImage[]> {
  const work = async (): Promise<FaceInImage[]> => {
    const human = await getHuman();
    const fileStats = await stat(imagePath).catch(() => null);
    if (fileStats == null || !fileStats.isFile()) {
      logger.warn(
        { imageId, imagePath },
        "Face extraction skipped: missing file",
      );
      return [];
    }
    if (fileStats.size < MIN_IMAGE_BYTES) {
      return [];
    }
    if (fileStats.size > MAX_FACE_DETECT_IMAGE_BYTES) {
      logger.warn(
        {
          imageId,
          imagePath,
          size: fileStats.size,
          maxBytes: MAX_FACE_DETECT_IMAGE_BYTES,
        },
        "Face extraction skipped: file too large",
      );
      return [];
    }
    const buffer = await readFile(imagePath);
    if (buffer.length < MIN_IMAGE_BYTES) {
      return [];
    }
    return detectFacesFromBuffer(human, buffer, imageId, imagePath);
  };

  const scheduled = faceDetectChain.tail.then(() => work());
  faceDetectChain.tail = scheduled.catch(() => {});
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
      return [
        ...clusters,
        {
          id: clusters.length + 1,
          descriptor: [...face.descriptor],
          faces: [{ imageId: face.imageId, box: face.box, confidence: 1 }],
        },
      ];
    }

    const matched = clusters[best.idx]!;
    const prevCount = matched.faces.length;
    const n = prevCount + 1;
    const descriptor = matched.descriptor.map(
      (value, i) => (value * prevCount + face.descriptor[i]!) / n,
    );
    const next: FaceCluster = {
      id: matched.id,
      descriptor,
      faces: [
        ...matched.faces,
        { imageId: face.imageId, box: face.box, confidence: best.sim },
      ],
    };
    return clusters.map((cluster, i) => (i === best.idx ? next : cluster));
  }, []);
}

/** Cosine-style similarity between two face descriptors (same as clustering). */
export async function getFaceSimilarityFn(): Promise<
  (a: number[], b: number[]) => number
> {
  const human = await getHuman();
  return (a, b) => human.match.similarity(a, b);
}

export async function clusterAllFaces(
  faces: FaceInImage[],
): Promise<Map<string, ImagePersonEntry[]>> {
  const human = await getHuman();
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
