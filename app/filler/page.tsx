/**
 * Filler app root — redirect to Product Grid.
 */

import { redirect } from 'next/navigation'

export default function FillerPage() {
  redirect('/filler/products')
}
