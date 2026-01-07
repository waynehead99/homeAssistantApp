// Claude API service for AI-powered home insights

const CLAUDE_API_KEY = import.meta.env.VITE_CLAUDE_API_KEY as string

// Aurora, CO coordinates for fallback weather
const AURORA_CO_LAT = 39.7294
const AURORA_CO_LON = -104.8319

// Home context for AI analysis
export interface HomeContext {
  alerts: Array<{ name: string; state: string; deviceClass: string }>
  weather: {
    temp: number
    condition: string
    humidity?: number
    forecast?: Array<{ datetime: string; temp: number; condition: string }>
  } | null
  calendar: Array<{
    summary: string
    start: string
    end: string
    location?: string
    weatherAtEvent?: { temp: number; condition: string }
    travelTimeMinutes?: number
    isReachable?: boolean
  }>
  people: Array<{ name: string; state: string; latitude?: number; longitude?: number }>
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
  // New attention items
  lowBatteryDevices: Array<{ name: string; level: number }>
  frontDoorOpenAfterDark: boolean
  windowsOpenWithTempDiff: Array<{ name: string; tempDiff: number }>
  insideTemp?: number
  isDark: boolean
}

// Fetch weather forecast from Open-Meteo (free, no API key needed)
export async function fetchWeatherForecast(): Promise<Array<{ datetime: string; temp: number; condition: string }> | null> {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${AURORA_CO_LAT}&longitude=${AURORA_CO_LON}&hourly=temperature_2m,weathercode&temperature_unit=fahrenheit&timezone=America/Denver&forecast_days=2`
    )

    if (!response.ok) return null

    const data = await response.json()
    const hourly = data.hourly

    if (!hourly?.time || !hourly?.temperature_2m || !hourly?.weathercode) return null

    return hourly.time.map((time: string, i: number) => ({
      datetime: time,
      temp: Math.round(hourly.temperature_2m[i]),
      condition: weatherCodeToCondition(hourly.weathercode[i])
    }))
  } catch (error) {
    console.error('Failed to fetch weather forecast:', error)
    return null
  }
}

// Convert WMO weather codes to readable conditions
function weatherCodeToCondition(code: number): string {
  if (code === 0) return 'clear'
  if (code <= 3) return 'partly cloudy'
  if (code <= 49) return 'foggy'
  if (code <= 59) return 'drizzle'
  if (code <= 69) return 'rainy'
  if (code <= 79) return 'snowy'
  if (code <= 84) return 'rainy'
  if (code <= 94) return 'stormy'
  if (code <= 99) return 'thunderstorm'
  return 'unknown'
}

// Get weather forecast for a specific event time
export function getWeatherForEventTime(
  eventStart: string,
  forecast: Array<{ datetime: string; temp: number; condition: string }>
): { temp: number; condition: string } | null {
  try {
    const eventTime = new Date(eventStart).getTime()

    // Find the closest forecast hour
    let closest = forecast[0]
    let closestDiff = Math.abs(new Date(forecast[0].datetime).getTime() - eventTime)

    for (const f of forecast) {
      const diff = Math.abs(new Date(f.datetime).getTime() - eventTime)
      if (diff < closestDiff) {
        closest = f
        closestDiff = diff
      }
    }

    // Only return if within 2 hours of the event
    if (closestDiff <= 2 * 60 * 60 * 1000) {
      return { temp: closest.temp, condition: closest.condition }
    }
    return null
  } catch {
    return null
  }
}

// Estimate travel time using Haversine distance (rough estimate)
export function estimateTravelTime(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number
): number {
  // Haversine formula to calculate distance in km
  const R = 6371 // Earth's radius in km
  const dLat = (toLat - fromLat) * Math.PI / 180
  const dLon = (toLon - fromLon) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(fromLat * Math.PI / 180) * Math.cos(toLat * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distanceKm = R * c
  const distanceMiles = distanceKm * 0.621371

  // Estimate: average 30 mph in urban areas, add 5 min buffer
  return Math.round((distanceMiles / 30) * 60) + 5
}

// Geocode an address to lat/lon using Nominatim (free, no API key)
export async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      { headers: { 'User-Agent': 'HomeAssistantDashboard/1.0' } }
    )

    if (!response.ok) return null

    const data = await response.json()
    if (data.length === 0) return null

    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) }
  } catch {
    return null
  }
}

// Generate the prompt for Claude
function buildPrompt(context: HomeContext): string {
  const timeOfDay = getTimeOfDay(context.time)

  let prompt = `You are a friendly home assistant for a family. Provide a brief, helpful insight about their day. This is a normal, lived-in home - not a security system. Be warm and conversational, like a helpful friend.

Current Time: ${context.time} (${timeOfDay})
Date: ${context.date}

`

  // Weather info - explicitly label as TODAY's weather
  if (context.weather) {
    prompt += `TODAY'S Weather (not tomorrow): ${context.weather.temp}°F, ${context.weather.condition}`
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
      prompt += `Today's Forecast (next few hours): ${forecastStr}\n`
    }
  }

  // Calendar events - group by day with weather forecasts and travel info
  // Filter out events that are unreachable (already started or can't make it in time)
  const reachableEvents = context.calendar.filter(e => e.isReachable !== false)

  if (reachableEvents.length > 0) {
    prompt += `Upcoming Events:\n`
    reachableEvents.forEach(event => {
      const dayLabel = getEventDayLabel(event.start)
      const startTime = formatEventTime(event.start)
      prompt += `- ${event.summary} ${dayLabel} at ${startTime}`
      if (event.location) {
        prompt += ` at ${event.location}`
      }
      // Include weather forecast for this specific event time
      if (event.weatherAtEvent) {
        prompt += ` [Weather at event: ${event.weatherAtEvent.temp}°F, ${event.weatherAtEvent.condition}]`
      }
      // Include travel time if available
      if (event.travelTimeMinutes) {
        prompt += ` [~${event.travelTimeMinutes} min travel]`
      }
      prompt += '\n'
    })
  } else {
    prompt += `Calendar: No upcoming events\n`
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

  // ATTENTION ITEMS - These need user attention
  const attentionItems: string[] = []

  // Low battery devices
  if (context.lowBatteryDevices.length > 0) {
    const batteryList = context.lowBatteryDevices
      .map(d => `${d.name} (${d.level}%)`)
      .join(', ')
    attentionItems.push(`LOW BATTERY: ${batteryList}`)
  }

  // Front door open after dark
  if (context.frontDoorOpenAfterDark && context.isDark) {
    attentionItems.push(`ATTENTION: Front door is still open after dark`)
  }

  // Windows open with significant temperature difference
  if (context.windowsOpenWithTempDiff.length > 0) {
    const windowList = context.windowsOpenWithTempDiff
      .map(w => `${w.name} (${w.tempDiff}° colder outside)`)
      .join(', ')
    attentionItems.push(`WINDOWS OPEN with cold air: ${windowList}`)
  }

  if (attentionItems.length > 0) {
    prompt += `\n⚠️ ITEMS NEEDING ATTENTION:\n`
    attentionItems.forEach(item => {
      prompt += `- ${item}\n`
    })
  }

  prompt += `
Provide ONE helpful insight, prioritizing in this order:
1. ATTENTION ITEMS (low battery, doors/windows needing action) - these are PRIORITY
2. Upcoming events with their specific weather (each event has its own forecast in brackets)
3. Time-appropriate suggestions (morning routines, evening wind-down)

WEATHER RULES:
- Each event now has its OWN weather forecast in [Weather at event: X°F, condition] format
- Use the event-specific weather, NOT the current weather, when discussing future events
- If an event shows travel time, you can mention "leave by X" based on event time minus travel time
- Events that are unreachable have already been filtered out

ATTENTION ITEM RULES:
- If there are LOW BATTERY devices, mention them naturally (e.g., "Your front door sensor battery is getting low at 15%")
- If the front door is open after dark, suggest closing it for security
- If windows are open and it's significantly colder outside, suggest closing them to save energy

Other guidelines:
- This is a normal family home, NOT a security facility
- Be positive and helpful, not alarming

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

function getEventDayLabel(isoString: string): string {
  try {
    const eventDate = new Date(isoString)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Reset times to compare dates only
    const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate())
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const tomorrowDay = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate())

    if (eventDay.getTime() === todayDay.getTime()) {
      return 'today'
    } else if (eventDay.getTime() === tomorrowDay.getTime()) {
      return 'tomorrow'
    } else {
      return eventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    }
  } catch {
    return 'upcoming'
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
