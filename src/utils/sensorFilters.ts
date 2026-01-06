import type { SensorEntity, BinarySensorEntity } from '../types/homeAssistant'

// Sensor device classes to SHOW (important room data)
const IMPORTANT_SENSOR_CLASSES = new Set([
  'temperature',
  'humidity',
])

// Sensor device classes to HIDE (diagnostic/energy/counters)
const HIDDEN_SENSOR_CLASSES = new Set([
  // Energy/Power
  'power',
  'energy',
  'voltage',
  'current',
  'power_factor',
  'apparent_power',
  'reactive_power',
  // Diagnostic
  'battery',
  'signal_strength',
  'connectivity',
  // Timestamps/Counters
  'timestamp',
  'duration',
  'date',
])

// Binary sensor classes that should show only when ON (alert state)
const ALERT_WHEN_ON_CLASSES = new Set([
  'door',
  'garage_door',
  'window',
  'opening',
  'motion',
  'occupancy',
  'presence',
  'vibration',
  'smoke',
  'gas',
  'moisture',
  'problem',
  'safety',
  'tamper',
  'sound',
])

// Binary sensor classes that should show only when OFF (unlocked = alert)
const ALERT_WHEN_OFF_CLASSES = new Set([
  'lock',
])

// Binary sensor classes to always hide (not useful on dashboard)
const HIDDEN_BINARY_CLASSES = new Set([
  'connectivity',
  'update',
  'plug',
  'running',
  'power',
  'battery',
  'battery_charging',
])

/**
 * Determines if a regular sensor should be shown on the dashboard
 */
export function shouldShowSensor(sensor: SensorEntity): boolean {
  const { device_class } = sensor.attributes
  const state = sensor.state

  // Hide unavailable/unknown sensors
  if (state === 'unavailable' || state === 'unknown') {
    return false
  }

  // If no device_class, likely internal/diagnostic - hide it
  if (!device_class) {
    return false
  }

  // Show important sensor classes
  if (IMPORTANT_SENSOR_CLASSES.has(device_class)) {
    return true
  }

  // Hide explicitly blocked classes
  if (HIDDEN_SENSOR_CLASSES.has(device_class)) {
    return false
  }

  // Default: hide unknown sensor types to keep dashboard clean
  return false
}

/**
 * Determines if a binary sensor should be shown on the dashboard
 * Only shows sensors in "alert" states (door open, motion detected, etc.)
 */
export function shouldShowBinarySensor(sensor: BinarySensorEntity): boolean {
  const { device_class } = sensor.attributes
  const state = sensor.state
  const isOn = state === 'on'

  // Hide unavailable/unknown sensors
  if (state === 'unavailable' || state === 'unknown') {
    return false
  }

  // Always hide certain diagnostic binary sensors
  if (device_class && HIDDEN_BINARY_CLASSES.has(device_class)) {
    return false
  }

  // If no device_class, hide (likely internal)
  if (!device_class) {
    return false
  }

  // Alert when ON: show if door is open, motion detected, etc.
  if (ALERT_WHEN_ON_CLASSES.has(device_class)) {
    return isOn // Only show when ON (alert state)
  }

  // Alert when OFF: show if lock is unlocked
  if (ALERT_WHEN_OFF_CLASSES.has(device_class)) {
    return !isOn // Only show when OFF (unlocked = alert)
  }

  // Unknown binary sensor type - hide by default
  return false
}

/**
 * Count how many sensors would be filtered out
 */
export function countFilteredSensors(sensors: SensorEntity[]): number {
  return sensors.filter(s => !shouldShowSensor(s)).length
}

/**
 * Count how many binary sensors would be filtered out
 */
export function countFilteredBinarySensors(sensors: BinarySensorEntity[]): number {
  return sensors.filter(s => !shouldShowBinarySensor(s)).length
}
