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
Conduct a rigorous, professional assessment of theese ${thingName} implementations. Provide a high-density report that distinguishes between "code that works" and "code that scales."
1. Assessment Pillars

Evaluate all provided snippets against these universal dimensions:

    Architectural Integrity: Examine the interface design. Is the API "open" (extensible/interoperable) or "closed" (hardcoded/rigid)? Does it respect the standards of its environment (e.g., prop spreading in React, memory safety in C++, PEP8 in Python)?

    Data Flow & Logic: Does the code "clean" its inputs? Is there a single source of truth, or is state/data duplicated? Check for defensive programming (error handling, null checks, floating-point safety).

    Maintenance & DX (Developer Experience): 
        Boilerplate: How much code does a developer have to write to use this component?
        The 80/20 Rule: Does it provide shortcuts for the most common use cases (e.g., a unit prop) while still allowing full control for complex ones?
        Discovery: Is the component self-documenting (JSDoc, clear prop names)?

    Foundational Baseline vs. Over-engineering: Distinguish between "Standard Practice" (necessary for health) and "Premature Optimization" (unnecessary complexity).

2. Report Configuration

	The 'Comparison Matrix,' 'Technical Analysis,' and 'Implementation Tiers' format.

	For the Comparison Matrix:
			A table comparing implementations side-by-side across key technical features and standards.
			Rows should include technical features (Prop Spreading, Data Cleaning) and "Soft" features (DX, A11y) + other metrics/assesions, like for example: API Surface, Data Flow, Scalability, Integrity.
			Include visual indicators (✅/❌) or score (1-5) for quick scanning in fields where possible.
	
    No Hyperbole: Eliminate fluff words like "ultimate," "perfect," or "professional." Use objective, technical language.

    Technical Analysis: Grouped by impact (Infrastructure, Logic, maintainability). Focus on the consequence of each design choice.
	
    Tiered Ranking: Categorize implementations (e.g., Industrial Grade, Foundationally Sound, Feature-Specific, or Localized Prototype).

3. Input Data

Context: ${context || "Not provided"}.

Implementations:
${codeBlockSection}
`;

    console.log("--- PROMPT SENT TO MODEL ---");
    console.log(prompt);
    console.log("--- END OF PROMPT ---");

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    console.log("\n--- FULL ANSWER FROM MODEL ---");
    console.log(text);
    console.log("--- END OF ANSWER ---\n");

    // Extract table and generate summary scores
    let summaryScores = "";
    const tableRegex = /\|(.+)\|.*\n\|( *:?-+:? *\|)+\n(\|(.+)\|.*\n?)+/g;
    const match = text.match(tableRegex);

    if (match && match.length > 0) {
      const tableMarkdown = match[0];
      const scoringPrompt = `
Based on the following comparison matrix table, calculate a summary score for each implementation (column). 

Identify all metrics (rows) that imply a positive/negative value (e.g., ✅/❌/⚠️ (1/0/-1), High(2)/Medium(1)/Low(0), or numerical scores). 
Determine the total maximum points possible and the actual points achieved by each implementation. 

Present the result as a table with only the header (names) and score row in '### Summary Scores' section. 
Include a brief explanation of the scoring logic used.

Return ONLY the markdown for this 'Summary Scores' section.

Table:
${tableMarkdown}
`;

      try {
        const scoreResult = await model.generateContent(scoringPrompt);
        summaryScores = scoreResult.response.text();
        
        console.log("--- SUMMARY SCORES GENERATED ---");
        console.log(summaryScores);
        console.log("--- END OF SUMMARY ---");

        // Inject summary scores after the table
        const tableIndex = text.indexOf(tableMarkdown);
        if (tableIndex !== -1) {
          const afterTableIndex = tableIndex + tableMarkdown.length;
          text = text.slice(0, afterTableIndex) + "\n\n" + summaryScores + "\n\n" + text.slice(afterTableIndex);
        }
      } catch (scoreError) {
        console.error("Error generating summary scores:", scoreError);
      }
    }

    // Add Header and Appendix
    const header = `# Architectural Assessment Report for: ${thingName}\n\r\n**Code context:** ${context || "Not provided"} \r\n\r\n`;
    
    const appendix = `\n\n---\n\n### Appendix: Assessment Methodology\n\nThis report was generated by an AI architectural assessment engine using the following prompt configuration:\n\n\`\`\`text\n${prompt.trim()}\n\`\`\``;

    text = header + text + appendix;

    return NextResponse.json({ report: text });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return NextResponse.json(
      { error: "An error occurred while generating the report. " + (error.message || "") },
      { status: 500 }
    );
  }
}

