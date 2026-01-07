import { useState, useCallback, useMemo } from 'react'
import {
  generateHomeInsights,
  isClaudeConfigured,
  fetchWeatherForecast,
  getWeatherForEventTime,
  geocodeAddress,
  estimateTravelTime,
  type HomeContext
} from '../services/claude'
import { useHomeAssistantContext } from '../context/HomeAssistantContext'
import { calendarService } from '../services/homeAssistant'
import { shouldShowBinarySensor } from '../utils/sensorFilters'
import type { CalendarEvent } from '../types/homeAssistant'

// Cache duration in milliseconds (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000

// Module-level cache that persists across component mounts
let cachedInsight: string | null = null
let lastGeneratedTime = 0

export function useAIInsights() {
  const [insight, setInsight] = useState<string | null>(cachedInsight)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    sensors,
    binarySensors,
    weather,
    calendars,
    filteredPeople,
    lights,
    climate,
    vacuums,
    alarms,
    valves,
    fans,
    locks,
    hiddenEntities,
    hiddenRooms,
    entityAreaMap,
    settings,
  } = useHomeAssistantContext()

  // Helper to check if an entity is visible (not hidden individually or by room)
  const isEntityVisible = useCallback((entityId: string) => {
    // Check if individually hidden
    if (hiddenEntities.has(entityId)) {
      return false
    }
    // Check if entity's room is hidden
    const areaId = entityAreaMap.get(entityId)
    if (areaId && hiddenRooms.has(areaId)) {
      return false
    }
    return true
  }, [hiddenEntities, hiddenRooms, entityAreaMap])

  // Filter entities to exclude hidden ones
  const visibleBinarySensors = useMemo(
    () => binarySensors.filter(s => isEntityVisible(s.entity_id)),
    [binarySensors, isEntityVisible]
  )

  const visibleLights = useMemo(
    () => lights.filter(l => isEntityVisible(l.entity_id)),
    [lights, isEntityVisible]
  )

  const visibleClimate = useMemo(
    () => climate.filter(c => isEntityVisible(c.entity_id)),
    [climate, isEntityVisible]
  )

  const visibleVacuums = useMemo(
    () => vacuums.filter(v => isEntityVisible(v.entity_id)),
    [vacuums, isEntityVisible]
  )

  const visibleAlarms = useMemo(
    () => alarms.filter(a => isEntityVisible(a.entity_id)),
    [alarms, isEntityVisible]
  )

  const visibleValves = useMemo(
    () => valves.filter(v => isEntityVisible(v.entity_id)),
    [valves, isEntityVisible]
  )

  const visibleFans = useMemo(
    () => fans.filter(f => isEntityVisible(f.entity_id)),
    [fans, isEntityVisible]
  )

  const visibleLocks = useMemo(
    () => locks.filter(l => isEntityVisible(l.entity_id)),
    [locks, isEntityVisible]
  )

  const generateInsight = useCallback(async (force = false) => {
    // Check if Claude is configured
    if (!isClaudeConfigured()) {
      setInsight('Add your Anthropic API key to enable AI insights.')
      return
    }

    // Check cache unless forced refresh
    const now = Date.now()
    if (!force && cachedInsight && (now - lastGeneratedTime) < CACHE_DURATION) {
      setInsight(cachedInsight)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Device classes to ignore for AI insights (too noisy for a lived-in home)
      const ignoredDeviceClasses = new Set(['motion', 'tamper', 'occupancy', 'presence', 'vibration'])

      // Helper to check if a door sensor is an exterior door (front/back)
      const isExteriorDoor = (sensor: typeof visibleBinarySensors[0]) => {
        if (sensor.attributes.device_class !== 'door') return true // Not a door, keep it
        const name = (sensor.attributes.friendly_name || sensor.entity_id).toLowerCase()
        return name.includes('front') || name.includes('back')
      }

      // Gather alerts (binary sensors in alert state) - exclude hidden entities and noisy sensors
      // For door sensors, only include front and back doors (exterior doors)
      const alerts = visibleBinarySensors
        .filter(shouldShowBinarySensor)
        .filter(sensor => !ignoredDeviceClasses.has(sensor.attributes.device_class || ''))
        .filter(isExteriorDoor)
        .map(sensor => ({
          name: sensor.attributes.friendly_name || sensor.entity_id.split('.')[1].replace(/_/g, ' '),
          state: sensor.state,
          deviceClass: sensor.attributes.device_class || 'unknown',
        }))

      // Get weather data
      const primaryWeather = weather[0]
      const weatherData = primaryWeather ? {
        temp: Math.round(primaryWeather.attributes.temperature || 0),
        condition: primaryWeather.attributes.condition || 'unknown',
        humidity: primaryWeather.attributes.humidity,
        forecast: primaryWeather.attributes.forecast?.slice(0, 3).map(f => ({
          datetime: f.datetime,
          temp: Math.round(f.temperature),
          condition: f.condition || 'unknown',
        })),
      } : null

      // Fetch calendar events for today - use settings pattern
      let calendarEvents: CalendarEvent[] = []
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
      if (filteredCalendars.length > 0) {
        const calendarIds = filteredCalendars.map(c => c.entity_id)
        calendarEvents = await calendarService.getAllEvents(calendarIds, 2) // Get 2 days for forecast matching
      }

      // Get weather forecast - try HA first, then fallback to Open-Meteo
      let hourlyForecast = weatherData?.forecast || null
      if (!hourlyForecast || hourlyForecast.length < 12) {
        // Fetch from Open-Meteo for Aurora, CO
        const openMeteoForecast = await fetchWeatherForecast()
        if (openMeteoForecast) {
          hourlyForecast = openMeteoForecast
        }
      }

      // Get people with their locations
      const peopleWithLocations = filteredPeople.map(person => ({
        name: person.attributes.friendly_name || person.entity_id.split('.')[1],
        state: person.state === 'home' ? 'Home' : person.state === 'not_home' ? 'Away' : person.state,
        latitude: person.attributes.latitude,
        longitude: person.attributes.longitude,
      }))

      // Find home person's location (first person who is home with GPS)
      const homePersonWithGPS = filteredPeople.find(
        p => p.state === 'home' && p.attributes.latitude && p.attributes.longitude
      )

      // Format calendar events with weather forecasts and travel time
      const formattedEvents = await Promise.all(calendarEvents.map(async event => {
        const startTime = event.start.dateTime || event.start.date || ''
        const eventStart = new Date(startTime)
        const now = new Date()

        // Get weather forecast for event time
        let weatherAtEvent: { temp: number; condition: string } | undefined
        if (hourlyForecast) {
          const weather = getWeatherForEventTime(startTime, hourlyForecast)
          if (weather) weatherAtEvent = weather
        }

        // Calculate travel time if event has location and we have person GPS
        let travelTimeMinutes: number | undefined
        let isReachable = true

        if (event.location && homePersonWithGPS) {
          // Geocode the event location
          const eventCoords = await geocodeAddress(event.location)
          if (eventCoords && homePersonWithGPS.attributes.latitude && homePersonWithGPS.attributes.longitude) {
            travelTimeMinutes = estimateTravelTime(
              homePersonWithGPS.attributes.latitude,
              homePersonWithGPS.attributes.longitude,
              eventCoords.lat,
              eventCoords.lon
            )

            // Check if event is reachable (event hasn't started and we have time to get there)
            const minutesUntilEvent = (eventStart.getTime() - now.getTime()) / (1000 * 60)
            if (minutesUntilEvent < 0) {
              // Event already started
              isReachable = false
            } else if (minutesUntilEvent < travelTimeMinutes) {
              // Not enough time to get there
              isReachable = false
            }
          }
        } else {
          // No location - just check if event already started
          if (eventStart.getTime() < now.getTime()) {
            isReachable = false
          }
        }

        return {
          summary: event.summary,
          start: startTime,
          end: event.end.dateTime || event.end.date || '',
          location: event.location,
          weatherAtEvent,
          travelTimeMinutes,
          isReachable,
        }
      }))

      // Get people status (simplified for prompt, locations used above)
      const peopleStatus = peopleWithLocations

      // Count lights - exclude hidden entities
      const lightsOn = visibleLights.filter(l => l.state === 'on').length
      const totalLights = visibleLights.length

      // Gather climate/HVAC data
      const climateData = visibleClimate.map(c => ({
        name: c.attributes.friendly_name || c.entity_id.split('.')[1].replace(/_/g, ' '),
        state: c.state,
        currentTemp: c.attributes.current_temperature,
        targetTemp: c.attributes.temperature,
      }))

      // Gather vacuum data
      const vacuumData = visibleVacuums.map(v => ({
        name: v.attributes.friendly_name || v.entity_id.split('.')[1].replace(/_/g, ' '),
        state: v.state,
        battery: v.attributes.battery_level,
      }))

      // Get primary alarm status (if any)
      const alarmData = visibleAlarms.length > 0 ? {
        name: visibleAlarms[0].attributes.friendly_name || 'Alarm',
        state: visibleAlarms[0].state,
      } : null

      // Gather valve/sprinkler data
      const valveData = visibleValves.map(v => ({
        name: v.attributes.friendly_name || v.entity_id.split('.')[1].replace(/_/g, ' '),
        state: v.state,
      }))

      // Gather fan data
      const fanData = visibleFans.map(f => ({
        name: f.attributes.friendly_name || f.entity_id.split('.')[1].replace(/_/g, ' '),
        state: f.state,
        percentage: f.attributes.percentage,
      }))

      // Gather lock data
      const lockData = visibleLocks.map(l => ({
        name: l.attributes.friendly_name || l.entity_id.split('.')[1].replace(/_/g, ' '),
        state: l.state,
      }))

      // === ATTENTION ITEMS (include hidden entities for these) ===

      // 1. Low battery devices - check ALL sensors (even hidden ones)
      const LOW_BATTERY_THRESHOLD = 20
      const lowBatteryDevices = sensors
        .filter(s => {
          const isBattery = s.attributes.device_class === 'battery' ||
            s.entity_id.toLowerCase().includes('battery')
          if (!isBattery) return false
          const level = parseFloat(s.state)
          return !isNaN(level) && level <= LOW_BATTERY_THRESHOLD && level > 0
        })
        .map(s => ({
          name: s.attributes.friendly_name || s.entity_id.split('.')[1].replace(/_/g, ' '),
          level: Math.round(parseFloat(s.state))
        }))
        .sort((a, b) => a.level - b.level) // Sort by lowest first

      // 2. Check if it's dark (after sunset / before sunrise)
      const currentHour = new Date().getHours()
      const isDark = currentHour >= 20 || currentHour < 6 // After 8pm or before 6am

      // 3. Front door open after dark - check ALL binary sensors (even hidden ones)
      const frontDoorSensor = binarySensors.find(s => {
        const name = (s.attributes.friendly_name || s.entity_id).toLowerCase()
        return s.attributes.device_class === 'door' &&
          (name.includes('front door') || name.includes('front_door'))
      })
      const frontDoorOpenAfterDark = isDark && frontDoorSensor?.state === 'on'

      // 4. Windows open with temperature difference - check ALL binary sensors
      const outsideTemp = weatherData?.temp
      const insideTemp = visibleClimate[0]?.attributes.current_temperature
      const TEMP_DIFF_THRESHOLD = 10

      let windowsOpenWithTempDiff: Array<{ name: string; tempDiff: number }> = []
      if (outsideTemp !== undefined && insideTemp !== undefined && insideTemp - outsideTemp >= TEMP_DIFF_THRESHOLD) {
        windowsOpenWithTempDiff = binarySensors
          .filter(s => {
            return s.attributes.device_class === 'window' && s.state === 'on'
          })
          .map(s => ({
            name: s.attributes.friendly_name || s.entity_id.split('.')[1].replace(/_/g, ' '),
            tempDiff: Math.round(insideTemp - outsideTemp)
          }))
      }

      // Build context
      const context: HomeContext = {
        alerts,
        weather: weatherData,
        calendar: formattedEvents,
        people: peopleStatus,
        lightsOn,
        totalLights,
        climate: climateData,
        vacuums: vacuumData,
        alarm: alarmData,
        valves: valveData,
        fans: fanData,
        locks: lockData,
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
        // Attention items
        lowBatteryDevices,
        frontDoorOpenAfterDark,
        windowsOpenWithTempDiff,
        insideTemp,
        isDark,
      }

      // Generate insight
      const result = await generateHomeInsights(context)
      setInsight(result)
      cachedInsight = result
      lastGeneratedTime = now
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate insight'
      setError(message)
      setInsight('Unable to generate insights at this time.')
    } finally {
      setLoading(false)
    }
  }, [visibleBinarySensors, visibleLights, visibleClimate, visibleVacuums, visibleAlarms, visibleValves, visibleFans, visibleLocks, weather, calendars, filteredPeople, settings, sensors, binarySensors])

  const refresh = useCallback(() => {
    generateInsight(true)
  }, [generateInsight])

  return {
    insight,
    loading,
    error,
    generateInsight,
    refresh,
    isConfigured: isClaudeConfigured(),
  }
}
