import React from 'react'
import { MapPin, Thermometer, AlertTriangle } from 'lucide-react'

interface SensorLocation {
  id: string
  sensor_id_local: string | null
  x: number // percentage from left
  y: number // percentage from top
  status: 'active' | 'maintenance' | 'decommissioned'
  current_value: number | null
  has_alert: boolean
}

interface FloorplanProps {
  sensors?: SensorLocation[]
  width?: number
  height?: number
  className?: string
}

export const Floorplan: React.FC<FloorplanProps> = ({
  sensors = [],
  width = 800,
  height = 600,
  className = ''
}) => {
  const getSensorColor = (status: string, hasAlert: boolean) => {
    if (hasAlert) return 'text-red-500'
    switch (status) {
      case 'active': return 'text-green-500'
      case 'maintenance': return 'text-yellow-500'
      case 'decommissioned': return 'text-gray-400'
      default: return 'text-gray-500'
    }
  }

  const getSensorIcon = (status: string, hasAlert: boolean) => {
    if (hasAlert) return <AlertTriangle className="w-4 h-4" />
    return <Thermometer className="w-4 h-4" />
  }

  return (
    <div className={`relative bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 ${className}`}>
      {/* Floorplan Background */}
      <div
        className="relative bg-white rounded-lg shadow-inner"
        style={{ width, height }}
      >
        {/* Grid lines for reference */}
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full grid grid-cols-10 grid-rows-10">
            {Array.from({ length: 100 }).map((_, i) => (
              <div key={i} className="border border-gray-200"></div>
            ))}
          </div>
        </div>

        {/* Sample floorplan elements */}
        <div className="absolute inset-4">
          {/* Walls */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gray-400"></div>
          <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-400"></div>
          <div className="absolute top-0 left-0 w-1 h-full bg-gray-400"></div>
          <div className="absolute top-0 right-0 w-1 h-full bg-gray-400"></div>

          {/* Internal walls */}
          <div className="absolute top-1/4 left-1/3 w-1/3 h-1 bg-gray-300"></div>
          <div className="absolute top-1/2 left-0 w-1/2 h-1 bg-gray-300"></div>

          {/* Equipment areas */}
          <div className="absolute top-8 left-8 w-32 h-24 bg-blue-100 rounded border border-blue-200 flex items-center justify-center">
            <span className="text-xs text-blue-700 font-medium">Cold Storage A</span>
          </div>

          <div className="absolute top-8 right-8 w-32 h-24 bg-green-100 rounded border border-green-200 flex items-center justify-center">
            <span className="text-xs text-green-700 font-medium">Freezer Unit</span>
          </div>

          <div className="absolute bottom-8 left-8 w-32 h-24 bg-purple-100 rounded border border-purple-200 flex items-center justify-center">
            <span className="text-xs text-purple-700 font-medium">Chiller Room</span>
          </div>

          {/* Sensor locations */}
          {sensors.map((sensor) => (
            <div
              key={sensor.id}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 ${getSensorColor(sensor.status, sensor.has_alert)}`}
              style={{
                left: `${sensor.x}%`,
                top: `${sensor.y}%`
              }}
            >
              <div className="relative group">
                {getSensorIcon(sensor.status, sensor.has_alert)}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                  <div className="font-medium">
                    {sensor.sensor_id_local || `Sensor ${sensor.id.slice(-4)}`}
                  </div>
                  {sensor.current_value && (
                    <div>{sensor.current_value.toFixed(1)}°C</div>
                  )}
                  <div className={`text-xs ${sensor.has_alert ? 'text-red-300' : 'text-gray-300'}`}>
                    {sensor.has_alert ? 'Alert Active' : sensor.status}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Legend */}
          <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow p-3 text-xs">
            <div className="font-medium mb-2">Legend</div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Thermometer className="w-3 h-3 text-green-500" />
                <span>Active Sensor</span>
              </div>
              <div className="flex items-center space-x-2">
                <Thermometer className="w-3 h-3 text-yellow-500" />
                <span>Maintenance</span>
              </div>
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-3 h-3 text-red-500" />
                <span>Alert Active</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Placeholder message */}
      <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-90 rounded-lg">
        <div className="text-center">
          <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Interactive Floorplan</h3>
          <p className="text-gray-600 max-w-md">
            This floorplan shows sensor locations and real-time status. In a full implementation,
            you would be able to click sensors for details and see live temperature overlays.
          </p>
          <div className="mt-4 text-sm text-gray-500">
            {sensors.length} sensors positioned • Interactive features coming soon
          </div>
        </div>
      </div>
    </div>
  )
}

export default Floorplan