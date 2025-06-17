import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';

const MAIN_FOLDER = 'storage';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { githubUrl } = body;

    if (!githubUrl) {
      return NextResponse.json({ error: 'GitHub URL is required' }, { status: 400 });
    }

    // Validate GitHub URL format
    const githubUrlRegex = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/;
    if (!githubUrlRegex.test(githubUrl.replace(/\/$/, ''))) {
      return NextResponse.json({ error: 'Invalid GitHub URL format' }, { status: 400 });
    }

    // Extract project name from GitHub URL (last part of the path)
    const urlParts = githubUrl.replace(/\/$/, '').split('/');
    const projectName = urlParts[urlParts.length - 1];
    
    // Validate project name
    if (!projectName || projectName.length === 0) {
      return NextResponse.json({ error: 'Could not extract project name from URL' }, { status: 400 });
    }

    // Generate unique project ID
    const projectId = randomBytes(8).toString('hex');

    // Create project directory
    const projectDir = path.join(process.cwd(), MAIN_FOLDER, projectId);
    
    if (!existsSync(projectDir)) {
      await mkdir(projectDir, { recursive: true });
    }

    // Create metadata.json
    const metadata = {
      projectName,
      githubUrl: githubUrl.replace(/\/$/, ''), // Remove trailing slash
      timeCreated: new Date().toISOString()
    };

    const metadataPath = path.join(projectDir, 'metadata.json');
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');

    return NextResponse.json({ 
      success: true, 
      projectId,
      projectName,
      metadata 
    });

  } catch (error) {
    console.error('Error creating project:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create project';
    return NextResponse.json({ 
      error: `Failed to create project: ${errorMessage}` 
    }, { status: 500 });
  }
}