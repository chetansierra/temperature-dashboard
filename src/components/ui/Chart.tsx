'use client'

import React from 'react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

export interface ChartDataPoint {
  timestamp: string
  value?: number | null
  [key: string]: any
}

export interface ChartProps {
  type: 'line' | 'area' | 'bar'
  data: ChartDataPoint[]
  width?: number | string
  height?: number | string
  xAxisKey?: string
  yAxisKey?: string
  color?: string
  showGrid?: boolean
  showTooltip?: boolean
  showLegend?: boolean
  className?: string
  loading?: boolean
  error?: string
  seriesKeys?: string[]
}

const Chart: React.FC<ChartProps> = ({
  type = 'line',
  data,
  width = '100%',
  height = 300,
  xAxisKey = 'timestamp',
  yAxisKey = 'value',
  color = '#3b82f6',
  showGrid = true,
  showTooltip = true,
  showLegend = false,
  className = '',
  loading = false,
  error,
  seriesKeys
}) => {
  // Loading state
  if (loading) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading chart data...</span>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <div className="text-center">
          <div className="text-red-500 mb-2">⚠️ Chart Error</div>
          <div className="text-sm text-gray-600">{error}</div>
        </div>
      </div>
    )
  }

  // No data state
  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <div className="text-center">
          <div className="text-gray-400 mb-2">📊 No Data</div>
          <div className="text-sm text-gray-500">No chart data available</div>
        </div>
      </div>
    )
  }

  // Format timestamp for display
  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp)
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      })
    } catch {
      return timestamp
    }
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm text-gray-600 mb-1">
            {new Date(label).toLocaleString()}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm font-medium" style={{ color: entry.color }}>
              {`${entry.name}: ${entry.value}°C`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const commonProps = {
    data,
    margin: { top: 5, right: 30, left: 20, bottom: 5 }
  }

  const seriesToRender = React.useMemo(() => {
    if (!data || data.length === 0) return [] as string[]
    if (seriesKeys && seriesKeys.length > 0) return seriesKeys

    const keys = Array.from(
      new Set(
        data.flatMap(point => Object.keys(point ?? {}))
      )
    ).filter(key => key !== xAxisKey)

    if (yAxisKey && keys.includes(yAxisKey)) {
      return [yAxisKey]
    }

    return keys
  }, [data, seriesKeys, xAxisKey, yAxisKey])

  // No renderable series -> treat as empty data
  if (seriesToRender.length === 0) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height }}>
        <div className="text-center">
          <div className="text-gray-400 mb-2">📊 No Data</div>
          <div className="text-sm text-gray-500">No chart data available</div>
        </div>
      </div>
    )
  }

  const palette = React.useMemo(() => {
    const basePalette = [
      '#2563eb', // blue-600
      '#16a34a', // green-600
      '#f97316', // orange-500
      '#9333ea', // purple-600
      '#ef4444', // red-500
      '#0ea5e9', // sky-500
      '#14b8a6', // teal-500
      '#facc15', // yellow-400
      '#a855f7', // violet-500
      '#22d3ee'  // cyan-400
    ]

    if (seriesToRender.length <= 1) {
      return [color]
    }

    // Ensure we always include provided color as first entry for consistency
    const paletteWithPrimary = [color, ...basePalette.filter(p => p !== color)]
    return seriesToRender.map((_, index) => paletteWithPrimary[index % paletteWithPrimary.length])
  }, [seriesToRender, color])

  const renderChart = () => {
    switch (type) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
            <XAxis 
              dataKey={xAxisKey} 
              tickFormatter={formatTimestamp}
              stroke="#666"
              fontSize={12}
            />
            <YAxis 
              stroke="#666"
              fontSize={12}
              label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft' }}
            />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend />}
            {seriesToRender.map((seriesKey, index) => (
              <Area
                key={seriesKey}
                type="monotone"
                dataKey={seriesKey}
                stroke={palette[index % palette.length]}
                fill={palette[index % palette.length]}
                fillOpacity={0.25}
                strokeWidth={2}
                name={seriesKey}
                connectNulls
              />
            ))}
          </AreaChart>
        )

      case 'bar':
        return (
          <BarChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
            <XAxis 
              dataKey={xAxisKey} 
              tickFormatter={formatTimestamp}
              stroke="#666"
              fontSize={12}
            />
            <YAxis 
              stroke="#666"
              fontSize={12}
              label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft' }}
            />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend />}
            {seriesToRender.map((seriesKey, index) => (
              <Bar
                key={seriesKey}
                dataKey={seriesKey}
                fill={palette[index % palette.length]}
                name={seriesKey}
              />
            ))}
          </BarChart>
        )

      default: // line
        return (
          <LineChart {...commonProps}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
            <XAxis 
              dataKey={xAxisKey} 
              tickFormatter={formatTimestamp}
              stroke="#666"
              fontSize={12}
            />
            <YAxis 
              stroke="#666"
              fontSize={12}
              label={{ value: 'Temperature (°C)', angle: -90, position: 'insideLeft' }}
            />
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend />}
            {seriesToRender.map((seriesKey, index) => {
              const seriesColor = palette[index % palette.length]
              return (
                <Line
                  key={seriesKey}
                  type="monotone"
                  dataKey={seriesKey}
                  stroke={seriesColor}
                  strokeWidth={2}
                  dot={{ fill: seriesColor, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: seriesColor, strokeWidth: 2 }}
                  name={seriesKey}
                  connectNulls
                />
              )
            })}
          </LineChart>
        )
    }
  }

  return (
    <div className={className}>
      <ResponsiveContainer width={width} height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  )
}

export default Chart
