import { NextRequest, NextResponse } from "next/server";
import { candidateService } from "@/services/CandidateService";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const candidate = await candidateService.getCandidateById(id);
      if (!candidate) {
        return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
      }
      return NextResponse.json(candidate);
    }

    const candidates = await candidateService.getAllCandidates();
    return NextResponse.json(candidates);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { _id, ...data } = body;

    if (_id) {
      const success = await candidateService.updateCandidate(_id, data);
      if (!success) {
        return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
      }
      return NextResponse.json({ _id, ...data });
    } else {
      const candidate = await candidateService.createCandidate(data);
      return NextResponse.json(candidate);
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

    const success = await candidateService.deleteCandidate(id);
    if (!success) {
      return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
