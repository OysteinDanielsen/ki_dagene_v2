import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

const MAIN_FOLDER = 'storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const audioPath = path.join(process.cwd(), MAIN_FOLDER, id, 'presentation_audio.mp3');
    console.log('Looking for audio file at:', audioPath);

    if (!existsSync(audioPath)) {
      console.error('Audio file not found at:', audioPath);
      return NextResponse.json({ error: 'Audio file not found' }, { status: 404 });
    }

    console.log('Reading audio file...');
    const audioData = await readFile(audioPath);
    console.log('Audio file size:', audioData.length);

    // Create a new response with the audio data
    const response = new NextResponse(audioData, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioData.length.toString(),
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Accept-Ranges': 'bytes'
      }
    });

    // Log the response headers for debugging
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    return response;

  } catch (error) {
    console.error('Error serving audio file:', error);
    return NextResponse.json({ 
      error: 'Failed to serve audio file',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 