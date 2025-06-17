import { NextResponse } from 'next/server';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

if (!ELEVENLABS_API_KEY) {
  throw new Error('ELEVENLABS_API_KEY is not set in environment variables');
}

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1';

// Default voice settings
const DEFAULT_VOICE_SETTINGS = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.0,
  use_speaker_boost: true
};

export async function GET() {
  try {
    console.log('Fetching voices from ElevenLabs API...');
    
    const response = await fetch(`${ELEVENLABS_API_URL}/voices`, {
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY
      } as HeadersInit
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error fetching voices:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      });
      throw new Error(`Failed to fetch voices: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('Received voices from ElevenLabs:', data);

    // Transform the voices data into our format
    const voices = data.voices.reduce((acc: Record<string, any>, voice: any) => {
      acc[voice.voice_id] = {
        name: voice.name,
        gender: voice.labels?.gender || 'unknown',
        accent: voice.labels?.accent || 'unknown',
        preview_url: voice.preview_url
      };
      return acc;
    }, {});

    console.log('Transformed voices:', voices);

    return NextResponse.json({
      voices,
      defaultVoiceSettings: DEFAULT_VOICE_SETTINGS
    });

  } catch (error) {
    console.error('Error in voices endpoint:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch voices',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 