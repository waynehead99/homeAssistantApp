import type { HAState, ServiceCallData, HAApiError, HAArea, HAEntityRegistryEntry, HADevice, CalendarEvent, FrigateEvent } from '../types/homeAssistant'

// Get configuration from environment variables
const HA_URL = import.meta.env.VITE_HA_URL as string | undefined
const HA_TOKEN = import.meta.env.VITE_HA_TOKEN as string | undefined
const FRIGATE_URL = import.meta.env.VITE_FRIGATE_URL as string | undefined
const isDev = import.meta.env.DEV

// Check if configuration is present
export function isConfigured(): boolean {
  return Boolean(HA_URL && HA_TOKEN)
}

// Get the base URL (for display purposes)
export function getBaseUrl(): string | undefined {
  return HA_URL
}

// Build headers for API requests
function getHeaders(): HeadersInit {
  return {
    'Authorization': `Bearer ${HA_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

// Get the API base URL - use relative URL in dev (for proxy), full URL in production
function getApiUrl(endpoint: string): string {
  if (isDev) {
    // In development, use relative URL so Vite proxy handles it
    return endpoint
  }
  // In production, use full URL
  return `${HA_URL?.replace(/\/$/, '')}${endpoint}`
}

// Generic API fetch wrapper
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  if (!HA_URL || !HA_TOKEN) {
    throw new Error('Home Assistant is not configured')
  }

  const url = getApiUrl(endpoint)

  const response = await fetch(url, {
    ...options,
    cache: 'no-store', // Prevent browser caching for real-time updates
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error: HAApiError = {
      message: `API error: ${response.status} ${response.statusText}`,
      code: response.status.toString(),
    }
    throw error
  }

  // Some endpoints return empty responses
  const text = await response.text()
  if (!text) {
    return {} as T
  }

  return JSON.parse(text) as T
}

// Test the connection to Home Assistant
export async function testConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    await apiFetch<unknown>('/api/')
    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  }
}

// Get all entity states
export async function getStates(): Promise<HAState[]> {
  return apiFetch<HAState[]>('/api/states')
}

// Get a single entity state
export async function getState(entityId: string): Promise<HAState> {
  return apiFetch<HAState>(`/api/states/${entityId}`)
}

// Raw fetch for template API (returns plain text, not JSON)
async function templateFetch(template: string): Promise<string> {
  if (!HA_URL || !HA_TOKEN) {
    throw new Error('Home Assistant is not configured')
  }

  const url = getApiUrl('/api/template')
  const response = await fetch(url, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ template }),
  })

  if (!response.ok) {
    throw new Error(`Template API error: ${response.status}`)
  }

  return response.text()
}

// Get all areas/rooms using template API
export async function getAreas(): Promise<HAArea[]> {
  try {
    // Get areas with their names in one call
    const template = `[{% for area_id in areas() %}{"area_id": "{{ area_id }}", "name": "{{ area_name(area_id) }}"}{% if not loop.last %},{% endif %}{% endfor %}]`
    const response = await templateFetch(template)

    const areas = JSON.parse(response) as HAArea[]
    return areas.map(a => ({ ...a, picture: null }))
  } catch (err) {
    console.warn('Could not fetch areas:', err)
    return []
  }
}

// Get entity-to-area and entity-to-device mappings using template API
export async function getEntityRegistry(): Promise<HAEntityRegistryEntry[]> {
  try {
    // Entity domains to fetch
    const domains = ['light', 'switch', 'sensor', 'binary_sensor', 'climate', 'vacuum', 'alarm_control_panel', 'valve', 'fan', 'camera', 'lock']

    // Build template for each domain - includes device_id
    const domainTemplates = domains.map((domain, index) => {
      const isLast = index === domains.length - 1
      return `{% for state in states.${domain} %}{"entity_id": "{{ state.entity_id }}", "area_id": {% if area_id(state.entity_id) %}"{{ area_id(state.entity_id) }}"{% else %}null{% endif %}, "device_id": {% if device_id(state.entity_id) %}"{{ device_id(state.entity_id) }}"{% else %}null{% endif %}}{% if not loop.last or ${isLast ? 'false' : 'true'} %},{% endif %}{% endfor %}`
    }).join('')

    const template = `[${domainTemplates}]`
    const response = await templateFetch(template)

    const entries = JSON.parse(response) as Array<{ entity_id: string; area_id: string | null; device_id: string | null }>
    return entries.map(e => ({
      entity_id: e.entity_id,
      area_id: e.area_id,
      device_id: e.device_id,
      name: null,
      original_name: null,
    }))
  } catch (err) {
    console.warn('Could not fetch entity registry:', err)
    return []
  }
}

// Get device registry - device names and info
export async function getDeviceRegistry(): Promise<HADevice[]> {
  try {
    // Get unique devices from all entity domains
    const template = `{% set devices_seen = namespace(ids=[]) %}{% set device_list = [] %}{% for state in states %}{% set dev_id = device_id(state.entity_id) %}{% if dev_id and dev_id not in devices_seen.ids %}{% set devices_seen.ids = devices_seen.ids + [dev_id] %}{"device_id": "{{ dev_id }}", "name": "{{ device_attr(dev_id, 'name') | default('Unknown', true) }}", "manufacturer": "{{ device_attr(dev_id, 'manufacturer') | default('', true) }}", "model": "{{ device_attr(dev_id, 'model') | default('', true) }}", "area_id": {% if device_attr(dev_id, 'area_id') %}"{{ device_attr(dev_id, 'area_id') }}"{% else %}null{% endif %}},{% endif %}{% endfor %}`

    const response = await templateFetch(template)
    // Response ends with trailing comma, need to clean it up
    const cleanedResponse = '[' + response.trim().replace(/,\s*$/, '') + ']'

    const devices = JSON.parse(cleanedResponse) as HADevice[]
    return devices
  } catch (err) {
    console.warn('Could not fetch device registry:', err)
    return []
  }
}

// Switch service calls
export const switchService = {
  turnOn: (entityId: string) =>
    callService('switch', 'turn_on', { entity_id: entityId }),

  turnOff: (entityId: string) =>
    callService('switch', 'turn_off', { entity_id: entityId }),

  toggle: (entityId: string) =>
    callService('switch', 'toggle', { entity_id: entityId }),
}

// Callback to trigger refresh after service calls
let onServiceCallComplete: (() => void) | null = null

// Register a callback to be called after successful service calls
export function setServiceCallCallback(callback: (() => void) | null): void {
  onServiceCallComplete = callback
}

// Call a service
export async function callService(
  domain: string,
  service: string,
  data: ServiceCallData
): Promise<HAState[]> {
  const result = await apiFetch<HAState[]>(`/api/services/${domain}/${service}`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

  // Trigger refresh after a delay to allow HA to update state
  // Needs to be long enough for slow devices (thermostats, Z-Wave) to confirm
  if (onServiceCallComplete) {
    setTimeout(onServiceCallComplete, 2000)
  }

  return result
}

// Send notification to mobile app devices
export async function sendNotification(
  recipients: string[],
  title: string,
  message: string,
  data?: { [key: string]: unknown }
): Promise<void> {
  for (const recipient of recipients) {
    try {
      await apiFetch(`/api/services/notify/mobile_app_${recipient}`, {
        method: 'POST',
        body: JSON.stringify({
          title,
          message,
          data,
        }),
      })
    } catch (error) {
      console.error(`Failed to send notification to ${recipient}:`, error)
    }
  }
}

// Light-specific service calls
export const lightService = {
  turnOn: (entityId: string, brightness?: number) =>
    callService('light', 'turn_on', {
      entity_id: entityId,
      ...(brightness !== undefined && { brightness }),
    }),

  turnOff: (entityId: string) =>
    callService('light', 'turn_off', { entity_id: entityId }),

  toggle: (entityId: string) =>
    callService('light', 'toggle', { entity_id: entityId }),

  setBrightness: (entityId: string, brightnessPct: number) =>
    callService('light', 'turn_on', {
      entity_id: entityId,
      brightness_pct: Math.round(brightnessPct),
    }),
}

// Scene service calls
export const sceneService = {
  turnOn: (entityId: string) =>
    callService('scene', 'turn_on', { entity_id: entityId }),
}

// Trigger a webhook
export async function triggerWebhook(webhookId: string): Promise<void> {
  if (!HA_URL) {
    throw new Error('Home Assistant is not configured')
  }

  const url = getApiUrl(`/api/webhook/${webhookId}`)

  const response = await fetch(url, {
    method: 'POST',
  })

  if (!response.ok) {
    throw new Error(`Webhook error: ${response.status} ${response.statusText}`)
  }
}

// Get Frigate API URL - use proxy in dev to avoid CORS
function getFrigateApiUrl(path: string): string {
  if (isDev) {
    // Use Vite proxy to avoid CORS
    return `/frigate-api${path}`
  }
  // In production, use direct URL
  return `${FRIGATE_URL?.replace(/\/$/, '')}/api${path}`
}

// Camera service for Frigate integration
export const cameraService = {
  // Check if Frigate is configured for direct access
  isFrigateConfigured: (): boolean => Boolean(FRIGATE_URL),

  // Get Frigate base URL
  getFrigateUrl: (): string | undefined => FRIGATE_URL?.replace(/\/$/, ''),

  // Get camera name from entity ID (e.g., camera.drivewayleft -> drivewayleft)
  getCameraName: (entityId: string): string => entityId.replace('camera.', ''),

  // Get live stream URL - use Frigate for Frigate cameras, HA proxy for others
  getStreamUrl: (entityId: string, isFrigateCamera: boolean = false): string => {
    const cameraName = entityId.replace('camera.', '')
    if (FRIGATE_URL && isFrigateCamera) {
      // Frigate MJPEG stream (through proxy in dev)
      return getFrigateApiUrl(`/${cameraName}`)
    }
    // Home Assistant proxy for non-Frigate cameras (Ring, Eufy, etc.)
    const baseUrl = isDev ? '' : HA_URL?.replace(/\/$/, '') || ''
    return `${baseUrl}/api/camera_proxy_stream/${entityId}`
  },

  // Get snapshot URL - use Frigate for Frigate cameras, HA proxy for others
  getSnapshotUrl: (entityId: string, isFrigateCamera: boolean = false): string => {
    const cameraName = entityId.replace('camera.', '')
    if (FRIGATE_URL && isFrigateCamera) {
      // Frigate snapshot (through proxy in dev)
      return getFrigateApiUrl(`/${cameraName}/latest.jpg`)
    }
    // Home Assistant proxy for non-Frigate cameras
    const baseUrl = isDev ? '' : HA_URL?.replace(/\/$/, '') || ''
    return `${baseUrl}/api/camera_proxy/${entityId}`
  },

  // Get camera snapshot as blob URL (handles auth for HA proxy)
  getSnapshot: async (entityId: string, isFrigateCamera: boolean = false): Promise<string> => {
    try {
      const cameraName = entityId.replace('camera.', '')

      // Try Frigate for Frigate cameras (through proxy in dev)
      if (FRIGATE_URL && isFrigateCamera) {
        const url = getFrigateApiUrl(`/${cameraName}/latest.jpg?t=${Date.now()}`)
        const response = await fetch(url)
        if (response.ok) {
          const blob = await response.blob()
          return URL.createObjectURL(blob)
        }
        // Fall through to HA proxy if Frigate fails
      }

      // Home Assistant proxy with auth (fallback)
      const url = getApiUrl(`/api/camera_proxy/${entityId}`)
      const response = await fetch(url, {
        headers: getHeaders(),
      })
      if (!response.ok) {
        throw new Error(`Failed to fetch camera snapshot: ${response.status}`)
      }
      const blob = await response.blob()
      return URL.createObjectURL(blob)
    } catch (err) {
      console.warn('Could not fetch camera snapshot:', err)
      return ''
    }
  },

  // Get auth headers for fetch requests
  getAuthHeaders: (): HeadersInit => getHeaders(),

  // Get Frigate events - use proxy in dev to avoid CORS
  getFrigateEvents: async (cameraName: string, limit = 10): Promise<FrigateEvent[]> => {
    try {
      if (FRIGATE_URL) {
        const url = getFrigateApiUrl(`/events?camera=${cameraName}&limit=${limit}`)
        const response = await fetch(url)
        if (response.ok) {
          return response.json()
        }
      }
      return []
    } catch (err) {
      console.warn('Could not fetch Frigate events:', err)
      return []
    }
  },

  // Get all recent Frigate events
  getAllFrigateEvents: async (limit = 20): Promise<FrigateEvent[]> => {
    try {
      if (FRIGATE_URL) {
        const url = getFrigateApiUrl(`/events?limit=${limit}`)
        const response = await fetch(url)
        if (response.ok) {
          return response.json()
        }
      }
      return []
    } catch (err) {
      console.warn('Could not fetch Frigate events:', err)
      return []
    }
  },

  // Get Frigate thumbnail URL
  getFrigateThumbnailUrl: (eventId: string): string => {
    return getFrigateApiUrl(`/events/${eventId}/thumbnail.jpg`)
  },

  // Get Frigate event snapshot URL (full resolution)
  getFrigateSnapshotUrl: (eventId: string): string => {
    return getFrigateApiUrl(`/events/${eventId}/snapshot.jpg`)
  },

  // Get Frigate clip URL
  getFrigateClipUrl: (eventId: string): string => {
    return getFrigateApiUrl(`/events/${eventId}/clip.mp4`)
  },
}

// Weather service for forecasts
export const weatherService = {
  // Get forecast via weather.get_forecasts service (HA 2023.12+)
  // return_response must be a query parameter, response is wrapped in service_response
  getForecast: async (entityId: string, type: 'daily' | 'hourly' = 'daily'): Promise<import('../types/homeAssistant').WeatherForecast[]> => {
    if (!HA_URL || !HA_TOKEN) return []

    try {
      const url = getApiUrl('/api/services/weather/get_forecasts?return_response')
      const response = await fetch(url, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          entity_id: entityId,
          type,
        }),
      })

      if (!response.ok) return []

      const data = JSON.parse(await response.text())

      // Response: { "service_response": { "weather.entity": { "forecast": [...] } } }
      const serviceResponse = data?.service_response ?? data
      if (serviceResponse?.[entityId]?.forecast) {
        return serviceResponse[entityId].forecast
      }

      // Try any key with a forecast array
      for (const key of Object.keys(serviceResponse || {})) {
        if (Array.isArray(serviceResponse[key]?.forecast)) {
          return serviceResponse[key].forecast
        }
      }

      return []
    } catch (err) {
      console.warn(`Could not fetch ${type} forecast:`, err)
      return []
    }
  },
}

// Calendar service for fetching events
export const calendarService = {
  // Get upcoming events for a calendar entity
  getEvents: async (entityId: string, days = 1): Promise<CalendarEvent[]> => {
    try {
      const now = new Date()
      const start = now.toISOString()
      const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString()

      const events = await apiFetch<CalendarEvent[]>(
        `/api/calendars/${entityId}?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
      )
      return events
    } catch (err) {
      console.warn('Could not fetch calendar events:', err)
      return []
    }
  },

  // Get events from all calendar entities
  getAllEvents: async (calendarIds: string[], days = 1): Promise<CalendarEvent[]> => {
    const allEvents: CalendarEvent[] = []

    for (const entityId of calendarIds) {
      const events = await calendarService.getEvents(entityId, days)
      allEvents.push(...events)
    }

    // Sort by start time
    return allEvents.sort((a, b) => {
      const aTime = a.start.dateTime || a.start.date || ''
      const bTime = b.start.dateTime || b.start.date || ''
      return aTime.localeCompare(bTime)
    })
  },
}

