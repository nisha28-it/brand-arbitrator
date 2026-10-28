import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { content } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) throw new Error("API Key missing");

    const prompt = `You are an expert Brand Governance AI. Analyze this draft: "${content}" against this rule: "Never use absolute superlatives like 'cheapest', 'best', or 'guaranteed'."
    
    If violated, extract the creator's intent, and generate three paths:
    Path A: A rewrite that follows the rule but preserves the intent.
    Path B: An escalation message.
    Path C: The original text to override.

    Return STRICTLY this JSON structure and nothing else:
    {
      "has_violation": true,
      "brand_rule_violated": "The specific rule that was broken",
      "extracted_intent": "What the creator was trying to achieve",
      "path_a_comply": "The rewritten compliant text",
      "path_b_escalate": "The escalation message",
      "path_c_override": "The original text kept as is"
    }`;

    // Function to call the API
    const callGemini = async (modelName: string) => {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
          })
        }
      );
      if (!response.ok) {
        throw new Error(`Model ${modelName} failed`);
      }
      return response.json();
    };

    let data;
    try {
      // Try the primary model
      data = await callGemini('gemini-3.5-flash');
    } catch (error) {
      console.log("Primary model busy. Switching to fallback...");
      // If it fails (e.g., 503 High Demand), try the fallback model
      data = await callGemini('gemini-3.1-pro'); 
    }

    const responseText = data.candidates[0].content.parts[0].text;
    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return NextResponse.json(JSON.parse(cleanedText));
  } catch (error: any) {
    console.error("BACKEND ERROR:", error.message);
    return NextResponse.json({ error: error.message || 'Failed to analyze' }, { status: 500 });
  }
}