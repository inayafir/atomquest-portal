export type Goal = {
  id?: string
  weightage: number
}

export function validateGoalSheet(goals: Goal[]): string[] {
  const errors: string[] = []
  if (goals.length > 8) errors.push('Maximum 8 goals allowed')
  if (goals.some(g => g.weightage < 10)) errors.push('Each goal must have at least 10% weightage')
  const total = goals.reduce((sum, g) => sum + Number(g.weightage), 0)
  if (total !== 100) errors.push(`Total weightage is ${total}% — must equal exactly 100%`)
  return errors
}