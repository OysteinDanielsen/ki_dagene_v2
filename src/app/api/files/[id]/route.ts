import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const MAIN_FOLDER = 'storage';

async function readFileContent(filePath: string): Promise<string> {
  if (existsSync(filePath)) {
    return await readFile(filePath, 'utf8');
  }
  return '';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    // Define file paths
    const basePath = path.join(process.cwd(), MAIN_FOLDER, id);
    const manuscriptPath = path.join(basePath, 'manuscript.md');
    const summaryPath = path.join(basePath, 'summary_for_presentation.md');
    const audioPath = path.join(basePath, 'audio_for_presentation.md');
    const metadataPath = path.join(basePath, 'metadata.json');

    // Read all files
    const manuscript = await readFileContent(manuscriptPath);
    const summaryForPresentation = await readFileContent(summaryPath);
    const audioForPresentation = await readFileContent(audioPath);
    const metadata = await readFileContent(metadataPath);

    return NextResponse.json({
      manuscript,
      summaryForPresentation,
      audioForPresentation,
      metadata
    });

  } catch (error) {
    console.error('Error serving files:', error);
    return NextResponse.json({ error: 'Failed to serve files' }, { status: 500 });
  }
}