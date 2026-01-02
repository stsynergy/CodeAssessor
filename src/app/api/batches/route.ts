import { NextRequest, NextResponse } from "next/server";
import { batchService } from "@/services/BatchService";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (id) {
      const batch = await batchService.getBatchById(id);
      if (!batch) {
        return NextResponse.json({ error: "Batch not found" }, { status: 404 });
      }
      return NextResponse.json(batch);
    }

    const batches = await batchService.getAllBatches();
    return NextResponse.json(batches);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { _id, action, ...data } = body;

    if (action === "getOrCreatePlayground") {
      const batch = await batchService.getOrCreatePlaygroundBatch(data.candidateIds || []);
      return NextResponse.json(batch);
    }

    if (_id) {
      const success = await batchService.updateBatch(_id, data);
      if (!success) {
        return NextResponse.json({ error: "Batch not found" }, { status: 404 });
      }
      return NextResponse.json({ _id, ...data });
    } else {
      const batch = await batchService.createBatch(data);
      return NextResponse.json(batch);
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

    const success = await batchService.deleteBatch(id);
    if (!success) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
