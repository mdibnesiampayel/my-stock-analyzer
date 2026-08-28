/**
 * Optional narrative polish. Keys stay on the server.
 * Supported: OPENAI_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY, ANTHROPIC_API_KEY
 * Never invents financial figures — the model only rewrites provided facts.
 */
export async function enhanceReport(analysis, facts) {
  const key =
    process.env.OPENAI_API_KEY ||
    process.env.GROQ_API_KEY ||
    process.env.OPENROUTER_API_KEY ||
    process.env.ANTHROPIC_API_KEY;
  if (!key) return null;

  const payload = {
    name: facts.profile?.name,
    symbol: facts.quote?.symbol,
    price: facts.quote?.price,
    sector: facts.profile?.sector,
    industry: facts.profile?.industry,
    about: (facts.profile?.about || "").slice(0, 500),
    metrics: facts.metrics || {},
    score: analysis.score,
    checklist: (analysis.items || []).map((i) => ({
      q: i.question,
      rating: i.ratingLabel,
      why: i.headline,
    })),
  };

  const instruction = `You are a cautious equity research assistant for beginner investors.
Rewrite the analysis into JSON only, no markdown.
Use ONLY the figures in the input. If a figure is missing, say it is unavailable. Never invent numbers.
Keys:
business, strengths (array of short strings), weaknesses (array), growth, financialHealth, competitiveAdvantage, risks (array), valuation, verdict
Each prose field: 2-4 sentences, plain English.`;

  try {
    if (process.env.ANTHROPIC_API_KEY && key === process.env.ANTHROPIC_API_KEY) {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || "claude-3-haiku-20240307",
          max_tokens: 1200,
          messages: [{ role: "user", content: `${instruction}\n\nINPUT:\n${JSON.stringify(payload)}` }],
        }),
      });
      if (!res.ok) throw new Error(`anthropic ${res.status}`);
      const data = await res.json();
      return parseJson(data?.content?.[0]?.text);
    }

    const url = process.env.GROQ_API_KEY
      ? "https://api.groq.com/openai/v1/chat/completions"
      : process.env.OPENROUTER_API_KEY
        ? "https://openrouter.ai/api/v1/chat/completions"
        : "https://api.openai.com/v1/chat/completions";
    const model =
      process.env.AI_MODEL ||
      (process.env.GROQ_API_KEY ? "llama-3.1-8b-instant" : "gpt-4o-mini");
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: instruction },
          { role: "user", content: JSON.stringify(payload) },
        ],
      }),
    });
    if (!res.ok) throw new Error(`llm ${res.status}`);
    const data = await res.json();
    return parseJson(data?.choices?.[0]?.message?.content);
  } catch (err) {
    console.warn("llm enhance skipped:", err.message);
    return null;
  }
}

function parseJson(text) {
  if (!text) return null;
  const raw = String(text).trim().replace(/^```json\s*|\s*```$/g, "");
  const obj = JSON.parse(raw);
  if (!obj || typeof obj !== "object") return null;
  return {
    business: str(obj.business),
    strengths: arr(obj.strengths),
    weaknesses: arr(obj.weaknesses),
    growth: str(obj.growth),
    financialHealth: str(obj.financialHealth),
    competitiveAdvantage: str(obj.competitiveAdvantage),
    risks: arr(obj.risks),
    valuation: str(obj.valuation),
    verdict: str(obj.verdict),
  };
}

function str(v) {
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}
function arr(v) {
  return Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean).slice(0, 6) : undefined;
}
