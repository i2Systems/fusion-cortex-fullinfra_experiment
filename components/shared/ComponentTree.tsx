/**
 * Component Tree Component
 * 
 * Displays a tree view of device components with warranty information.
 * Used in MapCanvas, DeviceTable, and DeviceProfilePanel.
 * 
 * AI Note: Shows expandable/collapsible component list with warranty status.
 */

'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronRight, ChevronDown, Package, Shield, Calendar, CheckCircle2, AlertCircle, XCircle, Info } from 'lucide-react'
import { Component, Device } from '@/lib/mockData'
import { getComponentLibraryUrl, getComponentImage, getComponentImageAsync } from '@/lib/libraryUtils'

interface ComponentTreeProps {
  components: Component[]
  expanded?: boolean
  onToggle?: (expanded: boolean) => void
  showHeader?: boolean
  compact?: boolean
  parentDevice?: Device | null
  onComponentClick?: (component: Component, parentDevice: Device) => void
}

export function ComponentTree({ 
  components, 
  expanded: initialExpanded = false,
  onToggle,
  showHeader = true,
  compact = false,
  parentDevice,
  onComponentClick
}: ComponentTreeProps) {
  const [expanded, setExpanded] = useState(initialExpanded)
  const [imageKey, setImageKey] = useState(0)

  // Listen for library image updates
  useEffect(() => {
    const handleImageUpdate = () => {
      setImageKey(prev => prev + 1)
    }
    window.addEventListener('libraryImageUpdated', handleImageUpdate)
    return () => window.removeEventListener('libraryImageUpdated', handleImageUpdate)
  }, [])
  
  // Component Image Icon (async for IndexedDB)
  function ComponentImageIcon({ componentType, componentId }: { componentType: string, componentId: string }) {
    const [componentImage, setComponentImage] = useState<string | null>(null)
    const [imageError, setImageError] = useState(false)

    useEffect(() => {
      const loadImage = async () => {
        try {
          // Try sync first (for localStorage)
          const syncImage = getComponentImage(componentType)
          if (syncImage) {
            setComponentImage(syncImage)
            return
          }
          
          // If sync returned null, try async (for IndexedDB)
          const asyncImage = await getComponentImageAsync(componentType)
          if (asyncImage) {
            setComponentImage(asyncImage)
          } else {
            setComponentImage(null)
          }
        } catch (error) {
          console.error('Failed to load component image:', error)
          setComponentImage(null)
        }
      }

      loadImage()

      const handleImageUpdate = () => {
        setImageError(false)
        loadImage()
      }
      window.addEventListener('libraryImageUpdated', handleImageUpdate)
      return () => window.removeEventListener('libraryImageUpdated', handleImageUpdate)
    }, [componentType, imageKey])

    if (componentImage && !imageError) {
      return (
        <img
          key={`${componentId}-${imageKey}`}
          src={componentImage}
          alt={componentType}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />
      )
    }
    return <Package size={12} className="text-[var(--color-primary)]" />
  }
  
  const handleToggle = () => {
    const newExpanded = !expanded
    setExpanded(newExpanded)
    onToggle?.(newExpanded)
  }

  if (components.length === 0) {
    return null
  }

  const getWarrantyIcon = (warrantyStatus?: string) => {
    switch (warrantyStatus) {
      case 'Active':
        return <CheckCircle2 size={12} className="text-[var(--color-success)]" />
      case 'Expired':
        return <XCircle size={12} className="text-[var(--color-danger)]" />
      default:
        return <AlertCircle size={12} className="text-[var(--color-text-muted)]" />
    }
  }

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'online':
        return <CheckCircle2 size={12} className="text-[var(--color-success)]" />
      case 'offline':
        return <AlertCircle size={12} className="text-[var(--color-warning)]" />
      case 'missing':
        return <XCircle size={12} className="text-[var(--color-danger)]" />
      default:
        return null
    }
  }

  return (
    <div className="w-full">
      {showHeader && (
        <button
          onClick={handleToggle}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--color-surface-subtle)] transition-colors text-left"
        >
          {expanded ? (
            <ChevronDown size={16} className="text-[var(--color-text-muted)] flex-shrink-0" />
          ) : (
            <ChevronRight size={16} className="text-[var(--color-text-muted)] flex-shrink-0" />
          )}
          <Package size={14} className="text-[var(--color-text-muted)] flex-shrink-0" />
          <span className="text-sm font-medium text-[var(--color-text)]">
            Components ({components.length})
          </span>
        </button>
      )}
      
      {expanded && (
        <div className={`${showHeader ? 'ml-4 mt-1' : ''} space-y-1.5`}>
          {components.map((component) => (
            <div
              key={component.id}
              onClick={() => {
                if (onComponentClick && parentDevice) {
                  onComponentClick(component, parentDevice)
                }
              }}
              className={`p-2.5 rounded-lg bg-[var(--color-surface-subtle)] border border-[var(--color-border-subtle)] ${
                compact ? 'text-xs' : 'text-sm'
              } ${
                onComponentClick ? 'cursor-pointer hover:bg-[var(--color-surface)] hover:border-[var(--color-primary)]/30 transition-all duration-200' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 overflow-hidden bg-[var(--color-surface-subtle)]">
                      <ComponentImageIcon componentType={component.componentType} componentId={component.id} />
                    </div>
                    <span className="font-semibold text-[var(--color-text)] truncate">
                      {component.componentType}
                    </span>
                    {getComponentLibraryUrl(component.componentType) && (
                      <Link
                        href={getComponentLibraryUrl(component.componentType)!}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (onComponentClick && parentDevice) {
                            onComponentClick(component, parentDevice)
                          }
                        }}
                        className="p-0.5 rounded hover:bg-[var(--color-surface-subtle)] transition-colors flex-shrink-0"
                        title="View in library"
                      >
                        <Info size={10} className="text-[var(--color-primary)]" />
                      </Link>
                    )}
                    {component.status && getStatusIcon(component.status)}
                  </div>
                  <div className="text-[var(--color-text-muted)] font-mono text-xs truncate ml-4">
                    {component.componentSerialNumber}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-2 ml-4">
                {component.warrantyStatus && (
                  <div className="flex items-center gap-1.5">
                    {getWarrantyIcon(component.warrantyStatus)}
                    <span className={`text-xs ${
                      component.warrantyStatus === 'Active' 
                        ? 'text-[var(--color-success)]' 
                        : 'text-[var(--color-danger)]'
                    }`}>
                      {component.warrantyStatus}
                    </span>
                  </div>
                )}
                {component.warrantyExpiry && (
                  <div className="flex items-center gap-1.5">
                    <Calendar size={10} className="text-[var(--color-text-muted)]" />
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {component.warrantyExpiry.toLocaleDateString()}
                    </span>
                  </div>
                )}
                {component.buildDate && (
                  <div className="flex items-center gap-1.5">
                    <Calendar size={10} className="text-[var(--color-text-muted)]" />
                    <span className="text-xs text-[var(--color-text-muted)]">
                      Built: {component.buildDate.toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
