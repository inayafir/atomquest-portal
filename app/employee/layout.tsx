import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'employee') redirect('/dashboard')

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role="employee" fullName={profile.full_name} />
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  )
}