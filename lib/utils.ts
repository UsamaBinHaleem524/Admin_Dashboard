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

// Convert ISO date (yyyy-MM-dd) to dd/MM/yyyy format
export function isoToDisplay(isoDate: string): string {
  if (!isoDate) return ""
  try {
    const [year, month, day] = isoDate.split("-")
    return `${day}/${month}/${year}`
  } catch {
    return ""
  }
}

// Convert dd/MM/yyyy to ISO format (yyyy-MM-dd) for backend
export function displayToISO(displayDate: string): string {
  if (!displayDate) return ""
  try {
    const [day, month, year] = displayDate.split("/")
    if (!day || !month || !year) return ""
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
  } catch {
    return ""
  }
}

// Parse dd/MM/yyyy input and validate
export function parseDDMMYYYY(value: string): { isValid: boolean; isoDate: string } {
  if (!value) return { isValid: false, isoDate: "" }
  
  // Remove any non-digit or slash characters
  const cleaned = value.replace(/[^\d/]/g, "")
  
  // Check if matches dd/MM/yyyy pattern
  const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!match) return { isValid: false, isoDate: "" }
  
  const [, day, month, year] = match
  const dayNum = parseInt(day, 10)
  const monthNum = parseInt(month, 10)
  const yearNum = parseInt(year, 10)
  
  // Validate ranges
  if (monthNum < 1 || monthNum > 12) return { isValid: false, isoDate: "" }
  if (dayNum < 1 || dayNum > 31) return { isValid: false, isoDate: "" }
  if (yearNum < 1900 || yearNum > 2100) return { isValid: false, isoDate: "" }
  
  // Check if date is valid (handles leap years, month lengths)
  const date = new Date(yearNum, monthNum - 1, dayNum)
  if (
    date.getFullYear() !== yearNum ||
    date.getMonth() !== monthNum - 1 ||
    date.getDate() !== dayNum
  ) {
    return { isValid: false, isoDate: "" }
  }
  
  const isoDate = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
  return { isValid: true, isoDate }
}

// Get today's date in ISO format
export function getTodayISO(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// Get today's date in dd/MM/yyyy format
export function getTodayDisplay(): string {
  return isoToDisplay(getTodayISO())
}
