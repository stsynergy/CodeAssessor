import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      if (!ObjectId.isValid(id)) {
        return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
      }
      const batch = await db.collection("batches").findOne({ _id: new ObjectId(id) });
      if (!batch) {
        return NextResponse.json({ error: "Batch not found" }, { status: 404 });
      }
      return NextResponse.json(batch);
    }

    const batches = await db
      .collection("batches")
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json(batches);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = await getDb();
    const body = await req.json();
    const { _id, name, description, candidateIds, assessmentIds } = body;

    const data: any = {
      name,
      description,
      candidateIds: (candidateIds || []).map((id: string) => 
        ObjectId.isValid(id) ? new ObjectId(id) : id
      ),
      assessmentIds: (assessmentIds || []).map((id: string) => 
        ObjectId.isValid(id) ? new ObjectId(id) : id
      ),
      updatedAt: new Date(),
    };

    if (_id) {
      if (!ObjectId.isValid(_id)) {
        return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
      }
      const result = await db.collection("batches").updateOne(
        { _id: new ObjectId(_id) },
        { $set: data }
      );
      if (result.matchedCount === 0) {
        return NextResponse.json({ error: "Batch not found" }, { status: 404 });
      }
      return NextResponse.json({ _id, ...data });
    } else {
      const result = await db.collection("batches").insertOne({
        ...data,
        createdAt: new Date(),
      });
      return NextResponse.json({ _id: result.insertedId, ...data });
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

    const result = await db.collection("batches").deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

