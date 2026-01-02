import { NextRequest, NextResponse } from "next/server";
import { assessmentService } from "@/services/AssessmentService";

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

    const result = await assessmentService.generateAssessment({
      thingName,
      context,
      snippets,
      providerId,
      modelId
    });

    return NextResponse.json({
      report: result.reportMarkdown,
      scores: result.scores,
    });
  } catch (error: any) {
    console.error("Assessment Error:", error);
    return NextResponse.json(
      { error: error.message || "An error occurred while generating the report." },
      { status: 500 }
    );
  }
}
