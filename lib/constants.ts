export const EVENT_CATEGORIES = [
  'Food',
  'Camp',
  'Academic',
  'Gaming',
  'Workshop',
  'Cultural Exchange',
  'Social',
  'Sports',
] as const

export type EventCategory = typeof EVENT_CATEGORIES[number]
