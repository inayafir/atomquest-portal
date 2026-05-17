export function computeScore(
  uomType: string,
  target: number,
  actual: number,
  targetDate?: string,
  actualDate?: string
): number {
  switch (uomType) {
    case 'numeric_min':
      return Math.min((actual / target) * 100, 100)
    case 'numeric_max':
      return Math.min((target / actual) * 100, 100)
    case 'zero':
      return actual === 0 ? 100 : 0
    case 'timeline':
      if (!targetDate || !actualDate) return 0
      return new Date(actualDate) <= new Date(targetDate) ? 100 : 0
    default:
      return 0
  }
}