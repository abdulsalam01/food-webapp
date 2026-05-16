import type { DailyValueStatus, NutritionAnalysis, NutrientCalculation, NutrientEmphasis, NutrientValue } from "../types/nutrition";

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

export const nutrientKeys = {
  limit: ["saturated_fat", "sodium", "added_sugars"],
  encourage: ["dietary_fiber", "vitamin_d", "calcium", "iron", "potassium"]
};

export const dailyValueReferences = {
  saturated_fat: { dailyValue: 20, unit: "g", goal: "less_than" },
  sodium: { dailyValue: 2300, unit: "mg", goal: "less_than" },
  dietary_fiber: { dailyValue: 28, unit: "g", goal: "at_least" },
  added_sugars: { dailyValue: 50, unit: "g", goal: "less_than" },
  vitamin_d: { dailyValue: 20, unit: "mcg", goal: "at_least" },
  calcium: { dailyValue: 1300, unit: "mg", goal: "at_least" },
  iron: { dailyValue: 18, unit: "mg", goal: "at_least" },
  potassium: { dailyValue: 4700, unit: "mg", goal: "at_least" }
} as const;

export const demoAnalysis: NutritionAnalysis = {
  foodName: "Frozen Lasagna",
  confidence: "medium",
  servingSize: "1 cup",
  servingSizeMetric: "227g",
  servingsPerContainer: "4",
  servingsPerContainerValue: 4,
  labelType: "dual_column_label",
  calories: 280,
  nutrients: [
    { key: "total_fat", label: "Total Fat", amount: "9g", amountValue: 9, unit: "g", dailyValue: "12%", dailyValuePercent: 12, emphasis: "neutral" },
    { key: "saturated_fat", label: "Saturated Fat", amount: "4.5g", amountValue: 4.5, unit: "g", dailyValue: "23%", dailyValuePercent: 23, emphasis: "limit" },
    { key: "trans_fat", label: "Trans Fat", amount: "0g", amountValue: 0, unit: "g", dailyValuePercent: null, emphasis: "limit" },
    { key: "cholesterol", label: "Cholesterol", amount: "35mg", amountValue: 35, unit: "mg", dailyValue: "12%", dailyValuePercent: 12, emphasis: "neutral" },
    { key: "sodium", label: "Sodium", amount: "850mg", amountValue: 850, unit: "mg", dailyValue: "37%", dailyValuePercent: 37, emphasis: "limit" },
    { key: "total_carbohydrate", label: "Total Carbohydrate", amount: "34g", amountValue: 34, unit: "g", dailyValue: "12%", dailyValuePercent: 12, emphasis: "neutral" },
    { key: "dietary_fiber", label: "Dietary Fiber", amount: "4g", amountValue: 4, unit: "g", dailyValue: "14%", dailyValuePercent: 14, emphasis: "encourage" },
    { key: "total_sugars", label: "Total Sugars", amount: "6g", amountValue: 6, unit: "g", dailyValuePercent: null, emphasis: "neutral" },
    { key: "added_sugars", label: "Added Sugars", amount: "0g", amountValue: 0, unit: "g", dailyValue: "0%", dailyValuePercent: 0, emphasis: "limit" },
    { key: "protein", label: "Protein", amount: "15g", amountValue: 15, unit: "g", dailyValuePercent: null, emphasis: "neutral" },
    { key: "vitamin_d", label: "Vitamin D", amount: "0mcg", amountValue: 0, unit: "mcg", dailyValue: "0%", dailyValuePercent: 0, emphasis: "encourage" },
    { key: "calcium", label: "Calcium", amount: "320mg", amountValue: 320, unit: "mg", dailyValue: "25%", dailyValuePercent: 25, emphasis: "encourage" },
    { key: "iron", label: "Iron", amount: "1.6mg", amountValue: 1.6, unit: "mg", dailyValue: "8%", dailyValuePercent: 8, emphasis: "encourage" },
    { key: "potassium", label: "Potassium", amount: "510mg", amountValue: 510, unit: "mg", dailyValue: "10%", dailyValuePercent: 10, emphasis: "encourage" }
  ],
  ingredientsLikely: ["pasta", "tomato sauce", "cheese", "seasoned beef or vegetables"],
  healthNotes: [
    "Serving size is the anchor: eating 2 cups doubles calories, nutrient amounts, and %DV.",
    "Sodium and saturated fat are high per serving, while calcium contributes a useful amount."
  ],
  comparisonNotes: ["Use %DV to compare products, but first check whether serving sizes match."],
  conversationStarter: "I read this like an FDA Nutrition Facts label: start with serving size, then calories, then %DV. How many servings do you expect to eat?",
  disclaimer: "Demo estimate only. Nutrition guidance is general education based on FDA label-reading principles and is not medical advice."
};

const keyFromLabel = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

export function parseAmount(amount: string) {
  const match = amount.match(/([\d.]+)\s*([a-zA-Zµ]+)?/);
  if (!match) return {};
  return { amountValue: Number(match[1]), unit: match[2]?.replace("µ", "mc") };
}

export function getDailyValuePercent(nutrient: NutrientValue) {
  if (typeof nutrient.dailyValuePercent === "number") return nutrient.dailyValuePercent;
  if (nutrient.dailyValuePercent === null) return null;
  if (!nutrient.dailyValue) return null;
  const parsed = Number(nutrient.dailyValue.replace(/[^\d.]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

export function interpretDV(percent: number | null | undefined): DailyValueStatus {
  if (percent === null || percent === undefined) return "No %DV Available";
  if (percent <= 5) return "Low";
  if (percent >= 20) return "High";
  return "Moderate";
}

export function normalizeNutrient(nutrient: NutrientValue): NutrientValue {
  const parsed = parseAmount(nutrient.amount);
  const key = nutrient.key ?? keyFromLabel(nutrient.label);
  const dailyValuePercent = getDailyValuePercent(nutrient);
  let emphasis: NutrientEmphasis = nutrient.emphasis ?? "neutral";

  if (nutrientKeys.limit.includes(key)) emphasis = "limit";
  if (nutrientKeys.encourage.includes(key)) emphasis = "encourage";

  return {
    ...nutrient,
    key,
    amountValue: nutrient.amountValue ?? parsed.amountValue,
    unit: nutrient.unit ?? parsed.unit,
    dailyValue: nutrient.dailyValue ?? (typeof dailyValuePercent === "number" ? `${dailyValuePercent}%` : undefined),
    dailyValuePercent,
    emphasis
  };
}

export function multiplyAmount(nutrient: NutrientValue, multiplier: number) {
  const normalized = normalizeNutrient(nutrient);
  if (typeof normalized.amountValue !== "number" || !normalized.unit) return normalized.amount;
  const value = normalized.amountValue * multiplier;
  return `${Number.isInteger(value) ? value.toLocaleString() : value.toLocaleString(undefined, { maximumFractionDigits: 1 })}${normalized.unit}`;
}

function adviceFor(nutrient: NutrientValue, actualStatus: DailyValueStatus) {
  const normalized = normalizeNutrient(nutrient);
  if (normalized.emphasis === "limit" && actualStatus === "High") {
    return `High - Limit this nutrient. Consider balancing this with lower-${normalized.label.toLowerCase()} foods during the day.`;
  }
  if (normalized.emphasis === "encourage" && actualStatus === "High") {
    return "Good source / high contribution for a nutrient many people need more of.";
  }
  if (actualStatus === "No %DV Available") {
    return "FDA labels do not always provide a %DV for this nutrient, so use the gram or milligram amount for context.";
  }
  return `${actualStatus} contribution based on FDA's 5% low and 20% high guide.`;
}

export function calculateNutrients(nutrients: NutrientValue[], servingsConsumed: number): NutrientCalculation[] {
  return nutrients.map((raw) => {
    const nutrient = normalizeNutrient(raw);
    const dailyValuePercent = getDailyValuePercent(nutrient);
    const actualDailyValuePercent = typeof dailyValuePercent === "number" ? dailyValuePercent * servingsConsumed : null;
    const actualDailyValueStatus = interpretDV(actualDailyValuePercent);
    const dailyValueStatus = interpretDV(dailyValuePercent);
    const badge = nutrient.emphasis === "limit" && actualDailyValueStatus === "High"
      ? "Limit"
      : nutrient.emphasis === "encourage" && actualDailyValueStatus === "High"
        ? "Good Source"
        : actualDailyValueStatus;

    return {
      ...nutrient,
      dailyValueStatus,
      actualAmount: multiplyAmount(nutrient, servingsConsumed),
      actualDailyValuePercent,
      actualDailyValueStatus,
      badge,
      advice: adviceFor(nutrient, actualDailyValueStatus)
    };
  });
}

export function getServingsPerContainerValue(analysis: NutritionAnalysis) {
  if (typeof analysis.servingsPerContainerValue === "number") return analysis.servingsPerContainerValue;
  const parsed = Number.parseFloat(analysis.servingsPerContainer);
  return Number.isFinite(parsed) ? parsed : 1;
}

export function compareServingSizes(primary: NutritionAnalysis, secondary: NutritionAnalysis) {
  const left = `${primary.servingSize}${primary.servingSizeMetric ? ` (${primary.servingSizeMetric})` : ""}`;
  const right = `${secondary.servingSize}${secondary.servingSizeMetric ? ` (${secondary.servingSizeMetric})` : ""}`;
  return left.toLowerCase() === right.toLowerCase()
    ? "Serving sizes match, so %DV comparison is more straightforward."
    : `Serving sizes differ (${left} vs ${right}), so comparison may be misleading until portions are adjusted.`;
}

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
  return {
    ...value,
    nutrients: value.nutrients.map(normalizeNutrient)
  };
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
    `Calories per serving: ${analysis.calories}`,
    `Label type: ${analysis.labelType ?? "standard_label"}`,
    `Nutrients: ${analysis.nutrients.map((nutrient) => `${nutrient.label} ${nutrient.amount}${nutrient.dailyValue ? ` (${nutrient.dailyValue} DV, ${interpretDV(getDailyValuePercent(nutrient))})` : ""}`).join(", ")}`,
    `Likely ingredients: ${analysis.ingredientsLikely.join(", ")}`,
    `Notes: ${analysis.healthNotes.join(" ")}`
  ].join("\n");
}
