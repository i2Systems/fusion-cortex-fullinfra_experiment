/**
 * izOS Sign app layout — fake app for app-switcher exploration.
 * Easy to remove: delete app/sign/ and components/sign/.
 */

import { SignShell } from '@/components/sign/SignShell'

export default function SignLayout({ children }: { children: React.ReactNode }) {
  return <SignShell>{children}</SignShell>
}
