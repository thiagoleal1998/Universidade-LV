'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { toWebP } from '@/lib/image'
import { requireAdmin } from '@/lib/authz'
import { logActivity } from '@/lib/activity-log'

export async function updateSettings(formData: FormData) {
  const authz = await requireAdmin()
  if ('error' in authz) return { error: authz.error }

  const supabase = await createClient()

  const entries = [
    { key: 'site_name', value: (formData.get('site_name') as string) || 'Universidade LV' },
    { key: 'site_tagline', value: (formData.get('site_tagline') as string) || '' },
    { key: 'primary_color', value: (formData.get('primary_color') as string) || 'default' },
    { key: 'logo_url', value: (formData.get('logo_url') as string) || '' },
    { key: 'favicon_url', value: (formData.get('favicon_url') as string) || '' },
    { key: 'login_logo_url', value: (formData.get('login_logo_url') as string) || '' },
    { key: 'login_logo_dark_url', value: (formData.get('login_logo_dark_url') as string) || '' },
    { key: 'login_messages', value: (formData.get('login_messages') as string) || '' },
    { key: 'login_heading', value: (formData.get('login_heading') as string) || 'Acessar minha conta' },
    { key: 'login_subheading', value: (formData.get('login_subheading') as string) || '' },
    { key: 'login_register_text', value: (formData.get('login_register_text') as string) || 'Fazer meu cadastro' },
    { key: 'loading_image_url', value: (formData.get('loading_image_url') as string) || '' },
    { key: 'marketing_sections', value: (formData.get('marketing_sections') as string) || '[]' },
    { key: 'nav_order', value: (formData.get('nav_order') as string) || '[]' },
    { key: 'member_area_subtitle', value: (formData.get('member_area_subtitle') as string) || 'Área do Aluno' },
    { key: 'member_nav_labels', value: (formData.get('member_nav_labels') as string) || '{}' },
    { key: 'member_nav_order', value: (formData.get('member_nav_order') as string) || '[]' },
    { key: 'dashboard_hero_tagline', value: (formData.get('dashboard_hero_tagline') as string) || '' },
    { key: 'dashboard_destaque', value: (formData.get('dashboard_destaque') as string) || '{}' },
    { key: 'onboarding_steps', value: (formData.get('onboarding_steps') as string) || '[]' },
    { key: 'faq_assistant_name', value: (formData.get('faq_assistant_name') as string) || '' },
    { key: 'faq_assistant_subtitle', value: (formData.get('faq_assistant_subtitle') as string) || '' },
    { key: 'sidebar_training_active', value: (formData.get('sidebar_training_active') as string) || '' },
    { key: 'sidebar_training_label', value: (formData.get('sidebar_training_label') as string) ?? '' },
    { key: 'sidebar_magazine', value: (formData.get('sidebar_magazine') as string) || '{}' },
    { key: 'sidebar_magazine_label', value: (formData.get('sidebar_magazine_label') as string) || 'Novidades' },
    { key: 'sidebar_social_links', value: (formData.get('sidebar_social_links') as string) || '{}' },
    { key: 'sidebar_social_label', value: (formData.get('sidebar_social_label') as string) || 'Nos siga' },
    { key: 'tamojunto', value: (formData.get('tamojunto') as string) || '{}' },
    { key: 'landing_hero_title', value: (formData.get('landing_hero_title') as string) || '' },
    { key: 'landing_hero_subtitle', value: (formData.get('landing_hero_subtitle') as string) || '' },
    { key: 'landing_hero_image_url', value: (formData.get('landing_hero_image_url') as string) || '' },
    { key: 'landing_hero_cta_text', value: (formData.get('landing_hero_cta_text') as string) || 'Acessar minha conta' },
    { key: 'landing_about_active', value: (formData.get('landing_about_active') as string) || '' },
    { key: 'landing_about_title', value: (formData.get('landing_about_title') as string) || '' },
    { key: 'landing_about_text', value: (formData.get('landing_about_text') as string) || '' },
    { key: 'landing_about_image_url', value: (formData.get('landing_about_image_url') as string) || '' },
    { key: 'landing_benefits', value: (formData.get('landing_benefits') as string) || '[]' },
    { key: 'landing_cta_title', value: (formData.get('landing_cta_title') as string) || '' },
    { key: 'landing_cta_subtitle', value: (formData.get('landing_cta_subtitle') as string) || '' },
    { key: 'landing_cta_button_text', value: (formData.get('landing_cta_button_text') as string) || 'Acessar agora' },
    { key: 'landing_stats', value: (formData.get('landing_stats') as string) || '[]' },
    { key: 'landing_steps', value: (formData.get('landing_steps') as string) || '[]' },
    { key: 'landing_testimonials', value: (formData.get('landing_testimonials') as string) || '[]' },
    { key: 'landing_faq', value: (formData.get('landing_faq') as string) || '[]' },
    { key: 'landing_hero_badge', value: (formData.get('landing_hero_badge') as string) || '' },
    { key: 'landing_hero_video_url', value: (formData.get('landing_hero_video_url') as string) || '' },
    { key: 'landing_hero_secondary_cta_text', value: (formData.get('landing_hero_secondary_cta_text') as string) || '' },
    { key: 'landing_benefits_section_title', value: (formData.get('landing_benefits_section_title') as string) || '' },
    { key: 'landing_benefits_section_subtitle', value: (formData.get('landing_benefits_section_subtitle') as string) || '' },
    { key: 'landing_steps_section_title', value: (formData.get('landing_steps_section_title') as string) || '' },
    { key: 'landing_steps_section_subtitle', value: (formData.get('landing_steps_section_subtitle') as string) || '' },
    { key: 'landing_testimonials_section_title', value: (formData.get('landing_testimonials_section_title') as string) || '' },
    { key: 'landing_testimonials_section_subtitle', value: (formData.get('landing_testimonials_section_subtitle') as string) || '' },
    { key: 'landing_faq_section_title', value: (formData.get('landing_faq_section_title') as string) || '' },
    { key: 'landing_about_checklist', value: (formData.get('landing_about_checklist') as string) || '' },
    { key: 'landing_nav_labels', value: (formData.get('landing_nav_labels') as string) || '{}' },
    { key: 'landing_nav_order', value: (formData.get('landing_nav_order') as string) || '[]' },
    { key: 'landing_nav_custom_items', value: (formData.get('landing_nav_custom_items') as string) || '[]' },
    { key: 'landing_partners', value: (formData.get('landing_partners') as string) || '[]' },
    { key: 'landing_partners_section_title', value: (formData.get('landing_partners_section_title') as string) || '' },
    { key: 'landing_seals', value: (formData.get('landing_seals') as string) || '[]' },
    { key: 'landing_section_order', value: (formData.get('landing_section_order') as string) || '[]' },
    { key: 'landing_perks_section_title', value: (formData.get('landing_perks_section_title') as string) || '' },
    { key: 'landing_perks_section_subtitle', value: (formData.get('landing_perks_section_subtitle') as string) || '' },
    { key: 'landing_perks', value: (formData.get('landing_perks') as string) || '[]' },
    { key: 'landing_countdown_active', value: (formData.get('landing_countdown_active') as string) || '' },
    { key: 'landing_countdown_date', value: (formData.get('landing_countdown_date') as string) || '' },
    { key: 'landing_countdown_title', value: (formData.get('landing_countdown_title') as string) || '' },
    { key: 'landing_lead_form_active', value: (formData.get('landing_lead_form_active') as string) || '' },
    { key: 'landing_lead_form_title', value: (formData.get('landing_lead_form_title') as string) || '' },
    { key: 'landing_lead_form_subtitle', value: (formData.get('landing_lead_form_subtitle') as string) || '' },
    { key: 'landing_lead_form_cta_text', value: (formData.get('landing_lead_form_cta_text') as string) || '' },
    { key: 'landing_lead_form_success_message', value: (formData.get('landing_lead_form_success_message') as string) || '' },
    { key: 'landing_lgpd_active', value: (formData.get('landing_lgpd_active') as string) || '' },
    { key: 'landing_lgpd_text', value: (formData.get('landing_lgpd_text') as string) || '' },
    { key: 'landing_lgpd_button_text', value: (formData.get('landing_lgpd_button_text') as string) || 'Aceitar e continuar' },
    { key: 'landing_lgpd_link_text', value: (formData.get('landing_lgpd_link_text') as string) || '' },
    { key: 'landing_lgpd_link_url', value: (formData.get('landing_lgpd_link_url') as string) || '' },
    { key: 'training_hero_title', value: (formData.get('training_hero_title') as string) || 'Treinamentos' },
    { key: 'training_hero_description', value: (formData.get('training_hero_description') as string) || '' },
    { key: 'training_hero_color', value: (formData.get('training_hero_color') as string) || 'primary' },
    { key: 'training_whatsapp_url', value: (formData.get('training_whatsapp_url') as string) || '' },
    { key: 'training_whatsapp_phrase', value: (formData.get('training_whatsapp_phrase') as string) || '' },
    { key: 'training_whatsapp_cta_text', value: (formData.get('training_whatsapp_cta_text') as string) || '' },
  ]

  for (const entry of entries) {
    await supabase.from('site_settings').upsert(entry, { onConflict: 'key' })
  }

  // Diff granular impraticável aqui (75+ chaves) — log genérico, sem lista de campos.
  logActivity(authz, { action: 'update', entityType: 'configuracao_site', entityLabel: 'Configurações do site' })

  revalidatePath('/', 'layout')
  revalidatePath('/login')
  return { success: true }
}

export async function uploadSiteLogo(formData: FormData) {
  const authz = await requireAdmin()
  if ('error' in authz) return { error: authz.error }

  const file = formData.get('logo') as File
  if (!file || file.size === 0) return { error: 'Nenhum arquivo selecionado' }

  const adminClient = createAdminClient()
  // SVGs are returned unchanged by toWebP; raster logos are converted
  const webpFile = await toWebP(file, { maxWidth: 512, quality: 90 })
  const isSvg = webpFile.type === 'image/svg+xml'
  const ext = isSvg ? 'svg' : 'webp'
  const path = `logos/logo-${Date.now()}.${ext}`

  const { error } = await adminClient.storage
    .from('lesson-photos')
    .upload(path, webpFile, { upsert: true, contentType: webpFile.type })

  if (error) return { error: error.message }

  const { data } = adminClient.storage.from('lesson-photos').getPublicUrl(path)

  logActivity(authz, { action: 'upload', entityType: 'configuracao_site', entityLabel: 'Logo do site', detail: file.name })

  return { success: true, url: data.publicUrl }
}

export async function uploadSiteFavicon(formData: FormData) {
  const authz = await requireAdmin()
  if ('error' in authz) return { error: authz.error }

  const file = formData.get('favicon') as File
  if (!file || file.size === 0) return { error: 'Nenhum arquivo selecionado' }

  const adminClient = createAdminClient()
  // .ico é enviado como está — sharp/toWebP não processa esse formato
  const isIco = file.type === 'image/x-icon' || file.type === 'image/vnd.microsoft.icon' || file.name.toLowerCase().endsWith('.ico')
  const finalFile = isIco ? file : await toWebP(file, { maxWidth: 256, maxHeight: 256, quality: 90 })
  const isSvg = finalFile.type === 'image/svg+xml'
  const ext = isIco ? 'ico' : isSvg ? 'svg' : 'webp'
  const path = `logos/favicon-${Date.now()}.${ext}`

  const { error } = await adminClient.storage
    .from('lesson-photos')
    .upload(path, finalFile, { upsert: true, contentType: isIco ? 'image/x-icon' : finalFile.type })

  if (error) return { error: error.message }

  const { data } = adminClient.storage.from('lesson-photos').getPublicUrl(path)

  logActivity(authz, { action: 'upload', entityType: 'configuracao_site', entityLabel: 'Favicon do site', detail: file.name })

  return { success: true, url: data.publicUrl }
}
