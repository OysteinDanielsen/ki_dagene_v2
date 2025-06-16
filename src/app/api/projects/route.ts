import { NextRequest, NextResponse } from 'next/server';
import { readdir, stat, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const MAIN_FOLDER = 'storage';

async function readMetadata(projectPath: string): Promise<any> {
  try {
    const metadataPath = path.join(projectPath, 'metadata.json');
    if (existsSync(metadataPath)) {
      const metadataContent = await readFile(metadataPath, 'utf8');
      return JSON.parse(metadataContent);
    }
    return {};
  } catch (error) {
    return {};
  }
}

export async function GET(request: NextRequest) {
  try {
    const storagePath = path.join(process.cwd(), MAIN_FOLDER);

    // Check if storage directory exists
    if (!existsSync(storagePath)) {
      return NextResponse.json({ projects: [] });
    }

    // Read directory contents
    const items = await readdir(storagePath);
    
    // Filter to only include directories and get their metadata
    const projects = [];
    for (const item of items) {
      const itemPath = path.join(storagePath, item);
      const stats = await stat(itemPath);
      if (stats.isDirectory()) {
        const metadata = await readMetadata(itemPath);
        projects.push({
          id: item,
          metadata: metadata
        });
      }
    }

    return NextResponse.json({ projects });

  } catch (error) {
    console.error('Error listing projects:', error);
    return NextResponse.json({ error: 'Failed to list projects' }, { status: 500 });
  }
}