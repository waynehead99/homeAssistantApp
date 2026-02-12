// Home Assistant entity state
export interface HAState {
  entity_id: string
  state: string
  attributes: HAAttributes
  last_changed: string
  last_updated: string
}

// Area/Room from Home Assistant
export interface HAArea {
  area_id: string
  name: string
  picture: string | null
}

// Entity registry entry (contains area mapping)
export interface HAEntityRegistryEntry {
  entity_id: string
  area_id: string | null
  device_id: string | null
  name: string | null
  original_name: string | null
}

// Common attributes for entities
export interface HAAttributes {
  friendly_name?: string
  icon?: string
  [key: string]: unknown
}

// Light-specific attributes
export interface LightAttributes extends HAAttributes {
  brightness?: number // 0-255
  color_mode?: string
  supported_color_modes?: string[]
  min_mireds?: number
  max_mireds?: number
  color_temp?: number
  rgb_color?: [number, number, number]
  hs_color?: [number, number]
}

// Light entity with typed attributes
export interface LightEntity extends HAState {
  attributes: LightAttributes
}

// Switch-specific attributes
export interface SwitchAttributes extends HAAttributes {
  device_class?: string
  current_power_w?: number
  today_energy_kwh?: number
}

// Switch entity
export interface SwitchEntity extends HAState {
  attributes: SwitchAttributes
}

// Sensor-specific attributes
export interface SensorAttributes extends HAAttributes {
  device_class?: string
  state_class?: string
  unit_of_measurement?: string
  native_value?: number | string
}

// Sensor entity
export interface SensorEntity extends HAState {
  attributes: SensorAttributes
}

// Binary sensor attributes
export interface BinarySensorAttributes extends HAAttributes {
  device_class?: string
}

// Binary sensor entity (doors, windows, motion, etc.)
export interface BinarySensorEntity extends HAState {
  attributes: BinarySensorAttributes
}

// Weather forecast entry
export interface WeatherForecast {
  datetime: string
  temperature: number
  templow?: number
  condition?: string
  precipitation?: number
  precipitation_probability?: number
  wind_speed?: number
  wind_bearing?: number
  humidity?: number
  is_daytime?: boolean
}

// Weather-specific attributes
export interface WeatherAttributes extends HAAttributes {
  temperature?: number
  temperature_unit?: string
  humidity?: number
  pressure?: number
  wind_speed?: number
  wind_bearing?: number
  visibility?: number
  condition?: string // sunny, cloudy, rainy, snowy, etc.
  forecast?: WeatherForecast[]
  // Extended attributes
  apparent_temperature?: number
  dew_point?: number
  uv_index?: number
  ozone?: number
  cloud_coverage?: number
  precipitation?: number
  precipitation_unit?: string
  // Sun times
  next_dawn?: string
  next_rising?: string
  next_noon?: string
  next_setting?: string
  next_dusk?: string
  next_midnight?: string
}

// Weather entity
export interface WeatherEntity extends HAState {
  attributes: WeatherAttributes
}

// Person-specific attributes
export interface PersonAttributes extends HAAttributes {
  latitude?: number
  longitude?: number
  gps_accuracy?: number
  source?: string
  user_id?: string
  device_trackers?: string[]
  entity_picture?: string
}

// Person entity (location tracking)
export interface PersonEntity extends HAState {
  attributes: PersonAttributes
}

// Camera-specific attributes (Frigate)
export interface CameraAttributes extends HAAttributes {
  access_token?: string
  frontend_stream_type?: string
  model_name?: string
  brand?: string
  motion_detection?: boolean
}

// Camera entity
export interface CameraEntity extends HAState {
  attributes: CameraAttributes
}

// Frigate detection event
export interface FrigateEvent {
  id: string
  camera: string
  label: string // person, car, dog, etc.
  sub_label?: string | null
  top_score?: number // Some Frigate versions use this
  score?: number // Some Frigate versions use this
  data?: {
    score?: number
    top_score?: number
    description?: string
  }
  start_time: number
  end_time: number | null
  thumbnail?: string // base64 or path
  has_clip: boolean
  has_snapshot: boolean
  zones?: string[]
  description?: string | null
}

// Calendar event (from HA calendar API)
export interface CalendarEvent {
  summary: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
  location?: string
  description?: string
}

// Calendar-specific attributes
export interface CalendarAttributes extends HAAttributes {
  message?: string
  all_day?: boolean
  start_time?: string
  end_time?: string
  location?: string
  description?: string
}

// Calendar entity
export interface CalendarEntity extends HAState {
  attributes: CalendarAttributes
}

// Climate/HVAC-specific attributes
export interface ClimateAttributes extends HAAttributes {
  hvac_modes?: string[] // off, heat, cool, heat_cool, auto, dry, fan_only
  hvac_action?: string // heating, cooling, idle, off
  current_temperature?: number
  temperature?: number // target temp (single setpoint)
  target_temp_high?: number
  target_temp_low?: number
  min_temp?: number
  max_temp?: number
  fan_mode?: string
  fan_modes?: string[]
  preset_mode?: string
  preset_modes?: string[]
}

// Climate entity (HVAC)
export interface ClimateEntity extends HAState {
  attributes: ClimateAttributes
}

// Vacuum-specific attributes
export interface VacuumAttributes extends HAAttributes {
  battery_level?: number
  fan_speed?: string
  fan_speed_list?: string[]
  status?: string
}

// Vacuum entity
export interface VacuumEntity extends HAState {
  attributes: VacuumAttributes
}

// Alarm control panel attributes
export interface AlarmAttributes extends HAAttributes {
  code_format?: string
  changed_by?: string
  code_arm_required?: boolean
  supported_features?: number
}

// Alarm control panel entity
export interface AlarmEntity extends HAState {
  attributes: AlarmAttributes
}

// Valve/irrigation attributes
export interface ValveAttributes extends HAAttributes {
  device_class?: string // water, gas, etc.
  current_position?: number
}

// Valve entity (sprinklers, water valves)
export interface ValveEntity extends HAState {
  attributes: ValveAttributes
}

// Fan-specific attributes
export interface FanAttributes extends HAAttributes {
  percentage?: number // 0-100 speed percentage
  percentage_step?: number // Step size for percentage
  preset_mode?: string // Current preset mode (auto, low, medium, high, etc.)
  preset_modes?: string[] // Available preset modes
  oscillating?: boolean // Is oscillation on
  direction?: 'forward' | 'reverse' // Fan direction
  supported_features?: number // Bitmask of supported features
}

// Fan supported features bitmask
export const FanSupportedFeatures = {
  SET_SPEED: 1,
  OSCILLATE: 2,
  DIRECTION: 4,
  PRESET_MODE: 8,
  TURN_OFF: 16,
  TURN_ON: 32,
} as const

// Fan entity
export interface FanEntity extends HAState {
  attributes: FanAttributes
}

// Lock-specific attributes
export interface LockAttributes extends HAAttributes {
  changed_by?: string // Who/what changed the lock state
  code_format?: string // Format for code entry (e.g., "^\\d{4,}$")
  supported_features?: number
}

// Lock supported features bitmask
export const LockSupportedFeatures = {
  OPEN: 1, // Can open (unlatch) without unlocking
} as const

// Lock entity
export interface LockEntity extends HAState {
  attributes: LockAttributes
}

// Cover-specific attributes (blinds, shades, garage doors)
export interface CoverAttributes extends HAAttributes {
  device_class?: 'awning' | 'blind' | 'curtain' | 'damper' | 'door' | 'garage' | 'gate' | 'shade' | 'shutter' | 'window'
  current_position?: number // 0-100, 0 = closed, 100 = open
  current_tilt_position?: number // 0-100
  supported_features?: number
}

// Cover supported features bitmask
export const CoverSupportedFeatures = {
  OPEN: 1,
  CLOSE: 2,
  SET_POSITION: 4,
  STOP: 8,
  OPEN_TILT: 16,
  CLOSE_TILT: 32,
  STOP_TILT: 64,
  SET_TILT_POSITION: 128,
} as const

// Cover entity
export interface CoverEntity extends HAState {
  attributes: CoverAttributes
}

// Automation-specific attributes
export interface AutomationAttributes extends HAAttributes {
  id?: string
  last_triggered?: string
  mode?: 'single' | 'restart' | 'queued' | 'parallel'
  current?: number // Number of running instances
  max?: number // Max concurrent runs (for parallel/queued)
}

// Automation entity
export interface AutomationEntity extends HAState {
  attributes: AutomationAttributes
}

// Script-specific attributes
export interface ScriptAttributes extends HAAttributes {
  last_triggered?: string
  mode?: 'single' | 'restart' | 'queued' | 'parallel'
  current?: number // Number of running instances
  max?: number // Max concurrent runs
}

// Script entity
export interface ScriptEntity extends HAState {
  attributes: ScriptAttributes
}

// Entity type for grouping
export type EntityType = 'light' | 'switch' | 'sensor' | 'binary_sensor' | 'weather' | 'person' | 'camera' | 'calendar' | 'climate' | 'vacuum' | 'alarm_control_panel' | 'valve' | 'fan' | 'lock' | 'cover' | 'automation' | 'script'

// Generic controllable entity (lights and switches)
export type ControllableEntity = LightEntity | SwitchEntity | ClimateEntity | VacuumEntity | AlarmEntity | ValveEntity | FanEntity | LockEntity | CoverEntity | AutomationEntity | ScriptEntity

// Service call data
export interface ServiceCallData {
  entity_id: string | string[]
  brightness?: number // 0-255
  brightness_pct?: number // 0-100
  [key: string]: unknown
}

// API response types
export interface HAApiError {
  message: string
  code?: string
}

// Connection status
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

// Scene entity
export interface SceneEntity extends HAState {
  attributes: HAAttributes & {
    entity_id?: string[]
  }
}

// Webhook configuration
export interface WebhookConfig {
  id: string
  name: string
  webhookId: string
  icon?: string
}

// Device from Home Assistant device registry
export interface HADevice {
  device_id: string
  name: string
  manufacturer?: string
  model?: string
  area_id?: string | null
}
