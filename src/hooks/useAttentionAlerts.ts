// Hook for managing attention alerts
import { useEffect, useCallback, useState } from 'react'
import { useHomeAssistantContext } from '../context/HomeAssistantContext'
import {
  checkAttentionItems,
  sendAttentionAlerts,
  shouldRunCheck,
  markCheckComplete,
  getMinutesUntilNextCheck,
  type AttentionItem,
} from '../services/attentionAlerts'

export function useAttentionAlerts() {
  const {
    sensors,
    binarySensors,
    climate,
    weather,
    calendars,
    settings,
  } = useHomeAssistantContext()

  const [lastCheckItems, setLastCheckItems] = useState<AttentionItem[]>([])
  const [checking, setChecking] = useState(false)
  const [minutesUntilNextCheck, setMinutesUntilNextCheck] = useState(getMinutesUntilNextCheck())

  // Build context for attention checks
  const getContext = useCallback(() => ({
    sensors,
    binarySensors,
    climate,
    weather,
    calendars,
    settings,
  }), [sensors, binarySensors, climate, weather, calendars, settings])

  // Run attention check and send notifications
  const runCheck = useCallback(async () => {
    const recipients = settings.notificationRecipients || []
    if (recipients.length === 0) return

    setChecking(true)
    try {
      const result = await sendAttentionAlerts(getContext())
      setLastCheckItems(result.items)
      // Always mark complete after checking, even if nothing was sent
      markCheckComplete()
      setMinutesUntilNextCheck(getMinutesUntilNextCheck())
    } catch (error) {
      console.error('Attention check failed:', error)
    } finally {
      setChecking(false)
    }
  }, [getContext, settings.notificationRecipients])

  // Test function - runs check without respecting interval
  const testAlerts = useCallback(async (): Promise<{
    success: boolean
    itemCount: number
    items: AttentionItem[]
    message: string
  }> => {
    const recipients = settings.notificationRecipients || []
    if (recipients.length === 0) {
      return {
        success: false,
        itemCount: 0,
        items: [],
        message: 'No notification recipients configured',
      }
    }

    setChecking(true)
    try {
      // First check what items exist
      const items = await checkAttentionItems(getContext())

      if (items.length === 0) {
        // No real items, send a test notification
        const { sendNotification } = await import('../services/homeAssistant')
        await sendNotification(
          recipients,
          '✅ Attention Alerts Test',
          'Your attention alerts are working! No items currently need attention.',
          { tag: 'attention-test', group: 'home-attention' }
        )
        return {
          success: true,
          itemCount: 0,
          items: [],
          message: 'Test notification sent - no items need attention',
        }
      }

      // There are actual items, send them
      const result = await sendAttentionAlerts(getContext())
      setLastCheckItems(result.items)
      markCheckComplete()

      return {
        success: true,
        itemCount: result.itemCount,
        items: result.items,
        message: `Sent ${result.itemCount} attention alert${result.itemCount !== 1 ? 's' : ''}`,
      }
    } catch (error) {
      console.error('Test alerts failed:', error)
      return {
        success: false,
        itemCount: 0,
        items: [],
        message: error instanceof Error ? error.message : 'Failed to send test alerts',
      }
    } finally {
      setChecking(false)
    }
  }, [getContext, settings.notificationRecipients])

  // Preview what items would be sent (without sending)
  const previewItems = useCallback(async (): Promise<AttentionItem[]> => {
    try {
      return await checkAttentionItems(getContext())
    } catch (error) {
      console.error('Preview failed:', error)
      return []
    }
  }, [getContext])

  // Set up hourly check interval
  useEffect(() => {
    const recipients = settings.notificationRecipients || []
    if (recipients.length === 0) return

    // Update the countdown display immediately
    setMinutesUntilNextCheck(getMinutesUntilNextCheck())

    // Check if we're due for a check (e.g., app was closed for a while)
    if (shouldRunCheck()) {
      runCheck()
    }

    // Set up interval to check every minute if it's time for hourly check
    const intervalId = setInterval(() => {
      setMinutesUntilNextCheck(getMinutesUntilNextCheck())

      if (shouldRunCheck()) {
        runCheck()
      }
    }, 60 * 1000) // Check every minute

    return () => clearInterval(intervalId)
  }, [runCheck, settings.notificationRecipients])

  return {
    checking,
    lastCheckItems,
    minutesUntilNextCheck,
    testAlerts,
    previewItems,
    runCheck,
  }
}
