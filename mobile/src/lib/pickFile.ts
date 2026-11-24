import * as DocumentPicker from 'expo-document-picker';

import type { PickedFile } from './resume';

export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

const RESUME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
];

/** The phone's file picker for a resume (PDF, DOCX, TXT up to 5 MB). Null when cancelled. */
export async function pickResumeFile(): Promise<PickedFile & { size?: number }> {
  const picked = await DocumentPicker.getDocumentAsync({ type: RESUME_TYPES, copyToCacheDirectory: true });
  if (picked.canceled || !picked.assets[0]) throw new PickCancelled();
  const f = picked.assets[0];
  if (f.size && f.size > MAX_RESUME_BYTES) throw new Error('That file is over 5 MB. Please choose a smaller PDF or DOCX.');
  return { uri: f.uri, name: f.name, mimeType: f.mimeType, size: f.size };
}

export class PickCancelled extends Error {
  constructor() {
    super('cancelled');
  }
}
