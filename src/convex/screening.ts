"use node";

/**
 * Demo screening logic. The real pipeline (LangGraph / SGLang / model
 * inference) is NOT wired up — this is a filename lookup against
 * cases.json with a freshly randomized confidence per request.
 *
 * cases.json is imported as a module so Convex re-bundles it on every
 * deploy: editing the file (adding cases, swapping wording) is picked up
 * on the next request without any code changes or manual restarts.
 * dr_stage / dr_label / referable / gradcam_image / explanation are fixed
 * per filename; confidence is computed in code, never stored.
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

    return {
      matched: true as const,
      matched_key: key,
      dr_stage: record.dr_stage,
      dr_label: record.dr_label,
      referable: record.referable,
      gradcam_image: record.gradcam_image,
      explanation: record.explanation,
      confidence,
    };
  },
});
