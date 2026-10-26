import { NextResponse } from "next/server";
import { omniroute } from "@/lib/omniroute";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const models = await omniroute.getAvailableModels();
    return NextResponse.json({ models });
  } catch (err: any) {
    console.error("[API_MODELS_GET] Error:", err.message);
    return NextResponse.json(
      {
        models: [
          "groq/openai/gpt-oss-120b",
          "groq/openai/gpt-oss-20b",
          "qwen/qwen3.8-27b",
          "ddgw/gpt-5.4-mini",
          "zc/glm-5.3-flash",
          "auto",
        ],
      },
      { status: 200 }
    );
  }
}
