import { useCallback } from 'react'
import { useHomeAssistantContext } from '../context/HomeAssistantContext'
import { callService, triggerWebhook as triggerWebhookService } from '../services/homeAssistant'
import type { ServiceCallData } from '../types/homeAssistant'

/**
 * Hook for interacting with Home Assistant services and webhooks
 */
export function useHomeAssistant() {
  const context = useHomeAssistantContext()

  /**
   * Call a Home Assistant service
   */
  const callServiceAction = useCallback(
    async (domain: string, service: string, data: ServiceCallData) => {
      try {
        const result = await callService(domain, service, data)
        // Refresh to get updated state
        await context.refresh()
        return result
      } catch (error) {
        console.error(`Failed to call service ${domain}.${service}:`, error)
        throw error
      }
    },
    [context]
  )

  /**
   * Trigger a webhook
   */
  const triggerWebhook = useCallback(async (webhookId: string) => {
    try {
      await triggerWebhookService(webhookId)
    } catch (error) {
      console.error(`Failed to trigger webhook ${webhookId}:`, error)
      throw error
    }
  }, [])

  /**
   * Get an entity by ID
   */
  const getEntity = useCallback(
    (entityId: string) => {
      return context.entities.find((e) => e.entity_id === entityId)
    },
    [context.entities]
  )

  /**
   * Get entities by domain (e.g., 'light', 'switch', 'scene')
   */
  const getEntitiesByDomain = useCallback(
    (domain: string) => {
      return context.entities.filter((e) => e.entity_id.startsWith(`${domain}.`))
    },
    [context.entities]
  )

  return {
    // State
    connectionStatus: context.connectionStatus,
    entities: context.entities,
    error: context.error,
    lastUpdated: context.lastUpdated,
    configured: context.configured,

    // Actions
    connect: context.connect,
    refresh: context.refresh,
    callService: callServiceAction,
    triggerWebhook,

    // Helpers
    getEntity,
    getEntitiesByDomain,
  }
}
