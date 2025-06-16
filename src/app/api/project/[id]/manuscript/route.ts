import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';

const MAIN_FOLDER = 'storage';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function* generateManuscriptWithClaudeStream(githubUrl: string, projectName: string) {
  try {
    const stream = await anthropic.beta.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 20000,
      temperature: 1,
      stream: true,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Please analyze the GitHub repository at ${githubUrl} and create a 1-minute presentation manuscript about the latest week's changes that would be noticeable to users.

Focus on:
- User-facing features and improvements
- Bug fixes that affect user experience
- New functionality or enhancements
- Performance improvements users would notice

Format the manuscript as a clear, engaging presentation script that can be read in about 60 seconds. Include an introduction, main points, and conclusion.

Project name: ${projectName}

Use web search to access the GitHub repository and analyze recent commits, pull requests, and releases to provide accurate, up-to-date information about what users would notice.`
            }
          ]
        }
      ],
      tools: [
        {
          name: "web_search",
          type: "web_search_20250305",
          allowed_domains: [
            "github.com"
          ]
        }
      ],
      thinking: {
        type: "enabled",
        budget_tokens: 16000
      },
      betas: ["web-search-2025-03-05"]
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && 'text' in chunk.delta) {
        yield chunk.delta.text;
      }
    }

  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw error;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Missing project id' }, { status: 400 });
    }

    // Read project metadata to get GitHub URL
    const metadataPath = path.join(process.cwd(), MAIN_FOLDER, id, 'metadata.json');
    
    if (!existsSync(metadataPath)) {
      return NextResponse.json({ error: 'Project metadata not found' }, { status: 404 });
    }

    const metadataContent = await readFile(metadataPath, 'utf8');
    const metadata = JSON.parse(metadataContent);
    
    if (!metadata.githubUrl) {
      return NextResponse.json({ error: 'GitHub URL not found in project metadata' }, { status: 400 });
    }

    // Create streaming response
    const encoder = new TextEncoder();
    let fullText = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log('Starting manuscript generation for:', metadata.githubUrl);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'starting' })}\n\n`));
          
          for await (const chunk of generateManuscriptWithClaudeStream(
            metadata.githubUrl, 
            metadata.projectName || id
          )) {
            fullText += chunk;
            console.log('Streaming chunk:', chunk.substring(0, 50) + '...');
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`));
          }

          console.log('Generation complete, saving file...');
          
          // Save the complete manuscript to file
          const dirPath = path.join(process.cwd(), MAIN_FOLDER, id);
          
          if (!existsSync(dirPath)) {
            await mkdir(dirPath, { recursive: true });
          }

          const filePath = path.join(dirPath, 'manuscript.md');
          await writeFile(filePath, fullText, 'utf8');

          console.log('File saved successfully');
          
          // Send completion signal
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ complete: true })}\n\n`));
          controller.close();
        } catch (error) {
          console.error('Error in stream:', error);
          let errorMessage = 'Failed to generate manuscript';
          
          if (error instanceof Error) {
            errorMessage = error.message;
          } else if (typeof error === 'object' && error !== null) {
            // Handle Anthropic API errors specifically
            if ('error' in error && typeof error.error === 'object') {
              errorMessage = error.error.message || error.message || errorMessage;
            } else if ('message' in error) {
              errorMessage = error.message;
            }
          }
          
          console.error('Sending error to client:', errorMessage);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`));
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Error generating manuscript:', error);
    return NextResponse.json({ text: 'Failed to generate manuscript' }, { status: 500 });
  }
}