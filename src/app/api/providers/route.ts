import { NextResponse } from "next/server";
import { getAvailableProviders } from "@/config/models";

export async function GET() {
  try {
    const providers = getAvailableProviders();
    
    console.log("Available providers identified:", providers.map(p => p.id));
    return NextResponse.json({ providers });
  } catch (error: any) {
    console.error("Error in /api/providers:", error);
    return NextResponse.json(
      { error: "Failed to fetch providers: " + error.message },
      { status: 500 }
    );
  }
}

