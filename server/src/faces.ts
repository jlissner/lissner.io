import path from "path";
import { fileURLToPath } from "url";
import { readFile } from "fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const modelPath = path.join(
  __dirname,
  "../../node_modules/@vladmandic/face-api/model"
);

let initialized = false;

async function ensureInitialized() {
  if (initialized) return;
  await import("@tensorflow/tfjs-node");
  const faceapi = (await import("@vladmandic/face-api")) as typeof import("@vladmandic/face-api");
  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath);
  initialized = true;
}

function euclideanDistance(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

const FACE_MATCH_THRESHOLD = 0.6;

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

function clusterFaces(faces: FaceInImage[]): PersonCluster[] {
  const clusters: PersonCluster[] = [];

  for (const face of faces) {
    let bestCluster: PersonCluster | null = null;
    let bestDist = FACE_MATCH_THRESHOLD;

    for (const cluster of clusters) {
      const dist = euclideanDistance(face.descriptor, cluster.descriptor);
      if (dist < bestDist) {
        bestDist = dist;
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
  await ensureInitialized();
  const faceapi = (await import("@vladmandic/face-api")) as any;
  const tf = faceapi.tf as any;

  const buffer = await readFile(imagePath);
  const inputTensor = tf.tidy(() => {
    const decode = tf.node.decodeImage(buffer, 3);
    const expand = tf.expandDims(decode, 0);
    return tf.cast(expand, "float32");
  });


  const options = new faceapi.SsdMobilenetv1Options({
    minConfidence: 0.2,
    maxResults: 20,
  });

  const detections = await faceapi
    .detectAllFaces(inputTensor, options)
    .withFaceLandmarks()
    .withFaceDescriptors();

  inputTensor.dispose?.();

  return detections
    .filter((d: { descriptor?: number[] }) => d.descriptor)
    .map((d: {
      descriptor: number[];
      detection?: { box: { x: number; y: number; width: number; height: number } };
      alignedRect?: { box: { x: number; y: number; width: number; height: number } };
    }) => {
      const box = d.detection?.box ?? d.alignedRect?.box;
      return {
        imageId,
        descriptor: Array.from(d.descriptor),
        box: box ? { x: box.x, y: box.y, width: box.width, height: box.height } : undefined,
      };
    });
}

export interface ImagePersonEntry {
  personId: number;
  box?: { x: number; y: number; width: number; height: number };
}

export function clusterAllFaces(faces: FaceInImage[]): Map<string, ImagePersonEntry[]> {
  const clusters = clusterFaces(faces);
  const imageToEntries = new Map<string, ImagePersonEntry[]>();

  for (const cluster of clusters) {
    for (const { imageId, box } of cluster.faces) {
      const existing = imageToEntries.get(imageId) ?? [];
      if (!existing.some((e) => e.personId === cluster.id)) {
        existing.push({ personId: cluster.id, box });
        imageToEntries.set(imageId, existing);
      }
    }
  }

  return imageToEntries;
}
