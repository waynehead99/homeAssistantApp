// Claude API service for AI-powered home insights

const CLAUDE_API_KEY = import.meta.env.VITE_CLAUDE_API_KEY as string

// Home context for AI analysis
export interface HomeContext {
  alerts: Array<{ name: string; state: string; deviceClass: string }>
  weather: {
    temp: number
    condition: string
    humidity?: number
    forecast?: Array<{ datetime: string; temp: number; condition: string }>
  } | null
  calendar: Array<{ summary: string; start: string; end: string; location?: string }>
  people: Array<{ name: string; state: string }>
  lightsOn: number
  totalLights: number
  climate: Array<{ name: string; state: string; currentTemp?: number; targetTemp?: number }>
  vacuums: Array<{ name: string; state: string; battery?: number }>
  alarm: { name: string; state: string } | null
  valves: Array<{ name: string; state: string }>
  fans: Array<{ name: string; state: string; percentage?: number }>
  locks: Array<{ name: string; state: string }>
  time: string
  date: string
}

// Generate the prompt for Claude
function buildPrompt(context: HomeContext): string {
  const timeOfDay = getTimeOfDay(context.time)

  let prompt = `You are a friendly home assistant for a family. Provide a brief, helpful insight about their day. This is a normal, lived-in home - not a security system. Be warm and conversational, like a helpful friend.

Current Time: ${context.time} (${timeOfDay})
Date: ${context.date}

`

  // Weather info
  if (context.weather) {
    prompt += `Weather: ${context.weather.temp}°F, ${context.weather.condition}`
    if (context.weather.humidity) {
      prompt += `, ${context.weather.humidity}% humidity`
    }
    prompt += '\n'

    if (context.weather.forecast && context.weather.forecast.length > 0) {
      const upcoming = context.weather.forecast.slice(0, 3)
      const forecastStr = upcoming.map(f => {
        const time = new Date(f.datetime).toLocaleTimeString('en-US', { hour: 'numeric' })
        return `${time}: ${f.temp}°F ${f.condition}`
      }).join(', ')
      prompt += `Forecast: ${forecastStr}\n`
    }
  }

  // Calendar events
  if (context.calendar.length > 0) {
    prompt += `Today's Events:\n`
    context.calendar.forEach(event => {
      const startTime = formatEventTime(event.start)
      prompt += `- ${event.summary} at ${startTime}`
      if (event.location) {
        prompt += ` (${event.location})`
      }
      prompt += '\n'
    })
  } else {
    prompt += `Calendar: No events scheduled\n`
  }

  // People status
  if (context.people.length > 0) {
    const peopleStatus = context.people.map(p => `${p.name}: ${p.state}`).join(', ')
    prompt += `People: ${peopleStatus}\n`
  }

  // Lights
  prompt += `Lights: ${context.lightsOn} of ${context.totalLights} on\n`

  // Climate/HVAC
  if (context.climate.length > 0) {
    const activeClimate = context.climate.filter(c => c.state !== 'off')
    if (activeClimate.length > 0) {
      prompt += `HVAC:\n`
      activeClimate.forEach(c => {
        prompt += `- ${c.name}: ${c.state}`
        if (c.currentTemp) prompt += `, currently ${c.currentTemp}°`
        if (c.targetTemp) prompt += `, set to ${c.targetTemp}°`
        prompt += '\n'
      })
    } else {
      prompt += `HVAC: All systems off\n`
    }
  }

  // Vacuum status
  const activeVacuums = context.vacuums.filter(v => ['cleaning', 'returning'].includes(v.state))
  if (activeVacuums.length > 0) {
    prompt += `Vacuums:\n`
    activeVacuums.forEach(v => {
      prompt += `- ${v.name}: ${v.state}`
      if (v.battery) prompt += ` (${v.battery}% battery)`
      prompt += '\n'
    })
  }

  // Alarm status
  if (context.alarm) {
    prompt += `Alarm: ${context.alarm.state}\n`
  }

  // Active valves/sprinklers
  const openValves = context.valves.filter(v => v.state === 'open')
  if (openValves.length > 0) {
    prompt += `Irrigation/Valves: ${openValves.map(v => v.name).join(', ')} running\n`
  }

  // Active fans
  const activeFans = context.fans.filter(f => f.state === 'on')
  if (activeFans.length > 0) {
    prompt += `Fans:\n`
    activeFans.forEach(f => {
      prompt += `- ${f.name}: on`
      if (f.percentage !== undefined) prompt += ` at ${f.percentage}%`
      prompt += '\n'
    })
  }

  // Locks status - only mention if unlocked or jammed
  const unlockedLocks = context.locks.filter(l => l.state !== 'locked')
  if (unlockedLocks.length > 0) {
    prompt += `Locks:\n`
    unlockedLocks.forEach(l => {
      prompt += `- ${l.name}: ${l.state}\n`
    })
  }

  // Alerts (only meaningful ones like doors/windows, not motion)
  const meaningfulAlerts = context.alerts.filter(a =>
    ['door', 'window', 'garage_door', 'lock', 'smoke', 'carbon_monoxide', 'gas', 'moisture', 'water'].includes(a.deviceClass)
  )
  if (meaningfulAlerts.length > 0) {
    prompt += `Open/Active:\n`
    meaningfulAlerts.forEach(alert => {
      prompt += `- ${alert.name}: ${alert.state}\n`
    })
  }

  prompt += `
Provide ONE helpful insight, prioritizing in this order:
1. Weather + calendar synergy (e.g., "Perfect day for your outdoor plans!" or "Rain expected - good thing your meeting is indoors")
2. Practical reminders (e.g., doors left open that might need closing, energy savings if everyone's away)
3. Time-appropriate suggestions (morning routines, evening wind-down)

Important guidelines:
- This is a normal family home, NOT a security facility
- Open doors during daytime are normal - only mention if unusual (like leaving for work with garage open)
- Be positive and helpful, not alarming
- If nothing notable, share a friendly weather observation or day-appropriate tip

Respond with only 1-2 friendly sentences. No greetings, sign-offs, or security warnings.`

  return prompt
}

function getTimeOfDay(time: string): string {
  const hour = parseInt(time.split(':')[0], 10)
  if (hour < 6) return 'night'
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  if (hour < 21) return 'evening'
  return 'night'
}

function formatEventTime(isoString: string): string {
  try {
    const date = new Date(isoString)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  } catch {
    return isoString
  }
}

// Call Claude API to generate insights
export async function generateHomeInsights(context: HomeContext): Promise<string> {
  if (!CLAUDE_API_KEY) {
    return 'AI insights unavailable. Add VITE_CLAUDE_API_KEY to your .env file.'
  }

  const prompt = buildPrompt(context)

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 150,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Claude API error:', response.status, error)
      if (response.status === 401) {
        return 'Invalid API key. Please check your VITE_CLAUDE_API_KEY.'
      }
      if (response.status === 429) {
        return 'Rate limited. Please try again in a moment.'
      }
      return 'Unable to generate insights at this time.'
    }

    const data = await response.json()
    const content = data.content?.[0]?.text || 'No insights available.'
    return content.trim()
  } catch (error) {
    console.error('Claude API error:', error)
    return 'Unable to connect to AI service.'
  }
}

// Check if Claude API is configured
export function isClaudeConfigured(): boolean {
  return Boolean(CLAUDE_API_KEY)
}
