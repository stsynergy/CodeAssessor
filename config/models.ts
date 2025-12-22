import * as api from "./.api";

export interface ModelConfig {
  id: string;
  name: string;
}

export interface ProviderConfig {
  id: string;
  name: string;
  models: ModelConfig[];
  apiKey: string | undefined;
}

export const PROVIDERS: ProviderConfig[] = [
  {
    id: "openai",
    name: "OpenAI",
    apiKey: api.OPENAI_API_KEY,
    models: [
      { id: "gpt-5.2", name: "GPT-5.2 (New)" },
      { id: "gpt-5", name: "GPT-5" },
      { id: "gpt-4o", name: "GPT-4o (Stable)" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini" },
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic",
    apiKey: api.ANTHROPIC_API_KEY,
    models: [
      { id: "claude-opus-4-5", name: "Claude 4.5 Opus" },
      { id: "claude-sonnet-4-5", name: "Claude 4.5 Sonnet" },
      { id: "claude-haiku-4-5", name: "Claude 4.5 Haiku" },
    ],
  },
  {
    id: "google",
    name: "Google",
    apiKey: api.GOOGLE_GENERATIVE_AI_API_KEY,
    models: [
      { id: "gemini-3-pro", name: "Gemini 3 Pro" },
      { id: "gemini-3-flash-preview", name: "Gemini 3 Flash (Preview)" },
      { id: "gemini-3-flash", name: "Gemini 3 Flash" },
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
    ],
  },
  {
    id: "xai",
    name: "Grok (xAI)",
    apiKey: api.XAI_API_KEY,
    models: [
      { id: "grok-4.1", name: "Grok 4.1" },
      { id: "grok-4-vision", name: "Grok 4 Vision" },
    ],
  },
];

export function getAvailableProviders() {
  return PROVIDERS.filter(
    (p) => p.apiKey && p.apiKey !== "YOUR_API_KEY_HERE" && p.apiKey !== ""
  );
}
