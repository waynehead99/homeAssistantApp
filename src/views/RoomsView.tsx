import { useState } from 'react'
import { useHomeAssistantContext } from '../context/HomeAssistantContext'
import { LightCard } from '../components/LightCard'
import { SwitchCard } from '../components/SwitchCard'
import { lightService, callService } from '../services/homeAssistant'
import { EntityControlModal } from '../components/EntityControlModal'
import { ClimateControls } from '../components/ClimateControls'
import { VacuumControls } from '../components/VacuumControls'
import { AlarmControls } from '../components/AlarmControls'
import { FanControls } from '../components/FanControls'
import { LockControls } from '../components/LockControls'
import { CoverControls } from '../components/CoverControls'
import { RelatedEntitiesSection } from '../components/RelatedEntitiesSection'
import type { ClimateEntity, VacuumEntity, AlarmEntity, FanEntity, ValveEntity, LockEntity, CoverEntity } from '../types/homeAssistant'

type ModalEntity =
  | { type: 'climate'; entity: ClimateEntity }
  | { type: 'vacuum'; entity: VacuumEntity }
  | { type: 'alarm'; entity: AlarmEntity }
  | { type: 'fan'; entity: FanEntity }
  | { type: 'lock'; entity: LockEntity }
  | { type: 'cover'; entity: CoverEntity }
  | null

// Edit name modal component
function EditNameModal({
  isOpen,
  currentName,
  onSave,
  onCancel,
  onReset,
  title
}: {
  isOpen: boolean
  currentName: string
  onSave: (name: string) => void
  onCancel: () => void
  onReset?: () => void
  title: string
}) {
  const [name, setName] = useState(currentName)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-card p-6 w-full max-w-sm shadow-glass-lg">
        <h3 className="text-lg font-semibold text-white mb-4 text-shadow">{title}</h3>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full glass-panel border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          placeholder="Enter custom name"
          autoFocus
        />
        <div className="flex gap-3 mt-6">
          <button
            onClick={onCancel}
            className="flex-1 py-3 glass-button text-white font-medium rounded-xl transition-all"
          >
            Cancel
          </button>
          {onReset && (
            <button
              onClick={onReset}
              className="py-3 px-4 glass-button text-slate-300 font-medium rounded-xl transition-all"
            >
              Reset
            </button>
          )}
          <button
            onClick={() => onSave(name)}
            className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-blue-400 hover:to-cyan-300 text-white font-medium rounded-xl transition-all shadow-lg shadow-blue-500/30"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

export function RoomsView() {
  const {
    entitiesByArea,
    editMode,
    setEditMode,
    hiddenEntities,
    hiddenRooms,
    customNames,
    showEntity,
    hideEntity,
    hideRoom,
    showRoom,
    setCustomName,
    removeCustomName,
    getDisplayName,
    updateEntity
  } = useHomeAssistantContext()

  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set())
  const [editingName, setEditingName] = useState<{ id: string; defaultName: string; type: 'room' | 'device' } | null>(null)
  const [modalEntity, setModalEntity] = useState<ModalEntity>(null)
  const [loadingEntities, setLoadingEntities] = useState<Set<string>>(new Set())

  const toggleRoom = (areaName: string) => {
    setExpandedRooms(prev => {
      const next = new Set(prev)
      if (next.has(areaName)) {
        next.delete(areaName)
      } else {
        next.add(areaName)
      }
      return next
    })
  }

  const handleHide = editMode ? hideEntity : undefined

  // Get temperature and humidity for an area
  const getAreaClimate = (sensors: typeof entitiesByArea[0]['sensors']) => {
    const tempSensor = sensors.find(s => s.attributes.device_class === 'temperature')
    const humiditySensor = sensors.find(s => s.attributes.device_class === 'humidity')

    return {
      temp: tempSensor ? `${Math.round(parseFloat(tempSensor.state))}°` : null,
      humidity: humiditySensor ? `${Math.round(parseFloat(humiditySensor.state))}%` : null,
    }
  }

  // Room controls
  const turnAllLightsOn = async (areaLights: typeof entitiesByArea[0]['lights']) => {
    for (const light of areaLights) {
      if (light.state === 'off') {
        updateEntity({ ...light, state: 'on' })
        lightService.turnOn(light.entity_id).catch(() => updateEntity(light))
      }
    }
  }

  const turnAllLightsOff = async (areaLights: typeof entitiesByArea[0]['lights']) => {
    for (const light of areaLights) {
      if (light.state === 'on') {
        updateEntity({ ...light, state: 'off' })
        lightService.turnOff(light.entity_id).catch(() => updateEntity(light))
      }
    }
  }

  const handleSaveName = (name: string) => {
    if (editingName && name.trim()) {
      setCustomName(editingName.id, name.trim())
    }
    setEditingName(null)
  }

  const handleResetName = () => {
    if (editingName) {
      removeCustomName(editingName.id)
    }
    setEditingName(null)
  }

  // Handle valve toggle
  const handleValveToggle = async (valve: ValveEntity) => {
    const entityId = valve.entity_id
    setLoadingEntities(prev => new Set(prev).add(entityId))
    try {
      const isOpen = valve.state === 'open'
      updateEntity({ ...valve, state: isOpen ? 'closed' : 'open' })
      await callService('valve', isOpen ? 'close_valve' : 'open_valve', { entity_id: entityId })
    } catch (error) {
      updateEntity(valve)
      console.error('Failed to toggle valve:', error)
    } finally {
      setLoadingEntities(prev => {
        const next = new Set(prev)
        next.delete(entityId)
        return next
      })
    }
  }

  // Get modal title
  const getModalTitle = () => {
    if (!modalEntity) return ''
    const entity = modalEntity.entity
    return getDisplayName(
      entity.entity_id,
      entity.attributes.friendly_name || entity.entity_id.split('.')[1].replace(/_/g, ' ')
    )
  }

  return (
    <div className="space-y-2 pb-20">
      {/* Edit Name Modal */}
      <EditNameModal
        isOpen={editingName !== null}
        currentName={editingName ? getDisplayName(editingName.id, editingName.defaultName) : ''}
        onSave={handleSaveName}
        onCancel={() => setEditingName(null)}
        onReset={editingName && customNames.has(editingName.id) ? handleResetName : undefined}
        title={editingName?.type === 'room' ? 'Edit Room Name' : 'Edit Device Name'}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white text-shadow">Rooms</h2>
        <button
          onClick={() => setEditMode(!editMode)}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-300 ${
            editMode
              ? 'bg-gradient-to-r from-blue-500 to-cyan-400 text-white shadow-lg shadow-blue-500/30'
              : 'glass-button text-slate-300'
          }`}
        >
          {editMode ? 'Done' : 'Edit'}
        </button>
      </div>

      {/* Edit mode hint */}
      {editMode && (
        <div className="glass-card bg-blue-500/10 p-3 mb-4 glow-blue">
          <p className="text-sm text-blue-300">
            Tap names to edit • Tap hide icons to hide rooms/devices
          </p>
        </div>
      )}

      {/* Room List */}
      {entitiesByArea.map(({ area, areaName, lights, switches, sensors, climate, vacuums, alarms, valves, fans, locks, covers }) => {
        const roomId = area?.area_id || 'unassigned'
        const isHidden = hiddenRooms.has(roomId)
        const isExpanded = expandedRooms.has(areaName)
        const climateInfo = getAreaClimate(sensors)
        const lightsOn = lights.filter(l => l.state === 'on').length
        const switchesOn = switches.filter(s => s.state === 'on').length
        const totalDevices = lights.length + switches.length + climate.length + vacuums.length + alarms.length + valves.length + fans.length + locks.length + covers.length
        const hasDevices = totalDevices > 0
        const displayName = getDisplayName(roomId, areaName)

        return (
          <div
            key={areaName}
            className={`glass-card overflow-hidden transition-all duration-300 ${isHidden ? 'opacity-50' : ''}`}
          >
            {/* Room Header - always visible */}
            <div className="flex items-center">
              <button
                onClick={() => toggleRoom(areaName)}
                className="flex-1 p-4 flex items-center justify-between hover:bg-white/5 transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  {/* Room icon */}
                  <div className="w-10 h-10 glass-panel rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                    </svg>
                  </div>

                  <div className="text-left">
                    {/* Room name - editable in edit mode */}
                    {editMode ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingName({ id: roomId, defaultName: areaName, type: 'room' })
                        }}
                        className="font-medium text-white hover:text-blue-400 transition-colors flex items-center gap-1"
                      >
                        {displayName}
                        <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                        </svg>
                      </button>
                    ) : (
                      <h3 className="font-medium text-white">{displayName}</h3>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                      {(lightsOn + switchesOn) > 0 && (
                        <span className="text-blue-400">{lightsOn + switchesOn} on</span>
                      )}
                      {hasDevices && (lightsOn + switchesOn) > 0 && (
                        <span className="text-slate-600">·</span>
                      )}
                      {hasDevices && (
                        <span className="text-slate-500">
                          {lights.length + switches.length} device{lights.length + switches.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Climate data + chevron */}
                <div className="flex items-center gap-4">
                  {(climateInfo.temp || climateInfo.humidity) && (
                    <div className="flex items-center gap-3 text-sm">
                      {climateInfo.temp && (
                        <span className="text-orange-400 font-medium">{climateInfo.temp}</span>
                      )}
                      {climateInfo.humidity && (
                        <span className="text-blue-400">{climateInfo.humidity}</span>
                      )}
                    </div>
                  )}
                  <svg
                    className={`w-5 h-5 text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </div>
              </button>

              {/* Hide/Show room button in edit mode */}
              {editMode && (
                <button
                  onClick={() => isHidden ? showRoom(roomId) : hideRoom(roomId)}
                  className={`p-4 hover:bg-slate-700/50 transition-colors ${isHidden ? 'text-green-400' : 'text-slate-400 hover:text-red-400'}`}
                  title={isHidden ? 'Show room' : 'Hide room'}
                >
                  {isHidden ? (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  )}
                </button>
              )}
            </div>

            {/* Expanded Content */}
            {isExpanded && hasDevices && (
              <div className="px-4 pb-4 space-y-3 border-t border-white/5">
                {/* Room controls */}
                {lights.length > 0 && (
                  <div className="flex items-center justify-end gap-2 pt-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); turnAllLightsOn(lights) }}
                      disabled={lightsOn === lights.length}
                      className="px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
                    >
                      All On
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); turnAllLightsOff(lights) }}
                      disabled={lightsOn === 0}
                      className="px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg text-white transition-colors"
                    >
                      All Off
                    </button>
                  </div>
                )}

                {/* Devices */}
                <div className="space-y-2">
                  {lights.map(light => {
                    const isDeviceHidden = hiddenEntities.has(light.entity_id)
                    const deviceName = getDisplayName(light.entity_id, light.attributes.friendly_name || light.entity_id)

                    return (
                      <div key={light.entity_id} className="relative">
                        {editMode && isDeviceHidden && (
                          <div
                            className="absolute inset-0 bg-slate-900/80 rounded-xl z-10 flex items-center justify-center cursor-pointer"
                            onClick={() => showEntity(light.entity_id)}
                          >
                            <span className="text-sm text-slate-400">Hidden - tap to show</span>
                          </div>
                        )}
                        <LightCard
                          light={{ ...light, attributes: { ...light.attributes, friendly_name: deviceName } }}
                          onHide={handleHide}
                          onEditName={editMode ? () => setEditingName({
                            id: light.entity_id,
                            defaultName: light.attributes.friendly_name || light.entity_id,
                            type: 'device'
                          }) : undefined}
                        />
                      </div>
                    )
                  })}

                  {switches.map(sw => {
                    const isDeviceHidden = hiddenEntities.has(sw.entity_id)
                    const deviceName = getDisplayName(sw.entity_id, sw.attributes.friendly_name || sw.entity_id)

                    return (
                      <div key={sw.entity_id} className="relative">
                        {editMode && isDeviceHidden && (
                          <div
                            className="absolute inset-0 bg-slate-900/80 rounded-xl z-10 flex items-center justify-center cursor-pointer"
                            onClick={() => showEntity(sw.entity_id)}
                          >
                            <span className="text-sm text-slate-400">Hidden - tap to show</span>
                          </div>
                        )}
                        <SwitchCard
                          entity={{ ...sw, attributes: { ...sw.attributes, friendly_name: deviceName } }}
                          onHide={handleHide}
                          onEditName={editMode ? () => setEditingName({
                            id: sw.entity_id,
                            defaultName: sw.attributes.friendly_name || sw.entity_id,
                            type: 'device'
                          }) : undefined}
                        />
                      </div>
                    )
                  })}

                  {/* Climate/HVAC entities */}
                  {climate.map(entity => {
                    const isDeviceHidden = hiddenEntities.has(entity.entity_id)
                    const deviceName = getDisplayName(entity.entity_id, entity.attributes.friendly_name || entity.entity_id)
                    const isActive = entity.state !== 'off'

                    return (
                      <div key={entity.entity_id} className="relative">
                        {editMode && isDeviceHidden && (
                          <div
                            className="absolute inset-0 bg-slate-900/80 rounded-xl z-10 flex items-center justify-center cursor-pointer"
                            onClick={() => showEntity(entity.entity_id)}
                          >
                            <span className="text-sm text-slate-400">Hidden - tap to show</span>
                          </div>
                        )}
                        <button
                          onClick={() => setModalEntity({ type: 'climate', entity })}
                          className={`w-full p-4 rounded-xl flex items-center justify-between transition-all ${
                            isActive ? 'bg-orange-500/20 border border-orange-500/30' : 'bg-slate-700/50 hover:bg-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              isActive ? 'bg-orange-500/30' : 'bg-slate-600'
                            }`}>
                              <span className="text-xl">🌡️</span>
                            </div>
                            <div className="text-left">
                              <p className="text-white font-medium">{deviceName}</p>
                              <p className="text-sm text-slate-400">
                                {entity.state}
                                {entity.attributes.current_temperature && ` • ${entity.attributes.current_temperature}°`}
                                {entity.attributes.temperature && ` → ${entity.attributes.temperature}°`}
                              </p>
                            </div>
                          </div>
                          {editMode && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                isDeviceHidden ? showEntity(entity.entity_id) : hideEntity(entity.entity_id)
                              }}
                              className={`p-2 rounded-lg ${isDeviceHidden ? 'text-green-400' : 'text-slate-400 hover:text-red-400'}`}
                            >
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                                {isDeviceHidden ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178zM15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                )}
                              </svg>
                            </button>
                          )}
                        </button>
                      </div>
                    )
                  })}

                  {/* Vacuum entities */}
                  {vacuums.map(entity => {
                    const isDeviceHidden = hiddenEntities.has(entity.entity_id)
                    const deviceName = getDisplayName(entity.entity_id, entity.attributes.friendly_name || entity.entity_id)
                    const isActive = ['cleaning', 'returning'].includes(entity.state)

                    return (
                      <div key={entity.entity_id} className="relative">
                        {editMode && isDeviceHidden && (
                          <div
                            className="absolute inset-0 bg-slate-900/80 rounded-xl z-10 flex items-center justify-center cursor-pointer"
                            onClick={() => showEntity(entity.entity_id)}
                          >
                            <span className="text-sm text-slate-400">Hidden - tap to show</span>
                          </div>
                        )}
                        <button
                          onClick={() => setModalEntity({ type: 'vacuum', entity })}
                          className={`w-full p-4 rounded-xl flex items-center justify-between transition-all ${
                            isActive ? 'bg-green-500/20 border border-green-500/30' : 'bg-slate-700/50 hover:bg-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              isActive ? 'bg-green-500/30' : 'bg-slate-600'
                            }`}>
                              <span className="text-xl">🤖</span>
                            </div>
                            <div className="text-left">
                              <p className="text-white font-medium">{deviceName}</p>
                              <p className="text-sm text-slate-400">
                                {entity.state}
                                {entity.attributes.battery_level !== undefined && ` • ${entity.attributes.battery_level}% battery`}
                              </p>
                            </div>
                          </div>
                          {editMode && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                isDeviceHidden ? showEntity(entity.entity_id) : hideEntity(entity.entity_id)
                              }}
                              className={`p-2 rounded-lg ${isDeviceHidden ? 'text-green-400' : 'text-slate-400 hover:text-red-400'}`}
                            >
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                                {isDeviceHidden ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178zM15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                )}
                              </svg>
                            </button>
                          )}
                        </button>
                      </div>
                    )
                  })}

                  {/* Alarm entities */}
                  {alarms.map(entity => {
                    const isDeviceHidden = hiddenEntities.has(entity.entity_id)
                    const deviceName = getDisplayName(entity.entity_id, entity.attributes.friendly_name || entity.entity_id)
                    const isArmed = entity.state.startsWith('armed')

                    return (
                      <div key={entity.entity_id} className="relative">
                        {editMode && isDeviceHidden && (
                          <div
                            className="absolute inset-0 bg-slate-900/80 rounded-xl z-10 flex items-center justify-center cursor-pointer"
                            onClick={() => showEntity(entity.entity_id)}
                          >
                            <span className="text-sm text-slate-400">Hidden - tap to show</span>
                          </div>
                        )}
                        <button
                          onClick={() => setModalEntity({ type: 'alarm', entity })}
                          className={`w-full p-4 rounded-xl flex items-center justify-between transition-all ${
                            isArmed ? 'bg-red-500/20 border border-red-500/30' : 'bg-slate-700/50 hover:bg-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              isArmed ? 'bg-red-500/30' : 'bg-slate-600'
                            }`}>
                              <span className="text-xl">🛡️</span>
                            </div>
                            <div className="text-left">
                              <p className="text-white font-medium">{deviceName}</p>
                              <p className="text-sm text-slate-400">{entity.state.replace(/_/g, ' ')}</p>
                            </div>
                          </div>
                          {editMode && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                isDeviceHidden ? showEntity(entity.entity_id) : hideEntity(entity.entity_id)
                              }}
                              className={`p-2 rounded-lg ${isDeviceHidden ? 'text-green-400' : 'text-slate-400 hover:text-red-400'}`}
                            >
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                                {isDeviceHidden ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178zM15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                )}
                              </svg>
                            </button>
                          )}
                        </button>
                      </div>
                    )
                  })}

                  {/* Valve entities */}
                  {valves.map(entity => {
                    const isDeviceHidden = hiddenEntities.has(entity.entity_id)
                    const deviceName = getDisplayName(entity.entity_id, entity.attributes.friendly_name || entity.entity_id)
                    const isOpen = entity.state === 'open'
                    const isLoading = loadingEntities.has(entity.entity_id)

                    return (
                      <div key={entity.entity_id} className="relative">
                        {editMode && isDeviceHidden && (
                          <div
                            className="absolute inset-0 bg-slate-900/80 rounded-xl z-10 flex items-center justify-center cursor-pointer"
                            onClick={() => showEntity(entity.entity_id)}
                          >
                            <span className="text-sm text-slate-400">Hidden - tap to show</span>
                          </div>
                        )}
                        <div className={`w-full p-4 rounded-xl flex items-center justify-between transition-all ${
                          isOpen ? 'bg-blue-500/20 border border-blue-500/30' : 'bg-slate-700/50'
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              isOpen ? 'bg-blue-500/30' : 'bg-slate-600'
                            }`}>
                              <span className="text-xl">💧</span>
                            </div>
                            <div className="text-left">
                              <p className="text-white font-medium">{deviceName}</p>
                              <p className="text-sm text-slate-400">{isOpen ? 'Open' : 'Closed'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleValveToggle(entity)}
                              disabled={isLoading}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                isOpen
                                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                                  : 'bg-slate-600 text-white hover:bg-slate-500'
                              } ${isLoading ? 'opacity-50' : ''}`}
                            >
                              {isLoading ? '...' : isOpen ? 'Close' : 'Open'}
                            </button>
                            {editMode && (
                              <button
                                onClick={() => isDeviceHidden ? showEntity(entity.entity_id) : hideEntity(entity.entity_id)}
                                className={`p-2 rounded-lg ${isDeviceHidden ? 'text-green-400' : 'text-slate-400 hover:text-red-400'}`}
                              >
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                                  {isDeviceHidden ? (
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178zM15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  ) : (
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                  )}
                                </svg>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {/* Fan entities */}
                  {fans.map(entity => {
                    const isDeviceHidden = hiddenEntities.has(entity.entity_id)
                    const deviceName = getDisplayName(entity.entity_id, entity.attributes.friendly_name || entity.entity_id)
                    const isOn = entity.state === 'on'

                    return (
                      <div key={entity.entity_id} className="relative">
                        {editMode && isDeviceHidden && (
                          <div
                            className="absolute inset-0 bg-slate-900/80 rounded-xl z-10 flex items-center justify-center cursor-pointer"
                            onClick={() => showEntity(entity.entity_id)}
                          >
                            <span className="text-sm text-slate-400">Hidden - tap to show</span>
                          </div>
                        )}
                        <button
                          onClick={() => setModalEntity({ type: 'fan', entity })}
                          className={`w-full p-4 rounded-xl flex items-center justify-between transition-all ${
                            isOn ? 'bg-cyan-500/20 border border-cyan-500/30' : 'bg-slate-700/50 hover:bg-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              isOn ? 'bg-cyan-500/30' : 'bg-slate-600'
                            }`}>
                              <span className={`text-xl ${isOn ? 'animate-spin' : ''}`} style={{ animationDuration: '2s' }}>🌀</span>
                            </div>
                            <div className="text-left">
                              <p className="text-white font-medium">{deviceName}</p>
                              <p className="text-sm text-slate-400">
                                {isOn ? 'On' : 'Off'}
                                {isOn && entity.attributes.percentage !== undefined && ` • ${entity.attributes.percentage}%`}
                                {isOn && entity.attributes.preset_mode && ` • ${entity.attributes.preset_mode}`}
                              </p>
                            </div>
                          </div>
                          {editMode && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                isDeviceHidden ? showEntity(entity.entity_id) : hideEntity(entity.entity_id)
                              }}
                              className={`p-2 rounded-lg ${isDeviceHidden ? 'text-green-400' : 'text-slate-400 hover:text-red-400'}`}
                            >
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                                {isDeviceHidden ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178zM15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                )}
                              </svg>
                            </button>
                          )}
                        </button>
                      </div>
                    )
                  })}

                  {/* Lock entities */}
                  {locks.map(entity => {
                    const isDeviceHidden = hiddenEntities.has(entity.entity_id)
                    const deviceName = getDisplayName(entity.entity_id, entity.attributes.friendly_name || entity.entity_id)
                    const isLocked = entity.state === 'locked'

                    return (
                      <div key={entity.entity_id} className="relative">
                        {editMode && isDeviceHidden && (
                          <div
                            className="absolute inset-0 bg-slate-900/80 rounded-xl z-10 flex items-center justify-center cursor-pointer"
                            onClick={() => showEntity(entity.entity_id)}
                          >
                            <span className="text-sm text-slate-400">Hidden - tap to show</span>
                          </div>
                        )}
                        <button
                          onClick={() => setModalEntity({ type: 'lock', entity })}
                          className={`w-full p-4 rounded-xl flex items-center justify-between transition-all ${
                            isLocked ? 'bg-green-500/20 border border-green-500/30' : 'bg-yellow-500/20 border border-yellow-500/30'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              isLocked ? 'bg-green-500/30' : 'bg-yellow-500/30'
                            }`}>
                              <span className="text-xl">{isLocked ? '🔒' : '🔓'}</span>
                            </div>
                            <div className="text-left">
                              <p className="text-white font-medium">{deviceName}</p>
                              <p className={`text-sm ${isLocked ? 'text-green-400' : 'text-yellow-400'}`}>
                                {isLocked ? 'Locked' : 'Unlocked'}
                              </p>
                            </div>
                          </div>
                          {editMode && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                isDeviceHidden ? showEntity(entity.entity_id) : hideEntity(entity.entity_id)
                              }}
                              className={`p-2 rounded-lg ${isDeviceHidden ? 'text-green-400' : 'text-slate-400 hover:text-red-400'}`}
                            >
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                                {isDeviceHidden ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178zM15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                )}
                              </svg>
                            </button>
                          )}
                        </button>
                      </div>
                    )
                  })}

                  {/* Cover entities (blinds, shades, garage doors) */}
                  {covers.map(entity => {
                    const isDeviceHidden = hiddenEntities.has(entity.entity_id)
                    const deviceName = getDisplayName(entity.entity_id, entity.attributes.friendly_name || entity.entity_id)
                    const isOpen = entity.state === 'open' || (entity.attributes.current_position ?? 0) > 0
                    const isMoving = entity.state === 'opening' || entity.state === 'closing'
                    const position = entity.attributes.current_position
                    const deviceClass = entity.attributes.device_class || 'cover'

                    // Choose icon based on device class
                    const getIcon = () => {
                      switch (deviceClass) {
                        case 'garage': return isOpen ? '🚗' : '🏠'
                        case 'gate': return isOpen ? '🚪' : '🔒'
                        case 'blind':
                        case 'shade':
                        case 'shutter':
                        case 'curtain': return isOpen ? '🪟' : '🪟'
                        default: return isOpen ? '📖' : '📕'
                      }
                    }

                    return (
                      <div key={entity.entity_id} className="relative">
                        {editMode && isDeviceHidden && (
                          <div
                            className="absolute inset-0 bg-slate-900/80 rounded-xl z-10 flex items-center justify-center cursor-pointer"
                            onClick={() => showEntity(entity.entity_id)}
                          >
                            <span className="text-sm text-slate-400">Hidden - tap to show</span>
                          </div>
                        )}
                        <button
                          onClick={() => setModalEntity({ type: 'cover', entity })}
                          className={`w-full p-4 rounded-xl flex items-center justify-between transition-all ${
                            isOpen ? 'bg-purple-500/20 border border-purple-500/30' : 'bg-slate-700/50 hover:bg-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              isOpen ? 'bg-purple-500/30' : 'bg-slate-600'
                            }`}>
                              <span className={`text-xl ${isMoving ? 'animate-pulse' : ''}`}>{getIcon()}</span>
                            </div>
                            <div className="text-left">
                              <p className="text-white font-medium">{deviceName}</p>
                              <p className="text-sm text-slate-400">
                                {isMoving ? entity.state.charAt(0).toUpperCase() + entity.state.slice(1) + '...' :
                                  position !== undefined ? `${position}% open` :
                                  isOpen ? 'Open' : 'Closed'}
                              </p>
                            </div>
                          </div>
                          {editMode && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                isDeviceHidden ? showEntity(entity.entity_id) : hideEntity(entity.entity_id)
                              }}
                              className={`p-2 rounded-lg ${isDeviceHidden ? 'text-green-400' : 'text-slate-400 hover:text-red-400'}`}
                            >
                              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                                {isDeviceHidden ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178zM15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                )}
                              </svg>
                            </button>
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* No devices message */}
            {isExpanded && !hasDevices && (
              <div className="px-4 pb-4 pt-2 border-t border-slate-700/50">
                <p className="text-sm text-slate-500 text-center">No controllable devices</p>
              </div>
            )}
          </div>
        )
      })}

      {/* No rooms message */}
      {entitiesByArea.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p>No rooms to display</p>
          {!editMode && (
            <button
              onClick={() => setEditMode(true)}
              className="mt-2 text-blue-400 text-sm"
            >
              Show hidden rooms
            </button>
          )}
        </div>
      )}

      {/* Entity Control Modal */}
      <EntityControlModal
        isOpen={modalEntity !== null}
        onClose={() => setModalEntity(null)}
        title={getModalTitle()}
      >
        {modalEntity?.type === 'climate' && (
          <ClimateControls
            entity={modalEntity.entity}
            onUpdate={updateEntity}
          />
        )}
        {modalEntity?.type === 'vacuum' && (
          <VacuumControls
            entity={modalEntity.entity}
            onUpdate={updateEntity}
          />
        )}
        {modalEntity?.type === 'alarm' && (
          <AlarmControls
            entity={modalEntity.entity}
            onUpdate={updateEntity}
          />
        )}
        {modalEntity?.type === 'fan' && (
          <FanControls
            entity={modalEntity.entity}
            onUpdate={updateEntity}
          />
        )}
        {modalEntity?.type === 'lock' && (
          <LockControls
            entity={modalEntity.entity}
            onUpdate={updateEntity}
          />
        )}
        {modalEntity?.type === 'cover' && (
          <CoverControls
            entity={modalEntity.entity}
            onUpdate={updateEntity}
          />
        )}
        {/* Related entities from same device */}
        {modalEntity && (
          <RelatedEntitiesSection entityId={modalEntity.entity.entity_id} />
        )}
      </EntityControlModal>
    </div>
  )
}
