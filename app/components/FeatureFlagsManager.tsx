'use client'

import { useState, useEffect } from 'react'
import { 
  Flag, 
  ToggleLeft, 
  ToggleRight, 
  Users, 
  Percent, 
  Globe,
  RefreshCw,
  Plus,
  Edit,
  Trash2,
  Save,
  X
} from 'lucide-react'
import { 
  FeatureFlag, 
  FlagType, 
  FlagStatus,
  featureFlags,
  DEFAULT_FLAGS
} from '@/app/lib/feature-flags/feature-flags'

export default function FeatureFlagsManager() {
  const [flags, setFlags] = useState<FeatureFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [editingFlag, setEditingFlag] = useState<string | null>(null)
  const [newFlag, setNewFlag] = useState<Partial<FeatureFlag> | null>(null)

  useEffect(() => {
    loadFlags()
  }, [])

  const loadFlags = async () => {
    setLoading(true)
    try {
      await featureFlags.initialize()
      const allFlags = featureFlags.getAllFlags()
      setFlags(allFlags)
    } catch (error) {
      console.error('Failed to load feature flags:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleFlag = async (flagId: string) => {
    const flag = flags.find(f => f.id === flagId)
    if (!flag) return

    const newStatus = flag.status === FlagStatus.ENABLED 
      ? FlagStatus.DISABLED 
      : FlagStatus.ENABLED

    // Update in database
    const response = await fetch('/api/feature-flags', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: flagId,
        status: newStatus
      })
    })

    if (response.ok) {
      setFlags(prev => prev.map(f => 
        f.id === flagId ? { ...f, status: newStatus } : f
      ))
    }
  }

  const updateRolloutPercentage = async (flagId: string, percentage: number) => {
    const response = await fetch('/api/feature-flags', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: flagId,
        rolloutPercentage: percentage
      })
    })

    if (response.ok) {
      setFlags(prev => prev.map(f => 
        f.id === flagId ? { ...f, rolloutPercentage: percentage } : f
      ))
    }
  }

  const deleteFlag = async (flagId: string) => {
    if (!confirm('Are you sure you want to delete this feature flag?')) return

    const response = await fetch(`/api/feature-flags/${flagId}`, {
      method: 'DELETE'
    })

    if (response.ok) {
      setFlags(prev => prev.filter(f => f.id !== flagId))
    }
  }

  const saveNewFlag = async () => {
    if (!newFlag?.id || !newFlag?.name) return

    const response = await fetch('/api/feature-flags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newFlag,
        status: FlagStatus.DISABLED,
        createdAt: new Date(),
        updatedAt: new Date()
      })
    })

    if (response.ok) {
      const created = await response.json()
      setFlags(prev => [...prev, created])
      setNewFlag(null)
    }
  }

  const getTypeIcon = (type: FlagType) => {
    switch (type) {
      case FlagType.BOOLEAN:
        return <ToggleLeft className="h-4 w-4" />
      case FlagType.PERCENTAGE:
        return <Percent className="h-4 w-4" />
      case FlagType.USER_LIST:
        return <Users className="h-4 w-4" />
      case FlagType.ENVIRONMENT:
        return <Globe className="h-4 w-4" />
      default:
        return <Flag className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: FlagStatus) => {
    switch (status) {
      case FlagStatus.ENABLED:
        return 'text-green-600 bg-green-50'
      case FlagStatus.DISABLED:
        return 'text-gray-600 bg-gray-50'
      case FlagStatus.PARTIAL:
        return 'text-yellow-600 bg-yellow-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flag className="h-6 w-6 text-indigo-600" />
          <h2 className="text-2xl font-bold text-gray-900">Feature Flags</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadFlags}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={() => setNewFlag({ 
              id: '', 
              name: '', 
              type: FlagType.BOOLEAN,
              value: false 
            })}
            className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-md shadow-sm text-sm font-medium hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            New Flag
          </button>
        </div>
      </div>

      {/* Create New Flag */}
      {newFlag && (
        <div className="bg-white rounded-lg shadow p-6 border-2 border-indigo-500">
          <h3 className="text-lg font-semibold mb-4">Create New Feature Flag</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Flag ID
              </label>
              <input
                type="text"
                value={newFlag.id || ''}
                onChange={(e) => setNewFlag({ ...newFlag, id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., new_feature"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={newFlag.name || ''}
                onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="e.g., New Feature"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={newFlag.type || FlagType.BOOLEAN}
                onChange={(e) => setNewFlag({ ...newFlag, type: e.target.value as FlagType })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value={FlagType.BOOLEAN}>Boolean</option>
                <option value={FlagType.PERCENTAGE}>Percentage</option>
                <option value={FlagType.USER_LIST}>User List</option>
                <option value={FlagType.ENVIRONMENT}>Environment</option>
                <option value={FlagType.VARIANT}>Variant</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                value={newFlag.description || ''}
                onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Brief description"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setNewFlag(null)}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={saveNewFlag}
              disabled={!newFlag.id || !newFlag.name}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              Create Flag
            </button>
          </div>
        </div>
      )}

      {/* Default Flags Section */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Available Default Flags</h3>
        <div className="flex flex-wrap gap-2">
          {Object.keys(DEFAULT_FLAGS).map(flagId => (
            <span
              key={flagId}
              className="px-2 py-1 bg-white rounded text-xs font-medium text-blue-700 border border-blue-300"
            >
              {flagId}
            </span>
          ))}
        </div>
      </div>

      {/* Flags List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Flag
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Configuration
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {flags.map((flag) => (
              <tr key={flag.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {flag.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {flag.id}
                    </div>
                    {flag.description && (
                      <div className="text-xs text-gray-400 mt-1">
                        {flag.description}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(flag.type)}
                    <span className="text-sm text-gray-900">
                      {flag.type}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(flag.status)}`}>
                    {flag.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {flag.type === FlagType.PERCENTAGE && (
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={flag.rolloutPercentage || 0}
                        onChange={(e) => updateRolloutPercentage(flag.id, parseInt(e.target.value))}
                        className="w-24"
                      />
                      <span className="text-sm text-gray-600">
                        {flag.rolloutPercentage || 0}%
                      </span>
                    </div>
                  )}
                  {flag.type === FlagType.USER_LIST && (
                    <span className="text-sm text-gray-600">
                      {flag.enabledUsers?.length || 0} users
                    </span>
                  )}
                  {flag.type === FlagType.ENVIRONMENT && (
                    <span className="text-sm text-gray-600">
                      {flag.enabledEnvironments?.join(', ') || 'None'}
                    </span>
                  )}
                  {flag.type === FlagType.VARIANT && (
                    <span className="text-sm text-gray-600">
                      {flag.variants?.length || 0} variants
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => toggleFlag(flag.id)}
                      className="text-indigo-600 hover:text-indigo-900"
                      title="Toggle flag"
                    >
                      {flag.status === FlagStatus.ENABLED ? (
                        <ToggleRight className="h-5 w-5" />
                      ) : (
                        <ToggleLeft className="h-5 w-5" />
                      )}
                    </button>
                    <button
                      onClick={() => setEditingFlag(flag.id)}
                      className="text-gray-600 hover:text-gray-900"
                      title="Edit flag"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteFlag(flag.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete flag"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {flags.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No feature flags configured
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Total Flags</div>
          <div className="text-2xl font-bold text-gray-900">{flags.length}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Enabled</div>
          <div className="text-2xl font-bold text-green-600">
            {flags.filter(f => f.status === FlagStatus.ENABLED).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Partial</div>
          <div className="text-2xl font-bold text-yellow-600">
            {flags.filter(f => f.status === FlagStatus.PARTIAL).length}
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-500">Disabled</div>
          <div className="text-2xl font-bold text-gray-600">
            {flags.filter(f => f.status === FlagStatus.DISABLED).length}
          </div>
        </div>
      </div>
    </div>
  )
}