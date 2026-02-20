/**
 * Filler App Layout
 *
 * Standalone shell for the "Products" filler app. Own sidebar + header.
 * No MainNav, TopBar, or ContextPanel — minimal and easy to remove.
 * See app/filler/README.md.
 */

import { FillerShell } from '@/components/filler/FillerShell'

export default function FillerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <FillerShell>{children}</FillerShell>
}
