import type { SensorEntity } from '../types/homeAssistant'

// Safe parseFloat that returns undefined for NaN/invalid values
export function safeParseFloat(value: string | undefined): number | undefined {
  if (value === undefined || value === 'unknown' || value === 'unavailable') return undefined
  const num = parseFloat(value)
  return isNaN(num) ? undefined : num
}

// Format number with unit
export function formatValue(value: string | number | undefined, unit?: string, decimals = 1): string {
  if (value === undefined || value === null || value === 'unknown' || value === 'unavailable') {
    return '—'
  }
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '—'
  const formatted = num.toFixed(decimals)
  return unit ? `${formatted} ${unit}` : formatted
}

// Format time remaining (input is hours)
export function formatTimeRemaining(hours: number | undefined): string {
  if (hours === undefined || isNaN(hours) || hours <= 0) return '—'

  // If more than 24 hours, show days
  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    const remainingHours = Math.round(hours % 24)
    if (remainingHours > 0) {
      return `${days}d ${remainingHours}h`
    }
    return `${days} days`
  }

  // Less than 24 hours, show hours and minutes
  const wholeHours = Math.floor(hours)
  const mins = Math.round((hours - wholeHours) * 60)
  if (mins > 0) {
    return `${wholeHours}h ${mins}m`
  }
  return `${wholeHours}h`
}

// Helper to find sensor by partial entity_id match
export function findSensor(sensors: SensorEntity[], pattern: string | RegExp): SensorEntity | undefined {
  if (typeof pattern === 'string') {
    return sensors.find(s => s.entity_id.toLowerCase().includes(pattern.toLowerCase()))
  }
  return sensors.find(s => pattern.test(s.entity_id))
}

// Helper to find sensor by exact entity_id
export function findSensorById(sensors: SensorEntity[], entityId: string): SensorEntity | undefined {
  return sensors.find(s => s.entity_id === entityId)
}
