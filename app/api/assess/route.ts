import { NextRequest, NextResponse } from "next/server";
import { igniteEngine, Message } from "multi-llm-ts";
import { PROVIDERS } from "@/config/models";

export async function POST(req: NextRequest) {
  try {
    const { thingName, context, snippets, providerId, modelId } = await req.json();

    if (!thingName || !snippets || !Array.isArray(snippets) || snippets.length < 2) {
      return NextResponse.json(
        { error: "Invalid request. Please provide a name and at least two implementations." },
        { status: 400 }
      );
    }

    if (!providerId || !modelId) {
      return NextResponse.json(
        { error: "Provider and Model must be selected." },
        { status: 400 }
      );
    }

    const provider = PROVIDERS.find((p) => p.id === providerId);
    if (!provider) {
      return NextResponse.json(
        { error: `Provider ${providerId} not found.` },
        { status: 404 }
      );
    }

    const isConfigured = 
      (provider.apiKey && provider.apiKey !== "YOUR_API_KEY_HERE" && provider.apiKey !== "") ||
      (provider.baseURL && provider.baseURL !== "" && provider.id === "ollama");

    if (!isConfigured) {
      return NextResponse.json(
        { error: `Provider ${providerId} is not configured in config/.api.ts.` },
        { status: 500 }
      );
    }

    console.log(`--- INITIALIZING ENGINE: ${providerId} ---`);
    const engineConfig: any = { 
      timeout: 120000 // Increase timeout to 120 seconds for large architectural reports
    };

    if (provider.apiKey) engineConfig.apiKey = provider.apiKey;
    if (provider.baseURL) engineConfig.baseURL = provider.baseURL;

    const engine = igniteEngine(providerId, engineConfig);
    const chatModel = engine.buildModel(modelId);

    let codeBlockSection = "";
    snippets.forEach((s: any) => {
      codeBlockSection += `\n${s.name}:\n\`\`\`${s.language || "javascript"}\n${s.content}\n\`\`\`\n`;
    });

    const prompt = `
Conduct a rigorous, professional assessment of these ${thingName} implementations. Provide a high-density report that distinguishes between "code that works" and "code that scales."
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
			Include visual indicators (✅/❌ for discrete metrics), (⚠️ exclusively for risks) and/or score (1-5) for quick scanning in fields where possible.
	
    No Hyperbole: Eliminate fluff words like "ultimate," "perfect," or "professional." Use objective, technical language.

    Technical Analysis: Grouped by impact (Infrastructure, Logic, maintainability). Focus on the consequence of each design choice.
	
    Tiered Ranking: Categorize implementations (e.g., Industrial Grade, Foundationally Sound, Feature-Specific, or Localized Prototype).

3. Input Data

Context: ${context || "Not provided"}.

Implementations:
${codeBlockSection}
`;

    console.log(`--- PROMPT SENT TO ${providerId} (${modelId}) ---`);
    console.log(prompt);
    console.log("--- END OF PROMPT ---");

    let text = "";
    let reasoning = "";
    try {
      console.log(`--- CALLING ENGINE.GENERATE() FOR ${providerId} (Internal Streaming) ---`);
      const messages = [new Message("user", prompt)];
      
      const stream = engine.generate(chatModel, messages, {
        maxTokens: 6000,
        temperature: 1.0
      });

      for await (const chunk of stream) {
        if (chunk.type === 'content') {
          text += chunk.text || "";
        } else if (chunk.type === 'reasoning') {
          reasoning += chunk.text || "";
        }
      }
      
      if (reasoning) {
        console.log(`--- REASONING CAPTURED (${reasoning.length} chars) ---`);
      }

      if (!text) {
        throw new Error("LLM returned no content via stream");
      }
    } catch (chatError: any) {
      console.error(`--- ERROR DURING ENGINE.GENERATE() FOR ${providerId} ---`);
      console.error("Error Name:", chatError.name);
      console.error("Error Message:", chatError.message);
      if (chatError.stack) console.error("Stack Trace:", chatError.stack);
      
      // Check for Anthropic-specific errors
      const errorMsg = chatError.message || "";
      let userError = `LLM Chat Error (${providerId}/${modelId}): ${errorMsg}`;
      
      return NextResponse.json(
        { error: userError },
        { status: 500 }
      );
    }

    console.log("\n--- FULL ANSWER FROM MODEL ---");
    console.log(text);
    console.log("--- END OF ANSWER ---\n");

    // Extract table and generate summary scores
    let summaryScoresMarkdown = "";
    let structuredScores: Record<string, string> = {};
    const tableRegex = /\|(.+)\|.*\n\|( *:?-+:? *\|)+\n(\|(.+)\|.*\n?)+/g;
    const match = text.match(tableRegex);

    if (match && match.length > 0) {
      const tableMarkdown = match[0];
      const scoringPrompt = `
Based on the following comparison matrix table, calculate a summary score for each implementation (column). 

Identify all metrics (rows) that imply a positive/negative value (e.g., ✅=1/❌=0/⚠️=-1, High=2/Medium=1/Low=0, or numerical scores). 
Determine the total maximum points possible and the actual points achieved by each implementation. 

OUTPUT REQUIREMENTS:
Present the result as a table with only the header (names) and score row in '### Summary Scores' section. 
Include a brief explanation of the scoring logic used.
Return ONLY the markdown for this 'Summary Scores' section.
Return ALSO a JSON object at the end - put it inside \`\`\`json \`\`\` code block.

JSON STRUCTURE:
{
  "Exact Name 1": "7/15",
  "Exact Name 2": "3/15"
}


TABLE TO ANALYZE:
${tableMarkdown}
`;

      try {
        const scoreMessages = [new Message("user", scoringPrompt)];
        const scoreStream = engine.generate(chatModel, scoreMessages, {
          maxTokens: 6000,
          temperature: 0.0 // Strict extraction
        });

        let scoreText = "";
        for await (const chunk of scoreStream) {
          if (chunk.type === 'content') {
            scoreText += chunk.text || "";
          }
        }
        
        console.log("--- RAW SCORE RESPONSE ---");
        console.log(scoreText);
        
        // Parsing logic to separate Markdown from JSON
        try {
          // 1. Extract JSON block (inside ```json ... ``` or just { ... })
          const jsonRegex = /```json\s*([\s\S]*?)\s*```|({[\s\S]*})/;
          const jsonMatch = scoreText.match(jsonRegex);
          const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[2]) : "";
          
          if (jsonStr) {
            const parsedData = JSON.parse(jsonStr.trim());
            // If the model returned a nested 'data' key, use it, otherwise use the whole object
            structuredScores = parsedData.data || parsedData;
            
            // Everything before the JSON block or opening brace is the markdown
            summaryScoresMarkdown = scoreText.split(/```json|{/)[0].trim();
          } else {
            // No JSON found, fallback to everything
            summaryScoresMarkdown = scoreText;
          }
          
          console.log("--- SUMMARY SCORES PARSED ---");
          console.log(structuredScores);
        } catch (parseError) {
          console.error("Error parsing score JSON. Raw text was:", scoreText);
          
          // Emergency Fallback: Extract everything before any JSON-like start
          summaryScoresMarkdown = scoreText.split(/```json|{/)[0].trim();
          
          // Try to build a basic data object by looking for "Name": "Score"
          const candidateNames = tableMarkdown.split('\n')[0].split('|').slice(2).map(n => n.trim());
          candidateNames.forEach(name => {
            const regex = new RegExp(`"${name}"\\s*:\\s*"([^"]+)"`, 'i');
            const match = scoreText.match(regex);
            if (match) {
              structuredScores[name] = match[1];
            }
          });
        }

        // Inject summary scores after the table if we have markdown content
        if (summaryScoresMarkdown) {
          const tableIndex = text.indexOf(tableMarkdown);
          if (tableIndex !== -1) {
            const afterTableIndex = tableIndex + tableMarkdown.length;
            const formattedMarkdown = summaryScoresMarkdown.includes('### Summary Scores') 
              ? summaryScoresMarkdown 
              : "### Summary Scores\n\n" + summaryScoresMarkdown;
            
            text = text.slice(0, afterTableIndex) + "\n\n" + formattedMarkdown + "\n\n" + text.slice(afterTableIndex);
          }
        }
      } catch (scoreError) {
        console.error("Error generating summary scores:", scoreError);
      }
    }

    // Add Header and Appendix
    const header = `# Architectural Assessment Report for: ${thingName}\n\r\n**Code context:** ${context || "Not provided"} \r\n\r\n`;
    
    const appendix = `\n\n---\n\n### Appendix: Assessment Methodology\n\nThis report was generated by an AI architectural assessment engine using the following configuration:\n\n- **Provider:** ${providerId}\n- **Model:** ${modelId}\n\n#### Prompt Configuration:\n\n\`\`\`text\n${prompt.trim()}\n\`\`\``;

    text = header + text + appendix;

    return NextResponse.json({ 
      report: text,
      scores: structuredScores 
    });
  } catch (error: any) {
    console.error("LLM Error:", error);
    return NextResponse.json(
      { error: "An error occurred while generating the report. " + (error.message || "") },
      { status: 500 }
    );
  }
}
