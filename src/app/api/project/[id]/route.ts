import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
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

async function readManuscript(projectPath: string): Promise<string> {
  try {
    const manuscriptPath = path.join(projectPath, 'manuscript.md');
    if (existsSync(manuscriptPath)) {
      return await readFile(manuscriptPath, 'utf8');
    }
    return '';
  } catch (error) {
    return '';
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const projectPath = path.join(process.cwd(), MAIN_FOLDER, id);

    // Check if project directory exists
    if (!existsSync(projectPath)) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Read project data
    const metadata = await readMetadata(projectPath);
    const manuscript = await readManuscript(projectPath);

    return NextResponse.json({
      id,
      metadata,
      manuscript
    });

  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    );
  }
} 