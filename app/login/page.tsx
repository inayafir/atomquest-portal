'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
  setLoading(true)
  setError('')
  const supabase = createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    setError('Invalid email or password')
    setLoading(false)
    return
  }

  // Wait for session cookie to be written before redirecting
  await new Promise(resolve => setTimeout(resolve, 500))
  window.location.href = '/dashboard'
}

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 w-full max-w-md">
        
        {/* Logo / Title */}
        <div className="mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#4F6EF7] mb-4" />
          <h1 className="text-2xl font-semibold text-gray-900">AtomQuest Portal</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F6EF7] focus:border-transparent"
              placeholder="you@company.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4F6EF7] focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-[#4F6EF7] text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-[#3d5ce0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </div>

        {/* Demo credentials hint */}
        <div className="mt-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs font-medium text-gray-600 mb-1">Demo accounts</p>
          <p className="text-xs text-gray-500">priya@demo.com — Employee</p>
          <p className="text-xs text-gray-500">raj@demo.com — Manager</p>
          <p className="text-xs text-gray-500">admin@demo.com — Admin</p>
          <p className="text-xs text-gray-400 mt-1">Password: Demo@1234</p>
        </div>
      </div>
    </div>
  )
}