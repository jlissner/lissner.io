import path from "path";
import { createRequire } from "module";
import { readFile } from "fs/promises";
import { logger } from "./logger.js";

const require = createRequire(import.meta.url);

// Load tfjs-node before Human (required for Node.js backend)
await import("@tensorflow/tfjs-node");

const Human = require("@vladmandic/human").default as new (config?: object) => {
  tf: {
    node: { decodeImage: (buf: Buffer, channels?: number) => unknown };
    dispose: (t: unknown) => void;
  };
  detect: (
    input: unknown
  ) => Promise<{ face: Array<{ box: [number, number, number, number]; embedding?: number[] }> }>;
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

export interface FaceInImage {
  imageId: string;
  descriptor: number[];
  box?: { x: number; y: number; width: number; height: number };
}

export async function extractFacesFromImage(
  imagePath: string,
  imageId: string
): Promise<FaceInImage[]> {
  const work = async (): Promise<FaceInImage[]> => {
    const human = await getHuman();
    const tf = human.tf;
    const buffer = await readFile(imagePath);
    if (buffer.length < 24) {
      return [];
    }

    let tensor: unknown;
    try {
      tensor = tf.node.decodeImage(buffer, 3);
      if (tensor == null) {
        return [];
      }
      const result = await human.detect(tensor);
      const faces: FaceInImage[] = [];
      for (const f of result.face) {
        if (!f.embedding) continue;
        const box = f.box;
        faces.push({
          imageId,
          descriptor: Array.from(f.embedding),
          box: box ? { x: box[0], y: box[1], width: box[2], height: box[3] } : undefined,
        });
      }
      return faces;
    } catch (err) {
      logger.error({ err, imageId, imagePath }, "Face extraction failed");
      return [];
    } finally {
      if (tensor != null) {
        try {
          tf.dispose(tensor);
        } catch {
          /* ignore dispose errors */
        }
      }
    }
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

function clusterFacesWithConfidence(
  faces: FaceInImage[],
  similarityFn: (a: number[], b: number[]) => number
): Array<{ id: number; descriptor: number[]; faces: ClusterFace[] }> {
  const clusters: Array<{ id: number; descriptor: number[]; faces: ClusterFace[] }> = [];

  for (const face of faces) {
    const match = {
      bestCluster: null as (typeof clusters)[0] | null,
      bestSim: FACE_SIMILARITY_THRESHOLD,
    };

    for (const cluster of clusters) {
      const sim = similarityFn(face.descriptor, cluster.descriptor);
      if (sim > match.bestSim) {
        match.bestSim = sim;
        match.bestCluster = cluster;
      }
    }

    if (match.bestCluster) {
      const bestCluster = match.bestCluster;
      bestCluster.faces.push({
        imageId: face.imageId,
        box: face.box,
        confidence: match.bestSim,
      });
      const n = bestCluster.faces.length;
      bestCluster.descriptor.forEach((_, i) => {
        bestCluster.descriptor[i] = (bestCluster.descriptor[i] * (n - 1) + face.descriptor[i]!) / n;
      });
    } else {
      clusters.push({
        id: clusters.length + 1,
        descriptor: [...face.descriptor],
        faces: [{ imageId: face.imageId, box: face.box, confidence: 1 }],
      });
    }
  }

  return clusters;
}

/** Cosine-style similarity between two face descriptors (same as clustering). */
export async function getFaceSimilarityFn(): Promise<(a: number[], b: number[]) => number> {
  const human = await getHuman();
  return (a, b) => human.match.similarity(a, b);
}

export async function clusterAllFaces(
  faces: FaceInImage[]
): Promise<Map<string, ImagePersonEntry[]>> {
  const human = await getHuman();
  const similarityFn = (a: number[], b: number[]) => human.match.similarity(a, b);
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
