import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import { readFile } from "fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Load tfjs-node before Human (required for Node.js backend)
await import("@tensorflow/tfjs-node");

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Human = require("@vladmandic/human").default as new (config?: object) => {
  tf: { node: { decodeImage: (buf: Buffer, channels?: number) => unknown }; dispose: (t: unknown) => void };
  detect: (input: unknown) => Promise<{ face: Array<{ box: [number, number, number, number]; embedding?: number[] }> }>;
  match: { similarity: (a: number[], b: number[]) => number };
};

let humanInstance: InstanceType<typeof Human> | null = null;

async function getHuman() {
  if (humanInstance) return humanInstance;
  const humanEntry = require.resolve("@vladmandic/human");
  const humanPackageDir = path.join(path.dirname(humanEntry), "..");
  const modelPath = `file://${path.join(humanPackageDir, "models")}`;
  humanInstance = new Human({
    backend: "tensorflow",
    modelBasePath: modelPath,
    face: {
      enabled: true,
      detector: { rotation: true, return: true, maxDetected: 20 },
      mesh: { enabled: true },
      description: { enabled: true },
    },
  });
  return humanInstance;
}

const FACE_SIMILARITY_THRESHOLD = 0.5;

export interface FaceInImage {
  imageId: string;
  descriptor: number[];
  box?: { x: number; y: number; width: number; height: number };
}

export interface PersonCluster {
  id: number;
  descriptor: number[];
  faces: Array<{ imageId: string; box?: { x: number; y: number; width: number; height: number } }>;
}

function clusterFaces(
  faces: FaceInImage[],
  similarityFn: (a: number[], b: number[]) => number
): PersonCluster[] {
  const clusters: PersonCluster[] = [];

  for (const face of faces) {
    let bestCluster: PersonCluster | null = null;
    let bestSim = FACE_SIMILARITY_THRESHOLD;

    for (const cluster of clusters) {
      const sim = similarityFn(face.descriptor, cluster.descriptor);
      if (sim > bestSim) {
        bestSim = sim;
        bestCluster = cluster;
      }
    }

    if (bestCluster) {
      bestCluster.faces.push({ imageId: face.imageId, box: face.box });
      const n = bestCluster.faces.length;
      for (let i = 0; i < bestCluster.descriptor.length; i++) {
        bestCluster.descriptor[i] =
          (bestCluster.descriptor[i] * (n - 1) + face.descriptor[i]) / n;
      }
    } else {
      clusters.push({
        id: clusters.length + 1,
        descriptor: [...face.descriptor],
        faces: [{ imageId: face.imageId, box: face.box }],
      });
    }
  }

  return clusters;
}

export async function extractFacesFromImage(
  imagePath: string,
  imageId: string
): Promise<FaceInImage[]> {
  const human = await getHuman();
  const tf = human.tf;
  const buffer = await readFile(imagePath);

  const tensor = tf.node.decodeImage(buffer, 3);
  const result = await human.detect(tensor);
  tf.dispose(tensor);

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
    let bestCluster: (typeof clusters)[0] | null = null;
    let bestSim = FACE_SIMILARITY_THRESHOLD;

    for (const cluster of clusters) {
      const sim = similarityFn(face.descriptor, cluster.descriptor);
      if (sim > bestSim) {
        bestSim = sim;
        bestCluster = cluster;
      }
    }

    if (bestCluster) {
      bestCluster.faces.push({
        imageId: face.imageId,
        box: face.box,
        confidence: bestSim,
      });
      const n = bestCluster.faces.length;
      for (let i = 0; i < bestCluster.descriptor.length; i++) {
        bestCluster.descriptor[i] =
          (bestCluster.descriptor[i] * (n - 1) + face.descriptor[i]) / n;
      }
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
