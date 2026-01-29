/**
 * Map Person Token (Konva)
 *
 * Pill-shaped token for people on map canvases: outline, circle (icon/photo) left, name right.
 * Matches the token style used elsewhere (e.g. PersonToken chip) for consistent representation.
 */

'use client'

import { Group, Rect, Circle, Text, Image as KonvaImage } from 'react-konva'
import useImage from 'use-image'
import { getRgbaVariable } from '@/lib/canvasColors'

export interface MapPersonTokenPerson {
  id: string
  firstName: string
  lastName: string
  imageUrl?: string | null
}

interface MapPersonTokenProps {
  person: MapPersonTokenPerson
  isSelected?: boolean
  isHovered?: boolean
  /** Circle radius; pill size scales with this */
  radius?: number
  /** Optional scale for zoom levels */
  scale?: number
}

const PILL_HEIGHT_RATIO = 1.15  // pill height = 2 * radius * this (slightly slimmer)
const PILL_WIDTH_RATIO = 4.2   // pill width = 2 * radius * this (circle + gap + name)
const CORNER_RADIUS_RATIO = 0.55

function PersonCircleContent({
  person,
  radius,
  isSelected,
  isHovered,
  borderColor,
}: {
  person: MapPersonTokenPerson
  radius: number
  isSelected: boolean
  isHovered: boolean
  borderColor: string
}) {
  const [image] = useImage(person.imageUrl || '', 'anonymous')

  if (image && person.imageUrl) {
    return (
      <>
        <Circle radius={radius - 1} fill={getRgbaVariable('--color-primary', 0.3)} listening={false} />
        <KonvaImage
          image={image}
          x={-radius}
          y={-radius}
          width={radius * 2}
          height={radius * 2}
          cornerRadius={radius}
          listening={false}
        />
        <Circle
          radius={radius}
          fill="transparent"
          stroke={borderColor}
          strokeWidth={isSelected ? 2.5 : 1.5}
          listening={false}
        />
      </>
    )
  }

  return (
    <>
      <Circle
        radius={radius}
        fill={getRgbaVariable('--color-primary', 0.5)}
        stroke={borderColor}
        strokeWidth={isSelected ? 2.5 : 1.5}
        listening={false}
      />
      <Text
        text="👤"
        fontSize={radius * 1.2}
        x={-radius * 0.6}
        y={-radius * 0.6}
        fill={getRgbaVariable('--color-text', 1)}
        listening={false}
      />
    </>
  )
}

export function MapPersonToken({
  person,
  isSelected = false,
  isHovered = false,
  radius = 7,
  scale = 1,
}: MapPersonTokenProps) {
  const r = radius * scale
  const pillHeight = r * 2 * PILL_HEIGHT_RATIO
  const pillWidth = r * 2 * PILL_WIDTH_RATIO
  const cornerRadius = r * CORNER_RADIUS_RATIO
  const circleCenterX = -pillWidth / 2 + r + 3
  const textX = circleCenterX + r + 5
  const textWidth = pillWidth / 2 - 6
  const name = [person.firstName, person.lastName].filter(Boolean).join(' ') || 'Person'

  const outlineColor = isSelected
    ? getRgbaVariable('--color-primary', 0.95)
    : isHovered
      ? getRgbaVariable('--color-primary', 0.7)
      : getRgbaVariable('--color-border-subtle', 0.7)
  const strokeWidth = isSelected ? 1.5 : (isHovered ? 1.2 : 1)

  // Center the token at the Group's (x,y) so person coords = token center.
  return (
    <Group offsetX={pillWidth / 2} offsetY={pillHeight / 2} listening={true}>
      {/* Invisible hit rect so hover/click are reliable */}
      <Rect
        x={-pillWidth / 2}
        y={-pillHeight / 2}
        width={pillWidth}
        height={pillHeight}
        cornerRadius={cornerRadius}
        fill="transparent"
        listening={true}
      />
      {/* Pill background - light fill so token isn't heavy */}
      <Rect
        x={-pillWidth / 2}
        y={-pillHeight / 2}
        width={pillWidth}
        height={pillHeight}
        cornerRadius={cornerRadius}
        fill={getRgbaVariable('--color-surface', 0.82)}
        listening={false}
      />
      {/* Pill outline */}
      <Rect
        x={-pillWidth / 2}
        y={-pillHeight / 2}
        width={pillWidth}
        height={pillHeight}
        cornerRadius={cornerRadius}
        fill="transparent"
        stroke={outlineColor}
        strokeWidth={strokeWidth}
        listening={false}
      />
      {/* Circle with icon/photo */}
      <Group x={circleCenterX} y={0}>
        <PersonCircleContent
          person={person}
          radius={r}
          isSelected={isSelected}
          isHovered={isHovered}
          borderColor={outlineColor}
        />
      </Group>
      {/* Name */}
      <Text
        x={textX}
        y={-pillHeight / 2 + (pillHeight - 11) / 2}
        text={name}
        fontSize={10}
        fontFamily="system-ui, -apple-system, sans-serif"
        fill={getRgbaVariable('--color-text', 0.92)}
        width={textWidth}
        wrap="none"
        ellipsis={true}
        listening={false}
      />
    </Group>
  )
}
