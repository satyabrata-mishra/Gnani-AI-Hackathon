import type { FilledField, ReviewResult } from "../engine/types";
import type { FormTemplate } from "../forms/types";

// Completed sessions, saved in this browser's IndexedDB (demo storage). IndexedDB keeps the
// answer recordings as Blobs, which localStorage cannot hold.

export interface Submission {
  id: string;
  createdAt: string;
  /** A copy of the form, so the record still renders if a custom form is edited or deleted. */
  template: FormTemplate;
  languageId: string;
  values: Record<string, FilledField>;
  skipped: string[];
  review: ReviewResult;
  conversation: { role: "bolo" | "user"; text: string; turn?: number; typed?: boolean }[];
  /** Answer recordings keyed by the session turn they produced. */
  clips: Record<number, Blob>;
}

const DB_NAME = "bolo";
const STORE = "submissions";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = op(tx.objectStore(STORE));
    tx.oncomplete = () => {
      db.close();
      resolve(req.result);
    };
    tx.onerror = tx.onabort = () => {
      db.close();
      reject(tx.error ?? new Error("Storage request failed"));
    };
  });
}

export async function saveSubmission(submission: Submission): Promise<void> {
  await run("readwrite", (s) => s.put(submission));
}

export async function listSubmissions(): Promise<Submission[]> {
  const all = await run<Submission[]>("readonly", (s) => s.getAll());
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getSubmission(id: string): Promise<Submission | undefined> {
  return run<Submission | undefined>("readonly", (s) => s.get(id));
}

export async function deleteSubmission(id: string): Promise<void> {
  await run("readwrite", (s) => s.delete(id));
}

export async function clearSubmissions(): Promise<void> {
  await run("readwrite", (s) => s.clear());
}
