import { createBrowserClient } from '@supabase/ssr'

const SB_URL = 'https://tfcaedotumvtcenapbrm.supabase.co'
const SB_KEY = 'sb_publishable_10Bts7wS5ViCpOx_ealwBQ_K89_-4iz'

// Client-side Supabase
export const supabase = createBrowserClient(SB_URL, SB_KEY)

// ── Auth helpers ──
export const authHelpers = {
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },

  async signUp(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    if (error) throw error

    if (data.user) {
      const words    = fullName.trim().split(/\s+/).filter(Boolean)
      const initials = words.slice(0, 2).map(w => w[0]).join('')
      await supabase.from('profiles').upsert({
        id: data.user.id, full_name: fullName.trim(),
        email, role: 'practitioner', av: initials,
        is_developer: false, is_evaluator: false,
      }, { onConflict: 'id' })
      await supabase.from('teacher_profiles').upsert(
        { uid: data.user.id, name: fullName.trim() },
        { onConflict: 'uid' }
      )
    }
    return data
  },

  async signOut() {
    await supabase.auth.signOut()
  },

  async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  },
}

// ── Profile helpers ──
export const profileHelpers = {
  async getProfile(uid: string) {
    const { data } = await supabase
      .from('profiles').select('*').eq('id', uid).single()
    if (!data) return null
    return { ...data, name: data.full_name || data.name || '' }
  },

  async getAllProfiles() {
    const { data } = await supabase
      .from('profiles').select('*').order('full_name')
    return (data ?? []).map((p: any) => ({ ...p, name: p.full_name || p.name || '' }))
  },

  async getTeacherProfile(uid: string) {
    const { data } = await supabase
      .from('teacher_profiles').select('*').eq('uid', uid).single()
    if (!data) return null
    return {
      ...data,
      quals: Array.isArray(data.quals)
        ? data.quals
        : (data.quals ? JSON.parse(data.quals) : []),
    }
  },

  async upsertTeacherProfile(uid: string, profile: any) {
    const { error } = await supabase.from('teacher_profiles').upsert({
      uid,
      name:        profile.name,
      phone:       profile.phone,
      bio:         profile.bio,
      photo:       profile.photo,
      quals:       JSON.stringify(profile.quals ?? []),
      philosophy:  profile.philosophy,
      reflection:  profile.reflection,
      conclusion:  profile.conclusion,
      hidden_secs: profile.hiddenSecs ?? [],
      seals:       profile.seals ?? [],
      kpi_summary: profile.kpiSummary ?? {},
      updated_at:  new Date().toISOString(),
    }, { onConflict: 'uid' })
    if (error) console.error('upsertTeacherProfile:', error)
  },
}

// ── Evidence helpers ──
export const evidenceHelpers = {
  async getByTeacher(tid: string) {
    const { data, error } = await supabase
      .from('evidences').select('*').eq('tid', tid).order('ts', { ascending: false })
    if (error) console.error('getByTeacher:', error)
    return data ?? []
  },

  async getAll() {
    const { data, error } = await supabase
      .from('evidences').select('*').order('ts', { ascending: false })
    if (error) console.error('getAll:', error)
    return data ?? []
  },

  async getActive() {
    const { data } = await supabase
      .from('evidences').select('*').order('ts', { ascending: false })
    return data ?? []
  },

  async upsert(ev: any) {
    const { data, error } = await supabase.from('evidences').upsert({
      id:          ev.id,
      tid:         ev.tid,
      sid:         ev.sid,
      title:       ev.title,
      desc:        ev.desc ?? '',
      type:        ev.type ?? 'doc',
      date:        ev.date ?? '',
      url:         ev.url ?? '',
      file_name:   ev.file_name ?? '',
      file_url:    ev.file_url ?? '',
      active:      ev.active ?? true,
      kpis:        ev.kpis ?? [],
      impact:      ev.impact ?? null,
      note:        ev.note ?? '',
      sup_rating:  ev.supRating ?? ev.sup_rating ?? 0,
      sup_tags:    ev.supTags ?? ev.sup_tags ?? [],
      is_verified: ev.is_verified ?? false,
      ts:          ev.ts ?? Date.now(),
    }, { onConflict: 'id' })
    if (error) console.error('upsertEv:', error)
    return data?.[0] ?? ev
  },

  async delete(id: string) {
    const { error } = await supabase.from('evidences').delete().eq('id', id)
    if (error) console.error('deleteEv:', error)
  },

  // ── رفع الملفات لـ Supabase Storage (حقيقي 100%) ──
  async uploadFile(file: File, tid: string): Promise<string> {
    const ext  = file.name.split('.').pop() ?? 'jpg'
    const path = `${tid}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

    const { error } = await supabase.storage
      .from('evidences')
      .upload(path, file, { cacheControl: '3600', upsert: false })

    if (error) throw error

    const { data } = supabase.storage.from('evidences').getPublicUrl(path)
    return data.publicUrl
  },

  async uploadBase64(b64: string, tid: string): Promise<string> {
    const res  = await fetch(b64)
    const blob = await res.blob()
    const ext  = blob.type.split('/')[1] ?? 'jpg'
    const file = new File([blob], `photo_${Date.now()}.${ext}`, { type: blob.type })
    return this.uploadFile(file, tid)
  },
}

// ── Seal helpers ──
export const sealHelpers = {
  async award(teacherId: string, sealId: string, awardedBy: string) {
    await supabase.from('seal_awards').upsert(
      { teacher_id: teacherId, seal_id: sealId, awarded_by: awardedBy },
      { onConflict: 'teacher_id,seal_id' }
    )
  },
  async revoke(teacherId: string, sealId: string) {
    await supabase.from('seal_awards')
      .delete().eq('teacher_id', teacherId).eq('seal_id', sealId)
  },
}

// ── Realtime subscription ──
export const subscribeToEvidences = (
  tid: string | null,
  callback: (payload: any) => void
) => {
  const channel = supabase
    .channel('evidences-changes')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'evidences',
      ...(tid ? { filter: `tid=eq.${tid}` } : {}),
    }, callback)
    .subscribe()

  return () => supabase.removeChannel(channel)
}
