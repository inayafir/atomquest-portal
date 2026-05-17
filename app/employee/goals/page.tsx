'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { validateGoalSheet } from '@/lib/validations'

type Goal = {
  id: string
  thrust_area: string
  title: string
  description: string
  uom_type: string
  target_value: number
  target_date: string
  weightage: number
  is_locked: boolean
}

type GoalSheet = {
  id: string
  status: string
  manager_notes: string | null
}

const UOM_LABELS: Record<string, string> = {
  numeric_min: 'Higher is better',
  numeric_max: 'Lower is better',
  timeline: 'Timeline',
  zero: 'Zero target',
}

const THRUST_AREAS = [
  'Revenue Growth',
  'Customer Success',
  'Operational Efficiency',
  'People & Culture',
  'Innovation',
  'Compliance & Risk',
]

export default function EmployeeGoalsPage() {
  const supabase = createClient()

  const [goals, setGoals] = useState<Goal[]>([])
  const [sheet, setSheet] = useState<GoalSheet | null>(null)
  const [cycleId, setCycleId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [requestingRevision, setRequestingRevision] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const [form, setForm] = useState({
    thrust_area: THRUST_AREAS[0],
    title: '',
    description: '',
    uom_type: 'numeric_min',
    target_value: '',
    target_date: '',
    weightage: '',
  })

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
    setCycleId(cycle.id)

    const { data: existingSheet } = await supabase
      .from('goal_sheets')
      .select('*')
      .eq('employee_id', user.id)
      .eq('cycle_id', cycle.id)
      .single()

    if (existingSheet) {
      setSheet(existingSheet)
      const { data: goalsData } = await supabase
        .from('goals')
        .select('*')
        .eq('goal_sheet_id', existingSheet.id)
        .order('created_at')
      setGoals(goalsData || [])
    }

    setLoading(false)
  }

  async function createSheetIfNeeded(): Promise<string | null> {
    if (sheet) return sheet.id
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !cycleId) return null

    const { data, error } = await supabase
      .from('goal_sheets')
      .insert({ employee_id: user.id, cycle_id: cycleId, status: 'draft' })
      .select()
      .single()

    if (error || !data) return null
    setSheet(data)
    return data.id
  }

  async function handleRequestRevision() {
    if (!sheet) return
    setRequestingRevision(true)

    await supabase
      .from('goal_sheets')
      .update({ status: 'draft', submitted_at: null, approved_at: null, approved_by: null, manager_notes: null })
      .eq('id', sheet.id)

    await supabase
      .from('goals')
      .update({ is_locked: false })
      .eq('goal_sheet_id', sheet.id)

    setSheet(prev => prev ? { ...prev, status: 'draft', manager_notes: null } : prev)
    setGoals(prev => prev.map(g => ({ ...g, is_locked: false })))
    setRequestingRevision(false)
  }

  async function handleAddGoal() {
    if (!form.title || !form.weightage) {
      setErrors(['Please fill in all required fields'])
      return
    }

    const sheetId = await createSheetIfNeeded()
    if (!sheetId) return

    const { data, error } = await supabase
      .from('goals')
      .insert({
        goal_sheet_id: sheetId,
        thrust_area: form.thrust_area,
        title: form.title,
        description: form.description,
        uom_type: form.uom_type,
        target_value: form.target_value ? Number(form.target_value) : null,
        target_date: form.target_date || null,
        weightage: Number(form.weightage),
      })
      .select()
      .single()

    if (error) { setErrors([error.message]); return }

    setGoals(prev => [...prev, data])
    setForm({
      thrust_area: THRUST_AREAS[0],
      title: '',
      description: '',
      uom_type: 'numeric_min',
      target_value: '',
      target_date: '',
      weightage: '',
    })
    setShowForm(false)
    setErrors([])
  }

  async function handleDeleteGoal(id: string) {
    await supabase.from('goals').delete().eq('id', id)
    setGoals(prev => prev.filter(g => g.id !== id))
  }

  async function handleSubmit() {
    const validationErrors = validateGoalSheet(goals)
    if (goals.length === 0) {
  setErrors(['Please add at least one goal'])
  return
}

    setSubmitting(true)
    await supabase
      .from('goal_sheets')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('id', sheet!.id)

    setSheet(prev => prev ? { ...prev, status: 'submitted' } : prev)
    setSubmitting(false)
    setErrors([])
  }

  const totalWeightage = goals.reduce((sum, g) => sum + Number(g.weightage), 0)
  const isLocked = sheet?.status === 'approved'
  const isSubmitted = sheet?.status === 'submitted'
  const isDraft = !sheet || sheet.status === 'draft' || sheet.status === 'returned'

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-gray-400 text-sm">Loading...</div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">My Goals</h1>
          <p className="text-gray-500 text-sm mt-1">FY 2025-26 · Goal Setting Phase</p>
        </div>
        <div className="flex items-center gap-3">
          {sheet?.status && (
            <span className={`text-xs font-medium px-3 py-1 rounded-full ${
              sheet.status === 'approved' ? 'bg-green-100 text-green-700' :
              sheet.status === 'submitted' ? 'bg-blue-100 text-blue-700' :
              sheet.status === 'returned' ? 'bg-red-100 text-red-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {sheet.status.charAt(0).toUpperCase() + sheet.status.slice(1)}
            </span>
          )}
          {isLocked && (
            <button
              onClick={handleRequestRevision}
              disabled={requestingRevision}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              {requestingRevision ? 'Unlocking...' : 'Request Revision'}
            </button>
          )}
          {isDraft && (
            <button
              onClick={() => setShowForm(true)}
              disabled={goals.length >= 8}
              className="bg-[#4F6EF7] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#3d5ce0] disabled:opacity-40"
            >
              + Add Goal
            </button>
          )}
        </div>
      </div>

      {sheet?.status === 'returned' && sheet.manager_notes && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm font-medium text-red-700 mb-1">Returned by manager</p>
          <p className="text-sm text-red-600">{sheet.manager_notes}</p>
        </div>
      )}

      {isLocked && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-sm text-green-700 font-medium">✓ Goals approved and locked</p>
          <p className="text-xs text-green-600 mt-0.5">Click "Request Revision" to unlock and make changes.</p>
        </div>
      )}

      <div className="mb-6 p-4 bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Total Weightage</span>
          <span className={`text-sm font-semibold ${
            totalWeightage === 100 ? 'text-green-600' :
            totalWeightage > 100 ? 'text-red-600' : 'text-amber-600'
          }`}>
            {totalWeightage}% / 100%
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              totalWeightage === 100 ? 'bg-green-500' :
              totalWeightage > 100 ? 'bg-red-500' : 'bg-[#4F6EF7]'
            }`}
            style={{ width: `${Math.min(totalWeightage, 100)}%` }}
          />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {goals.length}/8 goals · Min 10% per goal · Must total exactly 100%
        </p>
      </div>

      {errors.length > 0 && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          {errors.map((e, i) => <p key={i} className="text-sm text-red-600">{e}</p>)}
        </div>
      )}

      {goals.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-400 text-sm">No goals yet</p>
          <p className="text-gray-300 text-xs mt-1">Click "Add Goal" to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map(goal => (
            <div key={goal.id} className={`bg-white rounded-xl border p-5 ${goal.is_locked ? 'border-gray-100 opacity-80' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{goal.thrust_area}</span>
                    <span className="text-xs text-[#4F6EF7] bg-blue-50 px-2 py-0.5 rounded-full">{UOM_LABELS[goal.uom_type]}</span>
                    {goal.is_locked && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">🔒 Locked</span>}
                  </div>
                  <h3 className="font-medium text-gray-900">{goal.title}</h3>
                  {goal.description && <p className="text-sm text-gray-500 mt-1">{goal.description}</p>}
                  <div className="flex items-center gap-4 mt-2">
                    {goal.target_value && <span className="text-xs text-gray-400">Target: <span className="text-gray-600 font-medium">{goal.target_value}</span></span>}
                    {goal.target_date && <span className="text-xs text-gray-400">By: <span className="text-gray-600 font-medium">{goal.target_date}</span></span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900">{goal.weightage}%</p>
                    <p className="text-xs text-gray-400">weight</p>
                  </div>
                  {isDraft && !goal.is_locked && (
                    <button onClick={() => handleDeleteGoal(goal.id)} className="text-gray-300 hover:text-red-400 text-lg">×</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {goals.length > 0 && isDraft && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={submitting || goals.length === 0 || totalWeightage > 100}
            className="bg-gray-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-40"
          >
            {submitting ? 'Submitting...' : 'Submit for Approval'}
          </button>
        </div>
      )}

      {isSubmitted && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-center">
          <p className="text-sm text-blue-700 font-medium">Goals submitted — awaiting manager approval</p>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">Add New Goal</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Thrust Area</label>
                <select
                  value={form.thrust_area}
                  onChange={e => setForm(p => ({ ...p, thrust_area: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]"
                >
                  {THRUST_AREAS.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Goal Title *</label>
                <input
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]"
                  placeholder="e.g. Increase quarterly revenue by 15%"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]"
                  rows={2}
                  placeholder="Additional context..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Measurement Type *</label>
                  <select
                    value={form.uom_type}
                    onChange={e => setForm(p => ({ ...p, uom_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]"
                  >
                    <option value="numeric_min">Higher is better</option>
                    <option value="numeric_max">Lower is better</option>
                    <option value="timeline">Timeline</option>
                    <option value="zero">Zero target</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weightage (%) *</label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={form.weightage}
                    onChange={e => setForm(p => ({ ...p, weightage: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]"
                    placeholder="e.g. 25"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {form.uom_type !== 'zero' && form.uom_type !== 'timeline' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Value</label>
                    <input
                      type="number"
                      value={form.target_value}
                      onChange={e => setForm(p => ({ ...p, target_value: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]"
                      placeholder="e.g. 100"
                    />
                  </div>
                )}
                {form.uom_type === 'timeline' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Date</label>
                    <input
                      type="date"
                      value={form.target_date}
                      onChange={e => setForm(p => ({ ...p, target_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]"
                    />
                  </div>
                )}
              </div>
            </div>

            {errors.length > 0 && (
              <div className="mt-3 p-3 bg-red-50 rounded-lg">
                {errors.map((e, i) => <p key={i} className="text-xs text-red-600">{e}</p>)}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowForm(false); setErrors([]) }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddGoal}
                className="flex-1 px-4 py-2 bg-[#4F6EF7] text-white rounded-lg text-sm font-medium hover:bg-[#3d5ce0]"
              >
                Add Goal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}