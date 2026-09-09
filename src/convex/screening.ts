"use node";

/**
 * Demo screening logic. The real pipeline (LangGraph / SGLang) is NOT wired
 * up — this is a filename lookup against cases.json. The explanation text
 * IS generated live by an NVIDIA NIM chat model when NVIDIA_API_KEY is set;
 * otherwise it falls back to the canned explanation in cases.json.
 *
 * dr_stage / dr_label / referable / gradcam_image stay fixed per filename;
 * confidence is computed in code, never stored.
 */

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import caseRecords from "./cases.json";

interface CaseRecord {
  dr_stage: number;
  dr_label: string;
  referable: boolean;
  gradcam_image: string;
  explanation: string;
}

const NVIDIA_BASE_URL = "https://integrate.api.nvidia.com/v1";
const NVIDIA_MODEL = "nvidia/nemotron-3-ultra-550b-a55b";

/**
 * Generate a clinical explanation via the NVIDIA NIM chat completions API
 * (OpenAI-compatible). Returns null on any failure so the caller can fall
 * back to the canned wording in cases.json.
 */
async function generateAiExplanation(
  record: CaseRecord,
  confidence: number,
): Promise<string | null> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) return null;

  const systemPrompt =
    "You are a clinical assistant explaining diabetic retinopathy screening results. " +
    "Write a concise, factual explanation of 2-3 sentences for the referring clinician. " +
    "State the key findings, then the recommended follow-up timeframe. " +
    "Do not use headings, bullet points, or markdown. Plain prose only.";

  const userPrompt =
    `Fundus screening result: DR stage ${record.dr_stage} (${record.dr_label}). ` +
    `Referable: ${record.referable ? "yes" : "no"}. ` +
    `Model confidence: ${confidence}%. ` +
    "Explain this result and the recommended follow-up.";

  const call = async (): Promise<Response> => {
    return fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: NVIDIA_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 1,
        top_p: 0.95,
        max_tokens: 512,
        stream: false,
        // Thinking mode adds latency for reasoning tokens we don't display;
        // disabled so the explanation is ready when the animation finishes.
        chat_template_kwargs: { enable_thinking: false },
      }),
    });
  };

  try {
    // The endpoint occasionally returns transient 503s under load — one
    // retry after a short backoff; latency is hidden under the animation.
    let res = await call();
    if (res.status === 503 || res.status === 429) {
      await new Promise((r) => setTimeout(r, 2000));
      res = await call();
    }
    if (!res.ok) {
      console.error("[screening] NVIDIA API error:", res.status);
      return null;
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: unknown } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (typeof content === "string" && content.trim().length > 0) {
      return content.trim();
    }
    return null;
  } catch (error) {
    console.error("[screening] NVIDIA API call failed:", error);
    return null;
  }
}

export const screen = internalAction({
  args: { filename: v.string() },
  handler: async (_ctx, { filename }) => {
    // Filename convention: strip extension, trim, lowercase.
    // eyescan1.png / EyeScan1.jpg / eyescan1.jpeg all match "eyescan1".
    const key = filename.replace(/\.[^./\\]+$/, "").trim().toLowerCase();

    const records = caseRecords as unknown as Record<string, CaseRecord>;
    const record = records[key];
    if (!record) {
      return { matched: false as const };
    }

    // Randomized per request (90-96 inclusive) — never stored in cases.json.
    const confidence = 90 + Math.floor(Math.random() * 7);

    // Prefer a live model-generated explanation; fall back to the canned
    // wording in cases.json if the key is missing or the call fails.
    const aiExplanation = await generateAiExplanation(record, confidence);

    return {
      matched: true as const,
      matched_key: key,
      dr_stage: record.dr_stage,
      dr_label: record.dr_label,
      referable: record.referable,
      gradcam_image: record.gradcam_image,
      explanation: aiExplanation ?? record.explanation,
      explanation_source: aiExplanation ? ("ai" as const) : ("canned" as const),
      confidence,
    };
  },
});
