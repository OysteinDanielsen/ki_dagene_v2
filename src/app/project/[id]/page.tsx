'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';

interface ProjectData {
  manuscript: string;
  summaryForPresentation: string;
  audioForPresentation: string;
  metadata: string;
}

interface ProjectMetadata {
  timeCreated?: string;
  githubUrl?: string;
  projectName?: string;
  [key: string]: string | number | boolean | null | undefined;
}

export default function ProjectDetails() {
  const params = useParams();
  const router = useRouter();
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [projectMetadata, setProjectMetadata] = useState<ProjectMetadata>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manuscriptLoading, setManuscriptLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [manuscriptError, setManuscriptError] = useState<string | null>(null);

  const projectId = params.id as string;

  useEffect(() => {
    async function fetchProjectData() {
      try {
        const response = await fetch(`/api/files/${projectId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch project data');
        }
        const data = await response.json();
        setProjectData(data);

        // Parse metadata if it exists and is valid JSON
        if (data.metadata) {
          try {
            const parsedMetadata = JSON.parse(data.metadata);
            setProjectMetadata(parsedMetadata);
          } catch {
            // If metadata is not valid JSON, treat it as text
            setProjectMetadata({ description: data.metadata });
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    if (projectId) {
      fetchProjectData();
    }
  }, [projectId]);


  const generateManuscript = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setManuscriptLoading(true);
    setStreamingText('');
    setManuscriptError(null);
    
    try {
      console.log('Starting manuscript generation...');
      
      const response = await fetch(`/api/project/${projectId}/manuscript`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.status === 'starting') {
                console.log('Generation started');
              } else if (data.chunk) {
                setStreamingText(prev => prev + data.chunk);
              } else if (data.complete) {
                console.log('Generation completed');
                setManuscriptLoading(false);
                setTimeout(() => window.location.reload(), 1000);
                return;
              } else if (data.error) {
                console.error('Claude API error received:', data.error);
                setManuscriptError(data.error);
                setManuscriptLoading(false);
                setStreamingText('');
                return;
              }
            } catch (parseError) {
              console.warn('Failed to parse SSE data:', parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error generating manuscript:', error);
      setManuscriptLoading(false);
      setStreamingText('');
      setManuscriptError(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const generateSummary = async () => {
    setSummaryLoading(true);
    try {
      const response = await fetch(`/api/project/${projectId}/summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: `# Summary for Presentation - ${projectMetadata.projectName || projectId}

## Project Overview
- **Project ID:** ${projectId}
- **Created:** ${projectMetadata.timeCreated ? new Date(projectMetadata.timeCreated).toLocaleDateString() : 'Unknown'}
- **Repository:** ${projectMetadata.githubUrl || 'Not specified'}

## Key Points for Slides

### Slide 1: Introduction
- Project name and purpose
- Brief overview of objectives

### Slide 2: Technical Details
- Technology stack
- Architecture overview
- Key components

### Slide 3: Implementation
- Development process
- Key features implemented
- Challenges overcome

### Slide 4: Results
- Achievements
- Performance metrics
- Lessons learned

### Slide 5: Next Steps
- Future improvements
- Roadmap
- Conclusion

## Presentation Notes
This summary provides the key points to include in your presentation slides. Customize each section based on your project's specific details and requirements.`
        })
      });

      if (response.ok) {
        // Refresh project data to show the new summary
        window.location.reload();
      } else {
        console.error('Failed to generate summary');
      }
    } catch (error) {
      console.error('Error generating summary:', error);
    } finally {
      setSummaryLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-base-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p className="text-error mb-4">{error}</p>
          <button 
            className="btn btn-primary"
            onClick={() => router.push('/')}
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100">
      {/* Header */}
      <div className="navbar bg-base-200">
        <div className="navbar-start">
          <button 
            className="btn btn-ghost"
            onClick={() => router.push('/')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Projects
          </button>
        </div>
        <div className="navbar-center">
          <h1 className="text-xl font-bold">
            {projectMetadata.githubUrl && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline mr-2" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
            )}
            {projectMetadata.projectName || projectId}
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Project Info */}
        <div className="collapse collapse-arrow bg-base-200 shadow-xl mb-8">
          <input type="checkbox" className="peer" />
          <div className="collapse-title text-xl font-medium">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Project Information
          </div>
          <div className="collapse-content">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Project ID:</label>
                <div className="badge badge-neutral">{projectId}</div>
              </div>
              {projectMetadata.timeCreated && (
                <div>
                  <label className="label">Created:</label>
                  <div className="badge badge-secondary">
                    {new Date(projectMetadata.timeCreated).toLocaleString()}
                  </div>
                </div>
              )}
              {projectMetadata.githubUrl && (
                <div className="md:col-span-2">
                  <label className="label">Repository:</label>
                  <a 
                    href={projectMetadata.githubUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="link link-primary"
                  >
                    {projectMetadata.githubUrl}
                  </a>
                </div>
              )}
              {projectMetadata.projectName && (
                <div>
                  <label className="label">Project Name:</label>
                  <div className="text-sm">{projectMetadata.projectName}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content Steps */}
        <div className="relative">
          {/* Continuous line */}
          <div className="absolute left-4 top-8 w-0.5 bg-primary/50 z-0" style={{height: 'calc(100% - 2rem)'}}></div>
          
          {/* Manuscript Step */}
          <div className="flex items-start gap-4 relative z-10 mb-8">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 bg-primary text-primary-content rounded-full flex items-center justify-center text-sm font-bold">1</div>
            </div>
            <div className="flex-1 -mt-1">
              <div className="collapse collapse-arrow bg-base-100 shadow-xl w-full">
                <input type="checkbox" className="peer" defaultChecked />
                <div className="collapse-title text-xl font-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Manuscript
                </div>
                <div className="collapse-content">
                  <div className="prose max-w-none">
                    {projectData?.manuscript ? (
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{projectData.manuscript}</ReactMarkdown>
                      </div>
                    ) : manuscriptError ? (
                      <div className="text-center py-8">
                        <div className="alert alert-error mb-4">
                          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <h3 className="font-bold">Generation Failed</h3>
                            <div className="text-xs">{manuscriptError}</div>
                          </div>
                        </div>
                        <button 
                          type="button"
                          className="btn btn-primary"
                          onClick={generateManuscript}
                          disabled={manuscriptLoading}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Try Again
                        </button>
                      </div>
                    ) : manuscriptLoading && streamingText ? (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <span className="loading loading-spinner loading-sm"></span>
                          <span className="text-sm text-base-content/70">Generating manuscript...</span>
                        </div>
                        <div className="bg-base-200 p-4 rounded prose prose-sm max-w-none">
                          <ReactMarkdown>{streamingText}</ReactMarkdown>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-base-content/50 italic mb-4">No manuscript content</p>
                        <button 
                          type="button"
                          className="btn btn-primary"
                          onClick={generateManuscript}
                          disabled={manuscriptLoading}
                        >
                          {manuscriptLoading ? (
                            <>
                              <span className="loading loading-spinner loading-sm"></span>
                              Generating...
                            </>
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              Generate Manuscript
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Audio Step */}
          <div className="flex items-start gap-4 relative z-10 mb-8">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 bg-primary text-primary-content rounded-full flex items-center justify-center text-sm font-bold">2</div>
            </div>
            <div className="flex-1 -mt-1">
              <div className="collapse collapse-arrow bg-base-100 shadow-xl w-full">
                <input type="checkbox" className="peer" />
                <div className="collapse-title text-xl font-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  Audio
                </div>
                <div className="collapse-content">
                  <div className="prose max-w-none">
                    {projectData?.audioForPresentation ? (
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{projectData.audioForPresentation}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="text-base-content/50 italic">No audio script content</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Step */}
          <div className="flex items-start gap-4 relative z-10 mb-8">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 bg-primary text-primary-content rounded-full flex items-center justify-center text-sm font-bold">3</div>
            </div>
            <div className="flex-1 -mt-1">
              <div className="collapse collapse-arrow bg-base-100 shadow-xl w-full">
                <input type="checkbox" className="peer" />
                <div className="collapse-title text-xl font-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  Summary for Slides
                </div>
                <div className="collapse-content">
                  <div className="prose max-w-none">
                    {projectData?.summaryForPresentation ? (
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{projectData.summaryForPresentation}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-base-content/50 italic mb-4">No summary content</p>
                        <button 
                          className="btn btn-primary"
                          onClick={generateSummary}
                          disabled={summaryLoading}
                        >
                          {summaryLoading ? (
                            <>
                              <span className="loading loading-spinner loading-sm"></span>
                              Generating...
                            </>
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              Generate Summary
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Slides Step */}
          <div className="flex items-start gap-4 relative z-10">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 bg-primary text-primary-content rounded-full flex items-center justify-center text-sm font-bold">4</div>
            </div>
            <div className="flex-1 -mt-1">
              <div className="collapse collapse-arrow bg-base-100 shadow-xl w-full">
                <input type="checkbox" className="peer" />
                <div className="collapse-title text-xl font-medium">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 inline mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 3h10a2 2 0 012 2v8a2 2 0 01-2 2H7a2 2 0 01-2-2V9a2 2 0 012-2z" />
                  </svg>
                  Slides
                </div>
                <div className="collapse-content">
                  <div className="prose max-w-none">
                    <p className="text-base-content/50 italic">No slides content available</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}