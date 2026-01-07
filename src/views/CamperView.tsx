import { useMemo } from 'react'
import { useHomeAssistantContext } from '../context/HomeAssistantContext'
import type { SensorEntity } from '../types/homeAssistant'

// Helper to find sensor by partial entity_id match
function findSensor(sensors: SensorEntity[], pattern: string | RegExp): SensorEntity | undefined {
  if (typeof pattern === 'string') {
    return sensors.find(s => s.entity_id.toLowerCase().includes(pattern.toLowerCase()))
  }
  return sensors.find(s => pattern.test(s.entity_id))
}

// Helper to find sensor by exact entity_id
function findSensorById(sensors: SensorEntity[], entityId: string): SensorEntity | undefined {
  return sensors.find(s => s.entity_id === entityId)
}

// Format time remaining (input is hours)
function formatTimeRemaining(hours: number | undefined): string {
  if (hours === undefined || isNaN(hours) || hours <= 0) return '—'

  // If more than 24 hours, show days
  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    const remainingHours = Math.round(hours % 24)
    if (remainingHours > 0) {
      return `${days}d ${remainingHours}h`
    }
    return `${days} days`
  }

  // Less than 24 hours, show hours and minutes
  const wholeHours = Math.floor(hours)
  const mins = Math.round((hours - wholeHours) * 60)
  if (mins > 0) {
    return `${wholeHours}h ${mins}m`
  }
  return `${wholeHours}h`
}

// Format number with unit
function formatValue(value: string | number | undefined, unit?: string, decimals = 1): string {
  if (value === undefined || value === null || value === 'unknown' || value === 'unavailable') {
    return '—'
  }
  const num = typeof value === 'string' ? parseFloat(value) : value
  if (isNaN(num)) return '—'
  const formatted = num.toFixed(decimals)
  return unit ? `${formatted} ${unit}` : formatted
}

// Battery SOC gauge component
function BatteryGauge({ soc, voltage, current, power, systemState, timeToEmpty }: {
  soc?: number
  voltage?: number
  current?: number
  power?: number
  systemState?: string
  timeToEmpty?: number
}) {
  const socValue = soc ?? 0
  const isCharging = systemState?.toLowerCase().includes('charging') || systemState?.toLowerCase().includes('bulk') || systemState?.toLowerCase().includes('absorption') || systemState?.toLowerCase().includes('float')
  const isDischarging = systemState?.toLowerCase().includes('discharging') || systemState?.toLowerCase().includes('inverting')

  // Color based on SOC level
  const getColor = () => {
    if (socValue >= 80) return { bg: 'bg-emerald-500', text: 'text-emerald-400', ring: 'ring-emerald-500/30' }
    if (socValue >= 50) return { bg: 'bg-yellow-500', text: 'text-yellow-400', ring: 'ring-yellow-500/30' }
    if (socValue >= 20) return { bg: 'bg-orange-500', text: 'text-orange-400', ring: 'ring-orange-500/30' }
    return { bg: 'bg-red-500', text: 'text-red-400', ring: 'ring-red-500/30' }
  }

  const colors = getColor()

  // Get status badge based on system state
  const getStatusBadge = () => {
    if (!systemState || systemState === 'unknown' || systemState === 'unavailable') return null

    if (isCharging) {
      return (
        <span className="text-xs px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center gap-1">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z"/>
          </svg>
          {systemState}
        </span>
      )
    }

    if (isDischarging) {
      return (
        <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full">
          {systemState}
        </span>
      )
    }

    return (
      <span className="text-xs px-2 py-1 bg-slate-200 text-slate-600 rounded-full">
        {systemState}
      </span>
    )
  }

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 4h-3V2h-4v2H7a2 2 0 00-2 2v16a2 2 0 002 2h10a2 2 0 002-2V6a2 2 0 00-2-2zm0 18H7V6h10v16z"/>
            <path d="M9 8h6v10H9z" opacity={0.3}/>
          </svg>
          Battery
        </h3>
        {getStatusBadge()}
      </div>

      {/* SOC Display */}
      <div className="flex items-center gap-6">
        <div className={`relative w-24 h-24 rounded-full ${colors.ring} ring-4`}>
          <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-slate-200"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${socValue * 2.64} 264`}
              className={colors.text}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-2xl font-bold ${colors.text}`}>{socValue}%</span>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          {timeToEmpty !== undefined && timeToEmpty > 0 && (
            <div className="flex justify-between items-center">
              <span className="text-slate-500 text-sm">Time Left</span>
              <span className="text-slate-800 font-medium">{formatTimeRemaining(timeToEmpty)}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-slate-500 text-sm">Voltage</span>
            <span className="text-slate-800 font-medium">{formatValue(voltage, 'V')}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 text-sm">Current</span>
            <span className={`font-medium ${isCharging ? 'text-emerald-600' : isDischarging ? 'text-blue-600' : 'text-slate-800'}`}>
              {formatValue(current, 'A')}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500 text-sm">Power</span>
            <span className={`font-medium ${(power ?? 0) > 0 ? 'text-emerald-600' : (power ?? 0) < 0 ? 'text-blue-600' : 'text-slate-800'}`}>
              {formatValue(Math.abs(power ?? 0), 'W', 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Solar panel card
function SolarCard({ power, voltage, current, yieldToday }: {
  power?: number
  voltage?: number
  current?: number
  yieldToday?: number
}) {
  const isProducing = (power ?? 0) > 10

  return (
    <div className={`glass-card p-5 transition-all ${
      isProducing ? 'bg-gradient-to-br from-yellow-500/10 to-orange-500/10' : ''
    }`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          isProducing ? 'bg-yellow-500' : 'bg-slate-200'
        }`}>
          <svg className={`w-5 h-5 ${isProducing ? 'text-white' : 'text-slate-400'}`} viewBox="0 0 24 24" fill="currentColor">
            <path d="M3.55 19.09l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8zM11 20h2v3h-2v-3zM1 11h3v2H1v-2zm12-6.95v3.96l1-.01V4c-3.35.18-6 2.93-6 6.32 0 3.51 2.86 6.36 6.36 6.36 3.4 0 6.14-2.65 6.32-6h-3.96v1h3.95c-.17 2.76-2.43 4.97-5.23 4.97-2.9 0-5.27-2.37-5.27-5.27 0-2.8 2.21-5.06 4.97-5.23L13 4.05zM20 11h3v2h-3v-2zm-2.76-7.71l-1.79 1.8 1.41 1.41 1.79-1.79-1.41-1.42z"/>
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-slate-800">Solar</h3>
          <p className={`text-xs ${isProducing ? 'text-yellow-600' : 'text-slate-500'}`}>
            {isProducing ? 'Generating' : 'No Production'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="glass-panel p-3">
          <p className="text-xs text-slate-500 mb-1">Power</p>
          <p className={`text-xl font-bold ${isProducing ? 'text-yellow-600' : 'text-slate-500'}`}>
            {formatValue(power, 'W', 0)}
          </p>
        </div>
        <div className="glass-panel p-3">
          <p className="text-xs text-slate-500 mb-1">Today</p>
          <p className="text-xl font-bold text-slate-800">
            {formatValue(yieldToday, 'kWh', 2)}
          </p>
        </div>
        <div className="glass-panel p-3">
          <p className="text-xs text-slate-500 mb-1">Voltage</p>
          <p className="text-lg font-medium text-slate-800">{formatValue(voltage, 'V')}</p>
        </div>
        <div className="glass-panel p-3">
          <p className="text-xs text-slate-500 mb-1">Current</p>
          <p className="text-lg font-medium text-slate-800">{formatValue(current, 'A')}</p>
        </div>
      </div>
    </div>
  )
}

// Grid (AC Input) card
function GridCard({ connected, l1Power, l2Power }: {
  connected?: boolean
  l1Power?: number
  l2Power?: number
}) {
  const totalPower = (l1Power ?? 0) + (l2Power ?? 0)

  return (
    <div className={`glass-card p-5 transition-all ${
      connected ? 'bg-gradient-to-br from-blue-500/10 to-cyan-500/10' : ''
    }`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          connected ? 'bg-blue-500' : 'bg-slate-200'
        }`}>
          <svg className={`w-5 h-5 ${connected ? 'text-white' : 'text-slate-400'}`} viewBox="0 0 24 24" fill="currentColor">
            <path d="M16.01 7L16 3h-2v4h-4V3H8v4h-.01C7 7 6 7.99 6 8.99v5.49L9.5 18v3h5v-3l3.5-3.51v-5.5c0-1-.99-1.99-1.99-1.99z"/>
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-slate-800">Grid Input</h3>
          <p className={`text-xs ${connected ? 'text-blue-600' : 'text-slate-500'}`}>
            {connected ? 'Connected' : 'Disconnected'}
          </p>
        </div>
      </div>

      {connected ? (
        <div className="space-y-3">
          <div className="glass-panel p-3">
            <p className="text-xs text-slate-500 mb-1">Total Power</p>
            <p className="text-xl font-bold text-blue-600">{formatValue(totalPower, 'W', 0)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-panel p-3">
              <p className="text-xs text-slate-500 mb-1">L1</p>
              <p className="text-lg font-medium text-slate-800">{formatValue(l1Power, 'W', 0)}</p>
            </div>
            <div className="glass-panel p-3">
              <p className="text-xs text-slate-500 mb-1">L2</p>
              <p className="text-lg font-medium text-slate-800">{formatValue(l2Power, 'W', 0)}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-4 text-center">
          <p className="text-slate-500">Not connected to shore power</p>
        </div>
      )}
    </div>
  )
}

// AC Loads card
function ACLoadsCard({ power }: {
  power?: number
}) {
  const isActive = (power ?? 0) > 5

  return (
    <div className={`glass-card p-5 transition-all ${
      isActive ? 'bg-gradient-to-br from-orange-500/10 to-red-500/10' : ''
    }`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          isActive ? 'bg-orange-500' : 'bg-slate-200'
        }`}>
          <svg className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} viewBox="0 0 24 24" fill="currentColor">
            <path d="M11 21h-1l1-7H7.5c-.58 0-.57-.32-.38-.66.19-.34.05-.08.07-.12C8.48 10.94 10.42 7.54 13 3h1l-1 7h3.5c.49 0 .56.33.47.51l-.07.15C12.96 17.55 11 21 11 21z"/>
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-slate-800">AC Loads</h3>
          <p className={`text-xs ${isActive ? 'text-orange-600' : 'text-slate-500'}`}>
            {isActive ? 'Active' : 'Minimal'}
          </p>
        </div>
      </div>

      <div className="glass-panel p-3">
        <p className="text-xs text-slate-500 mb-1">Power</p>
        <p className={`text-xl font-bold ${isActive ? 'text-orange-600' : 'text-slate-500'}`}>
          {formatValue(power, 'W', 0)}
        </p>
      </div>
    </div>
  )
}

// Loads/Consumption card
function LoadsCard({ power, current }: {
  power?: number
  current?: number
}) {
  const isActive = (power ?? 0) > 5

  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          isActive ? 'bg-purple-500' : 'bg-slate-200'
        }`}>
          <svg className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-slate-800">DC Loads</h3>
          <p className={`text-xs ${isActive ? 'text-purple-600' : 'text-slate-500'}`}>
            {isActive ? 'Active' : 'Minimal'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="glass-panel p-3">
          <p className="text-xs text-slate-500 mb-1">Power</p>
          <p className={`text-xl font-bold ${isActive ? 'text-purple-600' : 'text-slate-500'}`}>
            {formatValue(power, 'W', 0)}
          </p>
        </div>
        <div className="glass-panel p-3">
          <p className="text-xs text-slate-500 mb-1">Current</p>
          <p className="text-lg font-medium text-slate-800">{formatValue(current, 'A')}</p>
        </div>
      </div>
    </div>
  )
}

// Sensor row for additional sensors
function SensorRow({ sensor }: { sensor: SensorEntity }) {
  const name = sensor.attributes.friendly_name || sensor.entity_id.split('.')[1].replace(/_/g, ' ')
  const unit = sensor.attributes.unit_of_measurement || ''

  return (
    <div className="flex justify-between items-center py-2 border-b border-slate-200 last:border-0">
      <span className="text-sm text-slate-500 truncate mr-2">{name}</span>
      <span className="text-sm font-medium text-slate-800 whitespace-nowrap">
        {formatValue(sensor.state, unit)}
      </span>
    </div>
  )
}

export function CamperView() {
  const { sensors, binarySensors, areas, entityAreaMap } = useHomeAssistantContext()

  // Find Camper area
  const camperArea = useMemo(
    () => areas.find(a => a.name.toLowerCase().includes('camper')),
    [areas]
  )

  // Get all sensors in the Camper area
  const camperSensors = useMemo(() => {
    if (!camperArea) return sensors.filter(s =>
      s.entity_id.toLowerCase().includes('victron') ||
      s.entity_id.toLowerCase().includes('camper')
    )
    return sensors.filter(s => entityAreaMap.get(s.entity_id) === camperArea.area_id)
  }, [sensors, camperArea, entityAreaMap])

  // Get binary sensors for the Camper
  const camperBinarySensors = useMemo(() => {
    if (!camperArea) return binarySensors.filter(s =>
      s.entity_id.toLowerCase().includes('victron') ||
      s.entity_id.toLowerCase().includes('camper')
    )
    return binarySensors.filter(s => entityAreaMap.get(s.entity_id) === camperArea.area_id)
  }, [binarySensors, camperArea, entityAreaMap])

  // Specific Victron sensors by exact entity ID
  const systemState = findSensorById(sensors, 'sensor.victron_power_system_victron_system_state')
  const timeToEmpty = findSensorById(sensors, 'sensor.victron_power_system_victron_time_to_empty')
  const gridL1 = findSensorById(sensors, 'sensor.victron_power_system_victron_grid_l1')
  const gridL2 = findSensorById(sensors, 'sensor.victron_power_system_victron_grid_l2')
  const acLoads = findSensorById(sensors, 'sensor.victron_power_system_victron_ac_loads')

  // Find other Victron sensors by pattern (fallback for battery, solar, etc.)
  const batterySOC = findSensor(camperSensors, /soc|state_of_charge|battery.*percent/i)
  const batteryVoltage = findSensor(camperSensors, /battery.*voltage|voltage.*battery/i)
  const batteryCurrent = findSensor(camperSensors, /battery.*current|current.*battery/i)
  const batteryPower = findSensor(camperSensors, /battery.*power|power.*battery/i)

  const solarPower = findSensor(camperSensors, /pv.*power|solar.*power|mppt.*power/i)
  const solarVoltage = findSensor(camperSensors, /pv.*voltage|solar.*voltage|mppt.*voltage/i)
  const solarCurrent = findSensor(camperSensors, /pv.*current|solar.*current|mppt.*current/i)
  const solarYield = findSensor(camperSensors, /yield.*today|daily.*yield|solar.*yield/i)

  const loadPower = findSensor(camperSensors, /dc.*load|dc.*power|consumption/i)
  const loadCurrent = findSensor(camperSensors, /load.*current|dc.*current/i)

  // Check if shore power is connected (Grid L1 > 0)
  const gridConnected = useMemo(() => {
    const l1Power = parseFloat(gridL1?.state || '0')
    return l1Power > 0
  }, [gridL1])

  // Other sensors not covered by main cards
  const otherSensors = useMemo(() => {
    const usedIds = new Set([
      systemState?.entity_id,
      timeToEmpty?.entity_id,
      gridL1?.entity_id,
      gridL2?.entity_id,
      acLoads?.entity_id,
      batterySOC?.entity_id,
      batteryVoltage?.entity_id,
      batteryCurrent?.entity_id,
      batteryPower?.entity_id,
      solarPower?.entity_id,
      solarVoltage?.entity_id,
      solarCurrent?.entity_id,
      solarYield?.entity_id,
      loadPower?.entity_id,
      loadCurrent?.entity_id,
    ].filter(Boolean))

    return camperSensors.filter(s => !usedIds.has(s.entity_id))
  }, [camperSensors, systemState, timeToEmpty, gridL1, gridL2, acLoads,
      batterySOC, batteryVoltage, batteryCurrent, batteryPower,
      solarPower, solarVoltage, solarCurrent, solarYield, loadPower, loadCurrent])

  if (camperSensors.length === 0) {
    return (
      <div className="p-4 pb-24">
        <div className="glass-card p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full glass-panel flex items-center justify-center">
            <svg className="w-8 h-8 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
          </div>
          <p className="text-slate-700 mb-2">No Camper sensors found</p>
          <p className="text-sm text-slate-500">
            Looking for Victron sensors in the "Camper" room
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 pb-24 space-y-4">
      {/* Battery Status - Main Focus */}
      <BatteryGauge
        soc={batterySOC ? parseFloat(batterySOC.state) : undefined}
        voltage={batteryVoltage ? parseFloat(batteryVoltage.state) : undefined}
        current={batteryCurrent ? parseFloat(batteryCurrent.state) : undefined}
        power={batteryPower ? parseFloat(batteryPower.state) : undefined}
        systemState={systemState?.state}
        timeToEmpty={timeToEmpty ? parseFloat(timeToEmpty.state) : undefined}
      />

      {/* Solar & Grid Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SolarCard
          power={solarPower ? parseFloat(solarPower.state) : undefined}
          voltage={solarVoltage ? parseFloat(solarVoltage.state) : undefined}
          current={solarCurrent ? parseFloat(solarCurrent.state) : undefined}
          yieldToday={solarYield ? parseFloat(solarYield.state) : undefined}
        />

        <GridCard
          connected={gridConnected}
          l1Power={gridL1 ? parseFloat(gridL1.state) : undefined}
          l2Power={gridL2 ? parseFloat(gridL2.state) : undefined}
        />
      </div>

      {/* AC & DC Loads Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* AC Loads */}
        <ACLoadsCard
          power={acLoads ? parseFloat(acLoads.state) : undefined}
        />

        {/* DC Loads */}
        {(loadPower || loadCurrent) && (
          <LoadsCard
            power={loadPower ? parseFloat(loadPower.state) : undefined}
            current={loadCurrent ? parseFloat(loadCurrent.state) : undefined}
          />
        )}
      </div>

      {/* Other Sensors */}
      {otherSensors.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
            </svg>
            Other Sensors
          </h3>
          <div className="space-y-1">
            {otherSensors.slice(0, 10).map(sensor => (
              <SensorRow key={sensor.entity_id} sensor={sensor} />
            ))}
            {otherSensors.length > 10 && (
              <p className="text-xs text-slate-500 pt-2">
                +{otherSensors.length - 10} more sensors
              </p>
            )}
          </div>
        </div>
      )}

      {/* System Status */}
      {camperBinarySensors.length > 0 && (
        <div className="glass-card p-5">
          <h3 className="text-lg font-semibold text-slate-800 mb-3">System Status</h3>
          <div className="grid grid-cols-2 gap-2">
            {camperBinarySensors.map(sensor => {
              const name = sensor.attributes.friendly_name || sensor.entity_id.split('.')[1].replace(/_/g, ' ')
              const isOn = sensor.state === 'on'
              return (
                <div
                  key={sensor.entity_id}
                  className={`glass-panel px-3 py-2 rounded-lg text-sm transition-all ${
                    isOn
                      ? 'bg-emerald-500/15 text-emerald-600'
                      : 'text-slate-500'
                  }`}
                >
                  {name}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
