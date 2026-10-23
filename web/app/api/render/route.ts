import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { topic = "kenapa freon ac gak habis" } = body;

    // Simulate/Prepare Remotion render command locally
    // npx remotion render BedahVideo out/output.mp4
    return NextResponse.json({
      success: true,
      message: `Render job started for: ${topic}`,
      outputFile: "/out/pabrik-bedah-video.mp4",
      status: "COMPLETED"
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
