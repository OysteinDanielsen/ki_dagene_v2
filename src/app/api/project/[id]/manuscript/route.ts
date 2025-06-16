import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const MAIN_FOLDER = 'storage';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { text } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing project id' }, { status: 400 });
    }

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    // Create directory path
    const dirPath = path.join(process.cwd(), MAIN_FOLDER, id);
    
    // Create directory if it doesn't exist
    if (!existsSync(dirPath)) {
      await mkdir(dirPath, { recursive: true });
    }

    // Save manuscript content to file
    const filePath = path.join(dirPath, 'manuscript.md');
    await writeFile(filePath, text, 'utf8');

    return NextResponse.json({ text: 'Manuscript saved successfully' });

  } catch (error) {
    console.error('Error saving manuscript:', error);
    return NextResponse.json({ text: 'Failed to save manuscript' }, { status: 500 });
  }
}