export type NutrientValue = {
  label: string;
  amount: string;
  dailyValue?: string;
  emphasis?: "limit" | "encourage" | "neutral";
};

export type NutritionAnalysis = {
  foodName: string;
  confidence: "low" | "medium" | "high";
  servingSize: string;
  servingsPerContainer: string;
  calories: number;
  nutrients: NutrientValue[];
  ingredientsLikely: string[];
  healthNotes: string[];
  conversationStarter: string;
  disclaimer: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};
