import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import OpenAI from 'openai';

const MAIN_FOLDER = 'storage';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Function to clean text for TTS
function cleanTextForTTS(text: string): string {
  // Remove markdown headers but preserve paragraph breaks
  text = text.replace(/^#+\s+/gm, '');
  
  // Remove markdown links but keep the text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  
  // Remove markdown formatting
  text = text.replace(/(\*\*|__|\*|_|~~|`)/g, '');
  
  // Remove HTML tags
  text = text.replace(/<[^>]*>/g, '');
  
  // Remove emojis
  text = text.replace(/[\u{1F300}-\u{1F9FF}]/gu, '');
  
  // Preserve paragraph breaks and normalize spaces
  text = text
    .replace(/\n\s*\n/g, '\n\n') // Preserve paragraph breaks
    .replace(/[ \t]+/g, ' ')     // Normalize spaces
    .trim();
  
  return text;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { text, voiceId } = body;

    if (!id) {
      console.error('Missing project id');
      return NextResponse.json({ error: 'Missing project id' }, { status: 400 });
    }

    if (!text) {
      console.error('No text provided');
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    // Clean the text before sending to OpenAI
    const cleanedText = cleanTextForTTS(text);
    console.log('Original text length:', text.length);
    console.log('Cleaned text length:', cleanedText.length);

    // Generate speech using OpenAI
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: voiceId || "alloy", // Use selected voice or default to alloy
      response_format: "mp3",
      speed: 1.0,
      input: cleanedText
    });

    // Convert the response to a buffer
    const buffer = Buffer.from(await mp3.arrayBuffer());
    console.log('Audio buffer created, size:', buffer.length);

    if (buffer.length === 0) {
      console.error('Received empty buffer from OpenAI');
      return NextResponse.json(
        { error: 'Received empty audio data from OpenAI' },
        { status: 500 }
      );
    }

    // Create directory path
    const dirPath = path.join(process.cwd(), MAIN_FOLDER, id);
    console.log('Directory path:', dirPath);
    
    try {
      // Create directory if it doesn't exist
      if (!existsSync(dirPath)) {
        console.log('Creating directory:', dirPath);
        await mkdir(dirPath, { recursive: true });
      }
    } catch (error) {
      console.error('Error creating directory:', error);
      return NextResponse.json(
        { error: 'Failed to create directory for audio file' },
        { status: 500 }
      );
    }

    // Save audio file
    const audioPath = path.join(dirPath, 'presentation_audio.mp3');
    console.log('Saving audio file to:', audioPath);
    
    try {
      await writeFile(audioPath, buffer);
    } catch (error) {
      console.error('Error saving audio file:', error);
      return NextResponse.json(
        { error: 'Failed to save audio file' },
        { status: 500 }
      );
    }

    // Return the audio data
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Accept-Ranges': 'bytes'
      },
    });

  } catch (error) {
    console.error('Error generating audio:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate audio' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const audioPath = path.join(process.cwd(), MAIN_FOLDER, id, 'presentation_audio.mp3');

    if (!existsSync(audioPath)) {
      return new NextResponse(null, { status: 404 });
    }

    const buffer = await readFile(audioPath);
    if (buffer.length === 0) {
      return new NextResponse(null, { status: 404 });
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Accept-Ranges': 'bytes'
      },
    });
  } catch (error) {
    console.error('Error serving audio:', error);
    return new NextResponse(null, { status: 500 });
  }
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const audioPath = path.join(process.cwd(), MAIN_FOLDER, id, 'presentation_audio.mp3');

    if (!existsSync(audioPath)) {
      return new NextResponse(null, { status: 404 });
    }

    const stats = await readFile(audioPath);
    if (stats.length === 0) {
      return new NextResponse(null, { status: 404 });
    }

    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': stats.length.toString(),
        'Accept-Ranges': 'bytes'
      }
    });
  } catch (error) {
    console.error('Error checking audio:', error);
    return new NextResponse(null, { status: 500 });
  }
} 