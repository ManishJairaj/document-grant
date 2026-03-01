// @ts-expect-error: Deno is available in Supabase Edge Functions
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, topic, experienceLevel, explanationStyle, preferredDomain, difficultyAdjustment, history = [] } = await req.json();

    let difficultyInstruction = "";
    if (difficultyAdjustment === "easier") {
        difficultyInstruction = "\nIMPORTANT: The user struggled with the last quiz. Please REDUCE the conceptual difficulty, simplify your explanation further, and make the next quiz much easier than usual.";
    } else if (difficultyAdjustment === "harder") {
        difficultyInstruction = "\nIMPORTANT: The user aced the last quiz perfectly. Please slightly INCREASE the conceptual difficulty and make the next quiz a bit more challenging.";
    }

    const systemPrompt = `You are an adaptive learning tutor. The user is at ${experienceLevel} level.
They prefer ${explanationStyle} explanations in the domain of ${preferredDomain || "general knowledge"}.
The current topic is: ${topic}.${difficultyInstruction}

Respond ONLY with valid JSON (no markdown, no code fences) in this exact format:
{
  "explanation": "A clear, ${explanationStyle} explanation adapted to ${experienceLevel} level",
  "quiz": [
    {
      "question": "A question about the topic",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "The correct option text"
    }
  ],
  "recommendations": ["Next topic suggestion 1", "Next topic suggestion 2", "Next topic suggestion 3"]
}

Generate 2-3 quiz questions. Make the explanation thorough but adapted to the user's level.
${explanationStyle === 'simple' ? 'Use simple language and short sentences.' : ''}
${explanationStyle === 'detailed' ? 'Provide comprehensive, in-depth explanations.' : ''}
${explanationStyle === 'visual' ? 'Use analogies, mental models, and describe visual representations.' : ''}
${explanationStyle === 'examples' ? 'Lead with practical examples before theory.' : ''}`;

    // @ts-expect-error: Deno is available in Supabase Edge Functions
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...history,
          { role: "user", content: query },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) throw new Error("No content in AI response");

    // Parse JSON from response (handle potential markdown wrapping)
    let parsed;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        explanation: content,
        quiz: [],
        recommendations: ["Try asking a more specific question"],
      };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
