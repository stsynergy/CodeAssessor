import { NextRequest, NextResponse } from "next/server";
import { trialService } from "@/services/TrialService";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const subjectId = searchParams.get("subjectId");
    const batchId = searchParams.get("batchId");

    if (id) {
      const trial = await trialService.getTrialById(id);
      if (!trial) {
        return NextResponse.json({ error: "Trial not found" }, { status: 404 });
      }
      return NextResponse.json(trial);
    }

    const trials = await trialService.getTrials({ 
      subjectId: subjectId || undefined, 
      batchId: batchId || undefined 
    });
    return NextResponse.json(trials);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { _id, ...data } = body;

    if (_id) {
      const success = await trialService.updateTrial(_id, data);
      if (!success) {
        return NextResponse.json({ error: "Trial not found" }, { status: 404 });
      }
      return NextResponse.json({ _id, ...data });
    } else {
      const trial = await trialService.createTrial(data);
      return NextResponse.json(trial);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const success = await trialService.deleteTrial(id);
    if (!success) {
      return NextResponse.json({ error: "Trial not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
