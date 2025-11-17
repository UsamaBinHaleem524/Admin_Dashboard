export const formatDateToDMY = (input?: string | Date | null): string => {
  if (!input) return ""
  const handleDate = (year: string, month: string, day: string) => {
    const d = day.padStart(2, "0")
    const m = month.padStart(2, "0")
    return `${d}/${m}/${year}`
  }

  if (input instanceof Date) {
    if (Number.isNaN(input.getTime())) return ""
    const day = input.getDate().toString().padStart(2, "0")
    const month = (input.getMonth() + 1).toString().padStart(2, "0")
    const year = input.getFullYear().toString()
    return `${day}/${month}/${year}`
  }

  const stringInput = String(input)

  if (stringInput.includes("-")) {
    const datePart = stringInput.split("T")[0]
    const segments = datePart.split("-")
    if (segments.length === 3) {
      const [year, month, day] = segments
      return handleDate(year, month, day)
    }
  }

  const parsed = new Date(stringInput)
  if (!Number.isNaN(parsed.getTime())) {
    const day = parsed.getDate().toString().padStart(2, "0")
    const month = (parsed.getMonth() + 1).toString().padStart(2, "0")
    const year = parsed.getFullYear().toString()
    return `${day}/${month}/${year}`
  }

  return stringInput
}
