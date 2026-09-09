export const CACHE_KEYS = {
  PROFILE: 'mm_profile',
  MESS: 'mm_mess',
  MEMBERS: 'mm_members',
  EXPENSES: 'mm_expenses',
  MEALS: 'mm_meals',
  MESSAGES: 'mm_messages',
  LOGS: 'mm_logs'
}

export const updateCache = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data))
}

export const formatMoney = (n) => `৳${n.toLocaleString('en-BD', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

export const formatDate = (iso) => new Date(iso).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })

export const formatChatTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

export const getChatDateLabel = (dateStr) => {
  const date = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export const NOTIFY_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'

// Global audio instance (singleton)
let audio = null
export const playNotificationSound = () => {
  if (!audio) {
    audio = new Audio(NOTIFY_SOUND_URL)
  }
  audio.play().catch(e => console.log('Audio play failed', e))
}