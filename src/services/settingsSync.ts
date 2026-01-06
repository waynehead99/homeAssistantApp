// Settings sync service - stores app settings in Home Assistant for cross-device sync
// Uses custom sensor entities with data stored in attributes to avoid 255 char state limit

import type { AppSettings } from '../context/HomeAssistantContext'

// Use sensor entities - state is just a timestamp, data is in attributes
const SETTINGS_ENTITY_ID = 'sensor.ha_dashboard_settings'
const HIDDEN_ENTITIES_ENTITY_ID = 'sensor.ha_dashboard_hidden_entities'
const HIDDEN_ROOMS_ENTITY_ID = 'sensor.ha_dashboard_hidden_rooms'
const CUSTOM_NAMES_ENTITY_ID = 'sensor.ha_dashboard_custom_names'

// Get configuration from environment variables
const HA_URL = import.meta.env.VITE_HA_URL as string | undefined
const HA_TOKEN = import.meta.env.VITE_HA_TOKEN as string | undefined
const isDev = import.meta.env.DEV

function getHeaders(): HeadersInit {
  return {
    'Authorization': `Bearer ${HA_TOKEN}`,
    'Content-Type': 'application/json',
  }
}

function getApiUrl(endpoint: string): string {
  if (isDev) {
    return endpoint
  }
  return `${HA_URL?.replace(/\/$/, '')}${endpoint}`
}

// Check if an entity exists
async function entityExists(entityId: string): Promise<boolean> {
  try {
    const url = getApiUrl(`/api/states/${entityId}`)
    const response = await fetch(url, { headers: getHeaders() })
    return response.ok
  } catch {
    return false
  }
}

// Get data from entity attributes (not state - state has 255 char limit)
async function getEntityData(entityId: string): Promise<string | null> {
  try {
    const url = getApiUrl(`/api/states/${entityId}`)
    const response = await fetch(url, { headers: getHeaders() })
    if (!response.ok) return null

    const data = await response.json()
    // Data is stored in attributes.data, not in state
    return data.attributes?.data || null
  } catch {
    return null
  }
}

// Set data in entity attributes (allows large JSON storage)
async function setEntityData(entityId: string, value: string, friendlyName: string): Promise<boolean> {
  try {
    const url = getApiUrl(`/api/states/${entityId}`)
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        state: new Date().toISOString(), // State is just timestamp of last update
        attributes: {
          friendly_name: friendlyName,
          data: value, // Actual data stored in attributes (no size limit)
          icon: 'mdi:cog',
        },
      }),
    })
    return response.ok
  } catch {
    return false
  }
}

// Sync status
export interface SyncStatus {
  available: boolean
  lastSync: Date | null
  error: string | null
}

let syncStatus: SyncStatus = {
  available: false,
  lastSync: null,
  error: null,
}

export function getSyncStatus(): SyncStatus {
  return syncStatus
}

// Initialize sync - check if we can use HA storage
export async function initializeSync(): Promise<boolean> {
  if (!HA_URL || !HA_TOKEN) {
    syncStatus = { available: false, lastSync: null, error: 'HA not configured' }
    return false
  }

  try {
    // Check which entities exist
    const [settingsExists, hiddenEntitiesExists, hiddenRoomsExists, customNamesExists] = await Promise.all([
      entityExists(SETTINGS_ENTITY_ID),
      entityExists(HIDDEN_ENTITIES_ENTITY_ID),
      entityExists(HIDDEN_ROOMS_ENTITY_ID),
      entityExists(CUSTOM_NAMES_ENTITY_ID),
    ])

    // Only create entities that don't exist - never overwrite existing data
    if (!settingsExists) {
      const created = await setEntityData(SETTINGS_ENTITY_ID, '{}', 'Dashboard Settings')
      if (!created) {
        console.warn('Could not create settings entity, using localStorage')
        syncStatus = { available: false, lastSync: null, error: 'Could not create settings entity' }
        return false
      }
    }

    if (!hiddenEntitiesExists) {
      await setEntityData(HIDDEN_ENTITIES_ENTITY_ID, '[]', 'Dashboard Hidden Entities')
    }

    if (!hiddenRoomsExists) {
      await setEntityData(HIDDEN_ROOMS_ENTITY_ID, '[]', 'Dashboard Hidden Rooms')
    }

    if (!customNamesExists) {
      await setEntityData(CUSTOM_NAMES_ENTITY_ID, '{}', 'Dashboard Custom Names')
    }

    syncStatus = { available: true, lastSync: new Date(), error: null }
    return true
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    syncStatus = { available: false, lastSync: null, error: message }
    return false
  }
}

// Load app settings from HA
export async function loadSettingsFromHA(): Promise<AppSettings | null> {
  if (!syncStatus.available) return null

  try {
    const value = await getEntityData(SETTINGS_ENTITY_ID)
    if (!value || value === 'unknown') return null

    const settings = JSON.parse(value) as AppSettings
    syncStatus.lastSync = new Date()
    return settings
  } catch (err) {
    console.warn('Failed to load settings from HA:', err)
    return null
  }
}

// Save app settings to HA
export async function saveSettingsToHA(settings: AppSettings): Promise<boolean> {
  if (!syncStatus.available) return false

  try {
    const value = JSON.stringify(settings)
    const success = await setEntityData(SETTINGS_ENTITY_ID, value, 'Dashboard Settings')
    if (success) {
      syncStatus.lastSync = new Date()
    }
    return success
  } catch (err) {
    console.warn('Failed to save settings to HA:', err)
    return false
  }
}

// Load hidden entities from HA
export async function loadHiddenEntitiesFromHA(): Promise<Set<string> | null> {
  if (!syncStatus.available) return null

  try {
    const value = await getEntityData(HIDDEN_ENTITIES_ENTITY_ID)
    if (!value || value === 'unknown') return null

    const arr = JSON.parse(value) as string[]
    return new Set(arr)
  } catch (err) {
    console.warn('Failed to load hidden entities from HA:', err)
    return null
  }
}

// Save hidden entities to HA
export async function saveHiddenEntitiesToHA(hidden: Set<string>): Promise<boolean> {
  if (!syncStatus.available) return false

  try {
    const value = JSON.stringify([...hidden])
    return await setEntityData(HIDDEN_ENTITIES_ENTITY_ID, value, 'Dashboard Hidden Entities')
  } catch (err) {
    console.warn('Failed to save hidden entities to HA:', err)
    return false
  }
}

// Load hidden rooms from HA
export async function loadHiddenRoomsFromHA(): Promise<Set<string> | null> {
  if (!syncStatus.available) return null

  try {
    const value = await getEntityData(HIDDEN_ROOMS_ENTITY_ID)
    if (!value || value === 'unknown') return null

    const arr = JSON.parse(value) as string[]
    return new Set(arr)
  } catch (err) {
    console.warn('Failed to load hidden rooms from HA:', err)
    return null
  }
}

// Save hidden rooms to HA
export async function saveHiddenRoomsToHA(hidden: Set<string>): Promise<boolean> {
  if (!syncStatus.available) return false

  try {
    const value = JSON.stringify([...hidden])
    return await setEntityData(HIDDEN_ROOMS_ENTITY_ID, value, 'Dashboard Hidden Rooms')
  } catch (err) {
    console.warn('Failed to save hidden rooms to HA:', err)
    return false
  }
}

// Load custom names from HA
export async function loadCustomNamesFromHA(): Promise<Map<string, string> | null> {
  if (!syncStatus.available) return null

  try {
    const value = await getEntityData(CUSTOM_NAMES_ENTITY_ID)
    if (!value || value === 'unknown') return null

    const obj = JSON.parse(value) as Record<string, string>
    return new Map(Object.entries(obj))
  } catch (err) {
    console.warn('Failed to load custom names from HA:', err)
    return null
  }
}

// Save custom names to HA
export async function saveCustomNamesToHA(names: Map<string, string>): Promise<boolean> {
  if (!syncStatus.available) return false

  try {
    const obj = Object.fromEntries(names)
    const value = JSON.stringify(obj)
    return await setEntityData(CUSTOM_NAMES_ENTITY_ID, value, 'Dashboard Custom Names')
  } catch (err) {
    console.warn('Failed to save custom names to HA:', err)
    return false
  }
}

// Load all synced data at once
export interface SyncedData {
  settings: AppSettings | null
  hiddenEntities: Set<string> | null
  hiddenRooms: Set<string> | null
  customNames: Map<string, string> | null
}

export async function loadAllFromHA(): Promise<SyncedData> {
  const [settings, hiddenEntities, hiddenRooms, customNames] = await Promise.all([
    loadSettingsFromHA(),
    loadHiddenEntitiesFromHA(),
    loadHiddenRoomsFromHA(),
    loadCustomNamesFromHA(),
  ])

  return { settings, hiddenEntities, hiddenRooms, customNames }
}
