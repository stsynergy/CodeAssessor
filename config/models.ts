import * as api from "./.api";

export interface ModelConfig {
  id: string;
  name: string;
}

export interface ProviderConfig {
  id: string;
  name: string;
  models: ModelConfig[];
  apiKey?: string;
  baseURL?: string;
}

export const PROVIDERS: ProviderConfig[] = [
  {
    id: "openai",
    name: "OpenAI",
    apiKey: api.OPENAI_API_KEY,
    models: [
      { id: "gpt-5.2", name: "GPT-5.2" },
      { id: "gpt-5.2-codex", name: "GPT-5.2-Codex" },
      { id: "gpt-5.1", name: "GPT-5.1" },
      { id: "gpt-5.1-codex", name: "GPT-5.1-Codex" },
      { id: "gpt-5", name: "GPT-5" },
      { id: "gpt-5-codex", name: "GPT-5-Codex" },
      { id: "gpt-4.1", name: "GPT-4.1" },
      { id: "gpt-4o", name: "GPT-4o" },
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
      { id: "claude-opus-4", name: "Claude 4 Opus" },
      { id: "claude-sonnet-4", name: "Claude 4 Sonnet" },
    ],
  },
  {
    id: "google",
    name: "Google",
    apiKey: api.GOOGLE_GENERATIVE_AI_API_KEY,
    models: [
      { id: "gemini-3-pro-preview", name: "Gemini 3 Pro" },
      { id: "gemini-3-flash-preview", name: "Gemini 3 Flash (Preview)" },
      { id: "gemini-3-flash", name: "Gemini 3 Flash" },
      { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
    ],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    apiKey: api.OPENROUTER_API_KEY,
    models: [
        { id: "google/gemini-3-pro", name: "Gemini 3 Pro" },
        { id: "google/gemini-3-flash-preview", name: "Gemini 3 Flash (Preview)" },
        { id: "google/gemini-3-flash", name: "Gemini 3 Flash" },
        { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro" },
        { id: "anthropic/claude-4-5-opus", name: "Claude 4.5 Opus" },
        { id: "anthropic/claude-4-5-sonnet", name: "Claude 4.5 Sonnet" },
        { id: "anthropic/claude-4-5-haiku", name: "Claude 4.5 Haiku" },
        { id: "anthropic/claude-4-opus", name: "Claude 4 Opus" },
        { id: "anthropic/claude-4-sonnet", name: "Claude 4 Sonnet" },
        { id: "openai/gpt-5.2", name: "GPT-5.2" },
        { id: "openai/gpt-5.2-codex", name: "GPT-5.2-Codex" },
        { id: "openai/gpt-5.1", name: "GPT-5.1" },
        { id: "openai/gpt-5.1-codex", name: "GPT-5.1-Codex" },
        { id: "openai/gpt-5", name: "GPT-5" },
        { id: "openai/gpt-5-codex", name: "GPT-5-Codex" },
        { id: "openai/gpt-4.1", name: "GPT-4.1" },
        { id: "openai/gpt-4o", name: "GPT-4o" },
        { id: "openai/gpt-4o-mini", name: "GPT-4o Mini" },
        { id: "x-ai/grok-4.1-fast", name: "Grok 4.1 Fast" },
        { id: "x-ai/grok-code-fast-1", name: "Grok Code Fast 1" },
        { id: "x-ai/grok-4-fast", name: "Grok 4 Fast" },
        { id: "x-ai/grok-4", name: "Grok 4" },
        { id: "deepseek/deepseek-v3.2", name: "DeepSeek 3.2" },
        { id: "deepseek/deepseek-chat-v3.1", name: "DeepSeek v3.1" },
        { id: "deepseek/deepseek-chat-v3-0324", name: "DeepSeek v3-0324" },
    ],
  },
  {
    id: "xai",
    name: "Grok (xAI)",
    apiKey: api.XAI_API_KEY,
    models: [
      { id: "grok-4-1-fast-reasoning", name: "Grok 4.1" },
      { id: "grok-code-fast-1", name: "Grok code fast 1" },
      { id: "grok-4-fast-reasoning", name: "Grok 4" },
    ],
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    apiKey: api.DEEPSEEK_API_KEY,
    models: [
      { id: "deepseek-chat", name: "DeepSeek Chat" },
      { id: "deepseek-reasoner", name: "DeepSeek Reasoner" },
    ],
  },
  {
    id: "mistralai",
    name: "Mistral AI",
    apiKey: api.MISTRALAI_API_KEY,
    models: [
      { id: "mistral-large-2512", name: "Mistral Large 3" },
      { id: "mistral-medium-2508", name: "Mistral Medium 3.1" },
      { id: "codestral-2508", name: "Codestral" },
      { id: "codestral-2508", name: "Codestral" },
    ],
  },
  {
    id: "groq",
    name: "Groq",
    apiKey: api.GROQ_API_KEY,
    models: [
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B" },
      { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B" },
    ],
  },
  {
    id: "cerebras",
    name: "Cerebras",
    apiKey: api.CEREBRAS_API_KEY,
    models: [
      { id: "llama3.1-70b", name: "Llama 3.1 70B" },
      { id: "llama3.1-8b", name: "Llama 3.1 8B" },
    ],
  },
  {
    id: "meta",
    name: "Meta",
    apiKey: api.META_API_KEY,
    models: [
      { id: "llama3.1-405b", name: "Llama 3.1 405B" },
      { id: "llama3.1-70b", name: "Llama 3.1 70B" },
    ],
  },
  {
    id: "ollama",
    name: "Ollama (Local)",
    baseURL: api.OLLAMA_BASE_URL,
    models: [
      { id: "llama3.1", name: "Llama 3.1" },
      { id: "mistral", name: "Mistral" },
      { id: "phi3", name: "Phi-3" },
    ],
  },
  {
    id: "azure",
    name: "Azure AI",
    apiKey: api.AZURE_API_KEY,
    models: [
      { id: "gpt-4", name: "GPT-4" },
      { id: "gpt-35-turbo", name: "GPT-3.5 Turbo" },
    ],
  },
];

export function getAvailableProviders() {
  return PROVIDERS.filter((p) => {
    // Check if it has a configured API key
    const hasKey = p.apiKey && p.apiKey !== "YOUR_API_KEY_HERE" && p.apiKey !== "";
    // Ollama uses baseURL instead of apiKey
    const hasBaseUrl = p.baseURL && p.baseURL !== "" && p.id === "ollama";
    // Some providers might not require a key in certain environments, but we'll stick to explicit config
    return hasKey || hasBaseUrl;
  });
}
