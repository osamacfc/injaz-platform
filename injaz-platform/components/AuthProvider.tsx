'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, profileHelpers, evidenceHelpers } from '@/lib/supabase'
import type { Profile, Evidence } from '@/lib/constants'
import { isPrivileged } from '@/lib/constants'

interface AuthCtx {
  user:       Profile | null
  evs:        Evidence[]
  loading:    boolean
  setEvs:     (evs: Evidence[]) => void
  refreshEvs: () => Promise<void>
  logout:     () => Promise<void>
}

const Ctx = createContext<AuthCtx>({
  user: null, evs: [], loading: true,
  setEvs: () => {}, refreshEvs: async () => {}, logout: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<Profile | null>(null)
  const [evs,     setEvs]     = useState<Evidence[]>([])
  const [loading, setLoading] = useState(true)

  const loadEvs = useCallback(async (profile: Profile) => {
    try {
      const data = isPrivileged(profile)
        ? await evidenceHelpers.getAll()
        : await evidenceHelpers.getByTeacher(profile.id)
      setEvs(data as Evidence[])
    } catch (e) {
      console.error('loadEvs:', e)
    }
  }, [])

  const refreshEvs = useCallback(async () => {
    if (user) await loadEvs(user)
  }, [user, loadEvs])

  useEffect(() => {
    // Check existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await profileHelpers.getProfile(session.user.id)
        if (profile) {
          setUser(profile as Profile)
          await loadEvs(profile as Profile)
        }
      }
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null); setEvs([])
        } else if (session?.user && event === 'SIGNED_IN') {
          const profile = await profileHelpers.getProfile(session.user.id)
          if (profile) {
            setUser(profile as Profile)
            await loadEvs(profile as Profile)
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [loadEvs])

  // Realtime sync
  useEffect(() => {
    if (!user) return
    const channel = supabase
      .channel('ev-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'evidences' },
        async () => { await loadEvs(user) }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, loadEvs])

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null); setEvs([])
  }

  return (
    <Ctx.Provider value={{ user, evs, loading, setEvs, refreshEvs, logout }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => useContext(Ctx)
