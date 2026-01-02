import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const subjectId = searchParams.get("subjectId");
    const batchId = searchParams.get("batchId");

    if (id) {
      if (!ObjectId.isValid(id)) {
        return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
      }
      const trial = await db.collection("trials").findOne({ _id: new ObjectId(id) });
      if (!trial) {
        return NextResponse.json({ error: "Trial not found" }, { status: 404 });
      }
      return NextResponse.json(trial);
    }

    const query: any = {};
    if (subjectId) {
      query.subjectId = ObjectId.isValid(subjectId) ? new ObjectId(subjectId) : subjectId;
    }
    if (batchId) {
      query.batchId = ObjectId.isValid(batchId) ? new ObjectId(batchId) : batchId;
    }

    const trials = await db
      .collection("trials")
      .find(query)
      .sort({ createdAt: 1 }) // Trials in chronological order
      .toArray();

    return NextResponse.json(trials);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const body = await req.json();
    const { _id, subjectId, batchId, status, providerId, modelId, result } = body;

    const data: any = {
      subjectId: subjectId && ObjectId.isValid(subjectId) ? new ObjectId(subjectId) : subjectId,
      batchId: batchId && ObjectId.isValid(batchId) ? new ObjectId(batchId) : batchId,
      status: status || 'pending',
      providerId,
      modelId,
      result,
      updatedAt: new Date(),
    };

    if (_id) {
      if (!ObjectId.isValid(_id)) {
        return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
      }
      const updateResult = await db.collection("trials").updateOne(
        { _id: new ObjectId(_id) },
        { $set: data }
      );
      if (updateResult.matchedCount === 0) {
        return NextResponse.json({ error: "Trial not found" }, { status: 404 });
      }
      return NextResponse.json({ _id, ...data });
    } else {
      const insertResult = await db.collection("trials").insertOne({
        ...data,
        createdAt: new Date(),
      });
      return NextResponse.json({ _id: insertResult.insertedId, ...data });
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

    const result = await db.collection("trials").deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Trial not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

