/**
 * Simple hash-based embedding with cosine similarity fallback.
 * No external API needed — works offline with deterministic vectors.
 * Replace with OpenAI/Ollama embeddings for production quality.
 */

const VECTOR_DIM = 64;

/** Generate a deterministic embedding vector from text using hash-based approach */
export function embed(text: string): number[] {
  const normalized = text.toLowerCase().trim();
  const vec = new Array(VECTOR_DIM).fill(0);

  // Character n-gram hashing into vector buckets
  for (let n = 1; n <= 3; n++) {
    for (let i = 0; i <= normalized.length - n; i++) {
      const gram = normalized.slice(i, i + n);
      const hash = simpleHash(gram);
      const bucket = Math.abs(hash) % VECTOR_DIM;
      vec[bucket] += (hash > 0 ? 1 : -1) * (1 / n);
    }
  }

  // Word-level features
  const words = normalized.split(/\s+/).filter(Boolean);
  for (const word of words) {
    const hash = simpleHash(word);
    const bucket = Math.abs(hash) % VECTOR_DIM;
    vec[bucket] += hash > 0 ? 2 : -2;
  }

  return normalize(vec);
}

/** Cosine similarity between two vectors */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

function normalize(vec: number[]): number[] {
  let mag = 0;
  for (const v of vec) mag += v * v;
  mag = Math.sqrt(mag);
  return mag === 0 ? vec : vec.map(v => v / mag);
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return hash;
}
