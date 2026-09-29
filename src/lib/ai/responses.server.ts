import { createOpenAI } from "@ai-sdk/openai";

import { createLovableAiGatewayRunIdFetch } from "./run-id.server";

export const GATEWAY_BASE_URL = "https://ai.gateway.lovable.dev";
export const RESUME_MODEL = "openai/gpt-6-astra";

export function createResponsesProvider() {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    throw new Error("AI is not configured for this app yet.");
  }

  const runIdFetch = createLovableAiGatewayRunIdFetch();
  const provider = createOpenAI({
    baseURL: `${GATEWAY_BASE_URL}/v1`,
    apiKey,
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    fetch: runIdFetch.fetch,
  });

  return provider;
}

export const RESPONSES_PROVIDER_OPTIONS = {
  openai: {
    store: false,
    forceReasoning: true,
    reasoningEffort: "medium",
    reasoningSummary: "auto",
    include: ["reasoning.encrypted_content"],
  },
} as const;
