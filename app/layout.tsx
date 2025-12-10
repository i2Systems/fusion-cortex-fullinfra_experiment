import type { Metadata } from 'next'
import './globals.css'
import { TRPCProvider } from '@/lib/trpc/Provider'
import { AuthProvider } from '@/lib/auth'
import { ThemeProvider } from '@/lib/theme'
import { RoleProvider } from '@/lib/role'
import { DeviceProvider } from '@/lib/DeviceContext'
import { ZoneProvider } from '@/lib/ZoneContext'
import { RuleProvider } from '@/lib/RuleContext'
import { NotificationProvider } from '@/lib/NotificationContext'
import { FontProvider } from '@/lib/FontContext'
import { I18nProvider } from '@/lib/i18n'

export const metadata: Metadata = {
  title: 'Fusion / Cortex — Commissioning & Configuration',
  description: 'Setup, mapping, and rules platform for large-scale retail lighting deployments',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Work+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&family=Lexend:wght@400;500;600;700&display=swap" rel="stylesheet" />
        {/* Atkinson Hyperlegible - self-hosted from Braille Institute */}
        <link href="https://fonts.bunny.net/css?family=atkinson-hyperlegible:400,700" rel="stylesheet" />
      </head>
      <body>
                <TRPCProvider>
                  <ThemeProvider>
                    <FontProvider>
                      <I18nProvider>
                        <RoleProvider>
                          <AuthProvider>
                            <DeviceProvider>
                              <ZoneProvider>
                                <RuleProvider>
                                  <NotificationProvider>
                                    {children}
                                  </NotificationProvider>
                                </RuleProvider>
                              </ZoneProvider>
                            </DeviceProvider>
                          </AuthProvider>
                        </RoleProvider>
                      </I18nProvider>
                    </FontProvider>
                  </ThemeProvider>
                </TRPCProvider>
      </body>
    </html>
  )
}

