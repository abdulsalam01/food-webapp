"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import type { ChatMessage, NutritionAnalysis } from "./types/nutrition";

const quickPrompts = [
  "How balanced is this meal?",
  "What should I watch out for?",
  "How could I make it more filling?",
  "What would pair well with it later?"
];

export default function Home() {
  const [preview, setPreview] = useState<string>();
  const [analysis, setAnalysis] = useState<NutritionAnalysis>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const [error, setError] = useState<string>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const highlightedNutrients = useMemo(
    () => analysis?.nutrients.filter((nutrient) => nutrient.emphasis && nutrient.dailyValue).slice(0, 5) ?? [],
    [analysis]
  );

  async function analyzeImage(file: File) {
    setError(undefined);
    setIsAnalyzing(true);
    setAnalysis(undefined);
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
          <p className="eyebrow">Gemini-powered meal companion</p>
          <h1>Chat with your food like it has a nutrition coach beside it.</h1>
          <p className="lede">
            Upload a plate photo to get an FDA-style Nutrition Facts label, then ask follow-up questions in a relaxed,
            natural conversation.
          </p>
        </div>
        <button className="primary" onClick={() => fileInputRef.current?.click()} disabled={isAnalyzing}>
          {isAnalyzing ? "Reading your plate…" : "Upload food photo"}
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
              <span>Drop in a meal photo</span>
              <small>Gemini estimates the food, portions, and likely nutrients.</small>
            </button>
          )}

          <div className="guidance">
            <h2>How the label is framed</h2>
            <p>
              The estimate follows FDA Nutrition Facts label concepts: serving size anchors the numbers, % Daily Value
              makes nutrients comparable, and 5% DV is low while 20% DV is high.
            </p>
            <a href="https://www.fda.gov/food/nutrition-facts-label/how-understand-and-use-nutrition-facts-label" target="_blank">
              FDA label guide
            </a>
          </div>
        </div>

        <div className="nutritionCard">
          <div className="labelHeader">
            <p>Nutrition Facts</p>
            <span>{analysis?.confidence ? `${analysis.confidence} confidence` : "photo estimate"}</span>
          </div>
          {analysis ? (
            <>
              <h2>{analysis.foodName}</h2>
              <div className="servingRow">
                <strong>Serving size</strong>
                <span>{analysis.servingSize}</span>
              </div>
              <div className="servingRow thin">
                <strong>Servings</strong>
                <span>{analysis.servingsPerContainer}</span>
              </div>
              <div className="calories">
                <span>Calories</span>
                <strong>{analysis.calories}</strong>
              </div>
              <div className="dailyValue">% Daily Value*</div>
              <div className="nutrients">
                {analysis.nutrients.map((nutrient) => (
                  <div className={`nutrient ${nutrient.emphasis ?? "neutral"}`} key={nutrient.label}>
                    <span>
                      <strong>{nutrient.label}</strong> {nutrient.amount}
                    </span>
                    <b>{nutrient.dailyValue ?? ""}</b>
                  </div>
                ))}
              </div>
              <p className="footnote">*%DV estimates how much a nutrient in one serving contributes to a daily diet.</p>
            </>
          ) : (
            <div className="emptyLabel">
              {isAnalyzing ? "Creating your nutrition label…" : "Your FDA-style label will appear here."}
            </div>
          )}
        </div>

        <div className="panel chatPanel">
          <div className="chatHeader">
            <div>
              <p className="eyebrow">Food chat</p>
              <h2>Ask anything about this meal</h2>
            </div>
            <span className="pulse" />
          </div>

          {analysis && highlightedNutrients.length ? (
            <div className="chips">
              {highlightedNutrients.map((nutrient) => (
                <span key={nutrient.label}>{nutrient.label}: {nutrient.dailyValue}</span>
              ))}
            </div>
          ) : null}

          <div className="messages">
            {messages.length ? (
              messages.map((message, index) => (
                <div className={`message ${message.role}`} key={`${message.role}-${index}`}>
                  {message.content}
                </div>
              ))
            ) : (
              <div className="message assistant">Upload a meal and I’ll start the conversation with what I notice first.</div>
            )}
            {isChatting ? <div className="message assistant typing">Thinking about the tastiest answer…</div> : null}
          </div>

          <div className="quickPrompts">
            {quickPrompts.map((prompt) => (
              <button key={prompt} disabled={!analysis || isChatting} onClick={() => void sendMessage(prompt)}>
                {prompt}
              </button>
            ))}
          </div>

          <form className="composer" onSubmit={onSubmit}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              disabled={!analysis || isChatting}
              placeholder={analysis ? "Ask about portions, macros, swaps…" : "Upload a photo to unlock chat"}
            />
            <button disabled={!analysis || !input.trim() || isChatting}>Send</button>
          </form>
        </div>
      </section>
    </main>
  );
}
