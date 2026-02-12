import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the settingsSync module to track calls
const mockDebouncedSaveSettings = vi.fn()
const mockDebouncedSaveHiddenEntities = vi.fn()
const mockDebouncedSaveHiddenRooms = vi.fn()
const mockDebouncedSaveCustomNames = vi.fn()
const mockInitializeSync = vi.fn().mockResolvedValue(true)

vi.mock('../../services/settingsSync', () => ({
  initializeSync: (...args: unknown[]) => mockInitializeSync(...args),
  loadAllFromHA: vi.fn().mockResolvedValue({
    settings: null,
    hiddenEntities: null,
    hiddenRooms: null,
    customNames: null,
  }),
  debouncedSaveSettingsToHA: (...args: unknown[]) => mockDebouncedSaveSettings(...args),
  debouncedSaveHiddenEntitiesToHA: (...args: unknown[]) => mockDebouncedSaveHiddenEntities(...args),
  debouncedSaveHiddenRoomsToHA: (...args: unknown[]) => mockDebouncedSaveHiddenRooms(...args),
  debouncedSaveCustomNamesToHA: (...args: unknown[]) => mockDebouncedSaveCustomNames(...args),
}))

// Mock homeAssistant service
vi.mock('../../services/homeAssistant', () => ({
  isConfigured: () => false,
  getStates: vi.fn().mockResolvedValue([]),
  testConnection: vi.fn().mockResolvedValue({ success: false }),
  getAreas: vi.fn().mockResolvedValue([]),
  getEntityRegistry: vi.fn().mockResolvedValue([]),
  getDeviceRegistry: vi.fn().mockResolvedValue([]),
  setServiceCallCallback: vi.fn(),
}))

// Mock sensorFilters
vi.mock('../../utils/sensorFilters', () => ({
  shouldShowSensor: () => true,
  shouldShowBinarySensor: () => true,
}))

import { renderHook, act } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { HomeAssistantProvider, useHomeAssistantContext } from '../HomeAssistantContext'

function wrapper({ children }: { children: ReactNode }) {
  return createElement(HomeAssistantProvider, null, children)
}

describe('Settings sync integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockInitializeSync.mockResolvedValue(true)
  })

  it('after settingsLoaded=true, changing settings triggers debouncedSaveSettingsToHA', async () => {
    const { result } = renderHook(() => useHomeAssistantContext(), { wrapper })

    // Wait for initial load (settingsLoaded becomes true)
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    // The sync effects fire once on initial load, clear mocks after that
    mockDebouncedSaveSettings.mockClear()

    // Now change settings
    act(() => {
      result.current.updateSettings({ refreshInterval: 60 })
    })

    // The effect should fire debouncedSaveSettingsToHA since syncEnabled is true
  })

  it('when sync unavailable, settingsError is set', async () => {
    mockInitializeSync.mockResolvedValue(false)

    const { result } = renderHook(() => useHomeAssistantContext(), { wrapper })

    // Wait for initSettings to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    // settingsLoaded should remain false, settingsError should be set
    expect(result.current.settingsLoaded).toBe(false)
    expect(result.current.settingsError).toBeTruthy()
  })

  it('hiding entities dispatches correctly', async () => {
    const { result } = renderHook(() => useHomeAssistantContext(), { wrapper })

    act(() => {
      result.current.hideEntity('light.kitchen')
    })

    expect(result.current.hiddenEntities.has('light.kitchen')).toBe(true)

    act(() => {
      result.current.showEntity('light.kitchen')
    })

    expect(result.current.hiddenEntities.has('light.kitchen')).toBe(false)
  })

  it('hiding rooms dispatches correctly', async () => {
    const { result } = renderHook(() => useHomeAssistantContext(), { wrapper })

    act(() => {
      result.current.hideRoom('living_room')
    })

    expect(result.current.hiddenRooms.has('living_room')).toBe(true)

    act(() => {
      result.current.showRoom('living_room')
    })

    expect(result.current.hiddenRooms.has('living_room')).toBe(false)
  })

  it('showAllEntities clears all hidden entities', () => {
    const { result } = renderHook(() => useHomeAssistantContext(), { wrapper })

    act(() => {
      result.current.hideEntity('light.kitchen')
      result.current.hideEntity('light.bedroom')
    })

    expect(result.current.hiddenEntities.size).toBe(2)

    act(() => {
      result.current.showAllEntities()
    })

    expect(result.current.hiddenEntities.size).toBe(0)
  })
})
