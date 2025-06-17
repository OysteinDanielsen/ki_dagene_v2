import { NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Slide {
  title: string;
  content: string;
  type: "title" | "content" | "image" | "bullet";
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Await params in Next.js 13+ route handlers
    const id = await params.id;
    if (!id) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    // Get the project data using absolute URL
    const origin = request.headers.get('origin') || 'http://localhost:3000';
    const projectResponse = await fetch(`${origin}/api/project/${id}`, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!projectResponse.ok) {
      throw new Error("Failed to fetch project data");
    }
    const projectData = await projectResponse.json();

    // Generate slides using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are a professional presentation designer. Create a presentation based on the following manuscript. 
          Follow these rules:
          1. Create 5-7 slides
          2. Start with a title slide
          3. End with a conclusion slide
          4. Each slide should have a clear title and concise content
          5. Use bullet points where appropriate
          6. Keep text brief and impactful
          7. Format the response as a JSON array of slides, where each slide has:
             - title: string
             - content: string
             - type: "title" | "content" | "image" | "bullet"
          8. Focus on key points and main ideas
          9. Make it engaging and professional`,
        },
        {
          role: "user",
          content: projectData.manuscript || "",
        },
      ],
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error("No content received from OpenAI");
    }

    const slides = JSON.parse(content).slides;

    return NextResponse.json({ slides });
  } catch (error) {
    console.error("Error generating slides:", error);
    return NextResponse.json(
      { error: "Failed to generate slides" },
      { status: 500 }
    );
  }
} 