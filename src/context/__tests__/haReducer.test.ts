import { describe, it, expect, beforeEach } from 'vitest'
import { haReducer, initialState, defaultSettings, type HAContextState } from '../haReducer'
import type { HAState, LightEntity, SwitchEntity } from '../../types/homeAssistant'

function makeState(): HAContextState {
  return {
    ...initialState,
    configured: false, // avoid calling isConfigured() which depends on env
    settingsLoaded: false,
    syncEnabled: false,
  }
}

function makeEntity(entityId: string, state = 'off'): HAState {
  return {
    entity_id: entityId,
    state,
    attributes: { friendly_name: entityId },
    last_changed: '',
    last_updated: '',
  }
}

describe('haReducer', () => {
  let state: HAContextState

  beforeEach(() => {
    state = makeState()
  })

  describe('UPDATE_ENTITY performance (bug fix #6)', () => {
    it('does NOT create new array reference for switches when updating a light', () => {
      // Set up state with some lights and switches
      const light1 = makeEntity('light.kitchen') as LightEntity
      const switch1 = makeEntity('switch.outlet') as SwitchEntity
      state = {
        ...state,
        entities: [light1, switch1],
        lights: [light1],
        switches: [switch1],
      }

      const switchesRef = state.switches

      // Update a light entity
      const updatedLight = { ...light1, state: 'on' }
      const newState = haReducer(state, { type: 'UPDATE_ENTITY', entity: updatedLight })

      // Switches array should be the SAME reference (not re-mapped)
      expect(newState.switches).toBe(switchesRef)
      // Lights should be updated
      expect(newState.lights[0].state).toBe('on')
    })

    it('does create new array reference for lights when updating a light', () => {
      const light1 = makeEntity('light.kitchen') as LightEntity
      state = {
        ...state,
        entities: [light1],
        lights: [light1],
      }

      const lightsRef = state.lights
      const updatedLight = { ...light1, state: 'on' }
      const newState = haReducer(state, { type: 'UPDATE_ENTITY', entity: updatedLight })

      // Lights array SHOULD be a new reference (was re-mapped)
      expect(newState.lights).not.toBe(lightsRef)
      expect(newState.lights[0].state).toBe('on')
    })
  })

  describe('HIDE_ENTITY / SHOW_ENTITY', () => {
    it('adds entity to hiddenEntities set', () => {
      const newState = haReducer(state, { type: 'HIDE_ENTITY', entityId: 'light.kitchen' })
      expect(newState.hiddenEntities.has('light.kitchen')).toBe(true)
    })

    it('removes entity from hiddenEntities set', () => {
      state = { ...state, hiddenEntities: new Set(['light.kitchen']) }
      const newState = haReducer(state, { type: 'SHOW_ENTITY', entityId: 'light.kitchen' })
      expect(newState.hiddenEntities.has('light.kitchen')).toBe(false)
    })

    it('showing an entity that is not hidden is a no-op', () => {
      const newState = haReducer(state, { type: 'SHOW_ENTITY', entityId: 'light.kitchen' })
      expect(newState.hiddenEntities.size).toBe(0)
    })
  })

  describe('HIDE_ROOM / SHOW_ROOM', () => {
    it('adds room to hiddenRooms set', () => {
      const newState = haReducer(state, { type: 'HIDE_ROOM', roomId: 'living_room' })
      expect(newState.hiddenRooms.has('living_room')).toBe(true)
    })

    it('removes room from hiddenRooms set', () => {
      state = { ...state, hiddenRooms: new Set(['living_room']) }
      const newState = haReducer(state, { type: 'SHOW_ROOM', roomId: 'living_room' })
      expect(newState.hiddenRooms.has('living_room')).toBe(false)
    })
  })

  describe('SET_SETTINGS', () => {
    it('merges partial settings with existing settings', () => {
      state = { ...state, settings: { ...defaultSettings, refreshInterval: 30 } }
      const newState = haReducer(state, {
        type: 'SET_SETTINGS',
        settings: { refreshInterval: 60 },
      })
      expect(newState.settings.refreshInterval).toBe(60)
      // Other settings should be preserved
      expect(newState.settings.aiInsightsEnabled).toBe(true)
      expect(newState.settings.calendarPattern).toBe('erikson')
    })

    it('preserves existing custom settings when merging', () => {
      state = {
        ...state,
        settings: { ...defaultSettings, primaryWeatherEntity: 'weather.home' },
      }
      const newState = haReducer(state, {
        type: 'SET_SETTINGS',
        settings: { refreshInterval: 10 },
      })
      expect(newState.settings.primaryWeatherEntity).toBe('weather.home')
      expect(newState.settings.refreshInterval).toBe(10)
    })
  })

  describe('LOAD_SYNCED_DATA', () => {
    it('merges settings with defaults and sets settingsLoaded', () => {
      const partialSettings = { refreshInterval: 60 } as any
      const newState = haReducer(state, {
        type: 'LOAD_SYNCED_DATA',
        settings: partialSettings,
        hiddenEntities: new Set(['light.x']),
        hiddenRooms: new Set(['room1']),
        customNames: new Map([['light.x', 'Custom']]),
        syncEnabled: true,
      })

      expect(newState.settingsLoaded).toBe(true)
      expect(newState.syncEnabled).toBe(true)
      // Defaults should be filled in
      expect(newState.settings.aiInsightsEnabled).toBe(defaultSettings.aiInsightsEnabled)
      expect(newState.settings.refreshInterval).toBe(60)
      expect(newState.hiddenEntities.has('light.x')).toBe(true)
      expect(newState.hiddenRooms.has('room1')).toBe(true)
      expect(newState.customNames.get('light.x')).toBe('Custom')
    })
  })

  describe('SET_ENTITIES', () => {
    it('categorizes entities into typed arrays', () => {
      const entities = [
        makeEntity('light.kitchen'),
        makeEntity('switch.outlet'),
        makeEntity('sensor.temp'),
        makeEntity('binary_sensor.door'),
      ]
      const newState = haReducer(state, { type: 'SET_ENTITIES', entities })

      expect(newState.lights).toHaveLength(1)
      expect(newState.switches).toHaveLength(1)
      expect(newState.sensors).toHaveLength(1)
      expect(newState.binarySensors).toHaveLength(1)
      expect(newState.entities).toHaveLength(4)
    })
  })

  describe('SET_ERROR / CLEAR_ERROR', () => {
    it('sets and clears error', () => {
      const s1 = haReducer(state, { type: 'SET_ERROR', error: 'Connection failed' })
      expect(s1.error).toBe('Connection failed')

      const s2 = haReducer(s1, { type: 'CLEAR_ERROR' })
      expect(s2.error).toBeNull()
    })
  })
})
