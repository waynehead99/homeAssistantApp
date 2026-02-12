import { describe, it, expect } from 'vitest'
import { getAreaClimate } from '../roomUtils'
import type { SensorEntity } from '../../types/homeAssistant'

function makeSensor(deviceClass: string, state: string): SensorEntity {
  return {
    entity_id: `sensor.test_${deviceClass}`,
    state,
    attributes: {
      friendly_name: `Test ${deviceClass}`,
      device_class: deviceClass,
    },
    last_changed: '',
    last_updated: '',
  }
}

describe('getAreaClimate', () => {
  it('returns formatted temp for valid temperature state', () => {
    const sensors = [makeSensor('temperature', '72.3')]
    const result = getAreaClimate(sensors)
    expect(result.temp).toBe('72°')
    expect(result.humidity).toBeNull()
  })

  it('returns null temp for "unknown" state (NaN guard)', () => {
    const sensors = [makeSensor('temperature', 'unknown')]
    const result = getAreaClimate(sensors)
    expect(result.temp).toBeNull()
  })

  it('returns null temp for "unavailable" state (NaN guard)', () => {
    const sensors = [makeSensor('temperature', 'unavailable')]
    const result = getAreaClimate(sensors)
    expect(result.temp).toBeNull()
  })

  it('returns both temp and humidity when present', () => {
    const sensors = [
      makeSensor('temperature', '72.3'),
      makeSensor('humidity', '45.7'),
    ]
    const result = getAreaClimate(sensors)
    expect(result.temp).toBe('72°')
    expect(result.humidity).toBe('46%')
  })

  it('returns null for both when sensors array is empty', () => {
    const result = getAreaClimate([])
    expect(result.temp).toBeNull()
    expect(result.humidity).toBeNull()
  })

  it('returns null humidity for "unknown" state', () => {
    const sensors = [
      makeSensor('temperature', '72'),
      makeSensor('humidity', 'unknown'),
    ]
    const result = getAreaClimate(sensors)
    expect(result.temp).toBe('72°')
    expect(result.humidity).toBeNull()
  })

  it('rounds temperature correctly', () => {
    const sensors = [makeSensor('temperature', '72.6')]
    const result = getAreaClimate(sensors)
    expect(result.temp).toBe('73°')
  })
})
