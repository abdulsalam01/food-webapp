import { NextResponse } from "next/server";
import { chatAboutFood } from "../../lib/gemini";
import { assertNutritionAnalysis } from "../../lib/nutrition";
import type { ChatMessage } from "../../types/nutrition";

export const runtime = "nodejs";

function assertMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) {
    throw new Error("Messages must be an array.");
  }

  return value.map((message) => {
    const candidate = message as ChatMessage;
    if (!["user", "assistant"].includes(candidate.role) || typeof candidate.content !== "string") {
      throw new Error("Invalid chat message.");
    }
    return candidate;
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const analysis = assertNutritionAnalysis(body.analysis);
    const messages = assertMessages(body.messages);
    const reply = await chatAboutFood(analysis, messages);
    return NextResponse.json({ reply });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Could not continue the food chat.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
