import { describe, it, expect } from 'vitest'
import { shouldShowSensor, shouldShowBinarySensor } from '../sensorFilters'
import type { SensorEntity, BinarySensorEntity } from '../../types/homeAssistant'

function makeSensor(deviceClass: string | undefined, state: string): SensorEntity {
  return {
    entity_id: `sensor.test_${deviceClass || 'none'}`,
    state,
    attributes: {
      friendly_name: `Test ${deviceClass || 'none'}`,
      device_class: deviceClass,
    },
    last_changed: '',
    last_updated: '',
  }
}

function makeBinarySensor(deviceClass: string | undefined, state: string): BinarySensorEntity {
  return {
    entity_id: `binary_sensor.test_${deviceClass || 'none'}`,
    state,
    attributes: {
      friendly_name: `Test ${deviceClass || 'none'}`,
      device_class: deviceClass,
    },
    last_changed: '',
    last_updated: '',
  }
}

describe('shouldShowSensor', () => {
  it('shows temperature sensor with valid state', () => {
    expect(shouldShowSensor(makeSensor('temperature', '72'))).toBe(true)
  })

  it('shows humidity sensor with valid state', () => {
    expect(shouldShowSensor(makeSensor('humidity', '45'))).toBe(true)
  })

  it('hides sensor with "unavailable" state', () => {
    expect(shouldShowSensor(makeSensor('temperature', 'unavailable'))).toBe(false)
  })

  it('hides sensor with "unknown" state', () => {
    expect(shouldShowSensor(makeSensor('temperature', 'unknown'))).toBe(false)
  })

  it('hides power sensor', () => {
    expect(shouldShowSensor(makeSensor('power', '150'))).toBe(false)
  })

  it('hides energy sensor', () => {
    expect(shouldShowSensor(makeSensor('energy', '42'))).toBe(false)
  })

  it('hides battery sensor', () => {
    expect(shouldShowSensor(makeSensor('battery', '80'))).toBe(false)
  })

  it('hides sensor with no device_class', () => {
    expect(shouldShowSensor(makeSensor(undefined, '42'))).toBe(false)
  })
})

describe('shouldShowBinarySensor', () => {
  it('shows door sensor when ON (open)', () => {
    expect(shouldShowBinarySensor(makeBinarySensor('door', 'on'))).toBe(true)
  })

  it('hides door sensor when OFF (closed)', () => {
    expect(shouldShowBinarySensor(makeBinarySensor('door', 'off'))).toBe(false)
  })

  it('shows lock sensor when OFF (unlocked = alert)', () => {
    expect(shouldShowBinarySensor(makeBinarySensor('lock', 'off'))).toBe(true)
  })

  it('hides lock sensor when ON (locked)', () => {
    expect(shouldShowBinarySensor(makeBinarySensor('lock', 'on'))).toBe(false)
  })

  it('hides connectivity binary sensor', () => {
    expect(shouldShowBinarySensor(makeBinarySensor('connectivity', 'on'))).toBe(false)
  })

  it('hides update binary sensor', () => {
    expect(shouldShowBinarySensor(makeBinarySensor('update', 'on'))).toBe(false)
  })

  it('hides sensor with "unavailable" state', () => {
    expect(shouldShowBinarySensor(makeBinarySensor('door', 'unavailable'))).toBe(false)
  })

  it('hides sensor with "unknown" state', () => {
    expect(shouldShowBinarySensor(makeBinarySensor('door', 'unknown'))).toBe(false)
  })

  it('hides sensor with no device_class', () => {
    expect(shouldShowBinarySensor(makeBinarySensor(undefined, 'on'))).toBe(false)
  })

  it('shows motion sensor when ON', () => {
    expect(shouldShowBinarySensor(makeBinarySensor('motion', 'on'))).toBe(true)
  })

  it('hides motion sensor when OFF', () => {
    expect(shouldShowBinarySensor(makeBinarySensor('motion', 'off'))).toBe(false)
  })

  it('shows smoke sensor when ON (alert)', () => {
    expect(shouldShowBinarySensor(makeBinarySensor('smoke', 'on'))).toBe(true)
  })

  it('shows window sensor when ON (open)', () => {
    expect(shouldShowBinarySensor(makeBinarySensor('window', 'on'))).toBe(true)
  })
})
