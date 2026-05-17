'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function DashboardPage() {
  useEffect(() => {
    async function redirect() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login'; return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile) { window.location.href = '/login'; return }

      if (profile.role === 'admin') window.location.href = '/admin/cycles'
      else if (profile.role === 'manager') window.location.href = '/manager/team'
      else window.location.href = '/employee/goals'
    }
    redirect()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-gray-400 text-sm">Redirecting...</div>
    </div>
  )
}