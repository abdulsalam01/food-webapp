"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import type { ChatMessage, NutritionAnalysis } from "./types/nutrition";
import {
  calculateNutrients,
  compareServingSizes,
  demoAnalysis,
  getServingsPerContainerValue
} from "./lib/nutrition";

const quickPrompts = [
  "How many servings is this?",
  "What should I limit here?",
  "What nutrients are helpful?",
  "Compare this with another label"
];

function getNutrient(analysis: NutritionAnalysis, key: string) {
  return analysis.nutrients.find((nutrient) => nutrient.key === key || nutrient.label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") === key);
}

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined) return "No %DV";
  return `${Math.round(value)}% DV`;
}

export default function Home() {
  const [preview, setPreview] = useState<string>();
  const [analysis, setAnalysis] = useState<NutritionAnalysis>(demoAnalysis);
  const [comparison, setComparison] = useState<NutritionAnalysis>();
  const [comparisonJson, setComparisonJson] = useState("");
  const [servingsConsumed, setServingsConsumed] = useState(2);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: demoAnalysis.conversationStarter }]);
  const [input, setInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const [error, setError] = useState<string>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const nutrientCalculations = useMemo(
    () => calculateNutrients(analysis.nutrients, servingsConsumed),
    [analysis, servingsConsumed]
  );

  const fullPackageServings = getServingsPerContainerValue(analysis);
  const fullPackageNutrients = useMemo(
    () => calculateNutrients(analysis.nutrients, fullPackageServings),
    [analysis, fullPackageServings]
  );

  const limitNutrients = nutrientCalculations.filter((nutrient) => nutrient.emphasis === "limit");
  const encourageNutrients = nutrientCalculations.filter((nutrient) => nutrient.emphasis === "encourage");
  const highlightedNutrients = nutrientCalculations.filter((nutrient) => nutrient.emphasis && nutrient.dailyValue).slice(0, 5);
  const totalSugars = getNutrient(analysis, "total_sugars");
  const addedSugars = getNutrient(analysis, "added_sugars");
  const naturalSugarEstimate =
    typeof totalSugars?.amountValue === "number" && typeof addedSugars?.amountValue === "number"
      ? Math.max(totalSugars.amountValue - addedSugars.amountValue, 0)
      : null;

  async function analyzeImage(file: File) {
    setError(undefined);
    setIsAnalyzing(true);
    setMessages([]);
    setPreview(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch("/api/analyze", { method: "POST", body: formData });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error ?? "Could not analyze this image.");
    }

    setAnalysis(payload.analysis);
    setServingsConsumed(1);
    setMessages([{ role: "assistant", content: payload.analysis.conversationStarter }]);
    setIsAnalyzing(false);
  }

  async function onFileChange(file?: File) {
    if (!file) return;
    try {
      await analyzeImage(file);
    } catch (caught) {
      setIsAnalyzing(false);
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    }
  }

  function loadComparison() {
    setError(undefined);
    try {
      const parsed = JSON.parse(comparisonJson) as NutritionAnalysis;
      if (!parsed.foodName || !Array.isArray(parsed.nutrients)) throw new Error("Missing label fields.");
      setComparison(parsed);
    } catch {
      setError("Paste a valid nutrition label JSON object before comparing.");
    }
  }

  async function sendMessage(messageText = input) {
    if (!analysis || !messageText.trim() || isChatting) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: messageText.trim() }];
    setMessages(nextMessages);
    setInput("");
    setIsChatting(true);
    setError(undefined);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis, messages: nextMessages })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not continue the conversation.");
      }

      setMessages([...nextMessages, { role: "assistant", content: payload.reply }]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
      setMessages(nextMessages);
    } finally {
      setIsChatting(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <p className="eyebrow">FDA-style nutrition label assistant</p>
          <h1>Turn Nutrition Facts into clear serving, %DV, and nutrient insights.</h1>
          <p className="lede">
            Upload a food photo or use the demo label to calculate actual intake, identify nutrients to limit, highlight
            nutrients to get more of, and compare products without medical diagnosis.
          </p>
        </div>
        <button className="primary" onClick={() => fileInputRef.current?.click()} disabled={isAnalyzing}>
          {isAnalyzing ? "Reading your label…" : "Upload food photo"}
        </button>
        <input
          ref={fileInputRef}
          className="hidden"
          type="file"
          accept="image/*"
          onChange={(event) => void onFileChange(event.target.files?.[0])}
        />
      </section>

      {error ? <div className="error">{error}</div> : null}

      <section className="workspace">
        <div className="panel uploadPanel">
          {preview ? (
            <img className="foodPreview" src={preview} alt="Uploaded food preview" />
          ) : (
            <button className="dropzone" onClick={() => fileInputRef.current?.click()}>
              <span>Start with a label or meal photo</span>
              <small>The app estimates label data, then applies FDA serving-size and %DV logic.</small>
            </button>
          )}

          <div className="guidance">
            <h2>How nutrition is determined</h2>
            <p>
              Values are interpreted per serving first. The selected servings multiplier then updates calories, nutrient
              amounts, and %DV. FDA guidance treats 5% DV or less as low and 20% DV or more as high.
            </p>
            <a href="https://www.fda.gov/food/nutrition-facts-label/how-understand-and-use-nutrition-facts-label" target="_blank">
              FDA label guide
            </a>
          </div>

          <div className="calculatorBox">
            <label htmlFor="servings">Servings consumed</label>
            <input
              id="servings"
              min="0.25"
              step="0.25"
              type="number"
              value={servingsConsumed}
              onChange={(event) => setServingsConsumed(Number(event.target.value) || 1)}
            />
            <strong>{analysis.calories} × {servingsConsumed} = {(analysis.calories * servingsConsumed).toLocaleString()} calories</strong>
            <small>All nutrient amounts and %DV below use this same multiplier.</small>
          </div>
        </div>

        <div className="nutritionCard">
          <div className="labelHeader">
            <p>Nutrition Facts</p>
            <span>{analysis.confidence} confidence</span>
          </div>
          <h2>{analysis.foodName}</h2>
          <div className="servingRow">
            <strong>Serving size</strong>
            <span>{analysis.servingSize}{analysis.servingSizeMetric ? ` (${analysis.servingSizeMetric})` : ""}</span>
          </div>
          <div className="servingRow thin">
            <strong>Servings per container</strong>
            <span>{analysis.servingsPerContainer}</span>
          </div>
          <div className="calories">
            <span>Calories</span>
            <strong>{analysis.calories}</strong>
          </div>
          <div className="dailyValue">% Daily Value*</div>
          <div className="nutrients">
            {nutrientCalculations.map((nutrient) => (
              <div className={`nutrient ${nutrient.emphasis ?? "neutral"}`} key={nutrient.label}>
                <span>
                  <strong>{nutrient.label}</strong> {nutrient.amount}
                  <em>{nutrient.dailyValueStatus}</em>
                </span>
                <b>{nutrient.dailyValue ?? "—"}</b>
              </div>
            ))}
          </div>
          <p className="footnote">
            *Percent Daily Values are based on a 2,000 calorie diet. Total sugars and trans fat may not have a %DV.
          </p>
        </div>

        <div className="panel chatPanel">
          <div className="chatHeader">
            <div>
              <p className="eyebrow">Food chat</p>
              <h2>Ask about servings or %DV</h2>
            </div>
            <span className="pulse" />
          </div>

          {highlightedNutrients.length ? (
            <div className="chips">
              {highlightedNutrients.map((nutrient) => (
                <span key={nutrient.label}>{nutrient.label}: {nutrient.dailyValue} · {nutrient.dailyValueStatus}</span>
              ))}
            </div>
          ) : null}

          <div className="messages">
            {messages.map((message, index) => (
              <div className={`message ${message.role}`} key={`${message.role}-${index}`}>
                {message.content}
              </div>
            ))}
            {isChatting ? <div className="message assistant typing">Checking the label logic…</div> : null}
          </div>

          <div className="quickPrompts">
            {quickPrompts.map((prompt) => (
              <button key={prompt} disabled={isChatting} onClick={() => void sendMessage(prompt)}>
                {prompt}
              </button>
            ))}
          </div>

          <form className="composer" onSubmit={onSubmit}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={isChatting}
              placeholder="Ask about portions, sodium, sugars, fiber…"
            />
            <button disabled={!input.trim() || isChatting}>Send</button>
          </form>
        </div>
      </section>

      <section className="insightGrid">
        <article className="panel insightCard">
          <p className="eyebrow">Actual intake</p>
          <h2>{servingsConsumed} serving{servingsConsumed === 1 ? "" : "s"}</h2>
          <div className="actualList">
            {nutrientCalculations.slice(0, 8).map((nutrient) => (
              <div key={nutrient.label}>
                <span>{nutrient.label}</span>
                <strong>{nutrient.actualAmount} · {formatPercent(nutrient.actualDailyValuePercent)}</strong>
                <small>{nutrient.advice}</small>
              </div>
            ))}
          </div>
        </article>

        <article className="panel insightCard">
          <p className="eyebrow">Nutrients to limit</p>
          <h2>Lower %DV is usually better</h2>
          <div className="badgeList">
            {limitNutrients.map((nutrient) => (
              <span className={`status ${nutrient.badge.replaceAll(" ", "").toLowerCase()}`} key={nutrient.label}>
                {nutrient.label}: {formatPercent(nutrient.actualDailyValuePercent)} · {nutrient.badge}
              </span>
            ))}
          </div>
        </article>

        <article className="panel insightCard">
          <p className="eyebrow">Nutrients to get more of</p>
          <h2>Higher %DV can be helpful</h2>
          <div className="badgeList">
            {encourageNutrients.map((nutrient) => (
              <span className={`status ${nutrient.badge.replaceAll(" ", "").toLowerCase()}`} key={nutrient.label}>
                {nutrient.label}: {formatPercent(nutrient.actualDailyValuePercent)} · {nutrient.badge}
              </span>
            ))}
          </div>
        </article>

        <article className="panel insightCard">
          <p className="eyebrow">Total sugars vs added sugars</p>
          <h2>They are not the same</h2>
          <p>
            This label shows {totalSugars?.amount ?? "unknown"} total sugars, including {addedSugars?.amount ?? "unknown"} added sugars.
            {naturalSugarEstimate !== null ? ` About ${naturalSugarEstimate}g may be naturally occurring sugar.` : " Total sugars can include sugars naturally present in fruit, milk, or other ingredients."}
          </p>
        </article>

        <article className="panel insightCard">
          <p className="eyebrow">Full package</p>
          <h2>If you eat the whole container</h2>
          <p>{analysis.calories} calories × {fullPackageServings} servings = {(analysis.calories * fullPackageServings).toLocaleString()} calories.</p>
          <div className="actualList compact">
            {fullPackageNutrients.filter((nutrient) => ["sodium", "saturated_fat", "added_sugars"].includes(nutrient.key ?? "")).map((nutrient) => (
              <div key={nutrient.label}><span>{nutrient.label}</span><strong>{nutrient.actualAmount} · {formatPercent(nutrient.actualDailyValuePercent)}</strong></div>
            ))}
          </div>
        </article>

        <article className="panel insightCard comparisonCard">
          <p className="eyebrow">Product comparison</p>
          <h2>Compare using serving size + %DV</h2>
          <textarea
            value={comparisonJson}
            onChange={(event) => setComparisonJson(event.target.value)}
            placeholder='Paste another label JSON, e.g. {"foodName":"Product B","confidence":"medium","servingSize":"1/2 cup","servingsPerContainer":"4","calories":180,"nutrients":[{"key":"sodium","label":"Sodium","amount":"280mg","dailyValue":"12%"}],"ingredientsLikely":[],"healthNotes":[],"conversationStarter":"","disclaimer":""}'
          />
          <button onClick={loadComparison}>Compare product</button>
          {comparison ? (
            <div className="comparisonResult">
              <strong>{compareServingSizes(analysis, comparison)}</strong>
              <p>
                {analysis.foodName} sodium: {getNutrient(analysis, "sodium")?.dailyValue ?? "No %DV"}. {comparison.foodName} sodium: {getNutrient(comparison, "sodium")?.dailyValue ?? "No %DV"}.
              </p>
            </div>
          ) : (
            <p>Serving sizes must be checked first; otherwise a lower %DV may simply reflect a smaller serving.</p>
          )}
        </article>
      </section>
    </main>
  );
}
