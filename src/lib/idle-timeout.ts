// Logout automático por inatividade na área do aluno (src/components/ui/idle-logout-guard.tsx).
// Isolado aqui para poder reduzir os valores temporariamente e testar sem esperar 10 min reais.
export const IDLE_TIMEOUT_MS = 10 * 60 * 1000
export const IDLE_WARNING_MS = 60 * 1000
export const ACTIVITY_STORAGE_KEY = 'lv:last-activity'
export const ACTIVITY_EVENT = 'lv:activity'
