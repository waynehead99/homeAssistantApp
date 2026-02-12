import type { HAState, LightEntity, SwitchEntity, SensorEntity, BinarySensorEntity, WeatherEntity, PersonEntity, CameraEntity, CalendarEntity, ClimateEntity, VacuumEntity, AlarmEntity, ValveEntity, FanEntity, LockEntity, CoverEntity, AutomationEntity, ScriptEntity, HAArea, HAEntityRegistryEntry, HADevice } from '../types/homeAssistant'
import type { AppSettings } from './HomeAssistantContext'
import { isConfigured } from '../services/homeAssistant'

// State shape
export interface HAContextState {
  configured: boolean
  connectionStatus: import('../types/homeAssistant').ConnectionStatus
  settingsLoaded: boolean
  syncEnabled: boolean
  settingsError: string | null
  entities: HAState[]
  lights: LightEntity[]
  switches: SwitchEntity[]
  sensors: SensorEntity[]
  binarySensors: BinarySensorEntity[]
  weather: WeatherEntity[]
  people: PersonEntity[]
  cameras: CameraEntity[]
  calendars: CalendarEntity[]
  climate: ClimateEntity[]
  vacuums: VacuumEntity[]
  alarms: AlarmEntity[]
  valves: ValveEntity[]
  fans: FanEntity[]
  locks: LockEntity[]
  covers: CoverEntity[]
  automations: AutomationEntity[]
  scripts: ScriptEntity[]
  areas: HAArea[]
  devices: HADevice[]
  entityAreaMap: Map<string, string>
  entityDeviceMap: Map<string, string>
  hiddenEntities: Set<string>
  hiddenRooms: Set<string>
  customNames: Map<string, string>
  settings: AppSettings
  error: string | null
  lastUpdated: Date | null
}

// Actions
export type HAAction =
  | { type: 'SET_CONNECTION_STATUS'; status: import('../types/homeAssistant').ConnectionStatus; error?: string }
  | { type: 'SET_ENTITIES'; entities: HAState[] }
  | { type: 'SET_AREAS'; areas: HAArea[]; entityRegistry: HAEntityRegistryEntry[]; devices: HADevice[] }
  | { type: 'UPDATE_ENTITY'; entity: HAState }
  | { type: 'SET_HIDDEN_ENTITIES'; hidden: Set<string> }
  | { type: 'HIDE_ENTITY'; entityId: string }
  | { type: 'SHOW_ENTITY'; entityId: string }
  | { type: 'HIDE_ROOM'; roomId: string }
  | { type: 'SHOW_ROOM'; roomId: string }
  | { type: 'SET_HIDDEN_ROOMS'; hidden: Set<string> }
  | { type: 'SET_CUSTOM_NAME'; id: string; name: string }
  | { type: 'SET_CUSTOM_NAMES'; names: Map<string, string> }
  | { type: 'REMOVE_CUSTOM_NAME'; id: string }
  | { type: 'SET_SETTINGS'; settings: Partial<AppSettings> }
  | { type: 'LOAD_SYNCED_DATA'; settings: AppSettings; hiddenEntities: Set<string>; hiddenRooms: Set<string>; customNames: Map<string, string>; syncEnabled: boolean }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_SETTINGS_ERROR'; error: string }

// Default settings
export const defaultSettings: AppSettings = {
  primaryWeatherEntity: null,
  calendarPattern: 'erikson',
  peoplePattern: 'shelby|wayne',
  aiInsightsEnabled: true,
  refreshInterval: 30,
  pinnedEntities: [],
  pinnedAutomations: [],
  notificationRecipients: [],
}

// Initial state
export const initialState: HAContextState = {
  configured: isConfigured(),
  connectionStatus: 'disconnected',
  settingsLoaded: false,
  syncEnabled: false,
  settingsError: null,
  entities: [],
  lights: [],
  switches: [],
  sensors: [],
  binarySensors: [],
  weather: [],
  people: [],
  cameras: [],
  calendars: [],
  climate: [],
  vacuums: [],
  alarms: [],
  valves: [],
  fans: [],
  locks: [],
  covers: [],
  automations: [],
  scripts: [],
  areas: [],
  devices: [],
  entityAreaMap: new Map(),
  entityDeviceMap: new Map(),
  hiddenEntities: new Set(),
  hiddenRooms: new Set(),
  customNames: new Map(),
  settings: defaultSettings,
  error: null,
  lastUpdated: null,
}

// Reducer
export function haReducer(state: HAContextState, action: HAAction): HAContextState {
  switch (action.type) {
    case 'SET_CONNECTION_STATUS':
      return {
        ...state,
        connectionStatus: action.status,
        error: action.error ?? null,
      }

    case 'SET_ENTITIES': {
      const lights = action.entities.filter(
        (e): e is LightEntity => e.entity_id.startsWith('light.')
      )
      const switches = action.entities.filter(
        (e): e is SwitchEntity => e.entity_id.startsWith('switch.')
      )
      const sensors = action.entities.filter(
        (e): e is SensorEntity => e.entity_id.startsWith('sensor.')
      )
      const binarySensors = action.entities.filter(
        (e): e is BinarySensorEntity => e.entity_id.startsWith('binary_sensor.')
      )
      const weather = action.entities.filter(
        (e): e is WeatherEntity => e.entity_id.startsWith('weather.')
      )
      const people = action.entities.filter(
        (e): e is PersonEntity => e.entity_id.startsWith('person.')
      )
      const cameras = action.entities.filter(
        (e): e is CameraEntity => e.entity_id.startsWith('camera.')
      )
      const calendars = action.entities.filter(
        (e): e is CalendarEntity => e.entity_id.startsWith('calendar.')
      )
      const climate = action.entities.filter(
        (e): e is ClimateEntity => e.entity_id.startsWith('climate.')
      )
      const vacuums = action.entities.filter(
        (e): e is VacuumEntity => e.entity_id.startsWith('vacuum.')
      )
      const alarms = action.entities.filter(
        (e): e is AlarmEntity => e.entity_id.startsWith('alarm_control_panel.')
      )
      const valves = action.entities.filter(
        (e): e is ValveEntity => e.entity_id.startsWith('valve.')
      )
      const fans = action.entities.filter(
        (e): e is FanEntity => e.entity_id.startsWith('fan.')
      )
      const locks = action.entities.filter(
        (e): e is LockEntity => e.entity_id.startsWith('lock.')
      )
      const covers = action.entities.filter(
        (e): e is CoverEntity => e.entity_id.startsWith('cover.')
      )
      const automations = action.entities.filter(
        (e): e is AutomationEntity => e.entity_id.startsWith('automation.')
      )
      const scripts = action.entities.filter(
        (e): e is ScriptEntity => e.entity_id.startsWith('script.')
      )
      return {
        ...state,
        entities: action.entities,
        lights,
        switches,
        sensors,
        binarySensors,
        weather,
        people,
        cameras,
        calendars,
        climate,
        vacuums,
        alarms,
        valves,
        fans,
        locks,
        covers,
        automations,
        scripts,
        lastUpdated: new Date(),
      }
    }

    case 'SET_AREAS': {
      const entityAreaMap = new Map<string, string>()
      const entityDeviceMap = new Map<string, string>()
      action.entityRegistry.forEach((entry) => {
        if (entry.area_id) {
          entityAreaMap.set(entry.entity_id, entry.area_id)
        }
        if (entry.device_id) {
          entityDeviceMap.set(entry.entity_id, entry.device_id)
        }
      })
      return {
        ...state,
        areas: action.areas,
        devices: action.devices,
        entityAreaMap,
        entityDeviceMap,
      }
    }

    case 'UPDATE_ENTITY': {
      const entityId = action.entity.entity_id
      const entities = state.entities.map((e) =>
        e.entity_id === entityId ? action.entity : e
      )

      // Only re-map the typed array that this entity belongs to (instead of all 17)
      const updateTypedArray = <T extends HAState>(
        arr: T[], prefix: string
      ): T[] => entityId.startsWith(prefix)
        ? arr.map(e => e.entity_id === entityId ? action.entity as unknown as T : e)
        : arr

      return {
        ...state,
        entities,
        lights: updateTypedArray(state.lights, 'light.'),
        switches: updateTypedArray(state.switches, 'switch.'),
        sensors: updateTypedArray(state.sensors, 'sensor.'),
        binarySensors: updateTypedArray(state.binarySensors, 'binary_sensor.'),
        weather: updateTypedArray(state.weather, 'weather.'),
        people: updateTypedArray(state.people, 'person.'),
        cameras: updateTypedArray(state.cameras, 'camera.'),
        calendars: updateTypedArray(state.calendars, 'calendar.'),
        climate: updateTypedArray(state.climate, 'climate.'),
        vacuums: updateTypedArray(state.vacuums, 'vacuum.'),
        alarms: updateTypedArray(state.alarms, 'alarm_control_panel.'),
        valves: updateTypedArray(state.valves, 'valve.'),
        fans: updateTypedArray(state.fans, 'fan.'),
        locks: updateTypedArray(state.locks, 'lock.'),
        covers: updateTypedArray(state.covers, 'cover.'),
        automations: updateTypedArray(state.automations, 'automation.'),
        scripts: updateTypedArray(state.scripts, 'script.'),
        lastUpdated: new Date(),
      }
    }

    case 'SET_HIDDEN_ENTITIES':
      return { ...state, hiddenEntities: action.hidden }

    case 'HIDE_ENTITY': {
      const hidden = new Set(state.hiddenEntities)
      hidden.add(action.entityId)
      return { ...state, hiddenEntities: hidden }
    }

    case 'SHOW_ENTITY': {
      const hidden = new Set(state.hiddenEntities)
      hidden.delete(action.entityId)
      return { ...state, hiddenEntities: hidden }
    }

    case 'HIDE_ROOM': {
      const hidden = new Set(state.hiddenRooms)
      hidden.add(action.roomId)
      return { ...state, hiddenRooms: hidden }
    }

    case 'SHOW_ROOM': {
      const hidden = new Set(state.hiddenRooms)
      hidden.delete(action.roomId)
      return { ...state, hiddenRooms: hidden }
    }

    case 'SET_HIDDEN_ROOMS':
      return { ...state, hiddenRooms: action.hidden }

    case 'SET_CUSTOM_NAME': {
      const names = new Map(state.customNames)
      names.set(action.id, action.name)
      return { ...state, customNames: names }
    }

    case 'SET_CUSTOM_NAMES':
      return { ...state, customNames: action.names }

    case 'REMOVE_CUSTOM_NAME': {
      const names = new Map(state.customNames)
      names.delete(action.id)
      return { ...state, customNames: names }
    }

    case 'SET_SETTINGS': {
      // Merge with current settings (which should already include defaults)
      const newSettings = { ...defaultSettings, ...state.settings, ...action.settings }
      return { ...state, settings: newSettings }
    }

    case 'LOAD_SYNCED_DATA':
      return {
        ...state,
        // Merge with defaults to ensure all fields exist
        settings: { ...defaultSettings, ...action.settings },
        hiddenEntities: action.hiddenEntities,
        hiddenRooms: action.hiddenRooms,
        customNames: action.customNames,
        syncEnabled: action.syncEnabled,
        settingsLoaded: true,
      }

    case 'SET_ERROR':
      return { ...state, error: action.error }

    case 'CLEAR_ERROR':
      return { ...state, error: null }

    case 'SET_SETTINGS_ERROR':
      return { ...state, settingsError: action.error }

    default:
      return state
  }
}
