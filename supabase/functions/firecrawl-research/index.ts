import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Extract key words from content for search
function extractSearchQuery(content: string): string {
  // Take first 100 chars, remove special chars, limit to ~10 words
  const cleaned = content
    .slice(0, 200)
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  
  const words = cleaned.split(" ").slice(0, 8);
  return words.join(" ");
}

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

    // Extract search query from content
    const searchQuery = extractSearchQuery(content);
    console.log("Search query:", searchQuery);

    // Call Firecrawl search API
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
      
      const errorMsg = firecrawlData.error?.toLowerCase() || "";
      
      // Check for quota/credit/rate limit errors (402 = Payment Required, 429 = Too Many Requests)
      if (
        firecrawlResponse.status === 402 ||
        firecrawlResponse.status === 429 ||
        errorMsg.includes("credit") ||
        errorMsg.includes("rate") ||
        errorMsg.includes("quota") ||
        errorMsg.includes("limit")
      ) {
        return new Response(
          JSON.stringify({
            error: "quota_exceeded",
            message: firecrawlResponse.status === 402 
              ? "Firecrawl credits depleted. Please upgrade your plan at firecrawl.dev/pricing."
              : "Firecrawl API rate limit reached. Please try again later.",
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: firecrawlData.error || "Firecrawl search failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format results into a brief summary
    const results = firecrawlData.data || [];
    if (results.length === 0) {
      return new Response(
        JSON.stringify({ summary: "No relevant research found for this topic.", query: searchQuery }),
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
