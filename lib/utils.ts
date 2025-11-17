import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parseISO } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const DISPLAY_DATE_FORMAT = "dd/MM/yyyy"

function parseDateInput(value?: string | Date | null) {
  if (!value) return null
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value
  }

  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    const parsedISO = parseISO(trimmed)
    if (!isNaN(parsedISO.getTime())) {
      return parsedISO
    }
  } catch {
    // ignore
  }

  const isoLikeMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoLikeMatch) {
    const [, year, month, day] = isoLikeMatch
    const parsed = new Date(Number(year), Number(month) - 1, Number(day))
    if (!isNaN(parsed.getTime())) {
      return parsed
    }
  }

  const fallback = new Date(trimmed)
  return isNaN(fallback.getTime()) ? null : fallback
}

export function formatDisplayDate(
  value?: string | Date | null,
  fallback: string = "-"
) {
  const parsed = parseDateInput(value)
  if (!parsed) return fallback

  try {
    return format(parsed, DISPLAY_DATE_FORMAT)
  } catch {
    return fallback
  }
}
