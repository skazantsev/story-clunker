import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { previousSegments, genre } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Generating story continuation for genre:', genre);

    // Craft a system prompt based on genre
    const genrePrompts = {
      scary: "You are a master horror writer. Create suspenseful, eerie, and thrilling story continuations that keep readers on edge. Use vivid, atmospheric descriptions and build tension.",
      funny: "You are a comedic storyteller. Create humorous, witty, and entertaining story continuations with clever wordplay, unexpected twists, and laugh-out-loud moments.",
      'sci-fi': "You are a science fiction author. Create imaginative, thought-provoking story continuations with advanced technology, alien worlds, and futuristic concepts."
    };

    const systemPrompt = genrePrompts[genre as keyof typeof genrePrompts] || genrePrompts['sci-fi'];
    
    // Build context from previous segments
    const storyContext = previousSegments.map((seg: any, idx: number) => 
      `${seg.is_ai_generated ? '[AI]' : '[User]'}: ${seg.content}`
    ).join('\n\n');

    const userPrompt = `Continue this ${genre} story with 2-3 engaging paragraphs that naturally flow from what came before. Make it creative and compelling:\n\n${storyContext}\n\nYour continuation:`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI usage credits depleted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI API request failed: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.choices[0].message.content;

    console.log('Story continuation generated successfully');

    return new Response(
      JSON.stringify({ continuation: generatedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in generate-story function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
