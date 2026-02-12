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
import type { HAState, LightEntity, SwitchEntity, SensorEntity, BinarySensorEntity, WeatherEntity, PersonEntity, ClimateEntity, VacuumEntity, AlarmEntity, ValveEntity, FanEntity, LockEntity, CoverEntity, HAArea } from '../types/homeAssistant'
import { isConfigured, getStates, testConnection, getAreas, getEntityRegistry, getDeviceRegistry, setServiceCallCallback } from '../services/homeAssistant'
import { shouldShowSensor, shouldShowBinarySensor } from '../utils/sensorFilters'
import {
  initializeSync,
  loadAllFromHA,
  debouncedSaveSettingsToHA,
  debouncedSaveHiddenEntitiesToHA,
  debouncedSaveHiddenRoomsToHA,
  debouncedSaveCustomNamesToHA,
} from '../services/settingsSync'
import {
  haReducer,
  initialState,
  defaultSettings,
  type HAContextState,
} from './haReducer'

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
  openaiApiKey?: string // OpenAI API key for voice features (Whisper STT + TTS)
  openaiVoice?: string // Selected OpenAI TTS voice (alloy, echo, fable, onyx, nova, shimmer)
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

        dispatch({
          type: 'LOAD_SYNCED_DATA',
          settings: synced.settings && Object.keys(synced.settings).length > 0
            ? synced.settings
            : defaultSettings,
          hiddenEntities: synced.hiddenEntities ?? new Set(),
          hiddenRooms: synced.hiddenRooms ?? new Set(),
          customNames: synced.customNames ?? new Map(),
          syncEnabled: true,
        })
      } else {
        // Cannot load settings from Home Assistant — show error
        dispatch({
          type: 'SET_SETTINGS_ERROR',
          error: 'Could not load settings from Home Assistant. Make sure the dashboard settings entities are accessible.',
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
  }, [state.areas, state.entityAreaMap, state.hiddenEntities, state.hiddenRooms, editMode, state.lights, state.switches, state.sensors, state.binarySensors, state.climate, state.vacuums, state.alarms, state.valves, state.fans, state.locks, state.covers, visibleLights, visibleSwitches, visibleSensors, visibleBinarySensors, visibleClimate, visibleVacuums, visibleAlarms, visibleValves, visibleFans, visibleLocks, visibleCovers])

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
  }, [])

  const showEntity = useCallback((entityId: string) => {
    dispatch({ type: 'SHOW_ENTITY', entityId })
  }, [])

  const showAllEntities = useCallback(() => {
    dispatch({ type: 'SET_HIDDEN_ENTITIES', hidden: new Set() })
  }, [])

  // Room visibility controls
  const hideRoom = useCallback((roomId: string) => {
    dispatch({ type: 'HIDE_ROOM', roomId })
  }, [])

  const showRoom = useCallback((roomId: string) => {
    dispatch({ type: 'SHOW_ROOM', roomId })
  }, [])

  const showAllRooms = useCallback(() => {
    dispatch({ type: 'SET_HIDDEN_ROOMS', hidden: new Set() })
  }, [])

  // Custom name controls
  const setCustomName = useCallback((id: string, name: string) => {
    dispatch({ type: 'SET_CUSTOM_NAME', id, name })
  }, [])

  const removeCustomName = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_CUSTOM_NAME', id })
  }, [])

  // Get display name - returns custom name if set, otherwise default
  const getDisplayName = useCallback((id: string, defaultName: string) => {
    return state.customNames.get(id) || defaultName
  }, [state.customNames])

  // Update settings
  const updateSettings = useCallback((settings: Partial<AppSettings>) => {
    dispatch({ type: 'SET_SETTINGS', settings })
  }, [])

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

  // === Effect-based HA sync ===
  // These effects watch state changes and automatically sync to HA.
  // They only run AFTER settingsLoaded is true, preventing overwrites during initial load.

  useEffect(() => {
    if (!state.settingsLoaded || !state.syncEnabled) return
    debouncedSaveSettingsToHA(state.settings)
  }, [state.settings, state.settingsLoaded, state.syncEnabled])

  useEffect(() => {
    if (!state.settingsLoaded || !state.syncEnabled) return
    debouncedSaveHiddenEntitiesToHA(state.hiddenEntities)
  }, [state.hiddenEntities, state.settingsLoaded, state.syncEnabled])

  useEffect(() => {
    if (!state.settingsLoaded || !state.syncEnabled) return
    debouncedSaveHiddenRoomsToHA(state.hiddenRooms)
  }, [state.hiddenRooms, state.settingsLoaded, state.syncEnabled])

  useEffect(() => {
    if (!state.settingsLoaded || !state.syncEnabled) return
    debouncedSaveCustomNamesToHA(state.customNames)
  }, [state.customNames, state.settingsLoaded, state.syncEnabled])

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
