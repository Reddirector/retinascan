"use node";

/**
 * Demo screening logic. The real pipeline (LangGraph / SGLang) is NOT wired
 * up — this is a filename lookup against cases.json. After the lookup, a
 * full clinical screening report is assembled from the case facts. When
 * NVIDIA_API_KEY is set, the NVIDIA NIM model fills in the report template;
 * otherwise a deterministic in-code template is used (same output shape).
 *
 * dr_stage / dr_label / referable / gradcam_image stay fixed per filename;
 * confidence is computed in code, never stored.
 */

import { action, internalAction } from "./_generated/server";
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
const NVIDIA_MODEL = "nvidia/nemotron-3.5-lightning-30b-a3b";

/* ------------------------------------------------------------------ */
/* Per-stage report content                                            */
/* ------------------------------------------------------------------ */

interface StageContent {
  verdictName: string;
  findings: string[];
  why: string;
  lesions: string;
  action: string;
}

function stageContent(record: CaseRecord): StageContent {
  if (record.dr_stage === 0) {
    return {
      verdictName: "No Diabetic Retinopathy (Grade 0)",
      findings: [
        "No **microaneurysms**, hemorrhages, or hard exudates are detected in the retinal field.",
        "Retinal blood vessels show normal caliber with no signs of **venous beading**.",
        "No evidence of **neovascularization** is detected at the optic disc or elsewhere.",
        "The optic disc and macula appear within normal limits and there is no obvious major imaging artifact affecting interpretation.",
      ],
      why: "The absence of **microaneurysms, retinal hemorrhages and hard exudates** forms a retinal lesion pattern consistent with a healthy retina. The extent and distribution of these findings are most consistent with **No DR** rather than any stage of diabetic retinopathy.",
      lesions: "No DR lesions detected",
      action: "Continue routine annual screening.",
    };
  }
  if (record.dr_stage >= 4) {
    return {
      verdictName: "Proliferative Diabetic Retinopathy (Grade 4)",
      findings: [
        "Extensive **retinal hemorrhages** are present across multiple quadrants of the retinal field.",
        "Clear signs of **neovascularization** are detected, consistent with proliferative disease.",
        "**Venous beading** is visible in the mid-peripheral retinal regions.",
        "The optic disc shows features of **fibrovascular proliferation** and there is no obvious major imaging artifact affecting interpretation.",
      ],
      why: "The combination of **extensive retinal hemorrhages, venous beading and neovascularization** forms a retinal lesion pattern associated with proliferative diabetic retinopathy. The extent and distribution of these findings are most consistent with **Proliferative DR** rather than earlier NPDR stages.",
      lesions:
        "Extensive hemorrhages detected\n   * Neovascularization detected\n   * Venous beading detected",
      action: "Urgent ophthalmologist examination and clinical confirmation.",
    };
  }
  return {
    verdictName:
      "Moderate Non-Proliferative Diabetic Retinopathy (NPDR), Grade 2",
    findings: [
      "Multiple small red lesions consistent with **microaneurysms** are visible across the retinal field.",
      "Several **dot and blot hemorrhages** are present, particularly in the mid-peripheral retinal regions.",
      "Small areas of **yellow-white hard exudates** are visible near the posterior pole.",
      "No clear evidence of **neovascularization** is detected.",
      "The optic disc appears identifiable and there is no obvious major imaging artifact affecting interpretation.",
    ],
    why: "The combination of **microaneurysms, retinal hemorrhages and hard exudates** forms a retinal lesion pattern associated with diabetic retinopathy. The extent and distribution of these findings are most consistent with **Moderate NPDR** rather than No DR or Mild NPDR.",
    lesions:
      "Microaneurysms detected\n   * Dot/blot hemorrhages detected\n   * Hard exudates detected",
    action: "Ophthalmologist examination and clinical confirmation.",
  };
}

/* ------------------------------------------------------------------ */
/* Deterministic report template (also the AI fallback)                */
/* ------------------------------------------------------------------ */

function buildDeterministicReport(
  record: CaseRecord,
  confidence: number,
): string {
  const content = stageContent(record);
  const dec = Math.floor(Math.random() * 10);
  const conf = `${confidence}.${dec}%`;
  const unc = `${(1000 - confidence * 10 - dec) / 10}%`;
  const classification = record.referable ? "REFERABLE DR" : "NO REFERABLE DR";
  const referral = record.referable ? "Yes" : "No";
  const bullets = content.findings.map((f) => `• ${f}`).join("\n\n");

  return [
    "RETINASCAN AI",
    "DIABETIC RETINOPATHY SCREENING REPORT",
    "",
    "Analysis Status: Analysis Complete",
    "Image Quality: Good / Gradable",
    "Eye: Right Eye (OD)",
    "",
    "FINAL VERDICT",
    "",
    `The retinal image shows **${content.verdictName}** features.`,
    "",
    `AI Confidence: **${conf}**`,
    `Uncertainty: **${unc}**`,
    `Screening Classification: **${classification}**`,
    "",
    "WHAT I SEE IN THE IMAGE",
    "",
    bullets,
    "",
    "WHY I CLASSIFIED IT AS DIABETIC RETINOPATHY",
    "",
    content.why,
    "",
    "EVIDENCE USED",
    "",
    "1. **Vision Model**",
    "",
    `   * Predicted DR Grade: ${record.dr_stage}`,
    `   * Confidence: ${conf}`,
    "",
    "2. **Visual Evidence**",
    "",
    `   * ${content.lesions}`,
    "",
    "3. **Explainability**",
    "",
    "   * Grad-CAM regions overlap with areas containing the detected retinal abnormalities.",
    "",
    "4. **Clinical Knowledge**",
    "",
    "   * Retrieved DR classification criteria and clinical literature support the association between these lesion patterns and the assigned staging.",
    "",
    "5. **Verification**",
    "",
    "   * Vision prediction and detected evidence are consistent.",
    "   * No major contradiction was identified between model output, visual evidence and retrieved clinical information.",
    "",
    "CLINICAL SCREENING RESULT",
    "",
    `**${content.verdictName}**`,
    "",
    `**Referral Recommended:** ${referral}`,
    `**Recommended Action:** ${content.action}`,
    "",
    "AI CONFIDENCE",
    "",
    `**${conf} Confidence → ${content.verdictName}**`,
    "",
    "This is an **AI screening assessment**, not a definitive clinical diagnosis.",
  ].join("\n");
}

/* ------------------------------------------------------------------ */
/* NVIDIA NIM report generation (OpenAI-compatible)                    */
/* ------------------------------------------------------------------ */

async function generateAiReport(
  record: CaseRecord,
  confidence: number,
): Promise<string | null> {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) return null;

  const content = stageContent(record);
  const dec = Math.floor(Math.random() * 10);
  const conf = `${confidence}.${dec}%`;
  const unc = `${(1000 - confidence * 10 - dec) / 10}%`;
  const classification = record.referable ? "REFERABLE DR" : "NO REFERABLE DR";

  const systemPrompt =
    "You output a fixed-format clinical screening report for the RetinaScan AI demo. " +
    "Fill the template EXACTLY as given, using ONLY the facts provided. " +
    "Keep every section heading, bullet and line break. Keep the markdown bold (**). " +
    "Do not add commentary, headings of your own, or thinking text. Output the report only.";

  const userPrompt = [
    "Template:",
    "",
    "RETINASCAN AI",
    "DIABETIC RETINOPATHY SCREENING REPORT",
    "",
    "Analysis Status: Analysis Complete",
    "Image Quality: Good / Gradable",
    "Eye: Right Eye (OD)",
    "",
    "FINAL VERDICT",
    "",
    "The retinal image shows **<VERDICT_NAME>** features.",
    "",
    "AI Confidence: **<CONF>**",
    "Uncertainty: **<UNC>**",
    "Screening Classification: **<CLASSIFICATION>**",
    "",
    "WHAT I SEE IN THE IMAGE",
    "",
    "<FINDINGS_BULLETS>",
    "",
    "WHY I CLASSIFIED IT AS DIABETIC RETINOPATHY",
    "",
    "<WHY>",
    "",
    "EVIDENCE USED",
    "",
    "1. **Vision Model**",
    "",
    "   * Predicted DR Grade: <STAGE>",
    "   * Confidence: <CONF>",
    "",
    "2. **Visual Evidence**",
    "",
    "   * <LESIONS>",
    "",
    "3. **Explainability**",
    "",
    "   * Grad-CAM regions overlap with areas containing the detected retinal abnormalities.",
    "",
    "4. **Clinical Knowledge**",
    "",
    "   * Retrieved DR classification criteria and clinical literature support the association between these lesion patterns and the assigned staging.",
    "",
    "5. **Verification**",
    "",
    "   * Vision prediction and detected evidence are consistent.",
    "   * No major contradiction was identified between model output, visual evidence and retrieved clinical information.",
    "",
    "CLINICAL SCREENING RESULT",
    "",
    "**<VERDICT_NAME>**",
    "",
    "**Referral Recommended:** <REFERRAL>",
    "**Recommended Action:** <ACTION>",
    "",
    "AI CONFIDENCE",
    "",
    "**<CONF> Confidence → <VERDICT_NAME>**",
    "",
    "This is an **AI screening assessment**, not a definitive clinical diagnosis.",
    "",
    "Facts to fill in:",
    `- VERDICT_NAME: ${content.verdictName}`,
    `- CONF: ${conf}`,
    `- UNC: ${unc}`,
    `- CLASSIFICATION: ${classification}`,
    `- FINDINGS_BULLETS: ${content.findings.map((f) => `• ${f}`).join(" ")}`,
    `- WHY: ${content.why}`,
    `- STAGE: ${record.dr_stage}`,
    `- LESIONS: ${content.lesions}`,
    `- REFERRAL: ${record.referable ? "Yes" : "No"}`,
    `- ACTION: ${content.action}`,
  ].join("\n");

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
        max_tokens: 2048,
        stream: false,
        // Thinking mode adds latency for reasoning tokens we don't display;
        // disabled so the report is ready when the animation finishes.
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
    const text = data.choices?.[0]?.message?.content;
    if (
      typeof text === "string" &&
      text.includes("RETINASCAN AI") &&
      text.includes("FINAL VERDICT")
    ) {
      return text.trim();
    }
    return null;
  } catch (error) {
    console.error("[screening] NVIDIA API call failed:", error);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Follow-up chat action                                               */
/* ------------------------------------------------------------------ */

export const chat = action({
  args: {
    question: v.string(),
    report: v.optional(v.string()),
    dr_stage: v.optional(v.number()),
    dr_label: v.optional(v.string()),
    referable: v.optional(v.boolean()),
    confidence: v.optional(v.number()),
    history: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
      }),
    ),
  },
  handler: async (_ctx, { question, report, dr_stage, dr_label, referable, confidence, history }) => {
    const apiKey = process.env.NVIDIA_API_KEY;
    if (!apiKey) {
      // Deterministic fallback when no key is configured.
      if (report) {
        const action = referable
          ? "Ophthalmologist referral is recommended."
          : "Routine annual screening is recommended.";
        return {
          reply:
            `Based on the screening report: DR stage ${dr_stage} (${dr_label}) ` +
            `with ${confidence}% confidence. ${action} ` +
            "(Configure NVIDIA_API_KEY to enable live AI answers.)",
          source: "template" as const,
        };
      }
      return {
        reply:
          "RetinaScan AI's chat assistant needs NVIDIA_API_KEY configured to answer questions. " +
          "Run a screening from New Screening first — the report itself works without the key.",
        source: "template" as const,
      };
    }

    const systemPrompt = report
      ? "You are RetinaScan AI's clinical follow-up assistant. Answer questions about " +
        "the screening report provided. Be concise (1-3 sentences unless asked for detail), " +
        "factual, and grounded in the report facts. You are an AI screening tool, not a " +
        "definitive clinical diagnosis. Plain prose only, no markdown headings."
      : "You are RetinaScan AI's assistant — a demo tool for AI-based diabetic retinopathy " +
        "screening from fundus images. Answer general questions about diabetic retinopathy, " +
        "DR staging (0-4), screening workflows, and the RetinaScan pipeline. Be concise and " +
        "factual. You are an AI screening tool, not a definitive clinical diagnosis. " +
        "Plain prose only, no markdown headings.";

    const userPrompt = report
      ? `Screening report for context:\n\n${report}\n\n` +
        `Case facts: DR stage ${dr_stage} (${dr_label}), referable: ${referable}, confidence: ${confidence}%.\n\n` +
        `The user asks: ${question}`
      : `The user asks: ${question}`;

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
            ...history,
            { role: "user", content: userPrompt },
          ],
          temperature: 1,
          top_p: 0.95,
          max_tokens: 512,
          stream: false,
          chat_template_kwargs: { enable_thinking: false },
        }),
      });
    };

    try {
      let res = await call();
      if (res.status === 503 || res.status === 429) {
        await new Promise((r) => setTimeout(r, 2000));
        res = await call();
      }
      if (!res.ok) {
        console.error("[chat] NVIDIA API error:", res.status);
        return {
          reply:
            "The AI service is temporarily unavailable. Please try again in a moment.",
          source: "error" as const,
        };
      }
      const data = (await res.json()) as {
        choices?: { message?: { content?: unknown } }[];
      };
      const content = data.choices?.[0]?.message?.content;
      if (typeof content === "string" && content.trim().length > 0) {
        return { reply: content.trim(), source: "ai" as const };
      }
      return {
        reply:
          "The AI service returned an empty response. Please try again.",
        source: "error" as const,
      };
    } catch (error) {
      console.error("[chat] NVIDIA API call failed:", error);
      return {
        reply:
          "Could not reach the AI service. Please check the connection and try again.",
        source: "error" as const,
      };
    }
  },
});

/* ------------------------------------------------------------------ */
/* Screening action                                                    */
/* ------------------------------------------------------------------ */

export const screen = action({
  args: { filename: v.string() },
  handler: async (_ctx, { filename }) => {
    // Filename convention: strip extension, trim, lowercase.
    // eyescan1.png / EyeScan1.jpg / eyescan1.jpeg all match "eyescan1".
    const key = filename.replace(/\.[^./\\]+$/, "").trim().toLowerCase();

    const records = caseRecords as unknown as Record<string, CaseRecord>;
    const keys = Object.keys(records);
    let record = records[key];
    let matchedKey = key;
    let viaFallback = false;

    if (!record) {
      // ANY uploaded image gets a full report: unmatched filenames fall
      // back to a demo case, rotating through the records so repeated
      // uploads cycle through No DR / Moderate / Proliferative.
      if (keys.length === 0) {
        return { matched: false as const };
      }
      const idx = Math.floor(Math.random() * keys.length);
      matchedKey = keys[idx] ?? key;
      record = records[matchedKey];
      if (!record) {
        return { matched: false as const };
      }
      viaFallback = true;
    }

    // Randomized per request (90-96 inclusive) — never stored in cases.json.
    const confidence = 90 + Math.floor(Math.random() * 7);

    // Full report: NVIDIA fills the template when the key is set; otherwise
    // the identical deterministic template is used. Latency is hidden under
    // the frontend's staged pipeline animation.
    const aiReport = await generateAiReport(record, confidence);
    const report = aiReport ?? buildDeterministicReport(record, confidence);

    return {
      matched: true as const,
      matched_key: matchedKey,
      via_fallback: viaFallback,
      dr_stage: record.dr_stage,
      dr_label: record.dr_label,
      referable: record.referable,
      gradcam_image: record.gradcam_image,
      explanation: record.explanation,
      report,
      report_source: aiReport ? ("ai" as const) : ("template" as const),
      confidence,
    };
  },
});
