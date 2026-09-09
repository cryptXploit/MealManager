import { supabase } from './supabaseClient'

export const signUp = async (email, password, fullName) => {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  if (data.user) {
    await supabase.from('profiles').insert([{ id: data.user.id, full_name: fullName, email }])
  }
  return data
}

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export const resetPassword = async (email) => {
  // Use current origin as redirect URL
  const redirectUrl = window.location.origin
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl })
  if (error) throw error
}

export const updatePassword = async (newPassword) => {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}