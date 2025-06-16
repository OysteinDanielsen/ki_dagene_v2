import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const MAIN_FOLDER = 'storage';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Save summary content to file
    const filePath = path.join(dirPath, 'summary_for_presentation.md');
    await writeFile(filePath, text, 'utf8');

    return NextResponse.json({ text: 'Summary saved successfully' });

  } catch (error) {
    console.error('Error saving summary:', error);
    return NextResponse.json({ text: 'Failed to save summary' }, { status: 500 });
  }
}