'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

type AuditLog = {
  id: string
  table_name: string
  record_id: string
  change_type: string
  created_at: string
}

export default function AdminAuditPage() {
  const supabase = createClient()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20

  useEffect(() => { loadLogs() }, [page])

  async function loadLogs() {
    setLoading(true)
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    setLogs(data || [])
    setLoading(false)
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Audit Log</h1>
        <p className="text-gray-500 text-sm mt-1">Full history of all system changes</p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-12 bg-gray-100 animate-pulse rounded-lg" />)}
        </div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-400 text-sm">No audit entries yet</p>
          <p className="text-gray-300 text-xs mt-1">Changes to goals and approvals will appear here</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Time</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Table</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Change</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500">Record ID</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                        {log.table_name}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        log.change_type === 'UPDATE' ? 'bg-blue-100 text-blue-700' :
                        log.change_type === 'DELETE' ? 'bg-red-100 text-red-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {log.change_type || 'CHANGE'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-400 font-mono truncate max-w-xs">
                      {log.record_id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between mt-4">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              ← Previous
            </button>
            <span className="text-sm text-gray-400 self-center">Page {page + 1}</span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={logs.length < PAGE_SIZE}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            >
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  )
}