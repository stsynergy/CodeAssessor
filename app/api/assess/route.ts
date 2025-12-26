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
Conduct a rigorous, professional assessment of these ${thingName} implementations.

Code context: ${context || "Not provided"}.


3. At the very end of your response, provide a ranked list of all candidates from best to worst using the following format:
<SCORES>
1: [Candidate Name]
2: [Candidate Name]
...
n: [Candidate Name]
</SCORES>


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

    // Extract ranking scores from the <SCORES> block
    let structuredScores: Record<string, string> = {};
    const scoresRegex = /<SCORES>([\s\S]*?)<\/SCORES>/i;
    const scoresMatch = text.match(scoresRegex);

    if (scoresMatch) {
      const scoresContent = scoresMatch[1].trim();
      const lines = scoresContent.split("\n").filter((l) => l.trim() !== "");

      lines.forEach((line) => {
        const match = line.match(/^\s*(\d+)\s*:\s*(.+)$/);
        if (match) {
          const rank = parseInt(match[1]);
          const candidateName = match[2].trim();

          // Map back to candidateId
          const id = nameToIdMap[candidateName.toLowerCase()];
          if (id) {
            structuredScores[id] = String(rank);
          } else {
            // Fuzzy match fallback
            const fuzzyName = Object.keys(nameToIdMap).find(
              (name) =>
                candidateName.toLowerCase().includes(name) ||
                name.includes(candidateName.toLowerCase())
            );
            if (fuzzyName) {
              structuredScores[nameToIdMap[fuzzyName]] = String(rank);
            } else {
              structuredScores[candidateName] = String(rank);
            }
          }
        }
      });
      console.log("--- SCORES EXTRACTED (RAW RANKS) ---");
      console.log(structuredScores);
    } else {
      console.warn("--- WARNING: NO <SCORES> BLOCK FOUND IN RESPONSE ---");
    }

    // Add Header and Appendix
    const header = `# Architectural Assessment Report for: ${thingName}\n\r\n**Code context:** ${context || "Not provided"} \r\n\r\n`;
    const appendix = `\n\n---\n\n### Appendix: Assessment Methodology\n\nThis report was generated by an AI architectural assessment engine using the following configuration:\n\n- **Provider:** ${providerId}\n- **Model:** ${modelId}\n\n#### Prompt Configuration:\n\n\`\`\`text\n${prompt.trim()}\n\`\`\``;

    text = header + text + appendix;

    return NextResponse.json({
      report: text,
      scores: structuredScores,
    });
  } catch (error: any) {
    console.error("LLM Error:", error);
    return NextResponse.json(
      { error: "An error occurred while generating the report. " + (error.message || "") },
      { status: 500 }
    );
  }
}
