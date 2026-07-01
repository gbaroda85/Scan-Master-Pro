import localforage from 'localforage';
import { ScannedDocument } from './types';

const store = localforage.createInstance({ name: 'docscan', storeName: 'documents' });

export async function saveDocument(doc: ScannedDocument): Promise<void> {
  await store.setItem(doc.id, doc);
}

export async function loadAllDocuments(): Promise<ScannedDocument[]> {
  const docs: ScannedDocument[] = [];
  await store.iterate((val) => { docs.push(val as ScannedDocument); });
  return docs.sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteDocument(id: string): Promise<void> {
  await store.removeItem(id);
}