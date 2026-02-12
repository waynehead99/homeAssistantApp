import type { SensorEntity } from '../types/homeAssistant'

// Get temperature and humidity for an area from its sensors
export function getAreaClimate(sensors: SensorEntity[]): { temp: string | null; humidity: string | null } {
  const tempSensor = sensors.find(s => s.attributes.device_class === 'temperature')
  const humiditySensor = sensors.find(s => s.attributes.device_class === 'humidity')

  const tempVal = tempSensor ? parseFloat(tempSensor.state) : NaN
  const humidityVal = humiditySensor ? parseFloat(humiditySensor.state) : NaN

  return {
    temp: !isNaN(tempVal) ? `${Math.round(tempVal)}°` : null,
    humidity: !isNaN(humidityVal) ? `${Math.round(humidityVal)}%` : null,
  }
}
