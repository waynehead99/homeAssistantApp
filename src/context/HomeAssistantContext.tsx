import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useMemo,
  useState,
  useRef,
  type ReactNode,
} from 'react'
import type { HAState, ConnectionStatus, LightEntity, SwitchEntity, SensorEntity, BinarySensorEntity, WeatherEntity, PersonEntity, CameraEntity, CalendarEntity, ClimateEntity, VacuumEntity, AlarmEntity, ValveEntity, FanEntity, LockEntity, CoverEntity, AutomationEntity, ScriptEntity, HAArea, HAEntityRegistryEntry, HADevice } from '../types/homeAssistant'
import { isConfigured, getStates, testConnection, getAreas, getEntityRegistry, getDeviceRegistry, setServiceCallCallback } from '../services/homeAssistant'
import { shouldShowSensor, shouldShowBinarySensor } from '../utils/sensorFilters'
import {
  initializeSync,
  loadAllFromHA,
  saveSettingsToHA,
  saveHiddenEntitiesToHA,
  saveHiddenRoomsToHA,
  saveCustomNamesToHA,
} from '../services/settingsSync'

// Entities grouped by area
export interface EntitiesByArea {
  area: HAArea | null
  areaName: string
  lights: LightEntity[]
  switches: SwitchEntity[]
  sensors: SensorEntity[]
  binarySensors: BinarySensorEntity[]
  climate: ClimateEntity[]
  vacuums: VacuumEntity[]
  alarms: AlarmEntity[]
  valves: ValveEntity[]
  fans: FanEntity[]
  locks: LockEntity[]
  covers: CoverEntity[]
  filteredSensorCount: number // Count of sensors hidden by smart filtering
  filteredBinarySensorCount: number // Count of binary sensors hidden by smart filtering
}

// App settings
export interface AppSettings {
  primaryWeatherEntity: string | null // entity_id of preferred weather entity
  calendarPattern: string // pattern to match calendars (e.g., "erikson")
  peoplePattern: string // pattern to match people (e.g., "shelby|wayne")
  aiInsightsEnabled: boolean
  refreshInterval: number // seconds between auto-refresh
  pinnedEntities: string[] // entity_ids to show on homepage for quick access
  pinnedAutomations: string[] // automation entity_ids to show on homepage
  notificationRecipients: string[] // mobile app device names for notifications (e.g., "waynes_iphone")
}

// Default settings
const defaultSettings: AppSettings = {
  primaryWeatherEntity: null,
  calendarPattern: 'erikson',
  peoplePattern: 'shelby|wayne',
  aiInsightsEnabled: true,
  refreshInterval: 30,
  pinnedEntities: [],
  pinnedAutomations: [],
  notificationRecipients: [],
}

// State shape
interface HAContextState {
  configured: boolean
  connectionStatus: ConnectionStatus
  settingsLoaded: boolean // Whether settings have been loaded from HA/localStorage
  syncEnabled: boolean // Whether HA sync is available
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
  entityDeviceMap: Map<string, string> // entity_id -> device_id
  hiddenEntities: Set<string>
  hiddenRooms: Set<string>
  customNames: Map<string, string> // key: entity_id or area_id, value: custom name
  settings: AppSettings
  error: string | null
  lastUpdated: Date | null
}

// Actions
type HAAction =
  | { type: 'SET_CONNECTION_STATUS'; status: ConnectionStatus; error?: string }
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

// Load hidden entities from localStorage
function loadHiddenEntities(): Set<string> {
  try {
    const stored = localStorage.getItem('hiddenEntities')
    if (stored) {
      return new Set(JSON.parse(stored))
    }
  } catch {
    // Ignore errors
  }
  return new Set()
}

// Save hidden entities to localStorage
function saveHiddenEntities(hidden: Set<string>) {
  try {
    localStorage.setItem('hiddenEntities', JSON.stringify([...hidden]))
  } catch {
    // Ignore errors
  }
}

// Load hidden rooms from localStorage
function loadHiddenRooms(): Set<string> {
  try {
    const stored = localStorage.getItem('hiddenRooms')
    if (stored) {
      return new Set(JSON.parse(stored))
    }
  } catch {
    // Ignore errors
  }
  return new Set()
}

// Save hidden rooms to localStorage
function saveHiddenRooms(hidden: Set<string>) {
  try {
    localStorage.setItem('hiddenRooms', JSON.stringify([...hidden]))
  } catch {
    // Ignore errors
  }
}

// Load custom names from localStorage
function loadCustomNames(): Map<string, string> {
  try {
    const stored = localStorage.getItem('customNames')
    if (stored) {
      return new Map(JSON.parse(stored))
    }
  } catch {
    // Ignore errors
  }
  return new Map()
}

// Save custom names to localStorage
function saveCustomNames(names: Map<string, string>) {
  try {
    localStorage.setItem('customNames', JSON.stringify([...names]))
  } catch {
    // Ignore errors
  }
}

// Load settings from localStorage
function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem('appSettings')
    if (stored) {
      return { ...defaultSettings, ...JSON.parse(stored) }
    }
  } catch {
    // Ignore errors
  }
  return defaultSettings
}

// Save settings to localStorage
function saveSettings(settings: AppSettings) {
  try {
    localStorage.setItem('appSettings', JSON.stringify(settings))
  } catch {
    // Ignore errors
  }
}

// Initial state - start with empty settings, will be loaded from HA or localStorage
const initialState: HAContextState = {
  configured: isConfigured(),
  connectionStatus: 'disconnected',
  settingsLoaded: false,
  syncEnabled: false,
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
function haReducer(state: HAContextState, action: HAAction): HAContextState {
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
      const entities = state.entities.map((e) =>
        e.entity_id === action.entity.entity_id ? action.entity : e
      )
      const lights = entities.filter(
        (e): e is LightEntity => e.entity_id.startsWith('light.')
      )
      const switches = entities.filter(
        (e): e is SwitchEntity => e.entity_id.startsWith('switch.')
      )
      const sensors = entities.filter(
        (e): e is SensorEntity => e.entity_id.startsWith('sensor.')
      )
      const binarySensors = entities.filter(
        (e): e is BinarySensorEntity => e.entity_id.startsWith('binary_sensor.')
      )
      const weather = entities.filter(
        (e): e is WeatherEntity => e.entity_id.startsWith('weather.')
      )
      const people = entities.filter(
        (e): e is PersonEntity => e.entity_id.startsWith('person.')
      )
      const cameras = entities.filter(
        (e): e is CameraEntity => e.entity_id.startsWith('camera.')
      )
      const calendars = entities.filter(
        (e): e is CalendarEntity => e.entity_id.startsWith('calendar.')
      )
      const climate = entities.filter(
        (e): e is ClimateEntity => e.entity_id.startsWith('climate.')
      )
      const vacuums = entities.filter(
        (e): e is VacuumEntity => e.entity_id.startsWith('vacuum.')
      )
      const alarms = entities.filter(
        (e): e is AlarmEntity => e.entity_id.startsWith('alarm_control_panel.')
      )
      const valves = entities.filter(
        (e): e is ValveEntity => e.entity_id.startsWith('valve.')
      )
      const fans = entities.filter(
        (e): e is FanEntity => e.entity_id.startsWith('fan.')
      )
      const locks = entities.filter(
        (e): e is LockEntity => e.entity_id.startsWith('lock.')
      )
      const covers = entities.filter(
        (e): e is CoverEntity => e.entity_id.startsWith('cover.')
      )
      const automations = entities.filter(
        (e): e is AutomationEntity => e.entity_id.startsWith('automation.')
      )
      const scripts = entities.filter(
        (e): e is ScriptEntity => e.entity_id.startsWith('script.')
      )
      return {
        ...state,
        entities,
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

    case 'SET_HIDDEN_ENTITIES':
      return { ...state, hiddenEntities: action.hidden }

    case 'HIDE_ENTITY': {
      const hidden = new Set(state.hiddenEntities)
      hidden.add(action.entityId)
      saveHiddenEntities(hidden)
      return { ...state, hiddenEntities: hidden }
    }

    case 'SHOW_ENTITY': {
      const hidden = new Set(state.hiddenEntities)
      hidden.delete(action.entityId)
      saveHiddenEntities(hidden)
      return { ...state, hiddenEntities: hidden }
    }

    case 'HIDE_ROOM': {
      const hidden = new Set(state.hiddenRooms)
      hidden.add(action.roomId)
      saveHiddenRooms(hidden)
      return { ...state, hiddenRooms: hidden }
    }

    case 'SHOW_ROOM': {
      const hidden = new Set(state.hiddenRooms)
      hidden.delete(action.roomId)
      saveHiddenRooms(hidden)
      return { ...state, hiddenRooms: hidden }
    }

    case 'SET_HIDDEN_ROOMS':
      return { ...state, hiddenRooms: action.hidden }

    case 'SET_CUSTOM_NAME': {
      const names = new Map(state.customNames)
      names.set(action.id, action.name)
      saveCustomNames(names)
      return { ...state, customNames: names }
    }

    case 'SET_CUSTOM_NAMES':
      return { ...state, customNames: action.names }

    case 'REMOVE_CUSTOM_NAME': {
      const names = new Map(state.customNames)
      names.delete(action.id)
      saveCustomNames(names)
      return { ...state, customNames: names }
    }

    case 'SET_SETTINGS': {
      // Merge with current settings (which should already include defaults)
      const newSettings = { ...defaultSettings, ...state.settings, ...action.settings }
      saveSettings(newSettings)
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

    default:
      return state
  }
}

// Related entity info for device grouping
export interface RelatedEntity {
  entity: HAState
  entityType: 'light' | 'switch' | 'sensor' | 'binary_sensor' | 'climate' | 'vacuum' | 'alarm' | 'valve' | 'fan' | 'lock' | 'cover' | 'automation' | 'script' | 'camera' | 'other'
}

// Context value type
interface HAContextValue extends HAContextState {
  connect: () => Promise<void>
  refresh: () => Promise<void>
  updateEntity: (entity: HAState) => void
  hideEntity: (entityId: string) => void
  showEntity: (entityId: string) => void
  showAllEntities: () => void
  hideRoom: (roomId: string) => void
  showRoom: (roomId: string) => void
  showAllRooms: () => void
  setCustomName: (id: string, name: string) => void
  removeCustomName: (id: string) => void
  getDisplayName: (id: string, defaultName: string) => string
  updateSettings: (settings: Partial<AppSettings>) => void
  getRelatedEntities: (entityId: string) => RelatedEntity[]
  getDeviceName: (entityId: string) => string | null
  entitiesByArea: EntitiesByArea[]
  filteredPeople: PersonEntity[]
  primaryWeather: WeatherEntity | null
  editMode: boolean
  setEditMode: (mode: boolean) => void
}

// Create context
const HomeAssistantContext = createContext<HAContextValue | null>(null)

// Provider component
export function HomeAssistantProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(haReducer, initialState)
  const [editMode, setEditMode] = useState(false)
  const syncInitialized = useRef(false)

  // Initialize settings sync and load settings on mount
  useEffect(() => {
    if (syncInitialized.current) return
    syncInitialized.current = true

    const initSettings = async () => {
      // Try to initialize HA sync
      const syncAvailable = await initializeSync()

      if (syncAvailable) {
        // Load from Home Assistant
        const synced = await loadAllFromHA()

        // Check if HA settings have actual content (not empty object)
        const hasHASettings = synced.settings && Object.keys(synced.settings).length > 0
        const hasHAHiddenEntities = synced.hiddenEntities && synced.hiddenEntities.size > 0
        const hasHAHiddenRooms = synced.hiddenRooms && synced.hiddenRooms.size > 0
        const hasHACustomNames = synced.customNames && synced.customNames.size > 0

        // Merge HA settings with localStorage (HA takes precedence if it has content)
        const localSettings = loadSettings()
        const mergedSettings = hasHASettings
          ? { ...localSettings, ...synced.settings }
          : localSettings

        dispatch({
          type: 'LOAD_SYNCED_DATA',
          settings: mergedSettings,
          hiddenEntities: hasHAHiddenEntities ? synced.hiddenEntities! : loadHiddenEntities(),
          hiddenRooms: hasHAHiddenRooms ? synced.hiddenRooms! : loadHiddenRooms(),
          customNames: hasHACustomNames ? synced.customNames! : loadCustomNames(),
          syncEnabled: true,
        })
      } else {
        // Fall back to localStorage
        dispatch({
          type: 'LOAD_SYNCED_DATA',
          settings: loadSettings(),
          hiddenEntities: loadHiddenEntities(),
          hiddenRooms: loadHiddenRooms(),
          customNames: loadCustomNames(),
          syncEnabled: false,
        })
      }
    }

    initSettings()
  }, [])

  // Filter out hidden entities
  const visibleLights = useMemo(
    () => state.lights.filter((l) => !state.hiddenEntities.has(l.entity_id)),
    [state.lights, state.hiddenEntities]
  )
  const visibleSwitches = useMemo(
    () => state.switches.filter((s) => !state.hiddenEntities.has(s.entity_id)),
    [state.switches, state.hiddenEntities]
  )
  const visibleSensors = useMemo(
    () => state.sensors.filter((s) => !state.hiddenEntities.has(s.entity_id)),
    [state.sensors, state.hiddenEntities]
  )
  const visibleBinarySensors = useMemo(
    () => state.binarySensors.filter((s) => !state.hiddenEntities.has(s.entity_id)),
    [state.binarySensors, state.hiddenEntities]
  )

  // Filter people based on settings pattern
  const filteredPeople = useMemo(
    () => {
      const pattern = state.settings.peoplePattern
      if (!pattern) return state.people
      try {
        const regex = new RegExp(pattern, 'i')
        return state.people.filter((p) => {
          const name = p.attributes.friendly_name || p.entity_id
          return regex.test(name)
        })
      } catch {
        // If regex is invalid, fall back to simple includes
        return state.people.filter((p) => {
          const name = (p.attributes.friendly_name || p.entity_id).toLowerCase()
          return name.includes(pattern.toLowerCase())
        })
      }
    },
    [state.people, state.settings.peoplePattern]
  )

  // Get primary weather entity based on settings
  const primaryWeather = useMemo(
    () => {
      if (state.settings.primaryWeatherEntity) {
        return state.weather.find(w => w.entity_id === state.settings.primaryWeatherEntity) || state.weather[0] || null
      }
      return state.weather[0] || null
    },
    [state.weather, state.settings.primaryWeatherEntity]
  )

  // Filter visible entities for new types
  const visibleClimate = useMemo(
    () => state.climate.filter((c) => !state.hiddenEntities.has(c.entity_id)),
    [state.climate, state.hiddenEntities]
  )
  const visibleVacuums = useMemo(
    () => state.vacuums.filter((v) => !state.hiddenEntities.has(v.entity_id)),
    [state.vacuums, state.hiddenEntities]
  )
  const visibleAlarms = useMemo(
    () => state.alarms.filter((a) => !state.hiddenEntities.has(a.entity_id)),
    [state.alarms, state.hiddenEntities]
  )
  const visibleValves = useMemo(
    () => state.valves.filter((v) => !state.hiddenEntities.has(v.entity_id)),
    [state.valves, state.hiddenEntities]
  )
  const visibleFans = useMemo(
    () => state.fans.filter((f) => !state.hiddenEntities.has(f.entity_id)),
    [state.fans, state.hiddenEntities]
  )
  const visibleLocks = useMemo(
    () => state.locks.filter((l) => !state.hiddenEntities.has(l.entity_id)),
    [state.locks, state.hiddenEntities]
  )
  const visibleCovers = useMemo(
    () => state.covers.filter((c) => !state.hiddenEntities.has(c.entity_id)),
    [state.covers, state.hiddenEntities]
  )

  // Compute entities grouped by area
  const entitiesByArea = useMemo((): EntitiesByArea[] => {
    const areaLights = new Map<string | null, LightEntity[]>()
    const areaSwitches = new Map<string | null, SwitchEntity[]>()
    const areaSensors = new Map<string | null, SensorEntity[]>()
    const areaBinarySensors = new Map<string | null, BinarySensorEntity[]>()
    const areaClimate = new Map<string | null, ClimateEntity[]>()
    const areaVacuums = new Map<string | null, VacuumEntity[]>()
    const areaAlarms = new Map<string | null, AlarmEntity[]>()
    const areaValves = new Map<string | null, ValveEntity[]>()
    const areaFans = new Map<string | null, FanEntity[]>()
    const areaLocks = new Map<string | null, LockEntity[]>()
    const areaCovers = new Map<string | null, CoverEntity[]>()
    // Track all sensors per area for filtered count calculation
    const areaAllSensors = new Map<string | null, SensorEntity[]>()
    const areaAllBinarySensors = new Map<string | null, BinarySensorEntity[]>()

    // Use visible entities in normal mode, all entities in edit mode
    const lights = editMode ? state.lights : visibleLights
    const switches = editMode ? state.switches : visibleSwitches
    // For sensors, apply both hidden filter AND smart filter (unless in edit mode)
    const sensors = editMode ? state.sensors : visibleSensors.filter(shouldShowSensor)
    const binarySensors = editMode ? state.binarySensors : visibleBinarySensors.filter(shouldShowBinarySensor)
    // Keep track of all visible sensors (before smart filter) for count
    const allVisibleSensors = editMode ? state.sensors : visibleSensors
    const allVisibleBinarySensors = editMode ? state.binarySensors : visibleBinarySensors
    // New entity types
    const climateEntities = editMode ? state.climate : visibleClimate
    const vacuumEntities = editMode ? state.vacuums : visibleVacuums
    const alarmEntities = editMode ? state.alarms : visibleAlarms
    const valveEntities = editMode ? state.valves : visibleValves
    const fanEntities = editMode ? state.fans : visibleFans
    const lockEntities = editMode ? state.locks : visibleLocks
    const coverEntities = editMode ? state.covers : visibleCovers

    // Helper to group entities by area
    const groupByArea = <T extends HAState>(entities: T[], map: Map<string | null, T[]>) => {
      entities.forEach((entity) => {
        const areaId = state.entityAreaMap.get(entity.entity_id) || null
        const existing = map.get(areaId) || []
        map.set(areaId, [...existing, entity])
      })
    }

    // Group all entity types by area
    groupByArea(lights, areaLights)
    groupByArea(switches, areaSwitches)
    groupByArea(sensors, areaSensors)
    groupByArea(binarySensors, areaBinarySensors)
    groupByArea(climateEntities, areaClimate)
    groupByArea(vacuumEntities, areaVacuums)
    groupByArea(alarmEntities, areaAlarms)
    groupByArea(valveEntities, areaValves)
    groupByArea(fanEntities, areaFans)
    groupByArea(lockEntities, areaLocks)
    groupByArea(coverEntities, areaCovers)

    // Group all visible sensors (for filtered count)
    groupByArea(allVisibleSensors, areaAllSensors)
    groupByArea(allVisibleBinarySensors, areaAllBinarySensors)

    // Helper to sort entities by friendly name
    const sortByName = <T extends HAState>(a: T, b: T) =>
      (a.attributes.friendly_name || a.entity_id).localeCompare(
        b.attributes.friendly_name || b.entity_id
      )

    // Build result array
    const result: EntitiesByArea[] = []

    // Add areas that have at least one entity (skip hidden rooms unless in edit mode)
    state.areas.forEach((area) => {
      // Skip hidden rooms unless in edit mode
      if (!editMode && state.hiddenRooms.has(area.area_id)) {
        return
      }

      const areaLightsList = areaLights.get(area.area_id) || []
      const areaSwitchesList = areaSwitches.get(area.area_id) || []
      const areaSensorsList = areaSensors.get(area.area_id) || []
      const areaBinarySensorsList = areaBinarySensors.get(area.area_id) || []
      const areaClimateList = areaClimate.get(area.area_id) || []
      const areaVacuumsList = areaVacuums.get(area.area_id) || []
      const areaAlarmsList = areaAlarms.get(area.area_id) || []
      const areaValvesList = areaValves.get(area.area_id) || []
      const areaFansList = areaFans.get(area.area_id) || []
      const areaLocksList = areaLocks.get(area.area_id) || []
      const areaCoversList = areaCovers.get(area.area_id) || []
      const allSensorsList = areaAllSensors.get(area.area_id) || []
      const allBinarySensorsList = areaAllBinarySensors.get(area.area_id) || []

      // Calculate filtered counts (how many were hidden by smart filter)
      const filteredSensorCount = allSensorsList.length - areaSensorsList.length
      const filteredBinarySensorCount = allBinarySensorsList.length - areaBinarySensorsList.length

      // Check if area has any entities
      const hasEntities = areaLightsList.length > 0 || areaSwitchesList.length > 0 ||
        areaSensorsList.length > 0 || areaBinarySensorsList.length > 0 ||
        areaClimateList.length > 0 || areaVacuumsList.length > 0 ||
        areaAlarmsList.length > 0 || areaValvesList.length > 0 ||
        areaFansList.length > 0 || areaLocksList.length > 0 ||
        areaCoversList.length > 0 ||
        filteredSensorCount > 0 || filteredBinarySensorCount > 0

      if (hasEntities) {
        result.push({
          area,
          areaName: area.name,
          lights: areaLightsList.sort(sortByName),
          switches: areaSwitchesList.sort(sortByName),
          sensors: areaSensorsList.sort(sortByName),
          binarySensors: areaBinarySensorsList.sort(sortByName),
          climate: areaClimateList.sort(sortByName),
          vacuums: areaVacuumsList.sort(sortByName),
          alarms: areaAlarmsList.sort(sortByName),
          valves: areaValvesList.sort(sortByName),
          fans: areaFansList.sort(sortByName),
          locks: areaLocksList.sort(sortByName),
          covers: areaCoversList.sort(sortByName),
          filteredSensorCount,
          filteredBinarySensorCount,
        })
      }
    })

    // Sort areas alphabetically
    result.sort((a, b) => a.areaName.localeCompare(b.areaName))

    // Add unassigned entities at the end
    const unassignedLights = areaLights.get(null) || []
    const unassignedSwitches = areaSwitches.get(null) || []
    const unassignedSensors = areaSensors.get(null) || []
    const unassignedBinarySensors = areaBinarySensors.get(null) || []
    const unassignedClimate = areaClimate.get(null) || []
    const unassignedVacuums = areaVacuums.get(null) || []
    const unassignedAlarms = areaAlarms.get(null) || []
    const unassignedValves = areaValves.get(null) || []
    const unassignedFans = areaFans.get(null) || []
    const unassignedLocks = areaLocks.get(null) || []
    const unassignedCovers = areaCovers.get(null) || []
    const unassignedAllSensors = areaAllSensors.get(null) || []
    const unassignedAllBinarySensors = areaAllBinarySensors.get(null) || []
    const unassignedFilteredSensorCount = unassignedAllSensors.length - unassignedSensors.length
    const unassignedFilteredBinarySensorCount = unassignedAllBinarySensors.length - unassignedBinarySensors.length

    const hasUnassigned = unassignedLights.length > 0 || unassignedSwitches.length > 0 ||
      unassignedSensors.length > 0 || unassignedBinarySensors.length > 0 ||
      unassignedClimate.length > 0 || unassignedVacuums.length > 0 ||
      unassignedAlarms.length > 0 || unassignedValves.length > 0 ||
      unassignedFans.length > 0 || unassignedLocks.length > 0 ||
      unassignedCovers.length > 0 ||
      unassignedFilteredSensorCount > 0 || unassignedFilteredBinarySensorCount > 0

    if (hasUnassigned) {
      result.push({
        area: null,
        areaName: result.length === 0 ? 'All Devices' : 'Other',
        lights: unassignedLights.sort(sortByName),
        switches: unassignedSwitches.sort(sortByName),
        sensors: unassignedSensors.sort(sortByName),
        binarySensors: unassignedBinarySensors.sort(sortByName),
        climate: unassignedClimate.sort(sortByName),
        vacuums: unassignedVacuums.sort(sortByName),
        alarms: unassignedAlarms.sort(sortByName),
        valves: unassignedValves.sort(sortByName),
        fans: unassignedFans.sort(sortByName),
        locks: unassignedLocks.sort(sortByName),
        covers: unassignedCovers.sort(sortByName),
        filteredSensorCount: unassignedFilteredSensorCount,
        filteredBinarySensorCount: unassignedFilteredBinarySensorCount,
      })
    }

    return result
  }, [state.lights, state.switches, state.sensors, state.binarySensors, state.climate, state.vacuums, state.alarms, state.valves, state.fans, state.locks, state.covers, state.areas, state.entityAreaMap, state.hiddenEntities, state.hiddenRooms, editMode, visibleLights, visibleSwitches, visibleSensors, visibleBinarySensors, visibleClimate, visibleVacuums, visibleAlarms, visibleValves, visibleFans, visibleLocks, visibleCovers])

  // Connect and fetch initial state
  const connect = useCallback(async () => {
    if (!isConfigured()) {
      dispatch({ type: 'SET_CONNECTION_STATUS', status: 'disconnected' })
      return
    }

    dispatch({ type: 'SET_CONNECTION_STATUS', status: 'connecting' })

    const result = await testConnection()
    if (!result.success) {
      dispatch({
        type: 'SET_CONNECTION_STATUS',
        status: 'error',
        error: result.error,
      })
      return
    }

    try {
      const [entities, areas, entityRegistry, devices] = await Promise.all([
        getStates(),
        getAreas(),
        getEntityRegistry(),
        getDeviceRegistry(),
      ])

      dispatch({ type: 'SET_AREAS', areas, entityRegistry, devices })
      dispatch({ type: 'SET_ENTITIES', entities })
      dispatch({ type: 'SET_CONNECTION_STATUS', status: 'connected' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch states'
      dispatch({ type: 'SET_CONNECTION_STATUS', status: 'error', error: message })
    }
  }, [])

  // Refresh entities
  const refresh = useCallback(async () => {
    if (state.connectionStatus !== 'connected') {
      return
    }

    try {
      const entities = await getStates()
      dispatch({ type: 'SET_ENTITIES', entities })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh'
      dispatch({ type: 'SET_ERROR', error: message })
    }
  }, [state.connectionStatus])

  // Entity visibility controls
  const updateEntity = useCallback((entity: HAState) => {
    dispatch({ type: 'UPDATE_ENTITY', entity })
  }, [])

  const hideEntity = useCallback((entityId: string) => {
    dispatch({ type: 'HIDE_ENTITY', entityId })
    // Sync to HA in background
    const newHidden = new Set(state.hiddenEntities)
    newHidden.add(entityId)
    if (state.syncEnabled) saveHiddenEntitiesToHA(newHidden)
  }, [state.hiddenEntities, state.syncEnabled])

  const showEntity = useCallback((entityId: string) => {
    dispatch({ type: 'SHOW_ENTITY', entityId })
    // Sync to HA in background
    const newHidden = new Set(state.hiddenEntities)
    newHidden.delete(entityId)
    if (state.syncEnabled) saveHiddenEntitiesToHA(newHidden)
  }, [state.hiddenEntities, state.syncEnabled])

  const showAllEntities = useCallback(() => {
    dispatch({ type: 'SET_HIDDEN_ENTITIES', hidden: new Set() })
    saveHiddenEntities(new Set())
    if (state.syncEnabled) saveHiddenEntitiesToHA(new Set())
  }, [state.syncEnabled])

  // Room visibility controls
  const hideRoom = useCallback((roomId: string) => {
    dispatch({ type: 'HIDE_ROOM', roomId })
    // Sync to HA in background
    const newHidden = new Set(state.hiddenRooms)
    newHidden.add(roomId)
    if (state.syncEnabled) saveHiddenRoomsToHA(newHidden)
  }, [state.hiddenRooms, state.syncEnabled])

  const showRoom = useCallback((roomId: string) => {
    dispatch({ type: 'SHOW_ROOM', roomId })
    // Sync to HA in background
    const newHidden = new Set(state.hiddenRooms)
    newHidden.delete(roomId)
    if (state.syncEnabled) saveHiddenRoomsToHA(newHidden)
  }, [state.hiddenRooms, state.syncEnabled])

  const showAllRooms = useCallback(() => {
    dispatch({ type: 'SET_HIDDEN_ROOMS', hidden: new Set() })
    saveHiddenRooms(new Set())
    if (state.syncEnabled) saveHiddenRoomsToHA(new Set())
  }, [state.syncEnabled])

  // Custom name controls
  const setCustomName = useCallback((id: string, name: string) => {
    dispatch({ type: 'SET_CUSTOM_NAME', id, name })
    // Sync to HA in background
    const newNames = new Map(state.customNames)
    newNames.set(id, name)
    if (state.syncEnabled) saveCustomNamesToHA(newNames)
  }, [state.customNames, state.syncEnabled])

  const removeCustomName = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_CUSTOM_NAME', id })
    // Sync to HA in background
    const newNames = new Map(state.customNames)
    newNames.delete(id)
    if (state.syncEnabled) saveCustomNamesToHA(newNames)
  }, [state.customNames, state.syncEnabled])

  // Get display name - returns custom name if set, otherwise default
  const getDisplayName = useCallback((id: string, defaultName: string) => {
    return state.customNames.get(id) || defaultName
  }, [state.customNames])

  // Update settings
  const updateSettings = useCallback((settings: Partial<AppSettings>) => {
    dispatch({ type: 'SET_SETTINGS', settings })
    // Sync to HA in background
    const newSettings = { ...state.settings, ...settings }
    if (state.syncEnabled) saveSettingsToHA(newSettings)
  }, [state.settings, state.syncEnabled])

  // Get entity type from entity_id
  const getEntityType = useCallback((entityId: string): RelatedEntity['entityType'] => {
    if (entityId.startsWith('light.')) return 'light'
    if (entityId.startsWith('switch.')) return 'switch'
    if (entityId.startsWith('sensor.')) return 'sensor'
    if (entityId.startsWith('binary_sensor.')) return 'binary_sensor'
    if (entityId.startsWith('climate.')) return 'climate'
    if (entityId.startsWith('vacuum.')) return 'vacuum'
    if (entityId.startsWith('alarm_control_panel.')) return 'alarm'
    if (entityId.startsWith('valve.')) return 'valve'
    if (entityId.startsWith('fan.')) return 'fan'
    if (entityId.startsWith('lock.')) return 'lock'
    if (entityId.startsWith('cover.')) return 'cover'
    if (entityId.startsWith('automation.')) return 'automation'
    if (entityId.startsWith('script.')) return 'script'
    if (entityId.startsWith('camera.')) return 'camera'
    return 'other'
  }, [])

  // Get related entities that share the same device
  const getRelatedEntities = useCallback((entityId: string): RelatedEntity[] => {
    const deviceId = state.entityDeviceMap.get(entityId)
    if (!deviceId) return []

    // Find all entities with the same device_id (excluding the current entity)
    const relatedEntityIds = Array.from(state.entityDeviceMap.entries())
      .filter(([id, devId]) => devId === deviceId && id !== entityId)
      .map(([id]) => id)

    // Map to entities with their types
    const related: RelatedEntity[] = []
    for (const relatedId of relatedEntityIds) {
      const entity = state.entities.find(e => e.entity_id === relatedId)
      if (entity) {
        related.push({
          entity,
          entityType: getEntityType(relatedId),
        })
      }
    }

    // Sort by entity type (controllable entities first)
    const typeOrder: Record<RelatedEntity['entityType'], number> = {
      light: 1,
      fan: 2,
      switch: 3,
      lock: 4,
      cover: 5,
      climate: 6,
      vacuum: 7,
      alarm: 8,
      valve: 9,
      automation: 10,
      script: 11,
      camera: 12,
      sensor: 13,
      binary_sensor: 14,
      other: 15,
    }
    related.sort((a, b) => typeOrder[a.entityType] - typeOrder[b.entityType])

    return related
  }, [state.entityDeviceMap, state.entities, getEntityType])

  // Get device name for an entity
  const getDeviceName = useCallback((entityId: string): string | null => {
    const deviceId = state.entityDeviceMap.get(entityId)
    if (!deviceId) return null

    const device = state.devices.find(d => d.device_id === deviceId)
    return device?.name || null
  }, [state.entityDeviceMap, state.devices])

  // Auto-connect on mount if configured
  useEffect(() => {
    if (isConfigured()) {
      connect()
    }
  }, [connect])

  // Auto-refresh based on settings interval when connected
  useEffect(() => {
    if (state.connectionStatus !== 'connected') {
      return
    }

    const intervalMs = state.settings.refreshInterval * 1000
    const interval = setInterval(refresh, intervalMs)
    return () => clearInterval(interval)
  }, [state.connectionStatus, refresh, state.settings.refreshInterval])

  // Register callback to refresh after service calls for real-time updates
  useEffect(() => {
    setServiceCallCallback(refresh)
    return () => setServiceCallCallback(null)
  }, [refresh])

  const value: HAContextValue = {
    ...state,
    connect,
    refresh,
    updateEntity,
    hideEntity,
    showEntity,
    showAllEntities,
    hideRoom,
    showRoom,
    showAllRooms,
    setCustomName,
    removeCustomName,
    getDisplayName,
    updateSettings,
    getRelatedEntities,
    getDeviceName,
    entitiesByArea,
    filteredPeople,
    primaryWeather,
    editMode,
    setEditMode,
  }

  return (
    <HomeAssistantContext.Provider value={value}>
      {children}
    </HomeAssistantContext.Provider>
  )
}

// Hook to use the context
export function useHomeAssistantContext(): HAContextValue {
  const context = useContext(HomeAssistantContext)
  if (!context) {
    throw new Error('useHomeAssistantContext must be used within HomeAssistantProvider')
  }
  return context
}
