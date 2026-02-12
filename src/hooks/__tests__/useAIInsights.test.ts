import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

import type { PersonEntity, HAArea } from '../../types/homeAssistant'

// Mock the context
const mockContextValue: {
  sensors: never[]
  binarySensors: never[]
  weather: never[]
  calendars: never[]
  filteredPeople: PersonEntity[]
  lights: never[]
  climate: never[]
  vacuums: never[]
  alarms: never[]
  valves: never[]
  fans: never[]
  locks: never[]
  hiddenEntities: Set<string>
  hiddenRooms: Set<string>
  entityAreaMap: Map<string, string>
  areas: HAArea[]
  settings: {
    primaryWeatherEntity: string | null
    calendarPattern: string
    peoplePattern: string
    aiInsightsEnabled: boolean
    refreshInterval: number
    pinnedEntities: string[]
    pinnedAutomations: string[]
    notificationRecipients: string[]
  }
} = {
  sensors: [],
  binarySensors: [],
  weather: [],
  calendars: [],
  filteredPeople: [],
  lights: [],
  climate: [],
  vacuums: [],
  alarms: [],
  valves: [],
  fans: [],
  locks: [],
  hiddenEntities: new Set<string>(),
  hiddenRooms: new Set<string>(),
  entityAreaMap: new Map<string, string>(),
  areas: [],
  settings: {
    primaryWeatherEntity: null,
    calendarPattern: 'erikson',
    peoplePattern: 'shelby|wayne',
    aiInsightsEnabled: true,
    refreshInterval: 30,
    pinnedEntities: [],
    pinnedAutomations: [],
    notificationRecipients: [],
  },
}

vi.mock('../../context/HomeAssistantContext', () => ({
  useHomeAssistantContext: () => mockContextValue,
}))

// Mock the claude service
const mockGenerateHomeInsights = vi.fn()
const mockIsClaudeConfigured = vi.fn()
const mockBuildHomeContextString = vi.fn()

vi.mock('../../services/claude', () => ({
  generateHomeInsights: (...args: unknown[]) => mockGenerateHomeInsights(...args),
  isClaudeConfigured: () => mockIsClaudeConfigured(),
  fetchWeatherForecast: vi.fn().mockResolvedValue(null),
  getWeatherForEventTime: vi.fn().mockReturnValue(null),
  geocodeAddress: vi.fn().mockResolvedValue(null),
  estimateTravelTime: vi.fn().mockReturnValue(0),
  chatAboutHome: vi.fn().mockResolvedValue(''),
  buildHomeContextString: (...args: unknown[]) => mockBuildHomeContextString(...args),
}))

// Mock homeAssistant service
vi.mock('../../services/homeAssistant', () => ({
  calendarService: {
    getAllEvents: vi.fn().mockResolvedValue([]),
  },
  sendNotification: vi.fn().mockResolvedValue(undefined),
  lightService: {
    turnOn: vi.fn().mockResolvedValue(undefined),
    turnOff: vi.fn().mockResolvedValue(undefined),
    setBrightness: vi.fn().mockResolvedValue(undefined),
  },
}))

// Need to import after mocks are set up
const { useAIInsights } = await import('../../hooks/useAIInsights')

describe('useAIInsights', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsClaudeConfigured.mockReturnValue(true)
    mockGenerateHomeInsights.mockResolvedValue('Test insight')
    mockBuildHomeContextString.mockReturnValue('context')

    // Reset module-level cache by importing fresh
    // The module caches are at module scope, so we need to handle them
  })

  it('concurrency guard: second call while first is pending is a no-op', async () => {
    // Make the first call slow
    let resolveFirst: (value: string) => void
    const firstCallPromise = new Promise<string>((resolve) => {
      resolveFirst = resolve
    })
    mockGenerateHomeInsights.mockReturnValueOnce(firstCallPromise)

    const { result } = renderHook(() => useAIInsights())

    // Start first call
    let firstPromise: Promise<void>
    act(() => {
      firstPromise = result.current.generateInsight(true)
    })

    // Start second call while first is still pending
    act(() => {
      result.current.generateInsight(true)
    })

    // Resolve the first call
    resolveFirst!('First result')
    await act(async () => {
      await firstPromise!
    })

    // Only one call should have been made to the service
    expect(mockGenerateHomeInsights).toHaveBeenCalledTimes(1)
  })

  it('guard resets on error, allowing retry', async () => {
    mockGenerateHomeInsights.mockRejectedValueOnce(new Error('API error'))

    const { result } = renderHook(() => useAIInsights())

    // First call fails
    await act(async () => {
      await result.current.generateInsight(true)
    })

    expect(result.current.error).toBe('API error')

    // Second call should work (guard was reset in finally block)
    mockGenerateHomeInsights.mockResolvedValueOnce('Retry result')
    await act(async () => {
      await result.current.generateInsight(true)
    })

    expect(mockGenerateHomeInsights).toHaveBeenCalledTimes(2)
  })

  it('returns cached insight when within cache duration', async () => {
    mockGenerateHomeInsights.mockResolvedValueOnce('Cached insight')

    const { result } = renderHook(() => useAIInsights())

    // Generate first insight
    await act(async () => {
      await result.current.generateInsight(true)
    })
    expect(result.current.insight).toBe('Cached insight')

    // Call again without force - should use cache
    await act(async () => {
      await result.current.generateInsight(false)
    })

    // Should only have been called once
    expect(mockGenerateHomeInsights).toHaveBeenCalledTimes(1)
  })

  it('force flag bypasses cache', async () => {
    mockGenerateHomeInsights
      .mockResolvedValueOnce('First insight')
      .mockResolvedValueOnce('Second insight')

    const { result } = renderHook(() => useAIInsights())

    await act(async () => {
      await result.current.generateInsight(true)
    })

    await act(async () => {
      await result.current.generateInsight(true)
    })

    expect(mockGenerateHomeInsights).toHaveBeenCalledTimes(2)
  })

  it('cache invalidated when people status changes', async () => {
    mockGenerateHomeInsights
      .mockResolvedValueOnce('First insight')
      .mockResolvedValueOnce('Second insight')

    const { result, rerender } = renderHook(() => useAIInsights())

    await act(async () => {
      await result.current.generateInsight(true)
    })

    // Change people status
    mockContextValue.filteredPeople = [
      {
        entity_id: 'person.wayne',
        state: 'home',
        attributes: { friendly_name: 'Wayne' },
        last_changed: '',
        last_updated: '',
      },
    ]
    rerender()

    await act(async () => {
      await result.current.generateInsight(false)
    })

    expect(mockGenerateHomeInsights).toHaveBeenCalledTimes(2)

    // Clean up
    mockContextValue.filteredPeople = []
  })

  it('cache invalidated when visibility hash changes', async () => {
    mockGenerateHomeInsights
      .mockResolvedValueOnce('First insight')
      .mockResolvedValueOnce('Second insight')

    const { result, rerender } = renderHook(() => useAIInsights())

    await act(async () => {
      await result.current.generateInsight(true)
    })

    // Change hidden entities count
    mockContextValue.hiddenEntities = new Set(['light.hidden1'])
    rerender()

    await act(async () => {
      await result.current.generateInsight(false)
    })

    expect(mockGenerateHomeInsights).toHaveBeenCalledTimes(2)

    // Clean up
    mockContextValue.hiddenEntities = new Set()
  })

  it('shows config message when Claude is not configured', async () => {
    mockIsClaudeConfigured.mockReturnValue(false)

    const { result } = renderHook(() => useAIInsights())

    await act(async () => {
      await result.current.generateInsight()
    })

    expect(result.current.insight).toBe('Add your Anthropic API key to enable AI insights.')
    expect(mockGenerateHomeInsights).not.toHaveBeenCalled()
  })
})
