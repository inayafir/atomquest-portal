'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type Profile = {
  id: string
  full_name: string
  email: string
  role: string
  manager_id: string | null
  department: string | null
}

export default function AdminUsersPage() {
  const supabase = createClient()
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<Profile>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    const { data } = await supabase.from('profiles').select('*').order('full_name')
    setUsers(data || [])
    setLoading(false)
  }

  async function handleSave(id: string) {
    setSaving(true)
    await supabase.from('profiles').update({
      role: editForm.role,
      manager_id: editForm.manager_id || null,
      department: editForm.department || null,
    }).eq('id', id)
    setSaving(false)
    setEditingId(null)
    loadUsers()
  }

  const managers = users.filter(u => u.role === 'manager' || u.role === 'admin')
  const roleColor: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-700',
    manager: 'bg-blue-100 text-blue-700',
    employee: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
        <p className="text-gray-500 text-sm mt-1">Manage roles and reporting relationships</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 animate-pulse rounded-xl" />)}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Name</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Role</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Manager</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Department</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </td>
                  <td className="px-5 py-4">
                    {editingId === user.id ? (
                      <select
                        value={editForm.role}
                        onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))}
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                      >
                        <option value="employee">Employee</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${roleColor[user.role] || 'bg-gray-100 text-gray-600'}`}>
                        {user.role}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-500">
                    {editingId === user.id ? (
                      <select
                        value={editForm.manager_id || ''}
                        onChange={e => setEditForm(p => ({ ...p, manager_id: e.target.value }))}
                        className="border border-gray-300 rounded px-2 py-1 text-sm"
                      >
                        <option value="">None</option>
                        {managers.filter(m => m.id !== user.id).map(m => (
                          <option key={m.id} value={m.id}>{m.full_name}</option>
                        ))}
                      </select>
                    ) : (
                      users.find(u => u.id === user.manager_id)?.full_name || '—'
                    )}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-500">
                    {editingId === user.id ? (
                      <input
                        value={editForm.department || ''}
                        onChange={e => setEditForm(p => ({ ...p, department: e.target.value }))}
                        className="border border-gray-300 rounded px-2 py-1 text-sm w-32"
                        placeholder="Department"
                      />
                    ) : (
                      user.department || '—'
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {editingId === user.id ? (
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setEditingId(null)} className="text-xs text-gray-400 hover:underline">Cancel</button>
                        <button onClick={() => handleSave(user.id)} disabled={saving} className="text-xs text-[#4F6EF7] font-medium hover:underline">Save</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingId(user.id); setEditForm(user) }}
                        className="text-sm text-gray-400 hover:text-[#4F6EF7] hover:underline"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}