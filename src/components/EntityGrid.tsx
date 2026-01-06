import { useState } from 'react'
import { useHomeAssistantContext } from '../context/HomeAssistantContext'
import { LightCard } from './LightCard'
import { SwitchCard } from './SwitchCard'
import { lightService } from '../services/homeAssistant'
import {
  HomeIcon,
  LightBulbIcon,
  ChevronDownIcon,
  EyeSlashIcon,
  ThermometerIcon,
  DropletIcon,
  BatteryIcon,
  MotionIcon,
  GaugeIcon,
  BoltIcon,
  DoorIcon,
  WindowIcon,
} from './icons'
import type { SensorEntity, BinarySensorEntity } from '../types/homeAssistant'

// Compact sensor display
function SensorBadge({ sensor, onHide }: { sensor: SensorEntity; onHide?: (id: string) => void }) {
  const { device_class, unit_of_measurement, friendly_name } = sensor.attributes
  const isUnavailable = sensor.state === 'unavailable' || sensor.state === 'unknown'

  const getIcon = () => {
    switch (device_class) {
      case 'temperature':
        return <ThermometerIcon className="w-4 h-4" />
      case 'humidity':
        return <DropletIcon className="w-4 h-4" />
      case 'battery':
        return <BatteryIcon className="w-4 h-4" level={parseFloat(sensor.state) || 0} />
      case 'motion':
      case 'occupancy':
        return <MotionIcon className="w-4 h-4" active={sensor.state === 'on'} />
      case 'power':
      case 'energy':
        return <BoltIcon className="w-4 h-4" />
      default:
        return <GaugeIcon className="w-4 h-4" />
    }
  }

  const getColor = () => {
    if (isUnavailable) return 'text-slate-500'
    switch (device_class) {
      case 'temperature': return 'text-orange-400'
      case 'humidity': return 'text-blue-400'
      case 'battery':
        const level = parseFloat(sensor.state) || 100
        if (level < 20) return 'text-red-400'
        if (level < 50) return 'text-yellow-400'
        return 'text-green-400'
      case 'motion':
      case 'occupancy':
        return sensor.state === 'on' ? 'text-green-400' : 'text-slate-400'
      case 'power':
      case 'energy':
        return 'text-yellow-400'
      default:
        return 'text-slate-300'
    }
  }

  const displayValue = isUnavailable
    ? '—'
    : `${sensor.state}${unit_of_measurement ? unit_of_measurement : ''}`

  const name = friendly_name || sensor.entity_id.split('.')[1].replace(/_/g, ' ')

  return (
    <div
      className={`group flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg ${getColor()}`}
      title={name}
    >
      {getIcon()}
      <span className="text-sm font-medium">{displayValue}</span>
      {onHide && (
        <button
          onClick={() => onHide(sensor.entity_id)}
          className="opacity-0 group-hover:opacity-100 ml-1 text-slate-500 hover:text-slate-300 transition-opacity"
        >
          <EyeSlashIcon className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

// Binary sensor display (door/window/motion/etc.)
function BinarySensorBadge({ sensor, onHide }: { sensor: BinarySensorEntity; onHide?: (id: string) => void }) {
  const { device_class, friendly_name } = sensor.attributes
  const isOn = sensor.state === 'on'
  const isUnavailable = sensor.state === 'unavailable' || sensor.state === 'unknown'

  const getIcon = () => {
    switch (device_class) {
      case 'door':
      case 'garage_door':
        return <DoorIcon className="w-4 h-4" open={isOn} />
      case 'window':
      case 'opening':
        return <WindowIcon className="w-4 h-4" open={isOn} />
      case 'motion':
      case 'occupancy':
      case 'presence':
        return <MotionIcon className="w-4 h-4" active={isOn} />
      case 'lock':
        return <DoorIcon className="w-4 h-4" open={!isOn} />
      default:
        return <GaugeIcon className="w-4 h-4" />
    }
  }

  const getColor = () => {
    if (isUnavailable) return 'text-slate-500'
    switch (device_class) {
      case 'door':
      case 'garage_door':
      case 'window':
      case 'opening':
        return isOn ? 'text-orange-400' : 'text-green-400'
      case 'motion':
      case 'occupancy':
      case 'presence':
        return isOn ? 'text-blue-400' : 'text-slate-400'
      case 'lock':
        return isOn ? 'text-green-400' : 'text-red-400'
      default:
        return isOn ? 'text-blue-400' : 'text-slate-400'
    }
  }

  const getStateText = () => {
    if (isUnavailable) return '—'
    switch (device_class) {
      case 'door':
      case 'garage_door':
        return isOn ? 'Open' : 'Closed'
      case 'window':
      case 'opening':
        return isOn ? 'Open' : 'Closed'
      case 'motion':
      case 'occupancy':
      case 'presence':
        return isOn ? 'Detected' : 'Clear'
      case 'lock':
        return isOn ? 'Locked' : 'Unlocked'
      default:
        return isOn ? 'On' : 'Off'
    }
  }

  const name = friendly_name || sensor.entity_id.split('.')[1].replace(/_/g, ' ')

  return (
    <div
      className={`group flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg ${getColor()}`}
      title={name}
    >
      {getIcon()}
      <span className="text-sm font-medium">{getStateText()}</span>
      {onHide && (
        <button
          onClick={() => onHide(sensor.entity_id)}
          className="opacity-0 group-hover:opacity-100 ml-1 text-slate-500 hover:text-slate-300 transition-opacity"
        >
          <EyeSlashIcon className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

export function EntityGrid() {
  const {
    lights,
    switches,
    sensors,
    binarySensors,
    entitiesByArea,
    hideEntity,
    showEntity,
    hiddenEntities,
    editMode,
    setEditMode,
    showAllEntities,
    updateEntity,
  } = useHomeAssistantContext()

  const [collapsedAreas, setCollapsedAreas] = useState<Set<string>>(new Set())

  const toggleArea = (areaName: string) => {
    setCollapsedAreas((prev) => {
      const next = new Set(prev)
      if (next.has(areaName)) {
        next.delete(areaName)
      } else {
        next.add(areaName)
      }
      return next
    })
  }

  // Room-level light controls
  const turnAllLightsOn = async (areaLights: typeof lights) => {
    for (const light of areaLights) {
      if (light.state === 'off') {
        updateEntity({ ...light, state: 'on' })
        lightService.turnOn(light.entity_id).catch(() => updateEntity(light))
      }
    }
  }

  const turnAllLightsOff = async (areaLights: typeof lights) => {
    for (const light of areaLights) {
      if (light.state === 'on') {
        updateEntity({ ...light, state: 'off' })
        lightService.turnOff(light.entity_id).catch(() => updateEntity(light))
      }
    }
  }

  const totalEntities = lights.length + switches.length + sensors.length + binarySensors.length
  const hiddenCount = hiddenEntities.size

  if (totalEntities === 0) {
    return (
      <div className="text-center py-12">
        <HomeIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
        <h2 className="text-xl font-medium text-white mb-2">No Devices Found</h2>
        <p className="text-slate-400 max-w-sm mx-auto">
          No entities were found in your Home Assistant instance.
        </p>
      </div>
    )
  }

  const handleHide = editMode ? hideEntity : undefined

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">My Home</h2>
          <p className="text-sm text-slate-400">
            {lights.filter(l => l.state === 'on').length + switches.filter(s => s.state === 'on').length} devices on
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hiddenCount > 0 && !editMode && (
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">
              {hiddenCount} hidden
            </span>
          )}
          <button
            onClick={() => setEditMode(!editMode)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              editMode
                ? 'bg-blue-500 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {editMode ? 'Done' : 'Edit'}
          </button>
        </div>
      </div>

      {/* Edit mode info */}
      {editMode && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <EyeSlashIcon className="w-5 h-5 text-blue-400" />
              <span className="text-sm text-blue-300">
                Tap items to hide them ({hiddenCount} hidden)
              </span>
            </div>
            {hiddenCount > 0 && (
              <button
                onClick={showAllEntities}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Restore all
              </button>
            )}
          </div>
        </div>
      )}

      {/* Room sections */}
      {entitiesByArea.map(({ areaName, lights: areaLights, switches: areaSwitches, sensors: areaSensors, binarySensors: areaBinarySensors, filteredSensorCount, filteredBinarySensorCount }) => {
        const isCollapsed = collapsedAreas.has(areaName)
        const lightsOn = areaLights.filter(l => l.state === 'on').length
        const switchesOn = areaSwitches.filter(s => s.state === 'on').length
        const hasControls = areaLights.length > 0 || areaSwitches.length > 0
        const totalFiltered = filteredSensorCount + filteredBinarySensorCount

        return (
          <div key={areaName} className="bg-slate-800/30 rounded-2xl overflow-hidden">
            {/* Room header */}
            <div className="flex items-center justify-between p-4">
              <button
                onClick={() => toggleArea(areaName)}
                className="flex items-center gap-3 flex-1"
              >
                <div className="w-10 h-10 bg-slate-700/50 rounded-xl flex items-center justify-center">
                  <HomeIcon className="w-5 h-5 text-slate-400" />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-white">{areaName}</h3>
                  <p className="text-xs text-slate-400">
                    {lightsOn + switchesOn > 0 ? (
                      <>
                        <span className="text-blue-400">{lightsOn + switchesOn} on</span>
                        <span className="mx-1">·</span>
                      </>
                    ) : null}
                    {areaLights.length + areaSwitches.length + areaSensors.length + areaBinarySensors.length} devices
                  </p>
                </div>
                <ChevronDownIcon
                  className={`w-5 h-5 text-slate-500 transition-transform ml-auto ${
                    isCollapsed ? '-rotate-90' : ''
                  }`}
                />
              </button>

              {/* Quick room controls */}
              {hasControls && areaLights.length > 0 && !isCollapsed && (
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => turnAllLightsOn(areaLights)}
                    disabled={lightsOn === areaLights.length}
                    className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="All lights on"
                  >
                    <LightBulbIcon className="w-4 h-4 text-yellow-400" filled />
                  </button>
                  <button
                    onClick={() => turnAllLightsOff(areaLights)}
                    disabled={lightsOn === 0}
                    className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="All lights off"
                  >
                    <LightBulbIcon className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              )}
            </div>

            {/* Room content */}
            {!isCollapsed && (
              <div className="px-4 pb-4 space-y-4">
                {/* Sensors & Binary Sensors row - compact badges */}
                {(areaSensors.length > 0 || areaBinarySensors.length > 0) && (
                  <div className="flex flex-wrap gap-2">
                    {/* Binary sensors first (doors, windows, motion) */}
                    {areaBinarySensors.map(binarySensor => (
                      <div key={binarySensor.entity_id} className="relative">
                        {editMode && hiddenEntities.has(binarySensor.entity_id) && (
                          <div
                            className="absolute inset-0 bg-slate-900/80 rounded-lg z-10 flex items-center justify-center cursor-pointer"
                            onClick={() => showEntity(binarySensor.entity_id)}
                          >
                            <span className="text-xs text-slate-400">Show</span>
                          </div>
                        )}
                        <BinarySensorBadge sensor={binarySensor} onHide={handleHide} />
                      </div>
                    ))}
                    {/* Regular sensors */}
                    {areaSensors.map(sensor => (
                      <div key={sensor.entity_id} className="relative">
                        {editMode && hiddenEntities.has(sensor.entity_id) && (
                          <div
                            className="absolute inset-0 bg-slate-900/80 rounded-lg z-10 flex items-center justify-center cursor-pointer"
                            onClick={() => showEntity(sensor.entity_id)}
                          >
                            <span className="text-xs text-slate-400">Show</span>
                          </div>
                        )}
                        <SensorBadge sensor={sensor} onHide={handleHide} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Controllable devices grid */}
                {(areaLights.length > 0 || areaSwitches.length > 0) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Lights */}
                    {areaLights.map(light => (
                      <div key={light.entity_id} className="relative">
                        {editMode && hiddenEntities.has(light.entity_id) && (
                          <div
                            className="absolute inset-0 bg-slate-900/80 rounded-xl z-10 flex items-center justify-center cursor-pointer"
                            onClick={() => showEntity(light.entity_id)}
                          >
                            <span className="text-sm text-slate-400 flex items-center gap-2">
                              <EyeSlashIcon className="w-4 h-4" /> Hidden
                            </span>
                          </div>
                        )}
                        <LightCard light={light} onHide={handleHide} />
                      </div>
                    ))}

                    {/* Switches */}
                    {areaSwitches.map(sw => (
                      <div key={sw.entity_id} className="relative">
                        {editMode && hiddenEntities.has(sw.entity_id) && (
                          <div
                            className="absolute inset-0 bg-slate-900/80 rounded-xl z-10 flex items-center justify-center cursor-pointer"
                            onClick={() => showEntity(sw.entity_id)}
                          >
                            <span className="text-sm text-slate-400 flex items-center gap-2">
                              <EyeSlashIcon className="w-4 h-4" /> Hidden
                            </span>
                          </div>
                        )}
                        <SwitchCard entity={sw} onHide={handleHide} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Filtered sensors indicator */}
                {!editMode && totalFiltered > 0 && (
                  <button
                    onClick={() => setEditMode(true)}
                    className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
                  >
                    +{totalFiltered} more sensors
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
