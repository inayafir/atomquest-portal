'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { computeScore } from '@/lib/scoring'

type Goal = {
  id: string
  title: string
  thrust_area: string
  uom_type: string
  target_value: number | null
  target_date: string | null
  weightage: number
}

type Achievement = {
  id?: string
  goal_id: string
  quarter: string
  actual_value: number | null
  actual_date: string | null
  status: string
  employee_notes: string
  computed_score: number | null
}

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']

export default function EmployeeCheckinsPage() {
  const supabase = createClient()

  const [goals, setGoals] = useState<Goal[]>([])
  const [achievements, setAchievements] = useState<Record<string, Record<string, Achievement>>>({})
  const [managerComments, setManagerComments] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [activeQuarter, setActiveQuarter] = useState('Q1')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<Achievement>>({})

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: cycle } = await supabase
      .from('cycles')
      .select('id')
      .eq('is_active', true)
      .single()

    if (!cycle) { setLoading(false); return }

    const { data: sheet } = await supabase
      .from('goal_sheets')
      .select('id, status')
      .eq('employee_id', user.id)
      .eq('cycle_id', cycle.id)
      .single()

    if (!sheet || sheet.status !== 'approved') { setLoading(false); return }

    const { data: goalsData } = await supabase
      .from('goals')
      .select('*')
      .eq('goal_sheet_id', sheet.id)
      .order('created_at')

    setGoals(goalsData || [])

    const goalIds = (goalsData || []).map((g: Goal) => g.id)

    const { data: achievementsData } = await supabase
      .from('achievements')
      .select('*')
      .in('goal_id', goalIds)

    const map: Record<string, Record<string, Achievement>> = {}
    achievementsData?.forEach((a: Achievement) => {
      if (!map[a.goal_id]) map[a.goal_id] = {}
      map[a.goal_id][a.quarter] = a
    })
    setAchievements(map)

    const achievementIds = achievementsData?.map((a: Achievement) => a.id).filter(Boolean) || []

const { data: commentRows } = await supabase
  .from('checkin_comments')
  .select('achievement_id, comment, quarter')
  .in('achievement_id', achievementIds)

const commentMap: Record<string, string[]> = {}
achievementsData?.forEach((a: Achievement) => {
  const comment = commentRows?.find((c: any) => c.achievement_id === a.id)
  if (comment) {
    commentMap[`${a.goal_id}-${a.quarter}`] = comment.comment
  }
})
setManagerComments(commentMap)

    setLoading(false)
  }

  function startEdit(goal: Goal, quarter: string) {
    const existing = achievements[goal.id]?.[quarter]
    setEditingId(`${goal.id}-${quarter}`)
    setForm({
      goal_id: goal.id,
      quarter,
      actual_value: existing?.actual_value ?? null,
      actual_date: existing?.actual_date ?? null,
      status: existing?.status ?? 'on_track',
      employee_notes: existing?.employee_notes ?? '',
    })
  }

  async function handleSave(goal: Goal) {
    setSaving(`${goal.id}-${activeQuarter}`)

    const score = computeScore(
      goal.uom_type,
      goal.target_value ?? 0,
      form.actual_value ?? 0,
      goal.target_date ?? undefined,
      form.actual_date ?? undefined
    )

    const payload = {
      goal_id: goal.id,
      quarter: activeQuarter,
      actual_value: form.actual_value,
      actual_date: form.actual_date,
      status: form.status,
      employee_notes: form.employee_notes,
      computed_score: score,
      updated_at: new Date().toISOString(),
    }

    const existing = achievements[goal.id]?.[activeQuarter]

    if (existing?.id) {
      await supabase.from('achievements').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('achievements').insert(payload)
    }

    setAchievements(prev => ({
  ...prev,
  [goal.id]: {
    ...prev[goal.id],
    [activeQuarter]: {
      id: existing?.id,
      goal_id: goal.id,
      quarter: activeQuarter,
      actual_value: form.actual_value ?? null,
      actual_date: form.actual_date ?? null,
      status: form.status ?? 'on_track',
      employee_notes: form.employee_notes ?? '',
      computed_score: score,
    }
  }
}))

    setEditingId(null)
    setSaving(null)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-400 text-sm">Loading...</div>
    </div>
  )

  if (goals.length === 0) return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Check-ins</h1>
      <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300 mt-8">
        <p className="text-gray-400 text-sm">No approved goals yet</p>
        <p className="text-gray-300 text-xs mt-1">Goals must be approved by your manager before you can log check-ins</p>
      </div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Check-ins</h1>
        <p className="text-gray-500 text-sm mt-1">Log your quarterly progress against each goal</p>
      </div>

      <div className="flex gap-2 mb-6">
        {QUARTERS.map(q => (
          <button
            key={q}
            onClick={() => { setActiveQuarter(q); setEditingId(null) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeQuarter === q
                ? 'bg-[#4F6EF7] text-white'
                : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {q}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {goals.map(goal => {
          const achievement = achievements[goal.id]?.[activeQuarter]
          const isEditing = editingId === `${goal.id}-${activeQuarter}`
          const isSaving = saving === `${goal.id}-${activeQuarter}`
          const managerComment = managerComments[`${goal.id}-${activeQuarter}`]

          return (
            <div key={goal.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{goal.thrust_area}</span>
                    <span className="text-xs text-gray-400">{goal.weightage}% weight</span>
                  </div>
                  <h3 className="font-medium text-gray-900">{goal.title}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Target: {goal.target_value ?? goal.target_date ?? '—'}
                  </p>
                </div>

                {achievement?.computed_score !== null && achievement?.computed_score !== undefined && (
                  <div className={`text-center px-3 py-1.5 rounded-lg ${
                    achievement.computed_score >= 80 ? 'bg-green-50 text-green-700' :
                    achievement.computed_score >= 50 ? 'bg-amber-50 text-amber-700' :
                    'bg-red-50 text-red-700'
                  }`}>
                    <p className="text-lg font-bold">{Math.round(achievement.computed_score)}%</p>
                    <p className="text-xs">score</p>
                  </div>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-3 border-t border-gray-100 pt-4">
                  <div className="grid grid-cols-2 gap-3">
                    {goal.uom_type !== 'zero' && goal.uom_type !== 'timeline' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Actual Value</label>
                        <input
                          type="number"
                          value={form.actual_value ?? ''}
                          onChange={e => setForm(p => ({ ...p, actual_value: Number(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]"
                          placeholder="Enter actual"
                        />
                      </div>
                    )}
                    {goal.uom_type === 'timeline' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Actual Date</label>
                        <input
                          type="date"
                          value={form.actual_date ?? ''}
                          onChange={e => setForm(p => ({ ...p, actual_date: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]"
                        />
                      </div>
                    )}
                    {goal.uom_type === 'zero' && (
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Actual Value (target: 0)</label>
                        <input
                          type="number"
                          value={form.actual_value ?? ''}
                          onChange={e => setForm(p => ({ ...p, actual_value: Number(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]"
                          placeholder="0 = 100% score"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                      <select
                        value={form.status}
                        onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]"
                      >
                        <option value="not_started">Not Started</option>
                        <option value="on_track">On Track</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                    <textarea
                      value={form.employee_notes ?? ''}
                      onChange={e => setForm(p => ({ ...p, employee_notes: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]"
                      rows={2}
                      placeholder="Any context or blockers..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSave(goal)}
                      disabled={!!isSaving}
                      className="px-4 py-2 bg-[#4F6EF7] text-white rounded-lg text-sm font-medium hover:bg-[#3d5ce0] disabled:opacity-40"
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="border-t border-gray-100 pt-4">
                  {achievement ? (
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          {achievement.actual_value !== null && (
                            <p className="text-sm text-gray-600">Actual: <span className="font-medium text-gray-900">{achievement.actual_value}</span></p>
                          )}
                          {achievement.actual_date && (
                            <p className="text-sm text-gray-600">Date: <span className="font-medium text-gray-900">{achievement.actual_date}</span></p>
                          )}
                          <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
                            achievement.status === 'completed' ? 'bg-green-100 text-green-700' :
                            achievement.status === 'on_track' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {achievement.status.replace('_', ' ')}
                          </span>
                          {achievement.employee_notes && (
                            <p className="text-xs text-gray-400 mt-1">{achievement.employee_notes}</p>
                          )}
                        </div>
                        <button
                          onClick={() => startEdit(goal, activeQuarter)}
                          className="text-sm text-[#4F6EF7] hover:underline ml-4"
                        >
                          Edit
                        </button>
                      </div>

                      {managerComment && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                          <p className="text-xs font-medium text-blue-700 mb-1">💬 Manager comment</p>
                          <p className="text-sm text-blue-800">{managerComment}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-400">No data logged for {activeQuarter}</p>
                        <button
                          onClick={() => startEdit(goal, activeQuarter)}
                          className="text-sm text-[#4F6EF7] font-medium hover:underline"
                        >
                          + Log progress
                        </button>
                      </div>

                      {managerComment && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                          <p className="text-xs font-medium text-blue-700 mb-1">💬 Manager comment</p>
                          <p className="text-sm text-blue-800">{managerComment}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}