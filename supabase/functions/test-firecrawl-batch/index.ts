import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const results: { index: number; success: boolean; error?: string; duration: number }[] = [];
  const testContent = "The abandoned Mars colony stood silent under the red sky";

  console.log("Starting 100 Firecrawl calls with 100ms delay...");

  for (let i = 0; i < 100; i++) {
    const start = Date.now();
    try {
      const response = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/firecrawl-research`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({ content: testContent }),
        }
      );

      const data = await response.json();
      const duration = Date.now() - start;

      if (response.ok) {
        results.push({ index: i, success: true, duration });
        console.log(`Call ${i + 1}: SUCCESS (${duration}ms)`);
      } else {
        results.push({ index: i, success: false, error: data.error, duration });
        console.log(`Call ${i + 1}: FAILED - ${data.error} (${duration}ms)`);
      }
    } catch (error) {
      const duration = Date.now() - start;
      results.push({ index: i, success: false, error: String(error), duration });
      console.log(`Call ${i + 1}: ERROR - ${error} (${duration}ms)`);
    }

    // Wait 100ms before next call
    if (i < 99) {
      await delay(100);
    }
  }

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length;

  console.log(`\nCompleted: ${successful} successful, ${failed} failed, avg ${avgDuration.toFixed(0)}ms`);

  return new Response(
    JSON.stringify({
      total: 100,
      successful,
      failed,
      avgDuration: Math.round(avgDuration),
      results,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
