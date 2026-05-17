'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Role = 'employee' | 'manager' | 'admin'

const navItems: Record<Role, { label: string; href: string; icon: string }[]> = {
  employee: [
    { label: 'My Goals', href: '/employee/goals', icon: '🎯' },
    { label: 'Check-ins', href: '/employee/checkins', icon: '📋' },
  ],
  manager: [
    { label: 'My Team', href: '/manager/team', icon: '👥' },
    { label: 'Check-ins', href: '/manager/checkins', icon: '📋' },
  ],
  admin: [
    { label: 'Cycles', href: '/admin/cycles', icon: '🔄' },
    { label: 'Users', href: '/admin/users', icon: '👤' },
    { label: 'Reports', href: '/admin/reports', icon: '📊' },
    { label: 'Audit Log', href: '/admin/audit', icon: '🔍' },
  ],
}

export default function Sidebar({
  role,
  fullName,
}: {
  role: Role
  fullName: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const items = navItems[role]

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const roleLabel = {
    employee: 'Employee',
    manager: 'Manager',
    admin: 'Administrator',
  }[role]

  return (
    <aside className="w-60 min-h-screen bg-[#0F1629] flex flex-col">

      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#4F6EF7]" />
          <span className="text-white font-semibold text-sm">AtomQuest</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {items.map(item => {
          const active = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-[#4F6EF7] text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User + Sign out */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="mb-3">
          <p className="text-white text-sm font-medium truncate">{fullName}</p>
          <p className="text-white/40 text-xs">{roleLabel}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full text-left text-xs text-white/40 hover:text-white/70 transition-colors"
        >
          Sign out →
        </button>
      </div>
    </aside>
  )
}