import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const MAIN_FOLDER = 'storage';

/**
 * Create a directory for a given ID
 */
export async function createDirectory(id: string): Promise<string> {
  const dirPath = path.join(process.cwd(), MAIN_FOLDER, id);
  
  if (!existsSync(dirPath)) {
    await mkdir(dirPath, { recursive: true });
  }
  
  return dirPath;
}

/**
 * Generate a unique ID for directories
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}