'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Employee = { id: string; full_name: string; email: string }
type Goal = {
  id: string; title: string; thrust_area: string
  uom_type: string; target_value: number | null; weightage: number
}
type Achievement = {
  id: string; goal_id: string; quarter: string
  actual_value: number | null; status: string
  employee_notes: string; computed_score: number | null
}
type Comment = { id: string; achievement_id: string; comment: string; created_at: string }

const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4']

export default function ManagerCheckinsPage() {
  const supabase = createClient()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selected, setSelected] = useState<Employee | null>(null)
  const [goals, setGoals] = useState<Goal[]>([])
  const [achievements, setAchievements] = useState<Record<string, Record<string, Achievement>>>({})
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [activeQuarter, setActiveQuarter] = useState('Q1')
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => { loadTeam() }, [])

  async function loadTeam() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: team } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .eq('manager_id', user.id)

    setEmployees(team || [])
    setLoading(false)
  }

  async function loadEmployee(emp: Employee) {
    setSelected(emp)
    setGoals([])
    setAchievements({})
    setComments({})

    const { data: cycle } = await supabase
      .from('cycles').select('id').eq('is_active', true).single()
    if (!cycle) return

    const { data: sheet } = await supabase
      .from('goal_sheets').select('id')
      .eq('employee_id', emp.id).eq('cycle_id', cycle.id).single()
    if (!sheet) return

    const { data: goalsData } = await supabase
      .from('goals').select('*').eq('goal_sheet_id', sheet.id).order('created_at')
    setGoals(goalsData || [])

    if (!goalsData?.length) return

    const { data: achData } = await supabase
      .from('achievements')
      .select('*')
      .in('goal_id', goalsData.map((g: Goal) => g.id))

    const achMap: Record<string, Record<string, Achievement>> = {}
    achData?.forEach((a: Achievement) => {
      if (!achMap[a.goal_id]) achMap[a.goal_id] = {}
      achMap[a.goal_id][a.quarter] = a
    })
    setAchievements(achMap)

    const { data: commentsData } = await supabase
      .from('checkin_comments')
      .select('*')
      .eq('goal_sheet_id', sheet.id)
      .order('created_at')

    const commMap: Record<string, Comment[]> = {}
    commentsData?.forEach((c: Comment) => {
      if (!commMap[c.achievement_id]) commMap[c.achievement_id] = []
      commMap[c.achievement_id].push(c)
    })
    setComments(commMap)
  }

  async function handleAddComment(goal: Goal, achievement: Achievement) {
    const key = `${goal.id}-${activeQuarter}`
    const text = commentText[key]?.trim()
    if (!text) return

    setSaving(key)
    const { data: { user } } = await supabase.auth.getUser()

    const { data: cycle } = await supabase
      .from('cycles').select('id').eq('is_active', true).single()
    const { data: sheet } = await supabase
      .from('goal_sheets').select('id')
      .eq('employee_id', selected!.id).eq('cycle_id', cycle!.id).single()

    const { data: newComment } = await supabase
      .from('checkin_comments')
      .insert({
        achievement_id: achievement.id,
        goal_sheet_id: sheet?.id,
        manager_id: user?.id,
        quarter: activeQuarter,
        comment: text,
      })
      .select().single()

    if (newComment) {
      setComments(prev => ({
        ...prev,
        [achievement.id]: [...(prev[achievement.id] || []), newComment]
      }))
    }
    setCommentText(prev => ({ ...prev, [key]: '' }))
    setSaving(null)
  }

  const scoreColor = (score: number | null) => {
    if (score === null) return 'text-gray-400'
    if (score >= 80) return 'text-green-600'
    if (score >= 50) return 'text-amber-600'
    return 'text-red-600'
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-400 text-sm">Loading...</div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Check-ins</h1>
        <p className="text-gray-500 text-sm mt-1">Review team progress and add comments</p>
      </div>

      {/* Employee selector */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {employees.map(emp => (
          <button
            key={emp.id}
            onClick={() => loadEmployee(emp)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selected?.id === emp.id
                ? 'bg-[#4F6EF7] text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {emp.full_name}
          </button>
        ))}
      </div>

      {!selected && (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-400 text-sm">Select a team member to view their check-ins</p>
        </div>
      )}

      {selected && (
        <>
          {/* Quarter tabs */}
          <div className="flex gap-2 mb-6">
            {QUARTERS.map(q => (
              <button
                key={q}
                onClick={() => setActiveQuarter(q)}
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

          {/* Goals */}
          {goals.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-400 text-sm">No approved goals found for {selected.full_name}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {goals.map(goal => {
                const achievement = achievements[goal.id]?.[activeQuarter]
                const key = `${goal.id}-${activeQuarter}`
                const goalComments = achievement ? (comments[achievement.id] || []) : []

                return (
                  <div key={goal.id} className="bg-white rounded-xl border border-gray-200 p-5">
                    {/* Goal header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            {goal.thrust_area}
                          </span>
                          <span className="text-xs text-gray-400">{goal.weightage}% weight</span>
                        </div>
                        <h3 className="font-medium text-gray-900">{goal.title}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">Target: {goal.target_value ?? '—'}</p>
                      </div>
                      {achievement?.computed_score !== null && achievement?.computed_score !== undefined && (
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${scoreColor(achievement.computed_score)}`}>
                            {Math.round(achievement.computed_score)}%
                          </p>
                          <p className="text-xs text-gray-400">score</p>
                        </div>
                      )}
                    </div>

                    {/* Planned vs Actual */}
                    <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg mb-4">
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Target</p>
                        <p className="text-sm font-medium text-gray-700">{goal.target_value ?? '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 mb-1">Actual ({activeQuarter})</p>
                        <p className="text-sm font-medium text-gray-700">
                          {achievement?.actual_value ?? <span className="text-gray-300">Not logged</span>}
                        </p>
                      </div>
                    </div>

                    {/* Employee notes */}
                    {achievement?.employee_notes && (
                      <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-blue-500 font-medium mb-1">Employee notes</p>
                        <p className="text-sm text-blue-700">{achievement.employee_notes}</p>
                      </div>
                    )}

                    {/* Manager comments */}
                    {goalComments.length > 0 && (
                      <div className="mb-3 space-y-2">
                        {goalComments.map(c => (
                          <div key={c.id} className="p-3 bg-amber-50 rounded-lg">
                            <p className="text-xs text-amber-500 font-medium mb-1">Your comment</p>
                            <p className="text-sm text-amber-800">{c.comment}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add comment */}
                    {achievement && (
                      <div className="flex gap-2">
                        <input
                          value={commentText[key] || ''}
                          onChange={e => setCommentText(prev => ({ ...prev, [key]: e.target.value }))}
                          placeholder="Add a comment..."
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]"
                          onKeyDown={e => e.key === 'Enter' && handleAddComment(goal, achievement)}
                        />
                        <button
                          onClick={() => handleAddComment(goal, achievement)}
                          disabled={saving === key}
                          className="px-4 py-2 bg-[#4F6EF7] text-white rounded-lg text-sm font-medium hover:bg-[#3d5ce0] disabled:opacity-40"
                        >
                          {saving === key ? '...' : 'Add'}
                        </button>
                      </div>
                    )}

                    {!achievement && (
                      <p className="text-xs text-gray-300 italic">Employee hasn't logged {activeQuarter} yet</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}