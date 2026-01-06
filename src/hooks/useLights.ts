import { useCallback, useMemo } from 'react'
import { useHomeAssistantContext } from '../context/HomeAssistantContext'
import { lightService } from '../services/homeAssistant'
import type { LightEntity } from '../types/homeAssistant'

/**
 * Hook for working with light entities
 */
export function useLights() {
  const { lights, updateEntity, refresh } = useHomeAssistantContext()

  /**
   * Get a specific light by entity ID
   */
  const getLight = useCallback(
    (entityId: string): LightEntity | undefined => {
      return lights.find((l) => l.entity_id === entityId)
    },
    [lights]
  )

  /**
   * Turn on a light
   */
  const turnOn = useCallback(
    async (entityId: string, brightness?: number) => {
      const light = getLight(entityId)
      if (!light) return

      // Optimistic update
      updateEntity({
        ...light,
        state: 'on',
        attributes: {
          ...light.attributes,
          ...(brightness !== undefined && { brightness }),
        },
      })

      try {
        await lightService.turnOn(entityId, brightness)
      } catch (error) {
        // Revert on error
        updateEntity(light)
        throw error
      }
    },
    [getLight, updateEntity]
  )

  /**
   * Turn off a light
   */
  const turnOff = useCallback(
    async (entityId: string) => {
      const light = getLight(entityId)
      if (!light) return

      // Optimistic update
      updateEntity({
        ...light,
        state: 'off',
      })

      try {
        await lightService.turnOff(entityId)
      } catch (error) {
        // Revert on error
        updateEntity(light)
        throw error
      }
    },
    [getLight, updateEntity]
  )

  /**
   * Toggle a light
   */
  const toggle = useCallback(
    async (entityId: string) => {
      const light = getLight(entityId)
      if (!light) return

      const newState = light.state === 'on' ? 'off' : 'on'

      // Optimistic update
      updateEntity({
        ...light,
        state: newState,
      })

      try {
        await lightService.toggle(entityId)
      } catch (error) {
        // Revert on error
        updateEntity(light)
        throw error
      }
    },
    [getLight, updateEntity]
  )

  /**
   * Set brightness (0-100%)
   */
  const setBrightness = useCallback(
    async (entityId: string, brightnessPct: number) => {
      const light = getLight(entityId)
      if (!light) return

      const brightness255 = Math.round((brightnessPct / 100) * 255)

      // Optimistic update
      updateEntity({
        ...light,
        state: brightnessPct > 0 ? 'on' : 'off',
        attributes: {
          ...light.attributes,
          brightness: brightness255,
        },
      })

      try {
        await lightService.setBrightness(entityId, brightnessPct)
      } catch (error) {
        // Revert on error
        updateEntity(light)
        throw error
      }
    },
    [getLight, updateEntity]
  )

  /**
   * Turn on all lights
   */
  const turnOnAll = useCallback(async () => {
    const offLights = lights.filter((l) => l.state === 'off')
    await Promise.all(offLights.map((l) => turnOn(l.entity_id)))
  }, [lights, turnOn])

  /**
   * Turn off all lights
   */
  const turnOffAll = useCallback(async () => {
    const onLights = lights.filter((l) => l.state === 'on')
    await Promise.all(onLights.map((l) => turnOff(l.entity_id)))
  }, [lights, turnOff])

  /**
   * Stats about lights
   */
  const stats = useMemo(
    () => ({
      total: lights.length,
      on: lights.filter((l) => l.state === 'on').length,
      off: lights.filter((l) => l.state === 'off').length,
    }),
    [lights]
  )

  return {
    // State
    lights,
    stats,

    // Actions
    getLight,
    turnOn,
    turnOff,
    toggle,
    setBrightness,
    turnOnAll,
    turnOffAll,
    refresh,
  }
}
