import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { message, shipId, distressId } = await req.json();

  if (!message) {
    return NextResponse.json({ error: 'No message provided' }, { status: 400 });
  }

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 512,
          system: `You are a maritime emergency analysis system for the Strait of Hormuz Crisis Command. 
Analyze distress messages from ship captains and extract structured threat data.
Respond ONLY with valid JSON, no markdown, no explanation.
JSON schema:
{
  "severity": "low|medium|high|critical",
  "issues": ["list of identified problems"],
  "injuryCount": number,
  "damageEstimate": number_in_usd,
  "requiresImmediateAction": boolean,
  "recommendedAction": "specific action for command to take",
  "confidence": 0.0_to_1.0,
  "cargoRisk": "low|medium|high",
  "environmentalRisk": "none|low|medium|high"
}`,
          messages: [
            {
              role: 'user',
              content: `Ship ID: ${shipId}\nDistress Message: "${message}"\n\nAnalyze this maritime emergency and return structured JSON.`,
            },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.content?.[0]?.text || '{}';

        try {
          const cleaned = text.replace(/```json|```/g, '').trim();
          const analysis = JSON.parse(cleaned);
          return NextResponse.json({ distressId, shipId, ...analysis });
        } catch {
          // Fall through to rule-based fallback
        }
      }
    } catch (error) {
      console.warn('AI distress analyzer API offline, using rule-based analysis:', error);
    }
  }

  // Rule-based maritime distress analysis fallback
  const lower = message.toLowerCase();
    const analysis = {
      distressId,
      shipId,
      severity: lower.includes('fire') || lower.includes('sinking') || lower.includes('mayday') ? 'critical'
              : lower.includes('engine') || lower.includes('injured') ? 'high'
              : 'medium',
      issues: [
        lower.includes('fire') ? 'fire onboard' : null,
        lower.includes('flooding') || lower.includes('sinking') ? 'hull breach' : null,
        lower.includes('engine') ? 'propulsion failure' : null,
        lower.includes('injured') ? 'medical emergency' : null,
        lower.includes('fuel') ? 'fuel emergency' : null,
      ].filter(Boolean),
      injuryCount: 0,
      damageEstimate: 0,
      requiresImmediateAction: lower.includes('mayday') || lower.includes('fire') || lower.includes('sinking'),
      recommendedAction: 'Dispatch nearest available vessel for assistance',
      confidence: 0.65,
      cargoRisk: 'medium',
      environmentalRisk: 'low',
    };
    return NextResponse.json(analysis);
}
