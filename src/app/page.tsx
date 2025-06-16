export default function Home() {
  return (
    <div className="min-h-screen bg-base-100">
      {/* Hero Section */}
      <div className="hero min-h-screen">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <h1 className="text-5xl font-bold mb-4">Git History Presentation Generator</h1>
            <p className="mb-8">
              Transform your Git repository's weekly progress into compelling presentations and interactive demos automatically.
            </p>
            
            <div className="flex justify-center">
              <button className="btn btn-primary btn-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Generate Presentation
              </button>
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
