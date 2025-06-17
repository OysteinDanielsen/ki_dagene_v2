"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { toast } from "react-hot-toast";

interface ProjectData {
  id: string;
  manuscript: string;
  summaryForPresentation?: string;
  audioForPresentation?: string;
  metadata: {
    title?: string;
    description?: string;
    [key: string]: any;
  };
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
  const [streamingText, setStreamingText] = useState("");
  const [manuscriptError, setManuscriptError] = useState<string | null>(null);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioStatus, setAudioStatus] = useState<
    "idle" | "generating" | "ready" | "error"
  >("idle");
  const [audioExists, setAudioExists] = useState(false);
  const [isCheckingAudio, setIsCheckingAudio] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState("alloy");
  const [availableVoices, setAvailableVoices] = useState({
    alloy: "Male Voice (Clear, Professional)",
    echo: "Male Voice (Warm, Engaging)",
    fable: "Male Voice (Bright, Energetic)",
    onyx: "Male Voice (Deep, Authoritative)",
    nova: "Female Voice (Natural, Conversational)",
  });
  const [voiceSettings, setVoiceSettings] = useState({
    accent: 0.5,
    emotional_range: 0.5,
    intonation: 0.5,
    impressions: 0.5,
    speed: 0.5,
    tone: 0.5,
    whispering: 0.0,
  });
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const projectId = params.id as string;

  useEffect(() => {
    async function fetchProjectData() {
      try {
        setLoading(true);
        const response = await fetch(`/api/project/${params.id}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch project data");
        }
        const data = await response.json();
        setProjectData({
          id: data.id,
          manuscript: data.manuscript,
          summaryForPresentation: data.summaryForPresentation,
          audioForPresentation: data.audioForPresentation,
          metadata: data.metadata,
        });
      } catch (error) {
        console.error("Error fetching project data:", error);
        setError(
          error instanceof Error ? error.message : "Failed to load project data"
        );
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      fetchProjectData();
    }
  }, [params.id]);

  useEffect(() => {
    const checkAudio = async () => {
      try {
        setIsCheckingAudio(true);
        const response = await fetch(`/api/project/${params.id}/audio`, {
          method: "HEAD",
          headers: {
            Accept: "audio/mpeg",
          },
        });

        if (response.ok) {
          setAudioUrl(`/api/project/${params.id}/audio`);
        } else {
          setAudioStatus("idle");
        }
      } catch (error) {
        console.error("Error checking audio:", error);
        setAudioStatus("error");
        setAudioError("Failed to check audio status");
      } finally {
        setIsCheckingAudio(false);
      }
    };

    checkAudio();

    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [params.id]);

  const generateManuscript = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setManuscriptLoading(true);
    setStreamingText("");
    setManuscriptError(null);

    try {
      console.log("Starting manuscript generation...");

      const response = await fetch(`/api/project/${projectId}/manuscript`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.status === "starting") {
                console.log("Generation started");
              } else if (data.heartbeat) {
                console.log("Keep-alive heartbeat received");
              } else if (data.chunk) {
                setStreamingText((prev) => prev + data.chunk);
                if (data.progress) {
                  console.log(
                    `Progress: ${data.progress.chunkCount} chunks, ${data.progress.length} chars`
                  );
                }
              } else if (data.complete) {
                console.log("Generation completed");
                if (data.stats) {
                  console.log(
                    `Stats: ${data.stats.chunkCount} chunks, ${data.stats.length} chars, ${data.stats.duration}ms`
                  );
                }
                setManuscriptLoading(false);
                setTimeout(() => window.location.reload(), 1000);
                return;
              } else if (data.error) {
                console.error("Claude API error received:", data.error);
                setManuscriptError(data.error);
                setManuscriptLoading(false);
                setStreamingText("");
                return;
              }
            } catch (parseError) {
              console.warn("Failed to parse SSE data:", parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error generating manuscript:", error);
      setManuscriptLoading(false);
      setStreamingText("");
      setManuscriptError(
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  };

  const generateSummary = async () => {
    setSummaryLoading(true);
    try {
      const response = await fetch(`/api/project/${projectId}/summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: `# Summary for Presentation - ${
            projectMetadata.projectName || projectId
          }

## Project Overview
- **Project ID:** ${projectId}
- **Created:** ${
            projectMetadata.timeCreated
              ? new Date(projectMetadata.timeCreated).toLocaleDateString()
              : "Unknown"
          }
- **Repository:** ${projectMetadata.githubUrl || "Not specified"}

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
This summary provides the key points to include in your presentation slides. Customize each section based on your project's specific details and requirements.`,
        }),
      });

      if (response.ok) {
        // Refresh project data to show the new summary
        window.location.reload();
      } else {
        console.error("Failed to generate summary");
      }
    } catch (error) {
      console.error("Error generating summary:", error);
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleAudioError = (
    e: React.SyntheticEvent<HTMLAudioElement, Event>
  ) => {
    console.error("Audio playback error:", e);
    let errorMessage = "Could not play audio. ";

    const audioElement = e.currentTarget;
    if (audioElement.error) {
      switch (audioElement.error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          errorMessage +=
            "Playback was aborted. Try generating the audio again.";
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          errorMessage +=
            "A network error occurred. Try generating the audio again.";
          break;
        case MediaError.MEDIA_ERR_DECODE:
          errorMessage +=
            "Could not decode audio file. Try generating the audio again.";
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage +=
            "Audio format not supported. Try generating the audio again.";
          break;
        default:
          errorMessage += "Try generating the audio again.";
      }
    }

    setAudioError(errorMessage);
    setAudioStatus("error");
    setAudioUrl(null);
  };

  const handleAudioLoad = () => {
    setAudioError(null);
    setAudioStatus("ready");
  };

  const handleGenerateAudio = async () => {
    if (!projectData?.manuscript) {
      console.error("No content to generate audio from");
      return;
    }

    setIsGenerating(true);
    setAudioError(null);
    setAudioUrl(null);

    try {
      const response = await fetch(`/api/project/${params.id}/audio`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: projectData.manuscript,
          voiceId: selectedVoice,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate audio");
      }

      // Create a blob URL from the response
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      // Play the audio
      const audioElement = audioRef.current;
      if (audioElement) {
        audioElement.src = url;
        audioElement.load();
        await audioElement.play();
      }
    } catch (error) {
      console.error("Error generating audio:", error);
      setAudioError(
        error instanceof Error ? error.message : "Failed to generate audio"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayClick = async () => {
    if (!audioExists) {
      console.log("No audio file found, generating...");
      await handleGenerateAudio();
    }
  };

  const handleVoiceChange = (voiceId: string) => {
    setSelectedVoice(voiceId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-500 mb-4">{error}</div>
        <button onClick={() => router.push("/")} className="btn btn-primary">
          Back to Home
        </button>
      </div>
    );
  }

  if (!projectData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-500 mb-4">Project not found</div>
        <button onClick={() => router.push("/")} className="btn btn-primary">
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100">
      {/* Header */}
      <div className="navbar bg-base-200">
        <div className="navbar-start">
          <button className="btn btn-ghost" onClick={() => router.push("/")}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Projects
          </button>
        </div>
        <div className="navbar-center">
          <h1 className="text-xl font-bold">
            {projectMetadata.githubUrl && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 inline mr-2"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 inline mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
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
          <div
            className="absolute left-4 top-8 w-0.5 bg-primary/50 z-0"
            style={{ height: "calc(100% - 2rem)" }}
          ></div>

          {/* Manuscript Step */}
          <div className="flex items-start gap-4 relative z-10 mb-8">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 bg-primary text-primary-content rounded-full flex items-center justify-center text-sm font-bold">
                1
              </div>
            </div>
            <div className="flex-1 -mt-1">
              <div className="collapse collapse-arrow bg-base-100 shadow-xl w-full">
                <input type="checkbox" className="peer" defaultChecked />
                <div className="collapse-title text-xl font-medium">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 inline mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
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
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="stroke-current shrink-0 h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
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
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 mr-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                          Try Again
                        </button>
                      </div>
                    ) : manuscriptLoading && streamingText ? (
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <span className="loading loading-spinner loading-sm"></span>
                          <span className="text-sm text-base-content/70">
                            Generating manuscript...
                          </span>
                        </div>
                        <div className="bg-base-200 p-4 rounded prose prose-sm max-w-none">
                          <ReactMarkdown>{streamingText}</ReactMarkdown>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-base-content/50 italic mb-4">
                          No manuscript content
                        </p>
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
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 mr-2"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                />
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
              <div className="w-8 h-8 bg-primary text-primary-content rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
            </div>
            <div className="flex-1 -mt-1">
              <div className="collapse collapse-arrow bg-base-100 shadow-xl w-full">
                <input type="checkbox" className="peer" />
                <div className="collapse-title text-xl font-medium">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 inline mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                  Audio
                </div>
                <div className="collapse-content">
                  <div className="prose max-w-none">
                    {audioError ? (
                      <div className="alert alert-error mb-4">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="stroke-current shrink-0 h-6 w-6"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <div>
                          <h3 className="font-bold">Audio Generation Failed</h3>
                          <div className="text-xs">{audioError}</div>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-4">
                      <div className="collapse collapse-arrow bg-base-100 shadow-xl w-full">
                        <input type="checkbox" className="peer" />
                        <div className="collapse-title text-xl font-medium">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6 inline mr-2"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                            />
                          </svg>
                          Audio Settings
                        </div>
                        <div className="collapse-content">
                          <div className="space-y-4">
                            {isCheckingAudio ? (
                              <div className="flex items-center justify-center p-4">
                                <span className="loading loading-spinner loading-md"></span>
                                <span className="ml-2">
                                  Checking audio status...
                                </span>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {/* Audio Player */}
                                {audioUrl && (
                                  <div className="mt-4">
                                    <audio
                                      ref={audioRef}
                                      controls
                                      className="w-full"
                                      src={audioUrl}
                                      onError={handleAudioError}
                                      onLoadedData={handleAudioLoad}
                                      preload="auto"
                                      crossOrigin="anonymous"
                                    >
                                      Your browser does not support the audio
                                      element.
                                    </audio>
                                  </div>
                                )}

                                {/* Error Message */}
                                {audioError && (
                                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
                                    <p className="text-red-600">{audioError}</p>
                                  </div>
                                )}

                                {/* Loading State */}
                                {isGenerating && (
                                  <div className="mt-4 flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    <span className="ml-2 text-gray-600">
                                      Generating audio...
                                    </span>
                                  </div>
                                )}

                                {/* Audio Status */}
                                {!isGenerating && !audioUrl && !audioError && (
                                  <div className="mt-4 text-center text-gray-600">
                                    Click "Generate Audio" to create an audio
                                    version of the presentation
                                  </div>
                                )}

                                {/* Voice Selection */}
                                <div className="mt-4">
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select Voice
                                  </label>
                                  <select
                                    value={selectedVoice}
                                    onChange={(e) =>
                                      setSelectedVoice(e.target.value)
                                    }
                                    className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    disabled={isGenerating}
                                  >
                                    {Object.entries(availableVoices).map(
                                      ([id, name]) => (
                                        <option key={id} value={id}>
                                          {name}
                                        </option>
                                      )
                                    )}
                                  </select>
                                </div>

                                {/* Generate Button */}
                                <button
                                  className="btn btn-primary w-full mt-4"
                                  onClick={handleGenerateAudio}
                                  disabled={
                                    isGenerating || !projectData?.manuscript
                                  }
                                >
                                  {isGenerating ? (
                                    <>
                                      <span className="loading loading-spinner loading-sm"></span>
                                      {audioExists
                                        ? "Regenerating..."
                                        : "Generating Audio..."}
                                    </>
                                  ) : (
                                    <>
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-5 w-5 mr-2"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                                        />
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          strokeWidth={2}
                                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                      </svg>
                                      {audioExists
                                        ? "Regenerate Audio"
                                        : "Generate & Play Audio"}
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
                </div>
              </div>
            </div>
          </div>

          {/* Summary Step */}
          <div className="flex items-start gap-4 relative z-10 mb-8">
            <div className="flex flex-col items-center">
              <div className="w-8 h-8 bg-primary text-primary-content rounded-full flex items-center justify-center text-sm font-bold">
                3
              </div>
            </div>
            <div className="flex-1 -mt-1">
              <div className="collapse collapse-arrow bg-base-100 shadow-xl w-full">
                <input type="checkbox" className="peer" />
                <div className="collapse-title text-xl font-medium">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 inline mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                  Summary for Slides
                </div>
                <div className="collapse-content">
                  <div className="prose max-w-none">
                    {projectData?.summaryForPresentation ? (
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>
                          {projectData.summaryForPresentation}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-base-content/50 italic mb-4">
                          No summary content
                        </p>
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
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-5 w-5 mr-2"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                />
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
              <div className="w-8 h-8 bg-primary text-primary-content rounded-full flex items-center justify-center text-sm font-bold">
                4
              </div>
            </div>
            <div className="flex-1 -mt-1">
              <div className="collapse collapse-arrow bg-base-100 shadow-xl w-full">
                <input type="checkbox" className="peer" />
                <div className="collapse-title text-xl font-medium">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 inline mr-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 3h10a2 2 0 012 2v8a2 2 0 01-2 2H7a2 2 0 01-2-2V9a2 2 0 012-2z"
                    />
                  </svg>
                  Slides
                </div>
                <div className="collapse-content">
                  <div className="prose max-w-none">
                    <p className="text-base-content/50 italic">
                      No slides content available
                    </p>
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
