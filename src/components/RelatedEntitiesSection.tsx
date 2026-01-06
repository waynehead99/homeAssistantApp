import { useState } from 'react'
import { useHomeAssistantContext, type RelatedEntity } from '../context/HomeAssistantContext'
import { lightService, switchService, callService } from '../services/homeAssistant'
import type { LightEntity, SwitchEntity, FanEntity, ValveEntity, LockEntity } from '../types/homeAssistant'

interface RelatedEntitiesSectionProps {
  entityId: string
}

export function RelatedEntitiesSection({ entityId }: RelatedEntitiesSectionProps) {
  const { getRelatedEntities, getDeviceName, updateEntity, getDisplayName } = useHomeAssistantContext()
  const [loadingEntities, setLoadingEntities] = useState<Set<string>>(new Set())

  const relatedEntities = getRelatedEntities(entityId)
  const deviceName = getDeviceName(entityId)

  if (relatedEntities.length === 0) return null

  // Filter to only show controllable entities (not sensors)
  const controllableEntities = relatedEntities.filter(
    r => ['light', 'switch', 'fan', 'valve', 'lock'].includes(r.entityType)
  )

  if (controllableEntities.length === 0) return null

  const handleToggle = async (related: RelatedEntity) => {
    const entity = related.entity
    const entityIdToToggle = entity.entity_id
    setLoadingEntities(prev => new Set(prev).add(entityIdToToggle))

    try {
      switch (related.entityType) {
        case 'light': {
          const light = entity as LightEntity
          const isOn = light.state === 'on'
          updateEntity({ ...light, state: isOn ? 'off' : 'on' })
          if (isOn) {
            await lightService.turnOff(entityIdToToggle)
          } else {
            await lightService.turnOn(entityIdToToggle)
          }
          break
        }
        case 'switch': {
          const sw = entity as SwitchEntity
          const isOn = sw.state === 'on'
          updateEntity({ ...sw, state: isOn ? 'off' : 'on' })
          if (isOn) {
            await switchService.turnOff(entityIdToToggle)
          } else {
            await switchService.turnOn(entityIdToToggle)
          }
          break
        }
        case 'fan': {
          const fan = entity as FanEntity
          const isOn = fan.state === 'on'
          updateEntity({ ...fan, state: isOn ? 'off' : 'on' })
          await callService('fan', isOn ? 'turn_off' : 'turn_on', { entity_id: entityIdToToggle })
          break
        }
        case 'valve': {
          const valve = entity as ValveEntity
          const isOpen = valve.state === 'open'
          updateEntity({ ...valve, state: isOpen ? 'closed' : 'open' })
          await callService('valve', isOpen ? 'close_valve' : 'open_valve', { entity_id: entityIdToToggle })
          break
        }
        case 'lock': {
          const lock = entity as LockEntity
          const isLocked = lock.state === 'locked'
          updateEntity({ ...lock, state: isLocked ? 'unlocking' : 'locking' })
          await callService('lock', isLocked ? 'unlock' : 'lock', { entity_id: entityIdToToggle })
          updateEntity({ ...lock, state: isLocked ? 'unlocked' : 'locked' })
          break
        }
      }
    } catch (error) {
      // Revert on error
      updateEntity(entity)
      console.error('Failed to toggle entity:', error)
    } finally {
      setLoadingEntities(prev => {
        const next = new Set(prev)
        next.delete(entityIdToToggle)
        return next
      })
    }
  }

  const getIcon = (entityType: RelatedEntity['entityType']) => {
    switch (entityType) {
      case 'light': return '💡'
      case 'switch': return '🔌'
      case 'fan': return '🌀'
      case 'valve': return '💧'
      case 'lock': return '🔒'
      default: return '📦'
    }
  }

  const getStateText = (related: RelatedEntity) => {
    switch (related.entityType) {
      case 'light':
      case 'switch':
      case 'fan':
        return related.entity.state === 'on' ? 'On' : 'Off'
      case 'valve':
        return related.entity.state === 'open' ? 'Open' : 'Closed'
      case 'lock':
        const lockState = related.entity.state
        if (lockState === 'locked') return 'Locked'
        if (lockState === 'unlocked') return 'Unlocked'
        if (lockState === 'jammed') return 'Jammed'
        if (lockState === 'locking') return 'Locking...'
        if (lockState === 'unlocking') return 'Unlocking...'
        return lockState
      default:
        return related.entity.state
    }
  }

  const isActive = (related: RelatedEntity) => {
    switch (related.entityType) {
      case 'light':
      case 'switch':
      case 'fan':
        return related.entity.state === 'on'
      case 'valve':
        return related.entity.state === 'open'
      case 'lock':
        return related.entity.state === 'locked'
      default:
        return false
    }
  }

  return (
    <div className="mt-6 pt-4 border-t border-slate-700">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-medium text-slate-400">Related</span>
        {deviceName && (
          <span className="text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded">
            {deviceName}
          </span>
        )}
      </div>
      <div className="space-y-2">
        {controllableEntities.map(related => {
          const name = getDisplayName(
            related.entity.entity_id,
            related.entity.attributes.friendly_name || related.entity.entity_id.split('.')[1].replace(/_/g, ' ')
          )
          const active = isActive(related)
          const loading = loadingEntities.has(related.entity.entity_id)

          return (
            <div
              key={related.entity.entity_id}
              className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                active ? 'bg-slate-700/50' : 'bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{getIcon(related.entityType)}</span>
                <div>
                  <p className="text-sm font-medium text-white">{name}</p>
                  <p className="text-xs text-slate-400">{getStateText(related)}</p>
                </div>
              </div>
              <button
                onClick={() => handleToggle(related)}
                disabled={loading}
                className={`w-12 h-7 rounded-full transition-colors relative ${
                  active ? 'bg-blue-500' : 'bg-slate-600'
                } ${loading ? 'opacity-50' : ''}`}
              >
                <div
                  className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    active ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
