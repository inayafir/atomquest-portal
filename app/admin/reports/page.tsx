'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Employee = { id: string; full_name: string; email: string }
type ScoreMap = Record<string, Record<string, number | null>>

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']

export default function AdminReportsPage() {
  const supabase = createClient()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [scoreMap, setScoreMap] = useState<ScoreMap>({})
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)

    const { data: cycle } = await supabase
      .from('cycles')
      .select('id')
      .eq('is_active', true)
      .single()

    if (!cycle) { setLoading(false); return }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('role', 'employee')

    if (!profiles || profiles.length === 0) { setLoading(false); return }
    setEmployees(profiles)

    const { data: sheets } = await supabase
      .from('goal_sheets')
      .select('id, employee_id')
      .eq('cycle_id', cycle.id)
      .in('employee_id', profiles.map(p => p.id))

    if (!sheets || sheets.length === 0) { setLoading(false); return }

    const sheetIds = sheets.map(s => s.id)
    const sheetToEmployee: Record<string, string> = {}
    sheets.forEach(s => { sheetToEmployee[s.id] = s.employee_id })

    const { data: goals } = await supabase
      .from('goals')
      .select('id, goal_sheet_id')
      .in('goal_sheet_id', sheetIds)

    if (!goals || goals.length === 0) { setLoading(false); return }

    const goalToSheet: Record<string, string> = {}
    goals.forEach(g => { goalToSheet[g.id] = g.goal_sheet_id })

    const { data: achievements } = await supabase
      .from('achievements')
      .select('goal_id, quarter, computed_score')
      .in('goal_id', goals.map(g => g.id))

    // Build score map: employeeId -> quarter -> avg score
    const accum: Record<string, Record<string, number[]>> = {}
    achievements?.forEach(a => {
      const sheetId = goalToSheet[a.goal_id]
      const empId = sheetToEmployee[sheetId]
      if (!empId || a.computed_score === null) return
      if (!accum[empId]) accum[empId] = {}
      if (!accum[empId][a.quarter]) accum[empId][a.quarter] = []
      accum[empId][a.quarter].push(a.computed_score)
    })

    const map: ScoreMap = {}
    profiles.forEach(p => {
      map[p.id] = {}
      QUARTERS.forEach(q => {
        const scores = accum[p.id]?.[q]
        map[p.id][q] = scores && scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : null
      })
    })

    setScoreMap(map)
    setLoading(false)
  }

  async function handleExport() {
    setExporting(true)
    const XLSX = await import('xlsx')

    const rows = employees.map(emp => {
      const row: Record<string, string | number> = {
        Employee: emp.full_name,
        Email: emp.email,
      }
      QUARTERS.forEach(q => {
        row[q] = scoreMap[emp.id]?.[q] != null ? `${scoreMap[emp.id][q]}%` : 'No data'
      })
      return row
    })

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Achievement Report')
    XLSX.writeFile(wb, 'AtomQuest_Report.xlsx')
    setExporting(false)
  }

  function cellStyle(score: number | null) {
    if (score === null) return 'bg-gray-50 text-gray-400'
    if (score >= 80) return 'bg-green-50 text-green-700 font-medium'
    if (score >= 50) return 'bg-amber-50 text-amber-700 font-medium'
    return 'bg-red-50 text-red-700 font-medium'
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Reports</h1>
          <p className="text-gray-500 text-sm mt-1">Achievement scores by employee and quarter</p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting || loading || employees.length === 0}
          className="bg-gray-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-40"
        >
          {exporting ? 'Exporting...' : '↓ Export to Excel'}
        </button>
      </div>

      {loading ? (
        <div className="h-48 bg-gray-100 animate-pulse rounded-xl" />
      ) : employees.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-400 text-sm">No employee data found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Employee</th>
                {QUARTERS.map(q => (
                  <th key={q} className="text-center px-5 py-3 text-xs font-medium text-gray-500">{q}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-gray-900">{emp.full_name}</p>
                    <p className="text-xs text-gray-400">{emp.email}</p>
                  </td>
                  {QUARTERS.map(q => {
                    const score = scoreMap[emp.id]?.[q] ?? null
                    return (
                      <td key={q} className="px-5 py-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-lg text-sm ${cellStyle(score)}`}>
                          {score !== null ? `${score}%` : '—'}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}