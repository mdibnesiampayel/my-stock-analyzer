/**
 * Optional narrative polish. Client keys (from the API keys page) take priority;
 * otherwise server env keys are used. Never invents financial figures.
 * Keys are never logged.
 */

const COMPAT = {
  openai: { url: "https://api.openai.com/v1/chat/completions", model: "gpt-4o-mini" },
  groq: { url: "https://api.groq.com/openai/v1/chat/completions", model: "llama-3.1-8b-instant" },
  openrouter: { url: "https://openrouter.ai/api/v1/chat/completions", model: "openai/gpt-4o-mini" },
  mistral: { url: "https://api.mistral.ai/v1/chat/completions", model: "mistral-small-latest" },
  together: { url: "https://api.together.xyz/v1/chat/completions", model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo" },
  perplexity: { url: "https://api.perplexity.ai/chat/completions", model: "sonar" },
  xai: { url: "https://api.x.ai/v1/chat/completions", model: "grok-2-latest" },
  cohere: { url: "https://api.cohere.ai/compatibility/v1/chat/completions", model: "command-r" },
  deepseek: { url: "https://api.deepseek.com/v1/chat/completions", model: "deepseek-chat" },
  fireworks: { url: "https://api.fireworks.ai/inference/v1/chat/completions", model: "accounts/fireworks/models/llama-v3p1-8b-instruct" },
};

export async function enhanceReport(analysis, facts, creds = {}) {
  const resolved = resolveCreds(creds);
  if (!resolved?.key) return null;

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
    if (resolved.provider === "anthropic") {
      return await callAnthropic(resolved, instruction, payload);
    }
    if (resolved.provider === "google") {
      return await callGemini(resolved, instruction, payload);
    }
    return await callOpenAiCompat(resolved, instruction, payload);
  } catch (err) {
    console.warn("llm enhance skipped:", safeErr(err));
    return null;
  }
}

function resolveCreds(creds) {
  const clientKey = typeof creds.apiKey === "string" ? creds.apiKey.trim() : "";
  if (clientKey) {
    const provider = String(creds.provider || "openai").toLowerCase().slice(0, 40);
    const model = typeof creds.model === "string" ? creds.model.trim() : "";
    const baseUrl = typeof creds.baseUrl === "string" ? creds.baseUrl.trim() : "";
    return { provider, key: clientKey.slice(0, 512), model: model.slice(0, 120), baseUrl: baseUrl.slice(0, 300) };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return { provider: "anthropic", key: process.env.ANTHROPIC_API_KEY, model: process.env.ANTHROPIC_MODEL || "claude-3-haiku-20240307" };
  }
  if (process.env.GROQ_API_KEY) {
    return { provider: "groq", key: process.env.GROQ_API_KEY, model: process.env.AI_MODEL || COMPAT.groq.model };
  }
  if (process.env.OPENROUTER_API_KEY) {
    return { provider: "openrouter", key: process.env.OPENROUTER_API_KEY, model: process.env.AI_MODEL || COMPAT.openrouter.model };
  }
  if (process.env.OPENAI_API_KEY) {
    return { provider: "openai", key: process.env.OPENAI_API_KEY, model: process.env.AI_MODEL || COMPAT.openai.model };
  }
  return null;
}

async function callAnthropic(resolved, instruction, payload) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": resolved.key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: resolved.model || "claude-3-haiku-20240307",
      max_tokens: 1200,
      messages: [{ role: "user", content: `${instruction}\n\nINPUT:\n${JSON.stringify(payload)}` }],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}`);
  const data = await res.json();
  return parseJson(data?.content?.[0]?.text);
}

async function callGemini(resolved, instruction, payload) {
  const model = resolved.model || "gemini-1.5-flash";
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": resolved.key,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: `${instruction}\n\nINPUT:\n${JSON.stringify(payload)}` }] }],
      generationConfig: { temperature: 0.2 },
    }),
  });
  if (!res.ok) throw new Error(`gemini ${res.status}`);
  const data = await res.json();
  return parseJson(data?.candidates?.[0]?.content?.parts?.[0]?.text);
}

async function callOpenAiCompat(resolved, instruction, payload) {
  const preset = COMPAT[resolved.provider] || COMPAT.openai;
  const url = chatUrl(resolved.baseUrl) || preset.url;
  const model = resolved.model || preset.model;
  const messages = [
    { role: "system", content: instruction },
    { role: "user", content: JSON.stringify(payload) },
  ];
  const headers = {
    "content-type": "application/json",
    authorization: `Bearer ${resolved.key}`,
  };
  let res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ model, temperature: 0.2, response_format: { type: "json_object" }, messages }),
  });
  if (!res.ok) {
    res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ model, temperature: 0.2, messages }),
    });
  }
  if (!res.ok) throw new Error(`llm ${res.status}`);
  const data = await res.json();
  return parseJson(data?.choices?.[0]?.message?.content);
}

function chatUrl(base) {
  if (!base) return null;
  const b = String(base).trim().replace(/\/$/, "");
  if (!b) return null;
  if (b.endsWith("/chat/completions")) return b;
  if (b.endsWith("/v1")) return `${b}/chat/completions`;
  return `${b}/chat/completions`;
}

function safeErr(err) {
  return String(err?.message || err)
    .replace(/sk-[a-zA-Z0-9_-]+/g, "sk-[redacted]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .slice(0, 180);
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
