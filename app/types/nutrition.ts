export type NutrientEmphasis = "limit" | "encourage" | "neutral";
export type DailyValueStatus = "Low" | "Moderate" | "High" | "No %DV Available";
export type LabelType = "standard_label" | "dual_column_label" | "single_ingredient_sugar_label";

export type NutrientValue = {
  key?: string;
  label: string;
  amount: string;
  amountValue?: number;
  unit?: string;
  dailyValue?: string;
  dailyValuePercent?: number | null;
  emphasis?: NutrientEmphasis;
};

export type NutritionAnalysis = {
  foodName: string;
  confidence: "low" | "medium" | "high";
  servingSize: string;
  servingSizeMetric?: string;
  servingsPerContainer: string;
  servingsPerContainerValue?: number;
  calories: number;
  labelType?: LabelType;
  nutrients: NutrientValue[];
  ingredientsLikely: string[];
  healthNotes: string[];
  comparisonNotes?: string[];
  conversationStarter: string;
  disclaimer: string;
};

export type NutrientCalculation = NutrientValue & {
  dailyValueStatus: DailyValueStatus;
  actualAmount?: string;
  actualDailyValuePercent?: number | null;
  actualDailyValueStatus: DailyValueStatus;
  badge: string;
  advice: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};
