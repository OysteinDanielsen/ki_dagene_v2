"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { toast } from "react-hot-toast";
import pptxgen from "pptxgenjs";
import {
  PDFDownloadLink,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

interface ProjectData {
  id: string;
  manuscript: string;
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

interface Slide {
  title: string;
  content: string;
  type: "title" | "content" | "image" | "bullet";
}

// Create styles for the PDF
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#FFFFFF",
    padding: 30,
  },
  title: {
    fontSize: 24,
    textAlign: "center",
    marginVertical: 20,
    color: "#333333",
  },
  content: {
    fontSize: 12,
    textAlign: "justify",
    marginVertical: 10,
    lineHeight: 1.5,
  },
  bulletPoint: {
    marginBottom: 5,
  },
  list: {
    marginVertical: 10,
  },
});

const SlidesPDF = ({ slides }: { slides: Slide[] }) => (
  <Document>
    {slides.map((slide, index) => (
      <Page key={index} size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>{slide.title}</Text>
        {slide.type === "bullet" ? (
          <View style={styles.list}>
            {slide.content.split("\n").map((item, idx) => (
              <Text key={idx} style={styles.bulletPoint}>
                • {item.trim()}
              </Text>
            ))}
          </View>
        ) : (
          <Text style={styles.content}>{slide.content}</Text>
        )}
      </Page>
    ))}
  </Document>
);

export default function ProjectDetails() {
  const params = useParams();
  const router = useRouter();
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [projectMetadata, setProjectMetadata] = useState<ProjectMetadata>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manuscriptLoading, setManuscriptLoading] = useState(false);
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
    alloy: "Alloy (Male) - Balanced and versatile voice",
    echo: "Echo (Male) - Deep and resonant voice",
    fable: "Fable (Female) - Clear and engaging voice",
    onyx: "Onyx (Male) - Strong and authoritative voice",
    nova: "Nova (Female) - Warm and expressive voice",
    shimmer: "Shimmer (Female) - Soft and melodic voice",
  });
  const [enthusiasm, setEnthusiasm] = useState(0.5);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

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
          audioForPresentation: data.audioForPresentation,
          metadata: data.metadata,
        });
        setSlides(data.slides || []); // Initialize slides state
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
  }, [params.id, audioUrl]);

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

  const handleAudioError = (
    e: React.SyntheticEvent<HTMLAudioElement, Event>
  ) => {
    console.error("Audio playback error:", e);
    setAudioError(
      "Failed to play audio. The file might be corrupted or missing."
    );
    setAudioStatus("error");
  };

  const handleAudioLoad = () => {
    setAudioError(null);
  };

  const handleGenerateAudio = async () => {
    if (!projectData?.manuscript) {
      toast.error("Please generate manuscript content first.");
      return;
    }

    setAudioLoading(true);
    setIsGenerating(true);
    setAudioError(null);
    setAudioStatus("generating");

    try {
      const response = await fetch(`/api/project/${projectId}/audio`, {
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

      setAudioUrl(`/api/project/${projectId}/audio?_t=${Date.now()}`);
      setAudioExists(true);
      setAudioStatus("ready");
      toast.success("Audio generated successfully!");
    } catch (error) {
      console.error("Error generating audio:", error);
      setAudioError(
        error instanceof Error ? error.message : "Failed to generate audio."
      );
      setAudioStatus("error");
      setAudioUrl(null);
      setAudioExists(false);
    } finally {
      setAudioLoading(false);
      setIsGenerating(false);
    }
  };

  const handlePlayClick = async () => {
    if (audioExists && audioUrl) {
      if (audioRef.current) {
        audioRef.current.play().catch((e) => {
          console.error("Audio play failed:", e);
          toast.error("Failed to play audio.");
        });
      }
    } else if (projectData?.manuscript) {
      console.log("No audio file found, generating...");
      await handleGenerateAudio();
    } else {
      toast.error("Please generate manuscript content first.");
    }
  };

  const handleVoiceChange = (voiceId: string) => {
    setSelectedVoice(voiceId);
  };

  const handleGenerateSlides = async () => {
    if (!projectData?.manuscript) {
      toast.error("Please generate manuscript content first.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/project/${projectId}/slides`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ manuscript: projectData.manuscript }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate slides");
      }

      const data = await response.json();
      setSlides(data.slides);
      setCurrentSlideIndex(0);
      toast.success("Slides generated successfully!");
    } catch (error) {
      console.error("Error generating slides:", error);
      toast.error("Failed to generate slides.");
      setSlides([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPPTX = async () => {
    try {
      setIsExporting(true);
      const pptx = new pptxgen();

      // Set presentation properties for standard 16:9 layout
      pptx.layout = "LAYOUT_WIDE"; // 13.3 x 7.5 inches
      pptx.company = "AI Presentation Generator";
      pptx.author = "AI Assistant";

      // Define a consistent theme color palette
      const themeColor = "4472C4"; // Primary Blue
      const secondaryColor = "8FAADC"; // Lighter Blue
      const accentColor = "D9E1F2"; // Very light blue for subtle backgrounds
      const textColor = "333333"; // Dark grey for content text
      const lightTextColor = "666666"; // Medium grey for page numbers

      // Add slides
      slides.forEach((slide: Slide, index: number) => {
        const pptxSlide = pptx.addSlide();

        // --- Background Illustrations (Simplified & Subtle) ---
        // Large, subtle circle in top-right corner
        pptxSlide.addShape(pptx.ShapeType.ellipse, {
          x: 8.7, // Slightly off-canvas
          y: -0.7, // Slightly off-canvas
          w: 2.5,
          h: 2.5,
          fill: { color: accentColor, transparency: 70 },
          line: { color: accentColor, transparency: 70 },
        });

        // Large, subtle rectangle in bottom-left corner
        pptxSlide.addShape(pptx.ShapeType.rect, {
          x: -0.7, // Slightly off-canvas
          y: 6.2, // Slightly off-canvas
          w: 3.0,
          h: 1.0,
          fill: { color: accentColor, transparency: 75 },
          line: { color: accentColor, transparency: 75 },
        });

        // --- Header Bar (Increased Height) ---
        pptxSlide.addShape(pptx.ShapeType.rect, {
          x: 0,
          y: 0,
          w: "100%",
          h: 2.8, // Further increased header height to accommodate multi-line titles with more buffer
          fill: { color: themeColor },
          line: { color: themeColor },
        });

        // --- Title Text (Precisely Centered in Header) ---
        pptxSlide.addText([
          {
            text: slide.title,
            options: {
              x: 0,
              y: 0.8, // Adjusted Y for better vertical centering within the larger header
              w: "100%",
              h: 1.8, // Increased height for text box to accommodate multi-line titles
              fontSize: 24, // Optimized font size for safety with multi-lines
              color: "FFFFFF",
              bold: true,
              align: "center",
              fontFace: "Arial",
            },
          },
        ]);

        // --- Main Content Area (More Vertical Space) ---
        const contentYStart = 3.2; // Adjusted start Y to be even further below the taller header
        const contentWidth = 9.0;
        const contentHeight = 4.2; // Adjusted height for content area

        if (slide.type === "bullet") {
          const bulletPoints = slide.content
            .split("\n")
            .map((item: string) => ({
              text: item.trim(),
              options: {
                bullet: true,
                indentLevel: 0,
              },
            }));
          pptxSlide.addText(bulletPoints, {
            x: 0.7,
            y: contentYStart,
            w: contentWidth,
            h: contentHeight,
            fontSize: 18,
            color: textColor,
            align: "left",
            fontFace: "Arial",
            lineSpacing: 22,
          });
        } else {
          pptxSlide.addText([
            {
              text: slide.content,
              options: {
                x: 0.7,
                y: contentYStart,
                w: contentWidth,
                h: contentHeight,
                fontSize: 18,
                color: textColor,
                align: "left",
                fontFace: "Arial",
                lineSpacing: 22,
              },
            },
          ]);
        }

        // --- Page Number ---
        pptxSlide.addText([
          {
            text: `${index + 1}`,
            options: {
              x: 9.3,
              y: 6.8,
              w: 0.5,
              h: 0.5,
              fontSize: 12,
              color: lightTextColor,
              align: "right",
              fontFace: "Arial",
            },
          },
        ]);

        // --- Footer Bar ---
        pptxSlide.addShape(pptx.ShapeType.rect, {
          x: 0,
          y: 7.2,
          w: "100%",
          h: 0.3,
          fill: { color: themeColor, transparency: 80 },
          line: { color: themeColor, transparency: 80 },
        });

        // --- Slide-Specific Decorative Elements (Simplified & Controlled) ---
        if (slide.type === "title") {
          pptxSlide.addShape(pptx.ShapeType.trapezoid, {
            x: 7.0,
            y: 3.5,
            w: 2.0,
            h: 1.0,
            fill: { color: secondaryColor, transparency: 60 },
            line: { color: secondaryColor, transparency: 60 },
          });
        } else if (slide.type === "bullet") {
          pptxSlide.addShape(pptx.ShapeType.line, {
            x: 0.5,
            y: 1.8, // Aligned with content top, but visually distinct
            w: 0,
            h: 4.7, // Adjusted height to fit content area
            line: { color: secondaryColor, width: 2 },
          });
        } else {
          pptxSlide.addShape(pptx.ShapeType.rect, {
            x: 8.5,
            y: 5.5,
            w: 1.0,
            h: 0.7,
            fill: { color: accentColor, transparency: 50 },
            line: { color: accentColor, transparency: 50 },
          });
        }
      });

      // Save the presentation
      await pptx.writeFile({ fileName: "presentation.pptx" });
    } catch (error) {
      console.error("Error exporting to PowerPoint:", error);
      toast.error("Failed to export to PowerPoint");
    } finally {
      setIsExporting(false);
    }
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
        <div className="navbar-end">
          <button
            className="btn btn-ghost btn-circle"
            onClick={() => {
              // Handle settings or other actions
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-base-200 shadow-xl rounded-box p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">Project Details</h2>
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

        {/* Content Steps */}
        <div className="relative">
          {/* Continuous line */}
          <div
            className="absolute left-4 top-8 w-0.5 bg-primary/50 z-0"
            style={{ height: "calc(100% - 2rem)" }}
          ></div>

          <div className="flex flex-col gap-8">
            {/* Manuscript Step */}
            <div className="flex items-start gap-4 relative z-10 mb-8">
              <div className="flex flex-col items-center">
                <div className="w-8 h-8 bg-primary text-primary-content rounded-full flex items-center justify-center text-sm font-bold">
                  1
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
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Manuscript
                  </div>
                  <div className="collapse-content">
                    <div className="prose max-w-none">
                      {projectData?.manuscript ? (
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown>
                            {projectData.manuscript}
                          </ReactMarkdown>
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
                            <h3 className="font-bold">
                              Audio Generation Failed
                            </h3>
                            <div className="text-xs">{audioError}</div>
                          </div>
                        </div>
                      ) : null}

                      {/* Audio Player */}
                      {audioUrl && (
                        <div className="w-full mt-4">
                          <audio
                            ref={audioRef}
                            src={audioUrl}
                            controls
                            className="w-full"
                            onError={handleAudioError}
                            onLoadedData={handleAudioLoad}
                          >
                            Your browser does not support the audio element.
                          </audio>
                        </div>
                      )}

                      {/* Voice Selection */}
                      <div className="form-control w-full max-w-xs mt-4">
                        <label className="label">
                          <span className="label-text">Select Voice</span>
                        </label>
                        <select
                          className="select select-bordered w-full"
                          value={selectedVoice}
                          onChange={(e) => setSelectedVoice(e.target.value)}
                          disabled={audioLoading}
                        >
                          {Object.entries(availableVoices).map(
                            ([id, description]) => (
                              <option key={id} value={id}>
                                {description}
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      {/* Enthusiasm Slider */}
                      <div className="form-control w-full max-w-xs mt-4">
                        <label className="label">
                          <span className="label-text">Enthusiasm</span>
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={enthusiasm}
                          onChange={(e) =>
                            setEnthusiasm(parseFloat(e.target.value))
                          }
                          className="range range-primary"
                          disabled={audioLoading}
                        />
                        <div className="w-full flex justify-between text-xs px-2 mt-1">
                          <span>Calm</span>
                          <span>Enthusiastic</span>
                        </div>
                      </div>

                      {/* Generate Audio Button */}
                      <div className="mt-4">
                        <button
                          className="btn btn-primary"
                          onClick={handleGenerateAudio}
                          disabled={
                            audioLoading ||
                            !projectData?.manuscript ||
                            isGenerating
                          }
                        >
                          {audioLoading || isGenerating ? (
                            <>
                              <span className="loading loading-spinner loading-sm"></span>
                              {audioUrl
                                ? "Regenerating Audio..."
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
                                  d={
                                    audioUrl
                                      ? "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                      : "M12 6v6m0 0v6m0-6h6m-6 0H6"
                                  }
                                />
                              </svg>
                              {audioUrl ? "Regenerate Audio" : "Generate Audio"}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Slides Step */}
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
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    Presentation Slides
                  </div>
                  <div className="collapse-content">
                    {slides.length > 0 ? (
                      <div className="mt-4">
                        <div className="flex justify-center items-center mb-4 space-x-2">
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() =>
                              setCurrentSlideIndex((prev) =>
                                Math.max(0, prev - 1)
                              )
                            }
                            disabled={currentSlideIndex === 0}
                          >
                            Previous
                          </button>
                          <span className="text-sm font-medium">
                            Slide {currentSlideIndex + 1} of {slides.length}
                          </span>
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() =>
                              setCurrentSlideIndex((prev) =>
                                Math.min(slides.length - 1, prev + 1)
                              )
                            }
                            disabled={currentSlideIndex === slides.length - 1}
                          >
                            Next
                          </button>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-inner flex flex-col items-center justify-center text-black">
                          <h3 className="text-2xl font-bold mb-4 text-center">
                            {slides[currentSlideIndex].title}
                          </h3>
                          <div className="w-full">
                            {slides[currentSlideIndex].type === "bullet" ? (
                              <ul className="list-disc pl-6 space-y-2">
                                {slides[currentSlideIndex].content
                                  .split("\n")
                                  .map((item, index) => (
                                    <li key={index} className="text-lg">
                                      {item.trim()}
                                    </li>
                                  ))}
                              </ul>
                            ) : (
                              <p className="text-lg text-center">
                                {slides[currentSlideIndex].content}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-center gap-4 mt-8">
                          <button
                            className="btn btn-secondary"
                            onClick={handleGenerateSlides}
                            disabled={loading || !projectData?.manuscript}
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
                            Regenerate Slides
                          </button>
                          <button
                            className="btn btn-accent"
                            onClick={handleExportPPTX}
                            disabled={isExporting || slides.length === 0}
                          >
                            {isExporting ? (
                              <>
                                <span className="loading loading-spinner loading-sm"></span>
                                Exporting PPTX...
                              </>
                            ) : (
                              <>
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={1.5}
                                  stroke="currentColor"
                                  className="h-5 w-5 mr-2"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                                  />
                                </svg>
                                Export PPTX
                              </>
                            )}
                          </button>
                          <PDFDownloadLink
                            document={<SlidesPDF slides={slides} />}
                            fileName="presentation.pdf"
                          >
                            {({ blob, url, loading, error }) => (
                              <button
                                className="btn btn-info"
                                disabled={loading || slides.length === 0}
                              >
                                {loading ? (
                                  <>
                                    <span className="loading loading-spinner loading-sm"></span>
                                    Generating PDF...
                                  </>
                                ) : (
                                  <>
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      fill="none"
                                      viewBox="0 0 24 24"
                                      strokeWidth={1.5}
                                      stroke="currentColor"
                                      className="h-5 w-5 mr-2"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12H7.5m3 0h3.75m-9.75 1.51c0 1.45 3.0 2.625 7.5 2.625s7.5-1.175 7.5-2.625M4.5 12v-1.5V9H5.25M6 15.75H4.5v-3.75m0-1.5L4.5 9m0 0H3.75M15 12h-3m-4.5 2.25H4.5M12 10.5h.008v.008H12V10.5zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                                      />
                                    </svg>
                                    Export PDF
                                  </>
                                )}
                              </button>
                            )}
                          </PDFDownloadLink>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-base-content/50 italic mb-4">
                          No slides generated yet.
                        </p>
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={handleGenerateSlides}
                          disabled={loading || !projectData?.manuscript}
                        >
                          {loading ? (
                            <>
                              <span className="loading loading-spinner loading-sm"></span>
                              Generating Slides...
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
                              Generate Slides
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
  );
}
