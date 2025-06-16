import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const MAIN_FOLDER = 'storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, filename, id } = body;

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    if (!filename) {
      return NextResponse.json({ error: 'No filename provided' }, { status: 400 });
    }

    if (!id) {
      return NextResponse.json({ error: 'No id provided' }, { status: 400 });
    }

    // Create directory path
    const dirPath = path.join(process.cwd(), MAIN_FOLDER, id);
    
    // Create directory if it doesn't exist
    if (!existsSync(dirPath)) {
      await mkdir(dirPath, { recursive: true });
    }

    // Ensure filename has .md extension
    const mdFilename = filename.endsWith('.md') ? filename : `${filename}.md`;

    // Save text content to file
    const filePath = path.join(dirPath, mdFilename);
    await writeFile(filePath, text, 'utf8');

    return NextResponse.json({ text: 'File saved successfully' });

  } catch (error) {
    console.error('Error saving file:', error);
    return NextResponse.json({ text: 'Failed to save file' }, { status: 500 });
  }
}