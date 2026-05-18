'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '../lib/supabase'

export default function PageViewTracker() {
  const pathname = usePathname()

  useEffect(() => {
    async function track() {
      const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))
      await supabase.from('page_views').insert({
        user_id: user?.id ?? null,
        path: pathname,
      })
    }
    track()
  }, [pathname])

  return null
}