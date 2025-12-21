import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GOOGLE_GENERATIVE_AI_API_KEY } from "@/config/api";

export async function POST(req: NextRequest) {
  try {
    const { thingName, context, snippets } = await req.json();

    if (!thingName || !snippets || !Array.isArray(snippets) || snippets.length < 2) {
      return NextResponse.json(
        { error: "Invalid request. Please provide a name and at least two implementations." },
        { status: 400 }
      );
    }

    const apiKey = GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey || apiKey === "YOUR_API_KEY_HERE") {
      return NextResponse.json(
        { error: "Google Gemini API key is not configured in config/api.ts." },
        { status: 500 }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    let codeBlockSection = "";
    snippets.forEach((s) => {
      codeBlockSection += `\n${s.name}:\n\`\`\`${s.language || "javascript"}\n${s.content}\n\`\`\`\n`;
    });

    const prompt = `
I have ${snippets.length} implementations of the ${thingName}.

Context: ${context || "Not provided"}.

Task:

    Conduct a deep-dive architectural assessment. Challenge any patterns that lead to technical debt or 'closed' APIs.

    Compare the implementations based on Integrity, DX, UX, and Data Flow.

    Prepare a report for my lead/boss using the 'Comparison Matrix,' 'Technical Analysis,' and 'Implementation Tiers' format.

    Be objective and rigorous. Do not use hyperbolic titles or forced agreement. Focus on the 'Truth' of the code's scalability.

Implementations:
${codeBlockSection}
`;

    console.log("--- PROMPT SENT TO MODEL ---");
    console.log(prompt);
    console.log("--- END OF PROMPT ---");

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log("\n--- FULL ANSWER FROM MODEL ---");
    console.log(text);
    console.log("--- END OF ANSWER ---\n");

    return NextResponse.json({ report: text });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: "An error occurred while generating the report. " + (error.message || "") },
      { status: 500 }
    );
  }
}

