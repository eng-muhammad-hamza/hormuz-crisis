import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { situation, ships, ports } = await req.json();

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
          max_tokens: 1024,
          system: `You are an AI Fleet Advisor for the Strait of Hormuz Maritime Crisis Command Center.
You analyze real-time fleet data and proactively recommend tactical actions to Command.
Your suggestions should be specific, actionable, and prioritized.

Respond ONLY with valid JSON (no markdown, no preamble):
{
  "suggestions": [
    {
      "priority": "critical|high|medium|low",
      "type": "reroute|zone|assist|fuel|weather|general",
      "title": "short title under 50 chars",
      "reasoning": "2-3 sentences explaining why this matters",
      "action": "specific command action to take",
      "shipId": "MV-X or null"
    }
  ]
}

Generate 3-5 suggestions based on the fleet situation. Focus on:
- Vessels in immediate danger (distress, out of fuel, stranded)
- Predictive risks (fuel shortfalls, weather intersections, zone conflicts)
- Tactical optimization (routing efficiency, convoy grouping)
- Strategic positioning (pre-positioning near threat zones)`,
          messages: [
            {
              role: 'user',
              content: `${situation}\n\nGenerate tactical recommendations for fleet command.`,
            },
          ],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.content?.[0]?.text || '{"suggestions":[]}';
        const cleaned = text.replace(/```json|```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        return NextResponse.json(parsed);
      }
    } catch (err) {
      console.warn('AI advisor API offline, using tactical heuristic engine:', err);
    }
  }

  // Intelligent fallback based on ship data
  const suggestions = [];

    if (ships) {
      const distressed = ships.filter((s: { status: string }) => s.status === 'distressed' || s.status === 'out_of_fuel');
      const fuelCritical = ships.filter((s: { fuel: number; arrived: boolean }) => s.fuel < 600 && !s.arrived);
      const inWeather = ships.filter((s: { inWeather: boolean; arrived: boolean }) => s.inWeather && !s.arrived);

      if (distressed.length > 0) {
        const ds = distressed[0] as { shipId: string; name: string; fuel: number };
        const nearest = ships
          .filter((s: { shipId: string; arrived: boolean; fuel: number }) => s.shipId !== ds.shipId && !s.arrived && s.fuel > 1500)
          .sort((a: { position: number[] }, b: { position: number[] }) => {
            const da = ships.find((s: { shipId: string }) => s.shipId === ds.shipId);
            if (!da) return 0;
            return Math.hypot(a.position[0] - da.position[0], a.position[1] - da.position[1]) -
                   Math.hypot(b.position[0] - da.position[0], b.position[1] - da.position[1]);
          })[0] as { shipId: string; name: string; fuel: number } | undefined;
        suggestions.push({
          priority: 'critical',
          type: 'assist',
          title: `Emergency: ${ds.name} needs assistance`,
          reasoning: `${ds.name} is in distress with ${Math.round(ds.fuel)}t fuel remaining. Immediate intervention required to prevent loss of vessel and cargo.`,
          action: nearest ? `Dispatch ${nearest.name} to assist ${ds.name} immediately` : `Coordinate coast guard response for ${ds.name}`,
          shipId: nearest?.shipId || ds.shipId,
        });
      }

      if (fuelCritical.length > 0) {
        const s = fuelCritical[0] as { shipId: string; name: string; fuel: number; destination: string };
        const port = ports?.find((p: { id: string; name: string }) => p.id !== s.destination);
        suggestions.push({
          priority: 'high',
          type: 'fuel',
          title: `Fuel critical: ${s.name}`,
          reasoning: `${s.name} has only ${Math.round(s.fuel)}t fuel. At current burn rate, vessel may not reach destination. Risk of becoming stranded in the strait.`,
          action: port ? `Reroute ${s.name} to ${port.name} for emergency refueling` : `Arrange fuel transfer for ${s.name}`,
          shipId: s.shipId,
        });
      }

      if (inWeather.length > 1) {
        suggestions.push({
          priority: 'medium',
          type: 'weather',
          title: `${inWeather.length} vessels burning excess fuel in weather`,
          reasoning: `Multiple vessels are transiting adverse weather zones, burning 30% extra fuel. This significantly increases risk of fuel shortfall across the fleet.`,
          action: 'Evaluate alternate routing for weather-affected vessels to reduce aggregate fuel consumption',
          shipId: null,
        });
      }

      suggestions.push({
        priority: 'low',
        type: 'zone',
        title: 'Consider buffer zone near Bandar Abbas',
        reasoning: 'The Strait of Hormuz chokepoint near Bandar Abbas represents the highest geopolitical risk in the operational area.',
        action: 'Draw a precautionary monitoring zone around the strait narrows to track all transiting vessels',
        shipId: null,
      });
    }

    if (suggestions.length === 0) {
      suggestions.push({
        priority: 'low',
        type: 'general',
        title: 'Fleet operating within normal parameters',
        reasoning: 'No critical threats detected. All vessels proceeding on optimal routes with adequate fuel reserves.',
        action: 'Maintain current posture. Monitor weather systems developing in Gulf of Oman.',
        shipId: null,
      });
    }

    return NextResponse.json({ suggestions });
}
