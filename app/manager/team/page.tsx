'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Employee = {
  id: string
  full_name: string
  email: string
  department: string | null
}

type GoalSheet = {
  id: string
  status: string
  submitted_at: string | null
  employee_id: string
}

type Goal = {
  id: string
  thrust_area: string
  title: string
  description: string
  uom_type: string
  target_value: number | null
  target_date: string | null
  weightage: number
}

const UOM_LABELS: Record<string, string> = {
  numeric_min: 'Higher is better',
  numeric_max: 'Lower is better',
  timeline: 'Timeline',
  zero: 'Zero target',
}

export default function ManagerTeamPage() {
  const supabase = createClient()

  const [employees, setEmployees] = useState<Employee[]>([])
  const [sheets, setSheets] = useState<Record<string, GoalSheet>>({})
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Employee | null>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [loadingGoals, setLoadingGoals] = useState(false)
  const [managerNotes, setManagerNotes] = useState('')
  const [acting, setActing] = useState(false)
  const [editingGoal, setEditingGoal] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})

  useEffect(() => { loadTeam() }, [])

  async function loadTeam() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return


    const { data: teamMembers, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('manager_id', user.id)


    if (!teamMembers || teamMembers.length === 0) { setLoading(false); return }
    setEmployees(teamMembers)

    const { data: cycle } = await supabase
      .from('cycles')
      .select('id')
      .eq('is_active', true)
      .single()

    if (!cycle) { setLoading(false); return }

    const { data: goalSheets } = await supabase
      .from('goal_sheets')
      .select('*')
      .in('employee_id', teamMembers.map((e: Employee) => e.id))
      .eq('cycle_id', cycle.id)

    const sheetsMap: Record<string, GoalSheet> = {}
    goalSheets?.forEach((s: GoalSheet) => { sheetsMap[s.employee_id] = s })
    setSheets(sheetsMap)
    setLoading(false)
  }

  async function openEmployee(employee: Employee) {
    setSelected(employee)
    setManagerNotes('')
    setEditingGoal(null)
    setLoadingGoals(true)

    const sheet = sheets[employee.id]
    if (!sheet) { setLoadingGoals(false); return }

    const { data: goalsData } = await supabase
      .from('goals')
      .select('*')
      .eq('goal_sheet_id', sheet.id)
      .order('created_at')

    setGoals(goalsData || [])
    setLoadingGoals(false)
  }

  async function handleApprove() {
    const sheet = sheets[selected!.id]
    if (!sheet) return
    setActing(true)

    const { data: { user } } = await supabase.auth.getUser()

    await supabase
      .from('goal_sheets')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString(),
        approved_by: user?.id,
        manager_notes: managerNotes || null,
      })
      .eq('id', sheet.id)

    await supabase
      .from('goals')
      .update({ is_locked: true })
      .eq('goal_sheet_id', sheet.id)

    setSheets(prev => ({
      ...prev,
      [selected!.id]: { ...sheet, status: 'approved' }
    }))
    setActing(false)
    setSelected(null)
  }

  async function handleReturn() {
    const sheet = sheets[selected!.id]
    if (!sheet || !managerNotes) return
    setActing(true)

    await supabase
      .from('goal_sheets')
      .update({ status: 'returned', manager_notes: managerNotes })
      .eq('id', sheet.id)

    setSheets(prev => ({
      ...prev,
      [selected!.id]: { ...sheet, status: 'returned' }
    }))
    setActing(false)
    setSelected(null)
  }

  async function handleSaveGoalEdit(goalId: string) {
    const updates: Record<string, string | number> = {}
    if (editValues.target_value) updates.target_value = Number(editValues.target_value)
    if (editValues.weightage) updates.weightage = Number(editValues.weightage)

    await supabase.from('goals').update(updates).eq('id', goalId)
    setGoals(prev => prev.map(g => g.id === goalId ? { ...g, ...updates } : g))
    setEditingGoal(null)
  }

  const statusColor: Record<string, string> = {
    approved: 'bg-green-100 text-green-700',
    submitted: 'bg-blue-100 text-blue-700',
    returned: 'bg-red-100 text-red-700',
    draft: 'bg-gray-100 text-gray-500',
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-400 text-sm">Loading team...</div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">My Team</h1>
        <p className="text-gray-500 text-sm mt-1">Review and approve goal sheets</p>
      </div>

      {employees.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-400 text-sm">No direct reports found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Employee</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Department</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Submitted</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => {
                const sheet = sheets[emp.id]
                return (
                  <tr key={emp.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-gray-900">{emp.full_name}</p>
                      <p className="text-xs text-gray-400">{emp.email}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">{emp.department || '—'}</td>
                    <td className="px-5 py-4">
                      {sheet ? (
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[sheet.status]}`}>
                          {sheet.status.charAt(0).toUpperCase() + sheet.status.slice(1)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">No sheet</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-500">
                      {sheet?.submitted_at
                        ? new Date(sheet.submitted_at).toLocaleDateString()
                        : '—'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {sheet?.status === 'submitted' && (
                        <button
                          onClick={() => openEmployee(emp)}
                          className="text-sm text-[#4F6EF7] font-medium hover:underline"
                        >
                          Review →
                        </button>
                      )}
                      {sheet?.status === 'approved' && (
                        <button
                          onClick={() => openEmployee(emp)}
                          className="text-sm text-gray-400 hover:underline"
                        >
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900">{selected.full_name}'s Goals</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  {sheets[selected.id]?.status === 'approved' ? 'Approved' : 'Awaiting your review'}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              {loadingGoals ? (
                <p className="text-sm text-gray-400 text-center py-8">Loading goals...</p>
              ) : goals.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No goals found</p>
              ) : (
                goals.map(goal => (
                  <div key={goal.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{goal.thrust_area}</span>
                          <span className="text-xs text-[#4F6EF7] bg-blue-50 px-2 py-0.5 rounded-full">{UOM_LABELS[goal.uom_type]}</span>
                        </div>
                        <p className="font-medium text-gray-900 text-sm">{goal.title}</p>
                        {goal.description && <p className="text-xs text-gray-500 mt-1">{goal.description}</p>}
                      </div>
                      <div className="ml-4 text-right">
                        {editingGoal === goal.id ? (
                          <input
                            type="number"
                            value={editValues.weightage ?? goal.weightage}
                            onChange={e => setEditValues(p => ({ ...p, weightage: e.target.value }))}
                            className="w-16 text-right border border-gray-300 rounded px-2 py-1 text-sm"
                          />
                        ) : (
                          <p className="text-lg font-semibold text-gray-900">{goal.weightage}%</p>
                        )}
                        <p className="text-xs text-gray-400">weight</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-2">
                      {goal.target_value !== null && (
                        editingGoal === goal.id ? (
                          <input
                            type="number"
                            value={editValues.target_value ?? goal.target_value}
                            onChange={e => setEditValues(p => ({ ...p, target_value: e.target.value }))}
                            className="w-24 border border-gray-300 rounded px-2 py-1 text-xs"
                            placeholder="Target"
                          />
                        ) : (
                          <span className="text-xs text-gray-400">Target: <span className="text-gray-600 font-medium">{goal.target_value}</span></span>
                        )
                      )}
                      {goal.target_date && (
                        <span className="text-xs text-gray-400">By: <span className="text-gray-600 font-medium">{goal.target_date}</span></span>
                      )}
                    </div>

                    {sheets[selected.id]?.status === 'submitted' && (
                      <div className="mt-2 flex gap-2">
                        {editingGoal === goal.id ? (
                          <>
                            <button onClick={() => handleSaveGoalEdit(goal.id)} className="text-xs text-green-600 hover:underline">Save</button>
                            <button onClick={() => setEditingGoal(null)} className="text-xs text-gray-400 hover:underline">Cancel</button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingGoal(goal.id)
                              setEditValues({
                                target_value: String(goal.target_value ?? ''),
                                weightage: String(goal.weightage),
                              })
                            }}
                            className="text-xs text-gray-400 hover:text-[#4F6EF7] hover:underline"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {sheets[selected.id]?.status === 'submitted' && (
              <div className="px-6 py-4 border-t border-gray-100">
                <textarea
                  value={managerNotes}
                  onChange={e => setManagerNotes(e.target.value)}
                  placeholder="Add notes (required to return, optional to approve)..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F6EF7] mb-3"
                  rows={2}
                />
                <div className="flex gap-3">
                  <button
                    onClick={handleReturn}
                    disabled={acting || !managerNotes}
                    className="flex-1 px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-40"
                  >
                    Return for Rework
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={acting}
                    className="flex-1 px-4 py-2 bg-[#4F6EF7] text-white rounded-lg text-sm font-medium hover:bg-[#3d5ce0] disabled:opacity-40"
                  >
                    {acting ? 'Processing...' : 'Approve Goals'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}