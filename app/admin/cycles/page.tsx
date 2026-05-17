'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Cycle = {
  id: string
  name: string
  goal_setting_opens: string
  q1_opens: string
  q2_opens: string
  q3_opens: string
  q4_opens: string
  is_active: boolean
}

const empty = {
  name: '',
  goal_setting_opens: '',
  q1_opens: '',
  q2_opens: '',
  q3_opens: '',
  q4_opens: '',
}

export default function AdminCyclesPage() {
  const supabase = createClient()
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadCycles() }, [])

  async function loadCycles() {
    const { data } = await supabase.from('cycles').select('*').order('created_at', { ascending: false })
    setCycles(data || [])
    setLoading(false)
  }

  async function handleCreate() {
    setSaving(true)
    await supabase.from('cycles').insert({ ...form, is_active: false })
    setForm(empty)
    setShowForm(false)
    setSaving(false)
    loadCycles()
  }

  async function toggleActive(cycle: Cycle) {
    await supabase.from('cycles').update({ is_active: false }).neq('id', '')
    await supabase.from('cycles').update({ is_active: !cycle.is_active }).eq('id', cycle.id)
    loadCycles()
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Goal Cycles</h1>
          <p className="text-gray-500 text-sm mt-1">Manage goal-setting windows and quarterly dates</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-[#4F6EF7] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#3d5ce0]"
        >
          + New Cycle
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-20 bg-gray-100 animate-pulse rounded-xl" />)}
        </div>
      ) : cycles.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-400 text-sm">No cycles yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cycles.map(cycle => (
            <div key={cycle.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium text-gray-900">{cycle.name}</h3>
                    {cycle.is_active && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Active</span>
                    )}
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-gray-400">
                    <span>Goal Setting: {cycle.goal_setting_opens || '—'}</span>
                    <span>Q1: {cycle.q1_opens || '—'}</span>
                    <span>Q2: {cycle.q2_opens || '—'}</span>
                    <span>Q3: {cycle.q3_opens || '—'}</span>
                    <span>Q4: {cycle.q4_opens || '—'}</span>
                  </div>
                </div>
                <button
                  onClick={() => toggleActive(cycle)}
                  className={`text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${
                    cycle.is_active
                      ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      : 'bg-[#4F6EF7] text-white hover:bg-[#3d5ce0]'
                  }`}
                >
                  {cycle.is_active ? 'Deactivate' : 'Set Active'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">New Cycle</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cycle Name</label>
                <input
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]"
                  placeholder="e.g. FY 2026-27"
                />
              </div>
              {(['goal_setting_opens', 'q1_opens', 'q2_opens', 'q3_opens', 'q4_opens'] as const).map(field => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field === 'goal_setting_opens' ? 'Goal Setting Opens' : field.replace('_opens', '').toUpperCase() + ' Opens'}
                  </label>
                  <input
                    type="date"
                    value={form[field]}
                    onChange={e => setForm(p => ({ ...p, [field]: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700">Cancel</button>
              <button onClick={handleCreate} disabled={saving || !form.name} className="flex-1 px-4 py-2 bg-[#4F6EF7] text-white rounded-lg text-sm font-medium disabled:opacity-40">
                {saving ? 'Creating...' : 'Create Cycle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}