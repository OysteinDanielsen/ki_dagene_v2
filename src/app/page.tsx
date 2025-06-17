'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Project {
  id: string;
  metadata: {
    timeCreated?: string;
    githubUrl?: string;
    projectName?: string;
    [key: string]: any;
  };
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [githubUrl, setGithubUrl] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchProjects() {
      try {
        const response = await fetch('/api/projects');
        const data = await response.json();
        setProjects(data.projects || []);
      } catch (error) {
        console.error('Failed to fetch projects:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, []);

  const createProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCreating(true);

    try {
      const response = await fetch('/api/projects/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ githubUrl }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to create project';
        try {
          const data = await response.json();
          errorMessage = data.error || errorMessage;
        } catch {
          // If response is not JSON, use status text
          errorMessage = `${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Reset form
      setGithubUrl('');
      
      // Refresh projects list
      const projectsResponse = await fetch('/api/projects');
      const projectsData = await projectsResponse.json();
      setProjects(projectsData.projects || []);

      // Navigate to the new project
      router.push(`/project/${data.projectId}`);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setCreating(false);
    }
  };
  return (
    <div className="min-h-screen bg-base-100">
      {/* Hero Section */}
      <div className="hero pt-8">
        <div className="hero-content text-center">
          <div className="max-w-3xl">
            <h1 className="text-5xl font-bold mb-4">Git History Presentation Generator</h1>
            <p className="mb-8">
              Transform your Git repository's weekly progress into compelling presentations and interactive demos automatically.
            </p>
            
            <div className="flex justify-center mb-12">
              <form onSubmit={createProject} className="w-full max-w-lg">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text text-lg font-medium">Enter GitHub Repository URL</span>
                  </label>
                  <div className="input-group">
                    <input
                      type="url"
                      placeholder="https://github.com/username/repository"
                      className="input input-bordered input-lg flex-1"
                      value={githubUrl}
                      onChange={(e) => setGithubUrl(e.target.value)}
                      required
                    />
                    <button 
                      type="submit" 
                      className="btn btn-primary btn-lg"
                      disabled={creating || !githubUrl.trim()}
                    >
                      {creating ? (
                        <>
                          <span className="loading loading-spinner loading-sm"></span>
                          Creating...
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          Create
                        </>
                      )}
                    </button>
                  </div>
                  {error && (
                    <label className="label">
                      <span className="label-text-alt text-error">{error}</span>
                    </label>
                  )}
                </div>
              </form>
            </div>

            {/* Projects Section */}
            <div className="w-full max-w-7xl mx-auto px-4 text-left">
              <h2 className="text-3xl font-bold text-center mb-12">Your Projects</h2>
              
              {loading ? (
                <div className="flex justify-center">
                  <span className="loading loading-spinner loading-lg"></span>
                </div>
              ) : projects.length > 0 ? (
                <div className="grid gap-6" style={{gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))'}}>
                  {projects.map((project) => (
                    <div 
                      key={project.id} 
                      className="card bg-base-100 shadow-xl cursor-pointer hover:shadow-2xl transition-shadow duration-200"
                      onClick={() => router.push(`/project/${project.id}`)}
                    >
                      <div className="card-body">
                        <h3 className="card-title text-sm">
                          {project.metadata.githubUrl && (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.30.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                            </svg>
                          )}
                          <span className="truncate">{project.metadata.projectName || project.id}</span>
                        </h3>
                        
                        {project.metadata.timeCreated && (
                          <div className="badge badge-secondary badge-sm mb-2">
                            {new Date(project.metadata.timeCreated).toLocaleDateString()}
                          </div>
                        )}
                        
                        <div className="text-xs text-base-content/50">
                          ID: {project.id}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-base-content/70">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-base-content/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <p className="text-lg mb-2">No projects found</p>
                  <p>Create your first project to get started</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 bg-base-200">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body items-center text-center">
                <div className="avatar">
                  <div className="w-16 rounded-full bg-primary text-primary-content flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <h3 className="card-title">Weekly Analysis</h3>
                <p>Automatically analyze your Git commits from the past week to identify key changes and improvements.</p>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body items-center text-center">
                <div className="avatar">
                  <div className="w-16 rounded-full bg-secondary text-secondary-content flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2h4a1 1 0 110 2h-1v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6H3a1 1 0 110-2h4z" />
                    </svg>
                  </div>
                </div>
                <h3 className="card-title">Smart Presentations</h3>
                <p>Generate beautiful, structured presentations highlighting your development progress and achievements.</p>
              </div>
            </div>

            <div className="card bg-base-100 shadow-xl">
              <div className="card-body items-center text-center">
                <div className="avatar">
                  <div className="w-16 rounded-full bg-accent text-accent-content flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1.01M15 10h1.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <h3 className="card-title">Interactive Demos</h3>
                <p>Create engaging demos that showcase your code changes with before/after comparisons and explanations.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How it Works Section */}
      <div className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">How it Works</h2>
          <div className="steps steps-vertical lg:steps-horizontal w-full">
            <div className="step step-primary">
              <div className="step-content">
                <h3 className="font-bold">Connect Repository</h3>
                <p>Link your Git repository to analyze commit history</p>
              </div>
            </div>
            <div className="step step-primary">
              <div className="step-content">
                <h3 className="font-bold">Analyze Changes</h3>
                <p>AI processes your weekly commits and identifies key developments</p>
              </div>
            </div>
            <div className="step step-primary">
              <div className="step-content">
                <h3 className="font-bold">Generate Content</h3>
                <p>Create presentations and demos showcasing your progress</p>
              </div>
            </div>
            <div className="step step-primary">
              <div className="step-content">
                <h3 className="font-bold">Present & Share</h3>
                <p>Export or present your generated content</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer footer-center p-10 bg-base-200 text-base-content">
        <aside>
          <p className="font-bold">Git History Presentation Generator</p>
          <p>Transform your development progress into compelling presentations</p>
        </aside>
      </footer>
    </div>
  );
}
