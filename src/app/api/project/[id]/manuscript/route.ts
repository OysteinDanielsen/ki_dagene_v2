import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';

const MAIN_FOLDER = 'storage';

// Configure route for longer timeout
export const maxDuration = 300; // 5 minutes
export const dynamic = 'force-dynamic';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 300000, // 5 minutes timeout
  maxRetries: 2,
});

async function* generateManuscriptWithClaudeStream(githubUrl: string, projectName: string) {
  try {
    const stream = await anthropic.beta.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8192,
      temperature: 1,
      stream: true,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Create a presentation manuscript for the GitHub repository: ${githubUrl}

IMPORTANT: Output the manuscript directly without any analysis steps or status messages.

Create a 1-minute presentation manuscript in Norwegian with:

## Structure:
1. **Introduksjon** (10 sekunder): Brief description of what ${projectName} does
2. **Hva er nytt** (50 sekunder): Recent changes and improvements that users would notice

## Requirements:
- Write in Norwegian
- Be engaging and easy to read
- Include mild humor
- Focus on user-facing features and benefits
- No technical jargon
- Complete sentences only
- Output manuscript text immediately

Start writing the manuscript now:` 
            }
          ]
        }
      ],
      mcp_servers: [
        {
          name: "Github",
          url: "https://api.githubcopilot.com/mcp/",
          type: "url",
          authorization_token: `${process.env.GITHUB_TOKEN}`
        }
      ],
      betas: ["mcp-client-2025-04-04"],
      thinking: {
        "type": "enabled",
        "budget_tokens": 1024
    },
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
        let keepAliveInterval: NodeJS.Timeout | null = null;
        
        try {
          console.log('Starting manuscript generation for:', metadata.githubUrl);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ status: 'starting' })}\n\n`));
          
          // Send keep-alive heartbeat every 30 seconds
          keepAliveInterval = setInterval(() => {
            try {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ heartbeat: Date.now() })}\n\n`));
            } catch {
              console.log('Keep-alive failed, connection likely closed');
              if (keepAliveInterval) clearInterval(keepAliveInterval);
            }
          }, 30000);
          
          let chunkCount = 0;
          const startTime = Date.now();
          
          for await (const chunk of generateManuscriptWithClaudeStream(
            metadata.githubUrl, 
            metadata.projectName || id
          )) {
            fullText += chunk;
            chunkCount++;
            
            console.log(`Chunk ${chunkCount}: ${chunk.substring(0, 50)}...`);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              chunk, 
              progress: { chunkCount, length: fullText.length }
            })}\n\n`));
            
            // Save progress every 10 chunks
            if (chunkCount % 10 === 0) {
              const dirPath = path.join(process.cwd(), MAIN_FOLDER, id);
              if (!existsSync(dirPath)) {
                await mkdir(dirPath, { recursive: true });
              }
              const tempPath = path.join(dirPath, 'manuscript_temp.md');
              await writeFile(tempPath, fullText, 'utf8');
              console.log(`Progress saved: ${chunkCount} chunks, ${fullText.length} chars`);
            }
          }

          const endTime = Date.now();
          console.log(`Generation complete in ${endTime - startTime}ms. Total chunks: ${chunkCount}, Length: ${fullText.length}`);
          
          // Clear keep-alive interval
          if (keepAliveInterval) {
            clearInterval(keepAliveInterval);
            keepAliveInterval = null;
          }
          
          // Save the complete manuscript to file
          const dirPath = path.join(process.cwd(), MAIN_FOLDER, id);
          
          if (!existsSync(dirPath)) {
            await mkdir(dirPath, { recursive: true });
          }

          const filePath = path.join(dirPath, 'manuscript.md');
          await writeFile(filePath, fullText, 'utf8');
          
          // Remove temp file if it exists
          const tempPath = path.join(dirPath, 'manuscript_temp.md');
          if (existsSync(tempPath)) {
            await writeFile(tempPath, '', 'utf8'); // Clear temp file
          }

          console.log('File saved successfully');
          
          // Send completion signal
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            complete: true, 
            stats: { chunkCount, length: fullText.length, duration: endTime - startTime }
          })}\n\n`));
          controller.close();
        } catch (error) {
          console.error('Error in stream:', error);
          let errorMessage = 'Failed to generate manuscript';
          
          if (error instanceof Error) {
            errorMessage = error.message;
          } else if (typeof error === 'object' && error !== null) {
            // Handle Anthropic API errors specifically
            if ('error' in error && typeof error.error === 'object' && error.error !== null) {
              const errorObj = error.error as Record<string, unknown>;
              const parentObj = error as Record<string, unknown>;
              errorMessage = (typeof errorObj.message === 'string' ? errorObj.message : '') || 
                           (typeof parentObj.message === 'string' ? parentObj.message : '') || 
                           errorMessage;
            } else if ('message' in error) {
              const errorObj = error as Record<string, unknown>;
              errorMessage = typeof errorObj.message === 'string' ? errorObj.message : errorMessage;
            }
          }
          
          console.error('Sending error to client:', errorMessage);
          
          // Clear keep-alive interval on error
          if (keepAliveInterval) {
            clearInterval(keepAliveInterval);
          }
          
          // Save partial content if we have any
          if (fullText.length > 0) {
            try {
              const dirPath = path.join(process.cwd(), MAIN_FOLDER, id);
              if (!existsSync(dirPath)) {
                await mkdir(dirPath, { recursive: true });
              }
              const partialPath = path.join(dirPath, 'manuscript_partial.md');
              await writeFile(partialPath, fullText, 'utf8');
              console.log(`Saved partial content: ${fullText.length} characters`);
            } catch (saveError) {
              console.error('Failed to save partial content:', saveError);
            }
          }
          
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
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    });

  } catch (error) {
    console.error('Error generating manuscript:', error);
    return NextResponse.json({ text: 'Failed to generate manuscript' }, { status: 500 });
  }
}