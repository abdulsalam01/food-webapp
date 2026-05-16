import type { ChatMessage, NutritionAnalysis } from "../types/nutrition";
import { compactNutritionContext, demoAnalysis, parseJsonFromModel } from "./nutrition";

const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const placeholderValues = new Set(["", "YOUR_GEMINI_API_KEY_HERE", "placeholder", "gemini-placeholder"]);

type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

function hasUsableKey() {
  return !placeholderValues.has(process.env.GEMINI_API_KEY?.trim() ?? "");
}

async function generateContent(parts: GeminiPart[], options?: { temperature?: number; responseMimeType?: string }) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY ?? ""
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: options?.temperature ?? 0.6,
        responseMimeType: options?.responseMimeType
      }
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Gemini request failed: ${detail}`);
  }

  const payload = await response.json();
  return payload.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text ?? "").join("") ?? "";
}

const labelPrompt = `You are a warm, practical nutrition companion. Analyze the uploaded food photo and return ONLY valid JSON.
Estimate nutrition in the style and ordering of the U.S. FDA Nutrition Facts label: serving information, calories, nutrients, and % Daily Value when possible.
Use the FDA label principles: serving size drives all nutrient amounts; 5% DV or less is low; 20% DV or more is high; saturated fat, sodium, and added sugars are nutrients to limit; dietary fiber, vitamin D, calcium, iron, and potassium are nutrients to encourage.
When a value can be estimated, include numeric amountValue, unit, and dailyValuePercent fields so the app can multiply servings and classify %DV. Use null for nutrients that do not have a %DV, such as total sugars or trans fat.
Be transparent that photo estimates are approximate. Do not diagnose or give medical advice.
JSON shape:
{
  "foodName": string,
  "confidence": "low" | "medium" | "high",
  "servingSize": string,
  "servingSizeMetric"?: string,
  "servingsPerContainer": string,
  "servingsPerContainerValue"?: number,
  "calories": number,
  "labelType"?: "standard_label" | "dual_column_label" | "single_ingredient_sugar_label",
  "nutrients": [{"key"?: string, "label": string, "amount": string, "amountValue"?: number, "unit"?: string, "dailyValue"?: string, "dailyValuePercent"?: number | null, "emphasis"?: "limit" | "encourage" | "neutral"}],
  "ingredientsLikely": string[],
  "healthNotes": string[],
  "comparisonNotes"?: string[],
  "conversationStarter": string,
  "disclaimer": string
}`;

export async function analyzeFoodImage(file: File): Promise<NutritionAnalysis> {
  if (!hasUsableKey()) {
    return {
      ...demoAnalysis,
      disclaimer: "Demo mode: add GEMINI_API_KEY to get a real photo-based nutrition estimate."
    };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const text = await generateContent(
    [
      { text: labelPrompt },
      {
        inline_data: {
          mime_type: file.type || "image/jpeg",
          data: bytes.toString("base64")
        }
      }
    ],
    { temperature: 0.35, responseMimeType: "application/json" }
  );

  return parseJsonFromModel(text);
}

export async function chatAboutFood(analysis: NutritionAnalysis, messages: ChatMessage[]) {
  const latestUserMessage = messages.at(-1)?.content ?? "What should I know about this meal?";

  if (!hasUsableKey()) {
    return `I’m in demo mode, but we can still talk naturally about the estimate. For ${analysis.foodName.toLowerCase()}, I’d focus on the sodium and saturated fat if you eat meals like this often, while keeping the protein and fiber. What part of the meal are you most curious about—energy, fullness, ingredients, or how to balance it later?`;
  }

  const historyText = messages
    .slice(-10)
    .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
    .join("\n");

  const text = await generateContent(
    [
      {
        text: `You are Food Buddy, a friendly nutrition chat companion.
Make the conversation feel natural: acknowledge the user's wording, answer directly, ask at most one thoughtful follow-up, and keep responses concise unless the user asks for depth.
Use this nutrition estimate as shared context, but do not pretend it is lab-tested. Avoid medical diagnosis. Follow FDA label-reading logic: serving size drives the numbers, 5% DV or less is low, 20% DV or more is high, and total sugars are not the same as added sugars.

Nutrition estimate:
${compactNutritionContext(analysis)}

Recent conversation:
${historyText}

User just said: ${latestUserMessage}`
      }
    ],
    { temperature: 0.75 }
  );

  return text || "I’m here with you. What would you like to understand about this food first?";
}
