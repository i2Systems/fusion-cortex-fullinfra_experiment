/**
 * i18n Context
 * 
 * Simple internationalization system for English, Spanish, and French.
 * 
 * AI Note: This is a basic implementation. For production, consider using
 * next-intl or react-i18next for more robust i18n support.
 */

'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type Language = 'en' | 'es' | 'fr'

interface Translations {
  [key: string]: string | Translations
}

// Translation strings
const translations: Record<Language, Translations> = {
  en: {
    // Settings
    settings: 'Settings',
    profile: 'Profile',
    notifications: 'Notifications',
    security: 'Security',
    appearance: 'Appearance',
    data: 'Data & Storage',
    about: 'About',
    theme: 'Theme',
    fontFamily: 'Font Family',
    fontSize: 'Font Size',
    language: 'Language',
    role: 'Role',
    // Common
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    search: 'Search',
    // Navigation
    dashboard: 'Dashboard',
    map: 'Map & Devices',
    zones: 'Zones',
    lookup: 'Device Lookup',
    bacnet: 'BACnet Mapping',
    rules: 'Rules & Overrides',
    faults: 'Faults / Health',
    // Status
    online: 'Online',
    offline: 'Offline',
    // Font sizes
    normal: 'Normal',
    medium: 'Medium',
    large: 'Large',
    default: 'Default',
  },
  es: {
    // Settings
    settings: 'Configuración',
    profile: 'Perfil',
    notifications: 'Notificaciones',
    security: 'Seguridad',
    appearance: 'Apariencia',
    data: 'Datos y Almacenamiento',
    about: 'Acerca de',
    theme: 'Tema',
    fontFamily: 'Familia de Fuentes',
    fontSize: 'Tamaño de Fuente',
    language: 'Idioma',
    role: 'Rol',
    // Common
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    edit: 'Editar',
    close: 'Cerrar',
    search: 'Buscar',
    // Navigation
    dashboard: 'Panel',
    map: 'Mapa y Dispositivos',
    zones: 'Zonas',
    lookup: 'Búsqueda de Dispositivos',
    bacnet: 'Mapeo BACnet',
    rules: 'Reglas y Anulaciones',
    faults: 'Fallas / Salud',
    // Status
    online: 'En línea',
    offline: 'Desconectado',
    // Font sizes
    normal: 'Normal',
    medium: 'Mediano',
    large: 'Grande',
    default: 'Predeterminado',
  },
  fr: {
    // Settings
    settings: 'Paramètres',
    profile: 'Profil',
    notifications: 'Notifications',
    security: 'Sécurité',
    appearance: 'Apparence',
    data: 'Données et Stockage',
    about: 'À propos',
    theme: 'Thème',
    fontFamily: 'Famille de Polices',
    fontSize: 'Taille de Police',
    language: 'Langue',
    role: 'Rôle',
    // Common
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    edit: 'Modifier',
    close: 'Fermer',
    search: 'Rechercher',
    // Navigation
    dashboard: 'Tableau de bord',
    map: 'Carte et Appareils',
    zones: 'Zones',
    lookup: 'Recherche d\'Appareils',
    bacnet: 'Cartographie BACnet',
    rules: 'Règles et Remplacements',
    faults: 'Défauts / Santé',
    // Status
    online: 'En ligne',
    offline: 'Hors ligne',
    // Font sizes
    normal: 'Normal',
    medium: 'Moyen',
    large: 'Grand',
    default: 'Par défaut',
  },
}

interface I18nContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const I18nContext = createContext<I18nContextType | undefined>(undefined)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')
  const [mounted, setMounted] = useState(false)

  // Load language preference from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('fusion_language') as Language | null
      if (savedLang && (savedLang === 'en' || savedLang === 'es' || savedLang === 'fr')) {
        setLanguageState(savedLang)
      }
      setMounted(true)
    }
  }, [])

  // Save language preference to localStorage
  useEffect(() => {
    if (mounted && typeof window !== 'undefined') {
      localStorage.setItem('fusion_language', language)
      // Set lang attribute on html element for accessibility
      document.documentElement.lang = language
    }
  }, [language, mounted])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
  }

  // Translation function - supports dot notation like 'settings.profile'
  const t = (key: string): string => {
    const keys = key.split('.')
    let value: any = translations[language]
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        // Fallback to English if translation not found
        value = translations.en
        for (const fallbackKey of keys) {
          if (value && typeof value === 'object' && fallbackKey in value) {
            value = value[fallbackKey]
          } else {
            return key // Return key if translation not found
          }
        }
        break
      }
    }
    
    return typeof value === 'string' ? value : key
  }

  return (
    <I18nContext.Provider value={{
      language,
      setLanguage,
      t,
    }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}

// Language display names
export const languageNames: Record<Language, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
}

