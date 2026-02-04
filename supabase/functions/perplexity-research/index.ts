import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Extract key words from content for search
function extractSearchQuery(content: string): string {
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

    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    if (!PERPLEXITY_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Perplexity API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const searchQuery = extractSearchQuery(content);
    console.log("Perplexity search query:", searchQuery);

    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          { 
            role: "system", 
            content: "You are a research assistant. Provide a brief, factual summary (2-3 sentences) about the topic. Focus on interesting facts that could inspire creative writing." 
          },
          { role: "user", content: `Research this topic for a story: ${searchQuery}` }
        ],
        max_tokens: 200,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Perplexity API error:", response.status, data);

      if (response.status === 402 || response.status === 429) {
        return new Response(
          JSON.stringify({
            error: "quota_exceeded",
            message: response.status === 402
              ? "Perplexity credits depleted. Please upgrade your plan."
              : "Perplexity rate limit reached. Please try again later.",
          }),
          { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: data.error?.message || "Perplexity search failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const summary = data.choices?.[0]?.message?.content || "No research found.";
    const citations = data.citations || [];

    console.log("Perplexity research complete");
    return new Response(
      JSON.stringify({ 
        summary, 
        query: searchQuery,
        citations 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("perplexity-research error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
