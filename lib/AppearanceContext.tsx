/**
 * Appearance Context
 * 
 * Consolidated provider for all UI appearance settings:
 * - Theme (dark, light, high-contrast, etc.)
 * - Font (family and size)
 * - Language (i18n)
 * - Advanced Settings (SVG extraction toggle)
 * 
 * AI Note: This replaces separate ThemeProvider, FontProvider, I18nProvider, 
 * and AdvancedSettingsProvider with a single context to reduce provider nesting.
 */

'use client'

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'

// ============================================================================
// TYPES
// ============================================================================

// Theme types
export type Theme = 'dark' | 'light' | 'high-contrast' | 'warm-night' | 'warm-day' | 'glass-neumorphism' | 'business-fluent' | 'on-brand' | 'on-brand-glass'
const VALID_THEMES: Theme[] = ['dark', 'light', 'high-contrast', 'warm-night', 'warm-day', 'glass-neumorphism', 'business-fluent', 'on-brand', 'on-brand-glass']

// Font types
export type FontFamily = 'system' | 'syne' | 'ibm-plex' | 'inter' | 'poppins' | 'space-grotesk' | 'work-sans' | 'manrope' | 'outfit' | 'lexend' | 'atkinson-hyperlegible'
export type FontSize = 'normal' | 'medium' | 'large'

// Language types
export type Language = 'en' | 'es' | 'fr'

// Day/night mode: which theme is applied when (sun = day, moon = night)
export type ThemeMode = 'day' | 'night'

// App switcher / app menu interaction pattern
export type AppSwitcherStyle = 'dropdown' | 'tabs' | 'inline' | 'primary' | 'recent' | 'role'
const VALID_APP_SWITCHER_STYLES: AppSwitcherStyle[] = ['dropdown', 'tabs', 'inline', 'primary', 'recent', 'role']

// ============================================================================
// CONSTANTS
// ============================================================================

// Font definitions with fallbacks
const fontFamilies: Record<FontFamily, string> = {
    'system': 'system-ui, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
    'syne': '"Syne", system-ui, -apple-system, sans-serif',
    'ibm-plex': '"IBM Plex Sans", system-ui, -apple-system, sans-serif',
    'inter': '"Inter", system-ui, -apple-system, sans-serif',
    'poppins': '"Poppins", system-ui, -apple-system, sans-serif',
    'space-grotesk': '"Space Grotesk", system-ui, -apple-system, sans-serif',
    'work-sans': '"Work Sans", system-ui, -apple-system, sans-serif',
    'manrope': '"Manrope", system-ui, -apple-system, sans-serif',
    'outfit': '"Outfit", system-ui, -apple-system, sans-serif',
    'lexend': '"Lexend", system-ui, -apple-system, sans-serif',
    'atkinson-hyperlegible': '"Atkinson Hyperlegible", system-ui, -apple-system, sans-serif',
}

const fontSizeMultipliers: Record<FontSize, number> = {
    'normal': 1.0,
    'medium': 1.125,
    'large': 1.25,
}

// Translation strings
interface Translations {
    [key: string]: string | Translations
}

const translations: Record<Language, Translations> = {
    en: {
        settings: 'Settings', profile: 'Profile', notifications: 'Notifications',
        security: 'Security', appearance: 'Appearance', data: 'Data & Storage',
        advanced: 'Advanced', about: 'About', theme: 'Theme', fontFamily: 'Font Family',
        fontSize: 'Font Size', language: 'Language', role: 'Role',
        save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit', close: 'Close', search: 'Search',
        dashboard: 'Dashboard', map: 'Locations & Devices', zones: 'Zones',
        lookup: 'Device Lookup', bacnet: 'BACnet Mapping', rules: 'Rules & Overrides', faults: 'Faults / Health',
        online: 'Online', offline: 'Offline',
        normal: 'Normal', medium: 'Medium', large: 'Large', default: 'Default',
    },
    es: {
        settings: 'Configuración', profile: 'Perfil', notifications: 'Notificaciones',
        security: 'Seguridad', appearance: 'Apariencia', data: 'Datos y Almacenamiento',
        advanced: 'Avanzado', about: 'Acerca de', theme: 'Tema', fontFamily: 'Familia de Fuentes',
        fontSize: 'Tamaño de Fuente', language: 'Idioma', role: 'Rol',
        save: 'Guardar', cancel: 'Cancelar', delete: 'Eliminar', edit: 'Editar', close: 'Cerrar', search: 'Buscar',
        dashboard: 'Panel', map: 'Ubicaciones y Dispositivos', zones: 'Zonas',
        lookup: 'Búsqueda de Dispositivos', bacnet: 'Mapeo BACnet', rules: 'Reglas y Anulaciones', faults: 'Fallas / Salud',
        online: 'En línea', offline: 'Desconectado',
        normal: 'Normal', medium: 'Mediano', large: 'Grande', default: 'Predeterminado',
    },
    fr: {
        settings: 'Paramètres', profile: 'Profil', notifications: 'Notifications',
        security: 'Sécurité', appearance: 'Apparence', data: 'Données et Stockage',
        advanced: 'Avancé', about: 'À propos', theme: 'Thème', fontFamily: 'Famille de Polices',
        fontSize: 'Taille de Police', language: 'Langue', role: 'Rôle',
        save: 'Enregistrer', cancel: 'Annuler', delete: 'Supprimer', edit: 'Modifier', close: 'Fermer', search: 'Rechercher',
        dashboard: 'Tableau de bord', map: 'Emplacements et Appareils', zones: 'Zones',
        lookup: "Recherche d'Appareils", bacnet: 'Cartographie BACnet', rules: 'Règles et Remplacements', faults: 'Défauts / Santé',
        online: 'En ligne', offline: 'Hors ligne',
        normal: 'Normal', medium: 'Moyen', large: 'Grand', default: 'Par défaut',
    },
}

export const languageNames: Record<Language, string> = {
    en: 'English',
    es: 'Español',
    fr: 'Français',
}

// ============================================================================
// CONTEXT
// ============================================================================

interface AppearanceContextType {
    // Theme (effective = dayTheme when mode is day, nightTheme when mode is night)
    theme: Theme
    setTheme: (theme: Theme) => void
    themeMode: ThemeMode
    setThemeMode: (mode: ThemeMode) => void
    dayTheme: Theme
    nightTheme: Theme
    setDayTheme: (theme: Theme) => void
    setNightTheme: (theme: Theme) => void
    // Font
    fontFamily: FontFamily
    fontSize: FontSize
    setFontFamily: (font: FontFamily) => void
    setFontSize: (size: FontSize) => void
    // Language
    language: Language
    setLanguage: (lang: Language) => void
    t: (key: string) => string
    // Advanced Settings
    enableSVGExtraction: boolean
    setEnableSVGExtraction: (enabled: boolean) => void
    // App menu / switcher interaction pattern
    appSwitcherStyle: AppSwitcherStyle
    setAppSwitcherStyle: (style: AppSwitcherStyle) => void
}

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined)

// ============================================================================
// PROVIDER
// ============================================================================

export function AppearanceProvider({ children }: { children: ReactNode }) {
    // State: day/night each have a design language (theme); mode picks which is active
    const [themeMode, setThemeModeState] = useState<ThemeMode>('night')
    const [dayTheme, setDayThemeState] = useState<Theme>('light')
    const [nightTheme, setNightThemeState] = useState<Theme>('dark')
    const theme = themeMode === 'day' ? dayTheme : nightTheme
    const [fontFamily, setFontFamilyState] = useState<FontFamily>('system')
    const [fontSize, setFontSizeState] = useState<FontSize>('normal')
    const [language, setLanguageState] = useState<Language>('en')
    const [enableSVGExtraction, setEnableSVGExtractionState] = useState(false)
    const [appSwitcherStyle, setAppSwitcherStyleState] = useState<AppSwitcherStyle>('dropdown')
    const [mounted, setMounted] = useState(false)

    // Load all preferences from localStorage on mount
    useEffect(() => {
        if (typeof window === 'undefined') return

        const root = document.documentElement

        // Day / night theme selection (with backward compat for old fusion_theme)
        const storedMode = localStorage.getItem('fusion_theme_mode') as ThemeMode | null
        let storedDay = localStorage.getItem('fusion_day_theme') as Theme | null
        let storedNight = localStorage.getItem('fusion_night_theme') as Theme | null
        const legacyTheme = localStorage.getItem('fusion_theme') as Theme | null
        let effective: Theme = 'dark'
        let mode: ThemeMode = 'night'

        if (!storedDay && !storedNight && legacyTheme && VALID_THEMES.includes(legacyTheme)) {
            storedDay = legacyTheme
            storedNight = legacyTheme
            setDayThemeState(legacyTheme)
            setNightThemeState(legacyTheme)
            const nightThemes: Theme[] = ['dark', 'warm-night', 'on-brand-glass']
            mode = nightThemes.includes(legacyTheme) ? 'night' : 'day'
            setThemeModeState(mode)
            effective = legacyTheme
        } else {
            if (storedMode === 'day' || storedMode === 'night') {
                mode = storedMode
                setThemeModeState(storedMode)
            }
            if (storedDay && VALID_THEMES.includes(storedDay)) setDayThemeState(storedDay)
            if (storedNight && VALID_THEMES.includes(storedNight)) setNightThemeState(storedNight)
            effective = mode === 'day' ? (storedDay && VALID_THEMES.includes(storedDay) ? storedDay : 'light') : (storedNight && VALID_THEMES.includes(storedNight) ? storedNight : 'dark')
        }
        root.setAttribute('data-theme', effective)

        // Font
        const savedFont = localStorage.getItem('fusion_font_family') as FontFamily | null
        const savedSize = localStorage.getItem('fusion_font_size') as FontSize | null
        const initialFont = (savedFont && Object.keys(fontFamilies).includes(savedFont)) ? savedFont : 'system'
        const initialSize = (savedSize && Object.keys(fontSizeMultipliers).includes(savedSize)) ? savedSize : 'normal'
        setFontFamilyState(initialFont)
        setFontSizeState(initialSize)

        // Apply font immediately
        const baseFontSize = fontSizeMultipliers[initialSize] * 16
        root.style.fontSize = `${baseFontSize}px`
        root.style.setProperty('--font-family-primary', fontFamilies[initialFont])
        root.style.setProperty('--font-size-base', `${baseFontSize}px`)
        root.style.setProperty('--font-size-multiplier', String(fontSizeMultipliers[initialSize]))
        document.body.style.fontFamily = fontFamilies[initialFont]

        // Language
        const savedLang = localStorage.getItem('fusion_language') as Language | null
        if (savedLang && ['en', 'es', 'fr'].includes(savedLang)) {
            setLanguageState(savedLang)
            root.lang = savedLang
        }

        // Advanced Settings
        try {
            const stored = localStorage.getItem('fusion-advanced-settings')
            if (stored) {
                const parsed = JSON.parse(stored)
                setEnableSVGExtractionState(parsed.enableSVGExtraction ?? false)
            }
        } catch (e) {
            console.warn('Failed to load advanced settings:', e)
        }

        // App switcher style (migrate legacy segmented/mega/rail to primary/recent/role)
        const storedStyle = localStorage.getItem('fusion_app_switcher_style') as string | null
        const migrated = storedStyle === 'segmented' ? 'primary' : storedStyle === 'mega' ? 'recent' : storedStyle === 'rail' ? 'role' : storedStyle
        if (migrated && VALID_APP_SWITCHER_STYLES.includes(migrated as AppSwitcherStyle)) {
            setAppSwitcherStyleState(migrated as AppSwitcherStyle)
            if (migrated !== storedStyle) localStorage.setItem('fusion_app_switcher_style', migrated)
        }

        setMounted(true)
    }, [])

    // Apply and persist theme (day/night)
    useEffect(() => {
        if (!mounted) return
        document.documentElement.setAttribute('data-theme', theme)
        localStorage.setItem('fusion_theme', theme)
    }, [theme, mounted])

    useEffect(() => {
        if (!mounted) return
        localStorage.setItem('fusion_theme_mode', themeMode)
        localStorage.setItem('fusion_day_theme', dayTheme)
        localStorage.setItem('fusion_night_theme', nightTheme)
    }, [themeMode, dayTheme, nightTheme, mounted])

    // Save font changes
    useEffect(() => {
        if (!mounted || typeof window === 'undefined') return
        const root = document.documentElement
        const baseFontSize = fontSizeMultipliers[fontSize] * 16

        root.style.fontSize = `${baseFontSize}px`
        root.style.setProperty('--font-family-primary', fontFamilies[fontFamily])
        root.style.setProperty('--font-size-base', `${baseFontSize}px`)
        root.style.setProperty('--font-size-multiplier', String(fontSizeMultipliers[fontSize]))
        document.body.style.fontFamily = fontFamilies[fontFamily]

        localStorage.setItem('fusion_font_family', fontFamily)
        localStorage.setItem('fusion_font_size', fontSize)
    }, [fontFamily, fontSize, mounted])

    // Save language changes
    useEffect(() => {
        if (!mounted || typeof window === 'undefined') return
        localStorage.setItem('fusion_language', language)
        document.documentElement.lang = language
    }, [language, mounted])

    // Save advanced settings changes
    useEffect(() => {
        if (!mounted) return
        try {
            localStorage.setItem('fusion-advanced-settings', JSON.stringify({ enableSVGExtraction }))
        } catch (e) {
            console.warn('Failed to save advanced settings:', e)
        }
    }, [enableSVGExtraction, mounted])

    // Save app switcher style
    useEffect(() => {
        if (!mounted) return
        localStorage.setItem('fusion_app_switcher_style', appSwitcherStyle)
    }, [appSwitcherStyle, mounted])

    // Translation function
    const t = useCallback((key: string): string => {
        const keys = key.split('.')
        let value: string | Translations | undefined = translations[language]

        for (const k of keys) {
            if (value && typeof value === 'object' && k in value) {
                value = value[k]
            } else {
                // Fallback to English
                value = translations.en
                for (const fallbackKey of keys) {
                    if (value && typeof value === 'object' && fallbackKey in value) {
                        value = value[fallbackKey]
                    } else {
                        return key
                    }
                }
                break
            }
        }
        return typeof value === 'string' ? value : key
    }, [language])

    // Setters: setTheme updates the current mode's theme; setThemeMode toggles day/night
    const setTheme = (newTheme: Theme) => {
        if (themeMode === 'day') setDayThemeState(newTheme)
        else setNightThemeState(newTheme)
    }
    const setThemeMode = (mode: ThemeMode) => setThemeModeState(mode)
    const setDayTheme = (t: Theme) => setDayThemeState(VALID_THEMES.includes(t) ? t : 'light')
    const setNightTheme = (t: Theme) => setNightThemeState(VALID_THEMES.includes(t) ? t : 'dark')
    const setFontFamily = (font: FontFamily) => setFontFamilyState(font)
    const setFontSize = (size: FontSize) => setFontSizeState(size)
    const setLanguage = (lang: Language) => setLanguageState(lang)
    const setEnableSVGExtraction = (enabled: boolean) => setEnableSVGExtractionState(enabled)
    const setAppSwitcherStyle = (style: AppSwitcherStyle) => setAppSwitcherStyleState(style)

    return (
        <AppearanceContext.Provider
            value={{
                theme, setTheme,
                themeMode, setThemeMode,
                dayTheme, nightTheme, setDayTheme, setNightTheme,
                fontFamily, fontSize, setFontFamily, setFontSize,
                language, setLanguage, t,
                enableSVGExtraction, setEnableSVGExtraction,
                appSwitcherStyle, setAppSwitcherStyle,
            }}
        >
            {children}
        </AppearanceContext.Provider>
    )
}

// ============================================================================
// HOOKS (for backward compatibility)
// ============================================================================

function useAppearance() {
    const context = useContext(AppearanceContext)
    if (context === undefined) {
        throw new Error('useAppearance must be used within an AppearanceProvider')
    }
    return context
}

/** @deprecated Use useAppearance() instead */
export function useTheme() {
    const { theme, setTheme } = useAppearance()
    return { theme, setTheme }
}

/** @deprecated Use useAppearance() instead */
export function useFont() {
    const { fontFamily, fontSize, setFontFamily, setFontSize } = useAppearance()
    return { fontFamily, fontSize, setFontFamily, setFontSize }
}

/** @deprecated Use useAppearance() instead */
export function useI18n() {
    const { language, setLanguage, t } = useAppearance()
    return { language, setLanguage, t }
}

/** @deprecated Use useAppearance() instead */
export function useAdvancedSettings() {
    const { enableSVGExtraction, setEnableSVGExtraction } = useAppearance()
    return { enableSVGExtraction, setEnableSVGExtraction }
}

export { useAppearance }
