import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { listOmnirouteModels } from "@/lib/omniroute";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const models = await listOmnirouteModels();
  return NextResponse.json({
    defaultModel: env.primaryModel,
    models,
  });
}
