'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

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
  [key: string]: any;
}

export default function ProjectDetails() {
  const params = useParams();
  const router = useRouter();
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [projectMetadata, setProjectMetadata] = useState<ProjectMetadata>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          } catch (error) {
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
        <div className="card bg-base-200 shadow-xl mb-8">
          <div className="card-body">
            <h2 className="card-title">Project Information</h2>
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
        <div className="steps steps-vertical w-full">
          {/* Manuscript Step */}
          <div className="step step-primary">
            <div className="step-content w-full">
              <div className="collapse collapse-arrow bg-base-100 shadow-xl w-full">
                <input type="checkbox" className="peer" defaultChecked />
                <div className="collapse-title text-xl font-medium">
                  Manuscript
                </div>
                <div className="collapse-content">
                  <div className="prose max-w-none">
                    {projectData?.manuscript ? (
                      <pre className="whitespace-pre-wrap text-sm">{projectData.manuscript}</pre>
                    ) : (
                      <p className="text-base-content/50 italic">No manuscript content</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Audio Step */}
          <div className="step step-primary">
            <div className="step-content w-full">
              <div className="collapse collapse-arrow bg-base-100 shadow-xl w-full">
                <input type="checkbox" className="peer" />
                <div className="collapse-title text-xl font-medium">
                  Audio
                </div>
                <div className="collapse-content">
                  <div className="prose max-w-none">
                    {projectData?.audioForPresentation ? (
                      <pre className="whitespace-pre-wrap text-sm">{projectData.audioForPresentation}</pre>
                    ) : (
                      <p className="text-base-content/50 italic">No audio script content</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Step */}
          <div className="step step-primary">
            <div className="step-content w-full">
              <div className="collapse collapse-arrow bg-base-100 shadow-xl w-full">
                <input type="checkbox" className="peer" />
                <div className="collapse-title text-xl font-medium">
                  Summary for Slides
                </div>
                <div className="collapse-content">
                  <div className="prose max-w-none">
                    {projectData?.summaryForPresentation ? (
                      <pre className="whitespace-pre-wrap text-sm">{projectData.summaryForPresentation}</pre>
                    ) : (
                      <p className="text-base-content/50 italic">No summary content</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Slides Step */}
          <div className="step step-primary">
            <div className="step-content w-full">
              <div className="collapse collapse-arrow bg-base-100 shadow-xl w-full">
                <input type="checkbox" className="peer" />
                <div className="collapse-title text-xl font-medium">
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