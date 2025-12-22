import { NextRequest, NextResponse } from "next/server";
import { igniteEngine, Message } from "multi-llm-ts";
import { PROVIDERS } from "@/config/models";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

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

    const db = await getDb();
    
    // Resolve candidate names for the prompt
    const candidateMap: Record<string, string> = {}; // ID -> Name
    const nameToIdMap: Record<string, string> = {}; // Name -> ID
    
    for (const s of snippets) {
      if (s.candidateId) {
        const candidate = await db.collection("candidates").findOne({ _id: new ObjectId(s.candidateId) });
        const name = candidate ? candidate.name : `Candidate ${s.candidateId}`;
        candidateMap[s.candidateId] = name;
        nameToIdMap[name.toLowerCase()] = s.candidateId;
      } else if (s.name) {
        // Fallback for adhoc snippets
        candidateMap[s.id || s.name] = s.name;
        nameToIdMap[s.name.toLowerCase()] = s.id || s.name;
      }
    }

    const engine = igniteEngine(providerId, engineConfig);
    const chatModel = engine.buildModel(modelId);

    let codeBlockSection = "";
    snippets.forEach((s: any) => {
      const name = candidateMap[s.candidateId] || s.name || "Unknown Candidate";
      codeBlockSection += `\n${name}:\n\`\`\`${s.language || "javascript"}\n${s.content}\n\`\`\`\n`;
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
			Include visual indicators (✅/❌ for discrete metrics), and/or score (1-5) for quick scanning in fields where possible.
	
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

    console.log(`\n--- FULL ANSWER FROM MODEL (length: ${text.length} chars) ---`);
    console.log(text);
    console.log("--- END OF ANSWER ---\n");

    // Extract table and generate summary scores
    let summaryScoresMarkdown = "";
    let structuredScores: Record<string, string> = {};
    const tableRegex = /\|(.+)\|.*\n\|( *:?-+:? *\|)+\n(\|(.+)\|.*\n?)+/g;
    const matches = text.match(tableRegex);

    if (matches && matches.length > 0) {
      // Find the best table (usually the one with most candidates or just the largest one)
      let tableMarkdown = matches[0];
      if (matches.length > 1) {
        let maxCandidateMatches = -1;
        for (const m of matches) {
          let count = 0;
          snippets.forEach((s: any) => {
            const name = candidateMap[s.candidateId] || s.name;
            if (name && m.toLowerCase().includes(name.toLowerCase())) count++;
          });
          if (count > maxCandidateMatches) {
            maxCandidateMatches = count;
            tableMarkdown = m;
          }
        }
      }

      console.log(`--- EXTRACTED TABLE FOR SCORING (length: ${tableMarkdown.length}) ---`);
      const scoringPrompt = `
Based on the following comparison matrix table, calculate a summary score for each implementation. 

${tableMarkdown}

Identify all metrics that imply a positive/negative value (e.g., ✅=1/❌=0/⚠️=-1, High=2/Medium=1/Low=0, or numerical scores).
Determine the total maximum points possible and the actual points achieved by each implementation. 

**FORMAT (strictly):**
1. Markdown horizontal table: header row + scores row (score/total)
2. "Scoring Logic" (short description how scores were counted.)
3. JSON code block with format: {"name": "score/total"}

DO NOT INCLUDE ANYTHING ELSE.
`;

      console.log(`--- SCORING PROMPT SENT TO ${providerId} (${modelId}) ---`);
      console.log(scoringPrompt);
      console.log("--- END OF SCORING PROMPT ---");

      try {
        const scoreMessages = [new Message("user", scoringPrompt)];
        const scoreStream = engine.generate(chatModel, scoreMessages, {
          maxTokens: 6000,
          temperature: 1.0 // Strict extraction
        });

        let scoreText = "";
        let scoreReasoning = "";
        for await (const chunk of scoreStream) {
          if (chunk.type === 'content') {
            scoreText += chunk.text || "";
          } else if (chunk.type === 'reasoning') {
            scoreReasoning += chunk.text || "";
          }
        }
        
        if (scoreReasoning) {
          console.log(`--- SCORING REASONING CAPTURED (${scoreReasoning.length} chars) ---`);
          // If the model put everything in reasoning (some models do this for extraction), 
          // we use it as the fallback text
          if (!scoreText) {
            scoreText = scoreReasoning;
          }
        }
        
        console.log(`--- RAW SCORE RESPONSE (length: ${scoreText.length}) ---`);
        console.log(scoreText);
        console.log("--- END OF RAW SCORE RESPONSE ---");
        
        // Parsing logic to separate Markdown from JSON
        try {
          // 1. Extract JSON block (preferring ```json blocks)
          const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
          const jsonBlockMatch = scoreText.match(jsonBlockRegex);
          
          let jsonStr = "";
          if (jsonBlockMatch) {
            jsonStr = jsonBlockMatch[1].trim();
            // Markdown is everything else, removing the JSON block
            summaryScoresMarkdown = scoreText.replace(jsonBlockRegex, "").trim();
          } else {
            // Fallback: look for the last { ... } pair which is usually the JSON object
            const lastBraceIndex = scoreText.lastIndexOf("}");
            const firstBraceIndex = scoreText.lastIndexOf("{", lastBraceIndex);
            
            if (firstBraceIndex !== -1 && lastBraceIndex !== -1) {
              jsonStr = scoreText.substring(firstBraceIndex, lastBraceIndex + 1).trim();
              summaryScoresMarkdown = (scoreText.substring(0, firstBraceIndex) + scoreText.substring(lastBraceIndex + 1)).trim();
            } else {
              // No JSON found
              summaryScoresMarkdown = scoreText;
            }
          }
          
          if (jsonStr) {
            try {
              const parsedData = JSON.parse(jsonStr);
              const rawScores = parsedData.data || parsedData;
              
              // Map names back to IDs
              Object.entries(rawScores).forEach(([name, score]) => {
                const id = nameToIdMap[name.toLowerCase()];
                if (id) {
                  structuredScores[id] = score as string;
                } else {
                  // Keep original if not found (might be an adhoc name)
                  structuredScores[name] = score as string;
                }
              });
              
              console.log("--- SUMMARY SCORES PARSED & MAPPED SUCCESS ---");
              console.log(structuredScores);
            } catch (jsonErr) {
              console.error("Failed to parse extracted JSON string:", jsonStr);
              throw jsonErr;
            }
          }
        } catch (parseError) {
          console.error("Error in score parsing logic:", parseError);
          // Fallback handled by keeping structuredScores as {} and summaryScoresMarkdown as populated above
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
    } else {
      console.warn("--- WARNING: NO TABLES FOUND IN RESPONSE ---");
      console.log("Raw text for debugging table regex:", text.substring(0, 500) + "...");
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
