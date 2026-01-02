import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { Assessment } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const batchId = searchParams.get("batchId");

    if (id) {
      if (!ObjectId.isValid(id)) {
        return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
      }
      const assessment = await db.collection("assessments").findOne({ _id: new ObjectId(id) });
      if (!assessment) {
        return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
      }
      return NextResponse.json(assessment);
    }

    const query: any = {};
    if (batchId) {
      query.batchId = ObjectId.isValid(batchId) ? new ObjectId(batchId) : batchId;
    }

    const assessments = await db
      .collection("assessments")
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(assessments);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const body = await req.json();
    const { _id, ...data } = body;
    
    // Explicitly update updatedAt on the server
    const updateData = {
      ...data,
      updatedAt: new Date(),
    };

    if (_id) {
      if (!ObjectId.isValid(_id)) {
        return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
      }
      const result = await db.collection("assessments").updateOne(
        { _id: new ObjectId(_id) },
        { $set: updateData }
      );
      if (result.matchedCount === 0) {
        return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
      }
      return NextResponse.json({ _id, ...updateData });
    } else {
      const result = await db.collection("assessments").insertOne({
        ...updateData,
        createdAt: new Date(),
      });
      return NextResponse.json({ _id: result.insertedId, ...updateData });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const result = await db.collection("assessments").deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

