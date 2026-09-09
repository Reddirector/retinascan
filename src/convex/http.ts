import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

// POST /api/screen
// Accepts a multipart upload (or a JSON { filename } fallback), matches the
// filename against the demo case records, and returns the matched record
// with a per-request randomized confidence. The frontend owns the 25-35s
// staged pipeline animation; this endpoint returns quickly.
http.route({
  path: "/api/screen",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      let filename = "";
      const contentType = request.headers.get("content-type") ?? "";

      if (contentType.includes("multipart/form-data")) {
        const form = await request.formData();
        const file = form.get("file") ?? form.get("image");
        if (file && typeof file !== "string") {
          filename = file.name;
        }
      } else if (contentType.includes("application/json")) {
        const body = (await request.json()) as { filename?: unknown };
        if (typeof body.filename === "string") {
          filename = body.filename;
        }
      }

      filename = filename.trim();
      if (!filename) {
        return new Response(
          JSON.stringify({ error: "No filename provided." }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }

      const result = await ctx.runAction(api.screening.screen, {
        filename,
      });

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("[/api/screen] error:", error);
      return new Response(
        JSON.stringify({ error: "Screening request failed." }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }
  }),
});

export default http;
