import type { NutritionAnalysis } from "../types/nutrition";

export const emptyLabelNutrients = [
  "Total Fat",
  "Saturated Fat",
  "Trans Fat",
  "Cholesterol",
  "Sodium",
  "Total Carbohydrate",
  "Dietary Fiber",
  "Total Sugars",
  "Added Sugars",
  "Protein",
  "Vitamin D",
  "Calcium",
  "Iron",
  "Potassium"
];

export const demoAnalysis: NutritionAnalysis = {
  foodName: "Estimated mixed meal",
  confidence: "medium",
  servingSize: "1 photographed plate",
  servingsPerContainer: "1",
  calories: 540,
  nutrients: [
    { label: "Total Fat", amount: "22g", dailyValue: "28%", emphasis: "neutral" },
    { label: "Saturated Fat", amount: "6g", dailyValue: "30%", emphasis: "limit" },
    { label: "Trans Fat", amount: "0g", emphasis: "limit" },
    { label: "Cholesterol", amount: "75mg", dailyValue: "25%", emphasis: "neutral" },
    { label: "Sodium", amount: "820mg", dailyValue: "36%", emphasis: "limit" },
    { label: "Total Carbohydrate", amount: "58g", dailyValue: "21%", emphasis: "neutral" },
    { label: "Dietary Fiber", amount: "7g", dailyValue: "25%", emphasis: "encourage" },
    { label: "Total Sugars", amount: "9g", emphasis: "neutral" },
    { label: "Added Sugars", amount: "2g", dailyValue: "4%", emphasis: "limit" },
    { label: "Protein", amount: "28g", emphasis: "encourage" },
    { label: "Vitamin D", amount: "1mcg", dailyValue: "6%", emphasis: "encourage" },
    { label: "Calcium", amount: "180mg", dailyValue: "15%", emphasis: "encourage" },
    { label: "Iron", amount: "3mg", dailyValue: "15%", emphasis: "encourage" },
    { label: "Potassium", amount: "780mg", dailyValue: "15%", emphasis: "encourage" }
  ],
  ingredientsLikely: ["lean protein", "grain or starch", "vegetables", "sauce or seasoning"],
  healthNotes: [
    "Sodium looks like the nutrient to watch most closely.",
    "There is a helpful amount of protein and fiber for fullness."
  ],
  conversationStarter: "Tell me what you liked about this meal, and I can help you tune the portions or balance it with the rest of your day.",
  disclaimer: "Demo estimate only. Photo-based nutrition is approximate and is not medical advice."
};

function isNutritionAnalysis(value: unknown): value is NutritionAnalysis {
  const analysis = value as NutritionAnalysis;
  return Boolean(
    analysis &&
      typeof analysis.foodName === "string" &&
      ["low", "medium", "high"].includes(analysis.confidence) &&
      typeof analysis.servingSize === "string" &&
      typeof analysis.servingsPerContainer === "string" &&
      typeof analysis.calories === "number" &&
      Array.isArray(analysis.nutrients) &&
      Array.isArray(analysis.ingredientsLikely) &&
      Array.isArray(analysis.healthNotes) &&
      typeof analysis.conversationStarter === "string" &&
      typeof analysis.disclaimer === "string"
  );
}

export function assertNutritionAnalysis(value: unknown): NutritionAnalysis {
  if (!isNutritionAnalysis(value)) {
    throw new Error("Invalid nutrition analysis payload.");
  }
  return value;
}

export function parseJsonFromModel(text: string): NutritionAnalysis {
  const match = text.match(/```json\s*([\s\S]*?)```|({[\s\S]*})/);
  const jsonText = match?.[1] ?? match?.[2] ?? text;
  return assertNutritionAnalysis(JSON.parse(jsonText));
}

export function compactNutritionContext(analysis: NutritionAnalysis) {
  return [
    `Food: ${analysis.foodName}`,
    `Serving: ${analysis.servingSize}; servings: ${analysis.servingsPerContainer}`,
    `Calories: ${analysis.calories}`,
    `Nutrients: ${analysis.nutrients.map((nutrient) => `${nutrient.label} ${nutrient.amount}${nutrient.dailyValue ? ` (${nutrient.dailyValue} DV)` : ""}`).join(", ")}`,
    `Likely ingredients: ${analysis.ingredientsLikely.join(", ")}`,
    `Notes: ${analysis.healthNotes.join(" ")}`
  ].join("\n");
}
