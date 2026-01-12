import { useMemo } from 'react'
import { useHomeAssistantContext } from '../context/HomeAssistantContext'
import type { HAState } from '../types/homeAssistant'

interface CarData {
  name: string
  brand: 'mercedes' | 'ford' | 'other'
  entities: HAState[]
  // Key metrics
  batteryLevel?: number
  batteryStatus?: string // For text-based battery states like "green", "yellow", "red"
  fuelLevel?: number
  range?: number
  electricRange?: number
  mileage?: number
  location?: string
  isHome?: boolean
  isCharging?: boolean
  isLocked?: boolean
  alarmStatus?: string // Alarm status (armed, disarmed, etc.)
  doorsOpen?: string[]
  windowsOpen?: string[]
  tirePressure?: { [key: string]: number }
  oilLife?: number
  defLevel?: number
  lastUpdate?: string
}

export function CarsView() {
  const { entities, hiddenEntities } = useHomeAssistantContext()

  // Find all car-related entities for Mercedes and Ford
  const carData = useMemo(() => {
    const cars: Map<string, CarData> = new Map()

    // Filter out hidden entities
    const visibleEntities = entities.filter(e => !hiddenEntities.has(e.entity_id))

    // Patterns to identify car entities
    // Mercedes VINs often start with W1K, WDB, WDD, WDC, WMX, etc.
    const mercedesPatterns = ['mercedes', 'mb_', 'eqs', 'eqe', 'eqc', 'eqa', 'eqb', 'eqv', 'gle', 'gls', 'glc', 'gla', 'glb']
    const mercedesVinPrefixes = ['w1k', 'wdb', 'wdd', 'wdc', 'wmx', 'wdf', '4jg']
    const fordPatterns = ['ford', 'fordpass', 'mustang', 'mach_e', 'mach-e', 'f150', 'f-150', 'bronco', 'explorer', 'escape', 'edge']

    const isMercedes = (id: string, name: string) => {
      const idLower = id.toLowerCase()
      const nameLower = name.toLowerCase()
      // Check standard patterns
      if (mercedesPatterns.some(p => idLower.includes(p) || nameLower.includes(p))) {
        return true
      }
      // Check for Mercedes VIN prefixes in entity ID (e.g., sensor.w1kzh6ab1nb032458_...)
      if (mercedesVinPrefixes.some(vin => idLower.includes(vin))) {
        return true
      }
      return false
    }

    const isFord = (id: string, name: string) =>
      fordPatterns.some(p => id.toLowerCase().includes(p) || name.toLowerCase().includes(p))

    // Group entities by car
    visibleEntities.forEach(entity => {
      const id = entity.entity_id.toLowerCase()
      const name = (entity.attributes.friendly_name || '').toLowerCase()

      let brand: 'mercedes' | 'ford' | 'other' | null = null
      let carKey: string | null = null

      if (isMercedes(id, name)) {
        brand = 'mercedes'
        carKey = 'mercedes'
      } else if (isFord(id, name)) {
        brand = 'ford'
        carKey = 'ford'
      }

      if (brand && carKey) {
        if (!cars.has(carKey)) {
          cars.set(carKey, {
            name: brand === 'mercedes' ? 'Mercedes' : 'Ford',
            brand,
            entities: [],
          })
        }
        cars.get(carKey)!.entities.push(entity)
      }
    })

    // Helper to safely parse numeric values
    const parseNumeric = (value: unknown): number | null => {
      if (typeof value === 'number') return value
      if (typeof value === 'string') {
        const parsed = parseFloat(value)
        return isNaN(parsed) ? null : parsed
      }
      return null
    }

    // Helper to get attribute value case-insensitively
    const getAttr = (attrs: Record<string, unknown>, ...keys: string[]): unknown => {
      for (const key of keys) {
        // Check exact key
        if (attrs[key] !== undefined) return attrs[key]
        // Check lowercase
        const lowerKey = key.toLowerCase()
        for (const attrKey of Object.keys(attrs)) {
          if (attrKey.toLowerCase() === lowerKey) {
            return attrs[attrKey]
          }
        }
      }
      return undefined
    }

    // Extract key metrics for each car
    cars.forEach((car, key) => {
      car.entities.forEach(entity => {
        const id = entity.entity_id.toLowerCase()
        const state = entity.state
        const attrs = entity.attributes as Record<string, unknown>

        // Battery/State of charge - check both state and attributes (skip for Mercedes - not readable)
        if (car.brand !== 'mercedes' && (id.includes('battery') || id.includes('state_of_charge') || id.includes('soc') || id.includes('elveh'))) {
          const stateStr = state.trim().toLowerCase()

          // Check for text-based status first
          const textStatuses = ['green', 'yellow', 'red', 'good', 'ok', 'warning', 'medium', 'critical', 'low']
          if (textStatuses.includes(stateStr)) {
            car.batteryStatus = state.trim() // Keep original case for display
          } else {
            // Try numeric value from state
            const val = parseNumeric(state)
            if (val !== null && val > 0 && val <= 100) {
              car.batteryLevel = val
            }
          }
        }

        // Also check for battery_level in attributes (Ford uses this) - skip for Mercedes
        if (car.brand !== 'mercedes' && car.batteryLevel === undefined && car.batteryStatus === undefined) {
          const attrVal = parseNumeric(getAttr(attrs, 'battery_level', 'batteryLevel', 'BatteryLevel', 'state_of_charge', 'stateOfCharge', 'StateOfCharge', 'battery', 'Battery'))
          if (attrVal !== null && attrVal > 0 && attrVal <= 100) {
            car.batteryLevel = attrVal
          }
        }

        // Fuel level - check both state and attributes (Ford uses fordpass_fuel, FuelLevel, fuel_level, tank_level)
        if ((id.includes('fuel') || id.includes('tank') || id.includes('fordpass_fuel')) && !id.includes('consumption') && !id.includes('range') && !id.includes('economy')) {
          const val = parseNumeric(state) ?? parseNumeric(getAttr(attrs, 'fuel_level', 'fuelLevel', 'FuelLevel', 'tanklevelpercent', 'fuel', 'tank_level', 'tankLevel', 'TankLevel'))
          // Handle percentage values - cap at 100 (some sensors report slightly over)
          if (val !== null && val >= 0) {
            car.fuelLevel = Math.min(100, val <= 1 ? val * 100 : val)
          }
        }
        // Check fuel attributes on any entity (Ford sometimes has fuel in main sensor attributes)
        if (car.fuelLevel === undefined) {
          const val = parseNumeric(getAttr(attrs, 'fuel_level', 'fuelLevel', 'FuelLevel', 'tanklevelpercent', 'fuel', 'Fuel', 'tank_level', 'tankLevel', 'TankLevel', 'fuelLevelPercent', 'FuelLevelPercent', 'fuel_level_percent'))
          if (val !== null && val >= 0) {
            car.fuelLevel = Math.min(100, val)
          }
        }

        // Range - check state and common attribute names (Ford uses FuelRange, DistanceToEmpty)
        if (id.includes('range') || id.includes('distance_to_empty') || id.includes('dte')) {
          const val = parseNumeric(state) ?? parseNumeric(getAttr(attrs, 'range', 'Range', 'FuelRange', 'fuelRange', 'fuel_range', 'total_range', 'totalRange', 'DistanceToEmpty', 'distanceToEmpty', 'distance_to_empty', 'dte'))
          if (val !== null && val > 0 && car.range === undefined) {
            car.range = val
          }
        }
        // Check range attributes on all entities
        if (car.range === undefined) {
          const val = parseNumeric(getAttr(attrs, 'range', 'Range', 'FuelRange', 'fuelRange', 'fuel_range', 'total_range', 'totalRange', 'DistanceToEmpty', 'distanceToEmpty', 'distance_to_empty', 'rangeliquid', 'RangeLiquid'))
          if (val !== null && val > 0) {
            car.range = val
          }
        }

        // Electric range - check state and attributes
        if (id.includes('electric_range') || id.includes('ev_range') || id.includes('rangeelectric') || id.includes('elec_range')) {
          const val = parseNumeric(state) ?? parseNumeric(getAttr(attrs, 'electric_range', 'electricRange', 'ElectricRange', 'rangeelectric', 'RangeElectric', 'ev_range', 'evRange'))
          if (val !== null && val > 0) {
            car.electricRange = val
          }
        }
        // Check electric range attributes
        if (car.electricRange === undefined) {
          const val = parseNumeric(getAttr(attrs, 'electric_range', 'electricRange', 'ElectricRange', 'rangeelectric', 'RangeElectric', 'ev_range', 'evRange', 'EVRange'))
          if (val !== null && val > 0) {
            car.electricRange = val
          }
        }

        // Mileage/Odometer - check state and attributes (Ford uses Odometer)
        if (id.includes('mileage') || id.includes('odometer') || id.includes('odo')) {
          const val = parseNumeric(state) ?? parseNumeric(getAttr(attrs, 'odometer', 'Odometer', 'mileage', 'Mileage', 'odo', 'Odo', 'total_mileage', 'totalMileage'))
          if (val !== null && val > 0) {
            car.mileage = val
          }
        }
        // Check odometer attributes
        if (car.mileage === undefined) {
          const val = parseNumeric(getAttr(attrs, 'odometer', 'Odometer', 'mileage', 'Mileage', 'odo', 'Odo', 'total_mileage', 'totalMileage', 'TotalMileage'))
          if (val !== null && val > 0) {
            car.mileage = val
          }
        }

        // Location - check device_tracker and location attributes
        if (entity.entity_id.startsWith('device_tracker.')) {
          car.location = state === 'home' ? 'Home' : state === 'not_home' ? 'Away' : state
          car.isHome = state === 'home'
        }
        // Check for location in attributes (some integrations use this)
        if (car.location === undefined) {
          const location = getAttr(attrs, 'location', 'Location', 'zone', 'Zone')
          if (location !== undefined) {
            car.location = String(location)
            car.isHome = String(location).toLowerCase() === 'home'
          }
        }

        // Charging status - check state and attributes (Ford uses chargingStatus, plugStatus)
        if (id.includes('charging') || id.includes('charger') || id.includes('plug')) {
          car.isCharging = state === 'on' || state === 'charging' || state === 'true' || state === 'Charging'
        }
        // Check charging attributes
        const chargingVal = getAttr(attrs, 'is_charging', 'isCharging', 'IsCharging', 'charging', 'Charging', 'chargingstatus', 'chargingStatus', 'ChargingStatus', 'plugStatus', 'PlugStatus')
        if (chargingVal !== undefined) {
          car.isCharging = chargingVal === true || chargingVal === 'on' || chargingVal === 'charging' || chargingVal === 'Charging' || chargingVal === 'true' || chargingVal === 'Connected'
        }

        // Lock status - check lock entity and attributes (Ford uses lockStatus)
        if (entity.entity_id.startsWith('lock.')) {
          car.isLocked = state === 'locked'
        }
        // Check lock attributes
        const lockedVal = getAttr(attrs, 'locked', 'Locked', 'lockStatus', 'LockStatus', 'lock_status', 'doorlockstate', 'doorLockState', 'DoorLockState')
        if (lockedVal !== undefined && car.isLocked === undefined) {
          car.isLocked = lockedVal === true || lockedVal === 'locked' || lockedVal === 'Locked' || lockedVal === 1
        }

        // Alarm status - check fordpass_alarm and alarm entities
        if (id.includes('fordpass_alarm') || id.includes('alarm')) {
          if (state && state !== 'unknown' && state !== 'unavailable') {
            car.alarmStatus = state
          }
        }

        // Door status
        if (id.includes('door') && entity.entity_id.startsWith('binary_sensor.')) {
          if (state === 'on' || state === 'open') {
            if (!car.doorsOpen) car.doorsOpen = []
            const doorName = (attrs.friendly_name as string)?.replace(/mercedes|ford/gi, '').trim() || 'Door'
            car.doorsOpen.push(doorName)
          }
        }
        // Check door status in attributes (Mercedes/Ford style) - only trigger on explicitly "open" values
        const doorAttrVariants = [
          ['doorstatusfrontleft', 'doorStatusFrontLeft', 'DoorStatusFrontLeft', 'leftFrontDoor', 'LeftFrontDoor'],
          ['doorstatusfrontright', 'doorStatusFrontRight', 'DoorStatusFrontRight', 'rightFrontDoor', 'RightFrontDoor'],
          ['doorstatusrearleft', 'doorStatusRearLeft', 'DoorStatusRearLeft', 'leftRearDoor', 'LeftRearDoor'],
          ['doorstatusrearright', 'doorStatusRearRight', 'DoorStatusRearRight', 'rightRearDoor', 'RightRearDoor']
        ]
        const doorNames = ['Front Left', 'Front Right', 'Rear Left', 'Rear Right']
        // Values that indicate door is OPEN (be strict)
        const openDoorValues = ['open', 'Open', 'OPEN', true, 'on', 'On', 'ON', 1, '1']
        doorAttrVariants.forEach((attrVariants, idx) => {
          const doorVal = getAttr(attrs, ...attrVariants)
          // Only add if explicitly open, not just "not closed"
          if (doorVal !== undefined && openDoorValues.includes(doorVal as string | boolean | number)) {
            if (!car.doorsOpen) car.doorsOpen = []
            if (!car.doorsOpen.includes(doorNames[idx])) {
              car.doorsOpen.push(doorNames[idx])
            }
          }
        })

        // Window status - only trigger on explicit "open" state (not "on" which could be other sensors)
        if (id.includes('window') && entity.entity_id.startsWith('binary_sensor.')) {
          if (state === 'open') {
            if (!car.windowsOpen) car.windowsOpen = []
            const windowName = (attrs.friendly_name as string)?.replace(/mercedes|ford/gi, '').trim() || 'Window'
            if (!car.windowsOpen.includes(windowName)) {
              car.windowsOpen.push(windowName)
            }
          }
        }
        // Check window status in attributes - only trigger on explicitly "open" values
        const windowAttrNames = [
          ['windowstatusfrontleft', 'windowStatusFrontLeft', 'WindowStatusFrontLeft', 'leftFrontWindow', 'LeftFrontWindow'],
          ['windowstatusfrontright', 'windowStatusFrontRight', 'WindowStatusFrontRight', 'rightFrontWindow', 'RightFrontWindow'],
          ['windowstatusrearleft', 'windowStatusRearLeft', 'WindowStatusRearLeft', 'leftRearWindow', 'LeftRearWindow'],
          ['windowstatusrearright', 'windowStatusRearRight', 'WindowStatusRearRight', 'rightRearWindow', 'RightRearWindow']
        ]
        const windowNames = ['Front Left', 'Front Right', 'Rear Left', 'Rear Right']
        // Values that indicate window is OPEN (be strict - only trigger on explicit open states)
        const openWindowValues = ['open', 'Open', 'OPEN', true, 'on', 'On', 'ON', 1, '1']
        windowAttrNames.forEach((attrVariants, idx) => {
          const windowVal = getAttr(attrs, ...attrVariants)
          // Only add if explicitly open, not just "not closed"
          if (windowVal !== undefined && openWindowValues.includes(windowVal as string | boolean | number)) {
            if (!car.windowsOpen) car.windowsOpen = []
            if (!car.windowsOpen.includes(windowNames[idx])) {
              car.windowsOpen.push(windowNames[idx])
            }
          }
        })

        // Tire pressure - check state and attributes (Ford uses tirePressure* or TirePressure*)
        if (id.includes('tire') && id.includes('pressure')) {
          const val = parseNumeric(state)
          if (val !== null) {
            if (!car.tirePressure) car.tirePressure = {}
            const tireName = (attrs.friendly_name as string)?.match(/(front|rear|left|right)/gi)?.join(' ') || 'Tire'
            car.tirePressure[tireName] = val
          }
        }
        // Check tire pressure in attributes
        const tireAttrNames = [
          ['tirepressurefrontleft', 'tirePressureFrontLeft', 'TirePressureFrontLeft', 'leftFrontTirePressure', 'LeftFrontTirePressure'],
          ['tirepressurefrontright', 'tirePressureFrontRight', 'TirePressureFrontRight', 'rightFrontTirePressure', 'RightFrontTirePressure'],
          ['tirepressurerearleft', 'tirePressureRearLeft', 'TirePressureRearLeft', 'leftRearTirePressure', 'LeftRearTirePressure'],
          ['tirepressurerearright', 'tirePressureRearRight', 'TirePressureRearRight', 'rightRearTirePressure', 'RightRearTirePressure']
        ]
        const tireNames = ['Front Left', 'Front Right', 'Rear Left', 'Rear Right']
        tireAttrNames.forEach((attrVariants, idx) => {
          const val = parseNumeric(getAttr(attrs, ...attrVariants))
          if (val !== null && val > 0) {
            if (!car.tirePressure) car.tirePressure = {}
            car.tirePressure[tireNames[idx]] = val
          }
        })

        // Oil Life - check state and attributes (Ford uses fordpass_oil, oilLife, OilLife, oil_life_remaining)
        if (id.includes('fordpass_oil') || (id.includes('oil') && (id.includes('life') || id.includes('remaining')))) {
          const val = parseNumeric(state) ?? parseNumeric(getAttr(attrs, 'oil_life', 'oilLife', 'OilLife', 'oilLifeRemaining', 'OilLifeRemaining', 'oil_life_remaining'))
          if (val !== null && val >= 0) {
            car.oilLife = Math.min(100, val)
          }
        }
        // Check oil life in attributes on all entities
        if (car.oilLife === undefined) {
          const val = parseNumeric(getAttr(attrs, 'oil_life', 'oilLife', 'OilLife', 'oilLifeRemaining', 'OilLifeRemaining', 'oil_life_remaining', 'oilLifeActual', 'OilLifeActual'))
          if (val !== null && val >= 0) {
            car.oilLife = Math.min(100, val)
          }
        }

        // DEF Level (Diesel Exhaust Fluid) - check state and attributes (Ford uses dieselExhaustFluid, DEFLevel, exhaustfluidlevel)
        if (id.includes('def') || id.includes('diesel') || id.includes('urea') || id.includes('adblue') || id.includes('exhaustfluid') || id.includes('exhaust_fluid')) {
          const val = parseNumeric(state) ?? parseNumeric(getAttr(attrs, 'def_level', 'defLevel', 'DEFLevel', 'dieselExhaustFluid', 'DieselExhaustFluid', 'diesel_exhaust_fluid'))
          if (val !== null && val >= 0 && val <= 100) {
            car.defLevel = val
          }
        }
        // Check DEF level in attributes on all entities
        if (car.defLevel === undefined) {
          const val = parseNumeric(getAttr(attrs, 'def_level', 'defLevel', 'DEFLevel', 'dieselExhaustFluid', 'DieselExhaustFluid', 'diesel_exhaust_fluid', 'urea_level', 'ureaLevel', 'UreaLevel', 'adblue_level', 'adblueLevel', 'AdblueLevel', 'dieselExhaustFluidLevel', 'DieselExhaustFluidLevel'))
          if (val !== null && val >= 0 && val <= 100) {
            car.defLevel = val
          }
        }

        // Try to get a better name from friendly_name or model attribute
        const friendlyName = attrs.friendly_name as string | undefined
        const modelName = getAttr(attrs, 'model', 'Model', 'vehicle_model', 'vehicleModel', 'VehicleModel', 'modelName', 'ModelName') as string | undefined

        if (modelName && car.name === (car.brand === 'mercedes' ? 'Mercedes' : 'Ford')) {
          if (car.brand === 'mercedes') {
            car.name = `Mercedes ${modelName}`
          } else if (car.brand === 'ford') {
            car.name = `Ford ${modelName}`
          }
        } else if (friendlyName && car.name === (car.brand === 'mercedes' ? 'Mercedes' : 'Ford')) {
          if (car.brand === 'mercedes' && friendlyName.toLowerCase().includes('mercedes')) {
            const modelMatch = friendlyName.match(/mercedes[- ]?([\w\s]+?)(?:\s|$)/i)
            if (modelMatch && modelMatch[1]) {
              car.name = `Mercedes ${modelMatch[1].trim()}`
            }
          } else if (car.brand === 'ford' && friendlyName.toLowerCase().includes('ford')) {
            const modelMatch = friendlyName.match(/ford[- ]?([\w\s]+?)(?:\s|$)/i)
            if (modelMatch && modelMatch[1]) {
              car.name = `Ford ${modelMatch[1].trim()}`
            }
          }
        }
      })

      cars.set(key, car)
    })

    return Array.from(cars.values())
  }, [entities, hiddenEntities])

  if (carData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="glass-card p-8">
          <div className="text-6xl mb-4">🚗</div>
          <h2 className="text-xl font-semibold text-slate-800 mb-2">No Vehicles Found</h2>
          <p className="text-slate-500 max-w-sm">
            Connect your Mercedes or Ford vehicle to Home Assistant to see it here.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      {carData.map((car, index) => (
        <CarCard key={`${car.brand}-${index}`} car={car} />
      ))}
    </div>
  )
}

function CarCard({ car }: { car: CarData }) {
  const getBrandIcon = () => {
    if (car.brand === 'mercedes') return '⭐'
    if (car.brand === 'ford') return '🔵'
    return '🚗'
  }

  // Determine primary energy source display
  const hasBattery = car.batteryLevel !== undefined
  const hasBatteryStatus = car.batteryStatus !== undefined
  const hasFuel = car.fuelLevel !== undefined
  const hasDef = car.defLevel !== undefined
  const primaryRange = car.electricRange || car.range

  // Alarm armed means doors are effectively locked
  const isAlarmArmed = car.alarmStatus?.toLowerCase() === 'set' || car.alarmStatus?.toLowerCase() === 'armed'
  const effectivelyLocked = isAlarmArmed || car.isLocked

  // Get battery status color based on text value
  const getBatteryStatusColor = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'green' || s === 'good' || s === 'ok') return { text: 'text-green-600', bg: 'bg-green-500/15' }
    if (s === 'yellow' || s === 'warning' || s === 'medium') return { text: 'text-yellow-600', bg: 'bg-yellow-500/15' }
    if (s === 'red' || s === 'critical' || s === 'low') return { text: 'text-red-600', bg: 'bg-red-500/15' }
    return { text: 'text-slate-500', bg: 'bg-slate-200' }
  }

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{getBrandIcon()}</span>
            <div>
              <h2 className="text-lg font-semibold text-slate-800">{car.name}</h2>
              {(car.location || effectivelyLocked) && (
                <p className={`text-sm ${car.isHome ? 'text-green-600' : 'text-slate-500'}`}>
                  {car.isHome ? '📍 ' : ''}{car.location}{car.location && effectivelyLocked ? ' • ' : ''}{effectivelyLocked ? '🔒 Secured' : ''}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {car.alarmStatus && (
              <div className={`glass-panel px-3 py-1.5 rounded-lg ${
                isAlarmArmed
                  ? 'bg-green-500/15'
                  : 'bg-slate-200'
              }`}>
                <span className={`text-sm font-medium ${
                  isAlarmArmed
                    ? 'text-green-600'
                    : 'text-slate-500'
                }`}>
                  🚨 {car.alarmStatus}
                </span>
              </div>
            )}
            {(car.isLocked !== undefined || isAlarmArmed) && (
              <div className={`glass-panel px-3 py-1.5 rounded-lg ${effectivelyLocked ? 'bg-green-500/15' : 'bg-yellow-500/15'}`}>
                <span className={`text-sm font-medium ${effectivelyLocked ? 'text-green-600' : 'text-yellow-600'}`}>
                  {effectivelyLocked ? '🔒 Locked' : '🔓 Unlocked'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Energy Levels */}
      {(hasBattery || hasBatteryStatus || hasFuel || hasDef) && (
        <div className="px-5 py-4 border-t border-slate-200">
          <div className="grid grid-cols-2 gap-4">
            {/* Battery Status - text-based (Mercedes style) - show this FIRST if available */}
            {hasBatteryStatus && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-500">Battery</span>
                </div>
                <div className={`glass-panel px-3 py-2 rounded-lg ${getBatteryStatusColor(car.batteryStatus!).bg}`}>
                  <span className={`text-sm font-medium capitalize ${getBatteryStatusColor(car.batteryStatus!).text}`}>
                    {car.batteryStatus}
                  </span>
                </div>
              </div>
            )}

            {/* Battery - numeric percentage (only if no text status) */}
            {!hasBatteryStatus && hasBattery && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-500">Battery</span>
                  <span className="text-sm font-medium text-slate-800">{Math.round(car.batteryLevel!)}%</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      car.batteryLevel! > 50 ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
                      car.batteryLevel! > 20 ? 'bg-gradient-to-r from-yellow-500 to-amber-400' : 'bg-gradient-to-r from-red-500 to-orange-400'
                    }`}
                    style={{ width: `${car.batteryLevel}%` }}
                  />
                </div>
                {car.isCharging && (
                  <p className="text-xs text-green-600 mt-1">⚡ Charging</p>
                )}
              </div>
            )}

            {/* Fuel */}
            {hasFuel && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-500">Fuel</span>
                  <span className="text-sm font-medium text-slate-800">{Math.round(car.fuelLevel!)}%</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      car.fuelLevel! > 50 ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
                      car.fuelLevel! > 20 ? 'bg-gradient-to-r from-yellow-500 to-amber-400' : 'bg-gradient-to-r from-red-500 to-orange-400'
                    }`}
                    style={{ width: `${car.fuelLevel}%` }}
                  />
                </div>
              </div>
            )}

            {/* DEF Level */}
            {hasDef && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-500">DEF</span>
                  <span className="text-sm font-medium text-slate-800">{Math.round(car.defLevel!)}%</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      car.defLevel! > 30 ? 'bg-gradient-to-r from-blue-500 to-cyan-400' :
                      car.defLevel! > 10 ? 'bg-gradient-to-r from-yellow-500 to-amber-400' : 'bg-gradient-to-r from-red-500 to-orange-400'
                    }`}
                    style={{ width: `${car.defLevel}%` }}
                  />
                </div>
                {car.defLevel! <= 10 && (
                  <p className="text-xs text-red-600 mt-1">Refill needed</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Key Stats */}
      <div className="px-5 py-4 border-t border-slate-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          {/* Range */}
          {primaryRange !== undefined && (
            <div className="glass-panel p-3 rounded-xl">
              <p className="text-2xl font-semibold text-slate-800">{Math.round(primaryRange)}</p>
              <p className="text-xs text-slate-500">mi range</p>
            </div>
          )}

          {/* Mileage */}
          {car.mileage !== undefined && (
            <div className="glass-panel p-3 rounded-xl">
              <p className="text-2xl font-semibold text-slate-800">{Math.round(car.mileage).toLocaleString()}</p>
              <p className="text-xs text-slate-500">miles</p>
            </div>
          )}

          {/* Placeholder for third stat or empty */}
          {(primaryRange !== undefined || car.mileage !== undefined) &&
           !(primaryRange !== undefined && car.mileage !== undefined) && (
            <div></div>
          )}
        </div>
      </div>

      {/* Alerts - Doors/Windows open */}
      {((car.doorsOpen && car.doorsOpen.length > 0) || (car.windowsOpen && car.windowsOpen.length > 0)) && (
        <div className="px-5 py-3 bg-yellow-500/10 border-t border-yellow-500/20">
          <div className="flex items-center gap-2">
            <span className="text-yellow-600">⚠️</span>
            <div className="text-sm text-yellow-700">
              {car.doorsOpen && car.doorsOpen.length > 0 && (
                <span>{car.doorsOpen.length} door{car.doorsOpen.length > 1 ? 's' : ''} open</span>
              )}
              {car.doorsOpen && car.doorsOpen.length > 0 && car.windowsOpen && car.windowsOpen.length > 0 && (
                <span> · </span>
              )}
              {car.windowsOpen && car.windowsOpen.length > 0 && (
                <span>{car.windowsOpen.length} window{car.windowsOpen.length > 1 ? 's' : ''} open</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Maintenance - Oil Life */}
      {car.oilLife !== undefined && (
        <div className="px-5 py-4 border-t border-slate-200">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-500">Oil Life</span>
              <span className="text-sm font-medium text-slate-800">{Math.round(car.oilLife)}%</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  car.oilLife > 30 ? 'bg-gradient-to-r from-green-500 to-emerald-400' :
                  car.oilLife > 10 ? 'bg-gradient-to-r from-yellow-500 to-amber-400' : 'bg-gradient-to-r from-red-500 to-orange-400'
                }`}
                style={{ width: `${car.oilLife}%` }}
              />
            </div>
            {car.oilLife <= 10 && (
              <p className="text-xs text-red-600 mt-1">Service needed</p>
            )}
          </div>
        </div>
      )}

      {/* Tire Pressure */}
      {car.tirePressure && Object.keys(car.tirePressure).length > 0 && (
        <div className="px-5 py-4 border-t border-slate-200">
          <p className="text-sm text-slate-500 mb-3">Tire Pressure</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(car.tirePressure).map(([tire, pressure]) => (
              <div key={tire} className="flex items-center justify-between glass-panel rounded-lg px-3 py-2">
                <span className="text-xs text-slate-500 capitalize">{tire}</span>
                <span className="text-sm font-medium text-slate-800">{pressure} PSI</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
