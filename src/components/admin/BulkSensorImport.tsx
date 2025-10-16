'use client'

import { useState, useRef } from 'react'

interface BulkSensorImportProps {
  onClose: () => void
  onSuccess: () => void
}

interface ImportResult {
  created: any[]
  errors: any[]
}

export default function BulkSensorImport({ onClose, onSuccess }: BulkSensorImportProps) {
  const [csvData, setCsvData] = useState('')
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      setError('Please select a CSV file')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      setCsvData(text)
      setError(null)
    }
    reader.readAsText(file)
  }

  const parseCsvData = (csvText: string) => {
    const lines = csvText.trim().split('\n')
    if (lines.length < 2) {
      throw new Error('CSV must have at least a header row and one data row')
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
    const requiredHeaders = ['name', 'type', 'environment_id']
    
    for (const required of requiredHeaders) {
      if (!headers.includes(required)) {
        throw new Error(`Missing required column: ${required}`)
      }
    }

    const sensors = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      if (values.length !== headers.length) {
        throw new Error(`Row ${i + 1}: Column count mismatch`)
      }

      const sensor: any = {}
      headers.forEach((header, index) => {
        const value = values[index]
        
        switch (header) {
          case 'name':
          case 'type':
          case 'environment_id':
          case 'status':
            sensor[header] = value
            break
          case 'battery_level':
            sensor[header] = value ? parseInt(value) : 100
            break
        }
      })

      sensors.push(sensor)
    }

    return sensors
  }

  const handleImport = async () => {
    if (!csvData.trim()) {
      setError('Please upload a CSV file or paste CSV data')
      return
    }

    setImporting(true)
    setError(null)
    setResult(null)

    try {
      const sensors = parseCsvData(csvData)
      
      const response = await fetch('/api/admin/sensors/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sensors })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to import sensors')
      }

      const data = await response.json()
      setResult(data.results)
      
      if (data.results.created.length > 0) {
        onSuccess()
      }
    } catch (err) {
      console.error('Error importing sensors:', err)
      setError(err instanceof Error ? err.message : 'Failed to import sensors')
    } finally {
      setImporting(false)
    }
  }

  const downloadTemplate = () => {
    const template = 'name,type,environment_id,status,battery_level\nSample Sensor,temperature,env-123,active,100\nHumidity Sensor,humidity,env-123,active,95'
    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sensor_import_template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-[700px] shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Bulk Sensor Import</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {result && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">Import Results</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p>✅ Successfully created: {result.created.length} sensors</p>
                  <p>❌ Errors: {result.errors.length}</p>
                  
                  {result.errors.length > 0 && (
                    <div className="mt-3">
                      <p className="font-medium">Errors:</p>
                      <div className="max-h-32 overflow-y-auto">
                        {result.errors.map((err, index) => (
                          <p key={index} className="text-xs">
                            Row {err.row}: {err.error}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-yellow-900 mb-2">CSV Format Requirements</h4>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• Required columns: name, type, environment_id</li>
                <li>• Optional columns: status (active/inactive/maintenance), battery_level (0-100)</li>
                <li>• Valid sensor types: temperature, humidity, temperature_humidity, pressure, air_quality, motion, other</li>
                <li>• Environment IDs must exist in the system</li>
              </ul>
              <button
                onClick={downloadTemplate}
                className="mt-2 text-sm text-yellow-700 hover:text-yellow-900 underline"
              >
                Download CSV Template
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload CSV File
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>

            <div>
              <label htmlFor="csvData" className="block text-sm font-medium text-gray-700 mb-2">
                Or Paste CSV Data
              </label>
              <textarea
                id="csvData"
                rows={8}
                value={csvData}
                onChange={(e) => setCsvData(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="name,type,environment_id,status,battery_level&#10;Sensor 1,temperature,env-123,active,100&#10;Sensor 2,humidity,env-456,active,95"
              />
            </div>

            <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Close
              </button>
              <button
                onClick={handleImport}
                disabled={importing || !csvData.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? 'Importing...' : 'Import Sensors'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}