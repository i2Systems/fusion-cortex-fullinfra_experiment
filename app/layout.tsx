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
      <body>
                <TRPCProvider>
                  <ThemeProvider>
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
                  </ThemeProvider>
                </TRPCProvider>
      </body>
    </html>
  )
}

