import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(req) {
  try {
    const { url } = await req.json();
    console.log("URL received:", url);

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    const html = await response.text();
    console.log("HTML fetched successfully.");

    const textContent = html
      .replace(/<[^>]*>?/gm, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    console.log("Text extracted:", textContent.slice(0, 300));

    // ✅ Use Gemini 2.5 Flash
    const model = genAI.getGenerativeModel({ model: 'models/gemini-2.5-flash' });

    // Summarization step
    const promptSummary = `Summarize this blog in 5 clear sentences:\n\n${textContent.slice(0, 12000)}`;
    const summaryResult = await model.generateContent(promptSummary);
    const summary = summaryResult.response.text();
    console.log("Summary generated:", summary);

    // Translation step
    const promptTranslate = `Translate the following summary into formal Urdu:\n\n${summary}`;
    const translationResult = await model.generateContent(promptTranslate);
    const urduTranslation = translationResult.response.text();
    console.log("Urdu translation generated.");

    return NextResponse.json({ summary, urduTranslation });
  } catch (error) {
    console.error("Error in summarization route:", error);
    return NextResponse.json(
      { error: 'An error occurred while processing your request.' },
      { status: 500 }
    );
  }
}
