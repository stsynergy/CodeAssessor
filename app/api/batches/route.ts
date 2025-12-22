import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  try {
    const db = await getDb();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const batch = await db.collection("batches").findOne({ _id: new ObjectId(id) });
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
    const { _id, ...data } = body;

    if (_id) {
      await db.collection("batches").updateOne(
        { _id: new ObjectId(_id) },
        { $set: { ...data, updatedAt: new Date() } }
      );
      return NextResponse.json({ _id, ...data });
    } else {
      const result = await db.collection("batches").insertOne({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        assessmentIds: data.assessmentIds || [],
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

    // Optional: Delete all assessments in the batch? 
    // For now just delete the batch record.
    await db.collection("batches").deleteOne({ _id: new ObjectId(id) });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

