import { describe, it, expect } from 'vitest'
import { safeParseFloat, formatValue, formatTimeRemaining, findSensor, findSensorById } from '../camperUtils'
import type { SensorEntity } from '../../types/homeAssistant'

describe('safeParseFloat', () => {
  it('returns undefined for undefined', () => {
    expect(safeParseFloat(undefined)).toBeUndefined()
  })

  it('returns undefined for "unknown"', () => {
    expect(safeParseFloat('unknown')).toBeUndefined()
  })

  it('returns undefined for "unavailable"', () => {
    expect(safeParseFloat('unavailable')).toBeUndefined()
  })

  it('parses a valid float string', () => {
    expect(safeParseFloat('42.5')).toBe(42.5)
  })

  it('returns undefined for non-numeric string', () => {
    expect(safeParseFloat('abc')).toBeUndefined()
  })

  it('parses "0" as 0', () => {
    expect(safeParseFloat('0')).toBe(0)
  })

  it('parses negative values', () => {
    expect(safeParseFloat('-3.5')).toBe(-3.5)
  })
})

describe('formatValue', () => {
  it('returns "—" for undefined', () => {
    expect(formatValue(undefined)).toBe('—')
  })

  it('returns "—" for "unknown"', () => {
    expect(formatValue('unknown')).toBe('—')
  })

  it('returns "—" for "unavailable"', () => {
    expect(formatValue('unavailable')).toBe('—')
  })

  it('returns "—" for non-numeric string', () => {
    expect(formatValue('abc')).toBe('—')
  })

  it('formats a numeric value with unit', () => {
    expect(formatValue(42.567, 'V')).toBe('42.6 V')
  })

  it('formats a numeric value without unit', () => {
    expect(formatValue(42.567)).toBe('42.6')
  })

  it('respects custom decimals', () => {
    expect(formatValue(42.567, 'kWh', 2)).toBe('42.57 kWh')
  })

  it('formats string numbers', () => {
    expect(formatValue('12.3', 'A')).toBe('12.3 A')
  })

  it('formats 0 decimals', () => {
    expect(formatValue(250, 'W', 0)).toBe('250 W')
  })
})

describe('formatTimeRemaining', () => {
  it('returns "—" for undefined', () => {
    expect(formatTimeRemaining(undefined)).toBe('—')
  })

  it('returns "—" for NaN', () => {
    expect(formatTimeRemaining(NaN)).toBe('—')
  })

  it('returns "—" for 0', () => {
    expect(formatTimeRemaining(0)).toBe('—')
  })

  it('returns "—" for negative', () => {
    expect(formatTimeRemaining(-1)).toBe('—')
  })

  it('formats fractional hours', () => {
    expect(formatTimeRemaining(0.5)).toBe('0h 30m')
  })

  it('formats hours and minutes over 24h', () => {
    expect(formatTimeRemaining(25.5)).toBe('1d 2h')
  })

  it('formats exact days', () => {
    expect(formatTimeRemaining(48)).toBe('2 days')
  })

  it('formats exact hours under 24', () => {
    expect(formatTimeRemaining(5)).toBe('5h')
  })
})

function makeSensor(entityId: string): SensorEntity {
  return {
    entity_id: entityId,
    state: '0',
    attributes: { friendly_name: entityId },
    last_changed: '',
    last_updated: '',
  }
}

describe('findSensor', () => {
  const sensors = [
    makeSensor('sensor.battery_soc'),
    makeSensor('sensor.solar_power'),
    makeSensor('sensor.grid_voltage'),
  ]

  it('finds by string pattern (case-insensitive)', () => {
    const result = findSensor(sensors, 'battery')
    expect(result?.entity_id).toBe('sensor.battery_soc')
  })

  it('finds by regex pattern', () => {
    const result = findSensor(sensors, /solar.*power/i)
    expect(result?.entity_id).toBe('sensor.solar_power')
  })

  it('returns undefined when no match', () => {
    expect(findSensor(sensors, 'nonexistent')).toBeUndefined()
  })
})

describe('findSensorById', () => {
  const sensors = [
    makeSensor('sensor.battery_soc'),
    makeSensor('sensor.solar_power'),
  ]

  it('finds exact entity_id match', () => {
    expect(findSensorById(sensors, 'sensor.battery_soc')?.entity_id).toBe('sensor.battery_soc')
  })

  it('returns undefined for no match', () => {
    expect(findSensorById(sensors, 'sensor.nonexistent')).toBeUndefined()
  })

  it('does not match partial ids', () => {
    expect(findSensorById(sensors, 'battery_soc')).toBeUndefined()
  })
})
