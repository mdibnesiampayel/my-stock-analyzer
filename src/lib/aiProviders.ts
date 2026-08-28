export interface AiProviderDef {
  id: string;
  label: string;
  hint: string;
  defaultModel: string;
  placeholder: string;
  openaiCompat?: boolean;
  defaultBaseUrl?: string;
}

export const BUILTIN_PROVIDERS: AiProviderDef[] = [
  { id: "openai", label: "OpenAI", hint: "GPT models", defaultModel: "gpt-4o-mini", placeholder: "sk-...", openaiCompat: true, defaultBaseUrl: "https://api.openai.com/v1" },
  { id: "anthropic", label: "Anthropic", hint: "Claude", defaultModel: "claude-3-haiku-20240307", placeholder: "sk-ant-..." },
  { id: "google", label: "Google Gemini", hint: "Gemini", defaultModel: "gemini-1.5-flash", placeholder: "AIza..." },
  { id: "groq", label: "Groq", hint: "Fast open models", defaultModel: "llama-3.1-8b-instant", placeholder: "gsk_...", openaiCompat: true, defaultBaseUrl: "https://api.groq.com/openai/v1" },
  { id: "openrouter", label: "OpenRouter", hint: "Many models, one key", defaultModel: "openai/gpt-4o-mini", placeholder: "sk-or-...", openaiCompat: true, defaultBaseUrl: "https://openrouter.ai/api/v1" },
  { id: "mistral", label: "Mistral", hint: "Mistral / Mixtral", defaultModel: "mistral-small-latest", placeholder: "API key", openaiCompat: true, defaultBaseUrl: "https://api.mistral.ai/v1" },
  { id: "together", label: "Together AI", hint: "Open-source models", defaultModel: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo", placeholder: "API key", openaiCompat: true, defaultBaseUrl: "https://api.together.xyz/v1" },
  { id: "perplexity", label: "Perplexity", hint: "Sonar models", defaultModel: "sonar", placeholder: "pplx-...", openaiCompat: true, defaultBaseUrl: "https://api.perplexity.ai" },
  { id: "xai", label: "xAI", hint: "Grok", defaultModel: "grok-2-latest", placeholder: "xai-...", openaiCompat: true, defaultBaseUrl: "https://api.x.ai/v1" },
  { id: "cohere", label: "Cohere", hint: "Command models", defaultModel: "command-r", placeholder: "API key", openaiCompat: true, defaultBaseUrl: "https://api.cohere.ai/compatibility/v1" },
  { id: "deepseek", label: "DeepSeek", hint: "DeepSeek Chat", defaultModel: "deepseek-chat", placeholder: "sk-...", openaiCompat: true, defaultBaseUrl: "https://api.deepseek.com/v1" },
  { id: "fireworks", label: "Fireworks", hint: "Fast inference", defaultModel: "accounts/fireworks/models/llama-v3p1-8b-instruct", placeholder: "API key", openaiCompat: true, defaultBaseUrl: "https://api.fireworks.ai/inference/v1" },
];

export const CURRENCIES = [
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "EUR", label: "Euro", symbol: "€" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "BDT", label: "Bangladeshi Taka", symbol: "৳" },
  { code: "JPY", label: "Japanese Yen", symbol: "¥" },
  { code: "INR", label: "Indian Rupee", symbol: "₹" },
  { code: "CAD", label: "Canadian Dollar", symbol: "CA$" },
  { code: "AUD", label: "Australian Dollar", symbol: "A$" },
  { code: "CHF", label: "Swiss Franc", symbol: "CHF" },
  { code: "CNY", label: "Chinese Yuan", symbol: "¥" },
  { code: "HKD", label: "Hong Kong Dollar", symbol: "HK$" },
  { code: "SGD", label: "Singapore Dollar", symbol: "S$" },
] as const;

export function currencyMeta(code: string) {
  return CURRENCIES.find((c) => c.code === code) || CURRENCIES[0];
}
