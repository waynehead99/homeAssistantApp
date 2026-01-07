// Attention Alerts Service
// Runs periodically to check for items needing immediate attention and sends notifications

import { sendNotification } from './homeAssistant'
import { calendarService } from './homeAssistant'
import type { SensorEntity, BinarySensorEntity, ClimateEntity, WeatherEntity, CalendarEntity } from '../types/homeAssistant'
import type { AppSettings } from '../context/HomeAssistantContext'

export interface AttentionItem {
  type: 'low_battery' | 'door_open' | 'window_cold' | 'upcoming_event' | 'sensor_alert'
  title: string
  message: string
  priority: 'high' | 'medium' | 'low'
}

interface AttentionCheckContext {
  sensors: SensorEntity[]
  binarySensors: BinarySensorEntity[]
  climate: ClimateEntity[]
  weather: WeatherEntity[]
  calendars: CalendarEntity[]
  settings: AppSettings
}

// Check for low battery devices
function checkLowBatteryDevices(sensors: SensorEntity[]): AttentionItem[] {
  const LOW_BATTERY_THRESHOLD = 20
  const CRITICAL_BATTERY_THRESHOLD = 10
  const items: AttentionItem[] = []

  const lowBatteryDevices = sensors.filter(s => {
    const entityId = s.entity_id.toLowerCase()
    const isBattery = s.attributes.device_class === 'battery' ||
      entityId.includes('battery')
    if (!isBattery) return false

    // Exclude voltage sensors (not SOC/percentage)
    if (entityId.includes('voltage') || s.attributes.unit_of_measurement === 'V') {
      return false
    }

    const level = parseFloat(s.state)
    return !isNaN(level) && level <= LOW_BATTERY_THRESHOLD && level > 0
  })

  for (const device of lowBatteryDevices) {
    const level = Math.round(parseFloat(device.state))
    const name = device.attributes.friendly_name || device.entity_id.split('.')[1].replace(/_/g, ' ')
    const isCritical = level <= CRITICAL_BATTERY_THRESHOLD

    items.push({
      type: 'low_battery',
      title: isCritical ? '🔴 Critical Battery' : '🔋 Low Battery',
      message: `${name} is at ${level}%`,
      priority: isCritical ? 'high' : 'medium',
    })
  }

  return items
}

// Check for front door open after dark
function checkFrontDoorAfterDark(binarySensors: BinarySensorEntity[]): AttentionItem[] {
  const items: AttentionItem[] = []
  const currentHour = new Date().getHours()
  const isDark = currentHour >= 20 || currentHour < 6

  if (!isDark) return items

  const frontDoorSensor = binarySensors.find(s => {
    const name = (s.attributes.friendly_name || s.entity_id).toLowerCase()
    return s.attributes.device_class === 'door' &&
      (name.includes('front door') || name.includes('front_door'))
  })

  if (frontDoorSensor?.state === 'on') {
    items.push({
      type: 'door_open',
      title: '🚪 Front Door Open',
      message: 'Your front door is still open after dark',
      priority: 'high',
    })
  }

  return items
}

// Check for windows open with cold air
function checkWindowsWithColdAir(
  binarySensors: BinarySensorEntity[],
  climate: ClimateEntity[],
  weather: WeatherEntity[]
): AttentionItem[] {
  const items: AttentionItem[] = []
  const TEMP_DIFF_THRESHOLD = 10

  const outsideTemp = weather[0]?.attributes.temperature
  const insideTemp = climate[0]?.attributes.current_temperature

  if (outsideTemp === undefined || insideTemp === undefined) return items
  if (insideTemp - outsideTemp < TEMP_DIFF_THRESHOLD) return items

  const openWindows = binarySensors.filter(s =>
    s.attributes.device_class === 'window' && s.state === 'on'
  )

  for (const window of openWindows) {
    const name = window.attributes.friendly_name || window.entity_id.split('.')[1].replace(/_/g, ' ')
    items.push({
      type: 'window_cold',
      title: '🪟 Window Open',
      message: `${name} is open and it's ${Math.round(insideTemp - outsideTemp)}° colder outside`,
      priority: 'medium',
    })
  }

  return items
}

// Check for upcoming events (within the next hour)
async function checkUpcomingEvents(
  calendars: CalendarEntity[],
  settings: AppSettings
): Promise<AttentionItem[]> {
  const items: AttentionItem[] = []

  // Filter calendars by pattern
  const filteredCalendars = calendars.filter(c => {
    if (!settings.calendarPattern) return true
    try {
      const regex = new RegExp(settings.calendarPattern, 'i')
      return regex.test(c.entity_id) || regex.test(c.attributes.friendly_name || '')
    } catch {
      const pattern = settings.calendarPattern.toLowerCase()
      return c.entity_id.toLowerCase().includes(pattern) ||
        (c.attributes.friendly_name || '').toLowerCase().includes(pattern)
    }
  })

  if (filteredCalendars.length === 0) return items

  try {
    const calendarIds = filteredCalendars.map(c => c.entity_id)
    const events = await calendarService.getAllEvents(calendarIds, 1)

    const now = new Date()
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000)

    for (const event of events) {
      const startTime = event.start.dateTime || event.start.date
      if (!startTime) continue

      const eventStart = new Date(startTime)

      // Check if event starts within the next hour
      if (eventStart > now && eventStart <= oneHourFromNow) {
        const minutesUntil = Math.round((eventStart.getTime() - now.getTime()) / (1000 * 60))
        items.push({
          type: 'upcoming_event',
          title: '📅 Upcoming Event',
          message: `${event.summary} starts in ${minutesUntil} minutes${event.location ? ` at ${event.location}` : ''}`,
          priority: minutesUntil <= 15 ? 'high' : 'medium',
        })
      }
    }
  } catch (error) {
    console.error('Failed to check calendar events:', error)
  }

  return items
}

// Main function to check all attention items
export async function checkAttentionItems(context: AttentionCheckContext): Promise<AttentionItem[]> {
  const items: AttentionItem[] = []

  // Check all categories
  items.push(...checkLowBatteryDevices(context.sensors))
  items.push(...checkFrontDoorAfterDark(context.binarySensors))
  items.push(...checkWindowsWithColdAir(context.binarySensors, context.climate, context.weather))
  items.push(...await checkUpcomingEvents(context.calendars, context.settings))

  // Sort by priority (high first)
  items.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  return items
}

// Send attention alerts as notifications
export async function sendAttentionAlerts(
  context: AttentionCheckContext
): Promise<{ sent: boolean; itemCount: number; items: AttentionItem[] }> {
  const recipients = context.settings.notificationRecipients || []

  if (recipients.length === 0) {
    return { sent: false, itemCount: 0, items: [] }
  }

  const items = await checkAttentionItems(context)

  if (items.length === 0) {
    return { sent: false, itemCount: 0, items: [] }
  }

  // Group items into a single notification or send individually based on count
  if (items.length === 1) {
    // Single item - send as-is
    await sendNotification(
      recipients,
      items[0].title,
      items[0].message,
      { tag: `attention-${items[0].type}`, group: 'home-attention' }
    )
  } else {
    // Multiple items - send summary
    const highPriority = items.filter(i => i.priority === 'high')
    const title = highPriority.length > 0
      ? `🚨 ${items.length} Items Need Attention`
      : `📋 ${items.length} Home Updates`

    const message = items
      .slice(0, 5) // Limit to 5 items in notification
      .map(i => `• ${i.message}`)
      .join('\n')

    await sendNotification(
      recipients,
      title,
      message,
      { tag: 'attention-summary', group: 'home-attention' }
    )
  }

  return { sent: true, itemCount: items.length, items }
}

// Track last check time to avoid duplicate notifications
let lastCheckTime = 0
const CHECK_INTERVAL = 60 * 60 * 1000 // 1 hour

// Check if enough time has passed since last check
export function shouldRunCheck(): boolean {
  const now = Date.now()
  return now - lastCheckTime >= CHECK_INTERVAL
}

// Mark that a check was performed
export function markCheckComplete(): void {
  lastCheckTime = Date.now()
}

// Get time until next check in minutes
export function getMinutesUntilNextCheck(): number {
  const now = Date.now()
  const timeSinceLastCheck = now - lastCheckTime
  const timeUntilNextCheck = CHECK_INTERVAL - timeSinceLastCheck
  return Math.max(0, Math.round(timeUntilNextCheck / (1000 * 60)))
}
