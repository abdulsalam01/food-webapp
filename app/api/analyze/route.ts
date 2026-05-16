import { NextResponse } from "next/server";
import { analyzeFoodImage } from "../../lib/gemini";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get("image");

    if (!(image instanceof File)) {
      return NextResponse.json({ error: "Upload a food image to analyze." }, { status: 400 });
    }

    const analysis = await analyzeFoodImage(image);
    return NextResponse.json({ analysis });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Could not analyze this food image.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
