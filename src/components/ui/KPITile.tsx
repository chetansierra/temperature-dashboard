'use client'

import React from 'react'

export interface KPITileProps {
  title: string
  value: string | number
  unit?: string
  trend?: {
    direction: 'up' | 'down' | 'stable'
    percentage?: number
    label?: string
  }
  status?: 'healthy' | 'warning' | 'critical' | 'neutral'
  icon?: React.ReactNode
  loading?: boolean
  className?: string
  onClick?: () => void
}

const KPITile: React.FC<KPITileProps> = ({
  title,
  value,
  unit,
  trend,
  status = 'neutral',
  icon,
  loading = false,
  className = '',
  onClick
}) => {
  // Status color mapping
  const statusColors = {
    healthy: 'border-green-200 bg-green-50',
    warning: 'border-yellow-200 bg-yellow-50',
    critical: 'border-red-200 bg-red-50',
    neutral: 'border-gray-200 bg-white'
  }

  const statusTextColors = {
    healthy: 'text-green-700',
    warning: 'text-yellow-700',
    critical: 'text-red-700',
    neutral: 'text-gray-700'
  }

  const statusIconColors = {
    healthy: 'text-green-500',
    warning: 'text-yellow-500',
    critical: 'text-red-500',
    neutral: 'text-gray-500'
  }

  // Trend icons
  const getTrendIcon = () => {
    if (!trend) return null

    switch (trend.direction) {
      case 'up':
        return (
          <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        )
      case 'down':
        return (
          <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )
      case 'stable':
        return (
          <svg className="w-4 h-4 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
          </svg>
        )
      default:
        return null
    }
  }

  const baseClasses = `
    relative p-6 rounded-lg border-2 transition-all duration-200
    ${statusColors[status]}
    ${onClick ? 'cursor-pointer hover:shadow-md hover:scale-105' : ''}
    ${className}
  `

  if (loading) {
    return (
      <div className={`${baseClasses} animate-pulse`}>
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 bg-gray-300 rounded w-24"></div>
          <div className="h-6 w-6 bg-gray-300 rounded"></div>
        </div>
        <div className="h-8 bg-gray-300 rounded w-16 mb-2"></div>
        <div className="h-3 bg-gray-300 rounded w-20"></div>
      </div>
    )
  }

  return (
    <div className={baseClasses} onClick={onClick}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600 truncate">{title}</h3>
        {icon && (
          <div className={`flex-shrink-0 ${statusIconColors[status]}`}>
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="flex items-baseline mb-2">
        <span className={`text-2xl font-bold ${statusTextColors[status]}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {unit && (
          <span className="ml-1 text-sm text-gray-500">{unit}</span>
        )}
      </div>

      {/* Trend */}
      {trend && (
        <div className="flex items-center text-xs">
          {getTrendIcon()}
          <span className="ml-1 text-gray-600">
            {trend.percentage && `${trend.percentage}%`}
            {trend.label && ` ${trend.label}`}
          </span>
        </div>
      )}

      {/* Status indicator */}
      {status !== 'neutral' && (
        <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${
          status === 'healthy' ? 'bg-green-400' :
          status === 'warning' ? 'bg-yellow-400' :
          'bg-red-400'
        }`} />
      )}
    </div>
  )
}

export default KPITile
