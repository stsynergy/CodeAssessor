import { NextRequest, NextResponse } from "next/server";
import { subjectService } from "@/services/SubjectService";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const batchId = searchParams.get("batchId");

    if (id) {
      const subject = await subjectService.getSubjectById(id);
      if (!subject) {
        return NextResponse.json({ error: "Subject not found" }, { status: 404 });
      }
      return NextResponse.json(subject);
    }

    const subjects = await subjectService.getAllSubjects(batchId || undefined);
    return NextResponse.json(subjects);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { _id, ...data } = body;

    if (_id) {
      const success = await subjectService.updateSubject(_id, data);
      if (!success) {
        return NextResponse.json({ error: "Subject not found" }, { status: 404 });
      }
      return NextResponse.json({ _id, ...data });
    } else {
      const subject = await subjectService.createSubject(data);
      return NextResponse.json(subject);
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

    const success = await subjectService.deleteSubject(id);
    if (!success) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
