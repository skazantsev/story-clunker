import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content } = await req.json();

    if (!content || typeof content !== "string") {
      return new Response(
        JSON.stringify({ error: "Content is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
    if (!FIRECRAWL_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Firecrawl API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Lovable API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 1: Extract search topic using Lovable AI
    console.log("Extracting search topic from content...");
    const topicResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "Extract a concise web search query (3-6 words) from the given story segment. Focus on real-world topics, facts, or concepts that could be researched. Return ONLY the search query, nothing else.",
          },
          { role: "user", content },
        ],
      }),
    });

    if (!topicResponse.ok) {
      console.error("Lovable AI error:", topicResponse.status);
      return new Response(
        JSON.stringify({ error: "Failed to extract search topic" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const topicData = await topicResponse.json();
    const searchQuery = topicData.choices?.[0]?.message?.content?.trim();

    if (!searchQuery) {
      return new Response(
        JSON.stringify({ error: "Could not extract search topic" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Search query:", searchQuery);

    // Step 2: Call Firecrawl search API
    const firecrawlResponse = await fetch("https://api.firecrawl.dev/v1/search", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: searchQuery,
        limit: 3,
      }),
    });

    const firecrawlData = await firecrawlResponse.json();

    if (!firecrawlResponse.ok) {
      console.error("Firecrawl API error:", firecrawlResponse.status, firecrawlData);
      
      // Check for quota/rate limit errors
      if (
        firecrawlResponse.status === 429 ||
        firecrawlData.error?.toLowerCase().includes("rate") ||
        firecrawlData.error?.toLowerCase().includes("quota") ||
        firecrawlData.error?.toLowerCase().includes("limit")
      ) {
        return new Response(
          JSON.stringify({
            error: "quota_exceeded",
            message: "Firecrawl API quota exceeded. Please check your Firecrawl plan limits.",
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: firecrawlData.error || "Firecrawl search failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 3: Format results into a brief summary
    const results = firecrawlData.data || [];
    if (results.length === 0) {
      return new Response(
        JSON.stringify({ summary: "No relevant research found for this topic." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const summaryParts = results.slice(0, 3).map((r: any) => {
      const title = r.title || "";
      const description = r.description || r.markdown?.slice(0, 150) || "";
      return `${title}: ${description}`.slice(0, 200);
    });

    const summary = summaryParts.join(" | ").slice(0, 500);

    console.log("Research complete");
    return new Response(
      JSON.stringify({ summary, query: searchQuery }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("firecrawl-research error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
