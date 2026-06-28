import { createClient } from '@/lib/supabase/server'
import { COLOR_PRESETS, ColorKey } from '@/lib/color-presets'

export type Settings = {
  site_name: string
  site_tagline: string
  primary_color: string
  logo_url: string
  login_logo_url: string
  login_logo_dark_url: string
  login_messages: string
  login_heading: string
  login_subheading: string
  login_register_text: string
  loading_image_url: string
  certificate_template: string
  certificate_signatory_name: string
  certificate_signatory_role: string
  certificate_custom_url: string
  certificate_name_x: string
  certificate_name_y: string
  certificate_name_font: string
  certificate_name_size: string
  certificate_name_color: string
  marketing_sections: string
  nav_order: string
  member_area_subtitle: string
  member_nav_labels: string
  member_nav_order: string
  dashboard_hero_tagline: string
  dashboard_destaque: string
  onboarding_steps: string
  faq_assistant_name: string
  faq_assistant_subtitle: string
  // Sidebar da home
  sidebar_training_active: string
  sidebar_training_label: string
  sidebar_magazine: string
  sidebar_magazine_label: string
  sidebar_social_links: string
  sidebar_social_label: string
  // TamoJunto
  tamojunto: string
  // Landing Page
  landing_hero_title: string
  landing_hero_subtitle: string
  landing_hero_image_url: string
  landing_hero_cta_text: string
  landing_about_active: string
  landing_about_title: string
  landing_about_text: string
  landing_about_image_url: string
  landing_benefits: string
  landing_cta_title: string
  landing_cta_subtitle: string
  landing_cta_button_text: string
  landing_stats: string
  landing_steps: string
  landing_testimonials: string
  landing_faq: string
  // Landing — textos de seções
  landing_hero_badge: string
  landing_hero_video_url: string
  landing_hero_secondary_cta_text: string
  landing_benefits_section_title: string
  landing_benefits_section_subtitle: string
  landing_steps_section_title: string
  landing_steps_section_subtitle: string
  landing_testimonials_section_title: string
  landing_testimonials_section_subtitle: string
  landing_faq_section_title: string
  landing_about_checklist: string
  landing_nav_labels: string
  landing_nav_order: string
  landing_nav_custom_items: string
  landing_partners: string
  landing_partners_section_title: string
  landing_seals: string
  landing_section_order: string
  landing_perks_section_title: string
  landing_perks_section_subtitle: string
  landing_perks: string
  // Landing — Countdown
  landing_countdown_active: string
  landing_countdown_date: string
  landing_countdown_title: string
  // Landing — Formulário de leads
  landing_lead_form_active: string
  landing_lead_form_title: string
  landing_lead_form_subtitle: string
  landing_lead_form_cta_text: string
  landing_lead_form_success_message: string
  // Landing — LGPD
  landing_lgpd_active: string
  landing_lgpd_text: string
  landing_lgpd_button_text: string
  landing_lgpd_link_text: string
  landing_lgpd_link_url: string
  // Treinamentos
  training_hero_title: string
  training_hero_description: string
  training_hero_color: string
  training_whatsapp_url: string
  training_whatsapp_phrase: string
  training_whatsapp_cta_text: string
  // TamoJunto — Vencedores do Mês
  tamojunto_winners: string
  // PodViajar
  podviajar: string
  // SEO
  seo_title: string
  seo_description: string
  seo_keywords: string
  seo_og_image: string
  seo_canonical_url: string
  seo_google_verification: string
  seo_robots: string
  seo_author: string
  // AEO/GEO
  aeo_featured_snippet: string
  aeo_faq: string
  geo_business_description: string
  geo_target_audience: string
  geo_key_facts: string
}

const DEFAULT_LOGIN_MESSAGES = [
  'Bem-vindo à Universidade LV',
  'Aqui começa o seu conhecimento',
  'Aprendizado que transforma destinos em experiências',
  'Capacitando os melhores agentes de viagem',
  'Sua jornada de conhecimento começa agora',
].join('\n')

const DEFAULTS = {
  site_name: 'Universidade LV',
  site_tagline: '',
  primary_color: 'default',
  logo_url: '',
  login_logo_url: '',
  login_logo_dark_url: '',
  login_messages: DEFAULT_LOGIN_MESSAGES,
  login_heading: 'Acessar minha conta',
  login_subheading: 'Entre com seu email e senha para continuar',
  login_register_text: 'Fazer meu cadastro',
  loading_image_url: '',
  certificate_template: 'classic',
  certificate_signatory_name: '',
  certificate_signatory_role: '',
  certificate_custom_url: '',
  certificate_name_x: '50',
  certificate_name_y: '50',
  certificate_name_font: 'Dancing Script',
  certificate_name_size: '60',
  certificate_name_color: '#1a1a1a',
  member_area_subtitle: 'Área do Aluno',
  member_nav_labels: JSON.stringify({ home: 'Início', cursos: 'Meus cursos', treinamentos: 'Treinamentos', marketing: 'Marketing', aereo: 'Bloqueios Aéreos', podviajar: 'PodViajar', comunidade: 'Comunidade', documentos: 'Documentos', configuracoes: 'Configurações' }),
  member_nav_order: JSON.stringify(['home', 'cursos', 'treinamentos', 'marketing', 'aereo', 'podviajar', 'comunidade', 'documentos', 'configuracoes']),
  dashboard_hero_tagline: 'Continue de onde parou e avance no seu aprendizado.',
  dashboard_destaque: JSON.stringify({ active: false, title: '', description: '', url: '', cover_url: '', button_text: 'Acessar' }),
  onboarding_steps: JSON.stringify([
    { title: 'Seus cursos estão aqui', description: 'Acesse "Meus Cursos" no menu para ver todo o conteúdo disponível. Seu progresso é salvo automaticamente a cada aula concluída.' },
    { title: 'Encontre qualquer conteúdo', description: 'Use o item "Buscar" no menu ou pressione Ctrl+K em qualquer página para encontrar aulas e cursos instantaneamente.' },
    { title: 'Você não está sozinho', description: 'Acesse a Comunidade para tirar dúvidas, compartilhar conquistas e interagir com outros membros.' },
  ]),
  faq_assistant_name: 'Assistente',
  faq_assistant_subtitle: 'Perguntas frequentes',
  sidebar_training_active: 'true',
  sidebar_training_label: '',
  sidebar_magazine: JSON.stringify({ active: false, title: 'LV Magazine', description: '', url: '', image_url: '', button_text: 'Ler agora' }),
  sidebar_magazine_label: 'Novidades',
  sidebar_social_links: JSON.stringify({ instagram: '', facebook: '', youtube: '', whatsapp: '', twitter: '', linkedin: '' }),
  sidebar_social_label: 'Nos siga',
  tamojunto: JSON.stringify({ active: false, title: 'TamoJuntoLV', description: '', url: '', image_url: '', button_text: 'Participar', badge: 'Comunidade' }),
  tamojunto_winners: JSON.stringify({
    active: false,
    title: 'Vencedores do Mês',
    badge: 'TamoJunto LV',
    month: '',
    regions: [
      { name: 'Norte', agency1: '', agency2: '' },
      { name: 'Nordeste', agency1: '', agency2: '' },
      { name: 'Centro-Oeste', agency1: '', agency2: '' },
      { name: 'Sudeste', agency1: '', agency2: '' },
      { name: 'Sul', agency1: '', agency2: '' },
    ],
  }),
  podviajar: JSON.stringify({
    active: false,
    title: 'PodViajar',
    description: 'O podcast sobre turismo e viagens para agentes de viagem.',
    image_url: '',
    spotify_url: '',
    apple_url: '',
    episodes: [],
  }),
  landing_hero_title: 'Capacitação exclusiva para agentes de viagem',
  landing_hero_subtitle: 'Treinamentos ao vivo, cursos completos, comunidade e certificados — tudo que você precisa para se destacar no mercado.',
  landing_hero_image_url: '',
  landing_hero_cta_text: 'Acessar minha conta',
  landing_about_active: 'true',
  landing_about_title: 'Sobre a Litoral Verde Operadora',
  landing_about_text: 'A Litoral Verde Operadora de Viagens e Turismo é uma empresa especializada no desenvolvimento e capacitação de agentes de viagem em todo o Brasil. Nossa missão é colocar nas mãos dos profissionais do setor as melhores ferramentas, treinamentos práticos e materiais exclusivos para que possam se destacar no mercado e entregar experiências inesquecíveis aos seus clientes.\n\nCom a Universidade LV, levamos esse propósito a um novo nível: uma plataforma completa de aprendizado, criada por especialistas em turismo, para quem vive e respira viagens.',
  landing_about_image_url: '',
  landing_benefits: JSON.stringify([
    { icon: 'Radio',          title: 'Treinamentos ao vivo',   description: 'Participe de sessões exclusivas ao vivo com nossa equipe e assista aos replays quando quiser.' },
    { icon: 'BookOpen',       title: 'Cursos completos',        description: 'Acesse módulos e aulas estruturadas no seu próprio ritmo, com progresso salvo automaticamente.' },
    { icon: 'MessageCircle',  title: 'Comunidade TamoJuntoLV', description: 'Conecte-se com outros agentes de viagem e não perca nenhuma novidade.' },
    { icon: 'Award',          title: 'Certificados',            description: 'Certifique seus conhecimentos e avance na carreira como agente de viagem.' },
  ]),
  landing_cta_title: 'Pronto para começar?',
  landing_cta_subtitle: '',
  landing_cta_button_text: 'Acessar agora',
  landing_stats: JSON.stringify([
    { number: '200+', label: 'Treinamentos realizados' },
    { number: '500+', label: 'Agentes capacitados' },
    { number: '50+', label: 'Destinos abordados' },
    { number: '98%', label: 'Satisfação dos alunos' },
  ]),
  landing_steps: JSON.stringify([
    { title: 'Acesse a plataforma', description: 'Faça seu login e tenha acesso imediato a todo o conteúdo da sua conta em qualquer dispositivo.' },
    { title: 'Aprenda com especialistas', description: 'Assista a treinamentos ao vivo, acesse cursos no seu ritmo e explore materiais exclusivos sobre turismo.' },
    { title: 'Certifique-se e cresça', description: 'Conclua os cursos, receba seus certificados e destaque-se no mercado de viagens.' },
  ]),
  landing_testimonials: JSON.stringify([
    { name: 'Maria Silva', role: 'Agente de viagem — São Paulo', text: 'A Universidade LV transformou minha carreira. Os treinamentos são práticos, atualizados e direto ao ponto.', avatar_url: '' },
    { name: 'João Santos', role: 'Consultor de turismo — Rio de Janeiro', text: 'O conteúdo é excelente e os certificados me ajudaram a conquistar novos clientes. Vale muito!', avatar_url: '' },
    { name: 'Ana Costa', role: 'Agente de viagem — Belo Horizonte', text: 'A comunidade é incrível. Aprendo com outros agentes todos os dias e fico por dentro de tudo.', avatar_url: '' },
  ]),
  landing_hero_badge: 'Plataforma exclusiva para agentes de viagem',
  landing_hero_video_url: '',
  landing_hero_secondary_cta_text: 'Como funciona',
  landing_benefits_section_title: 'O que você vai encontrar',
  landing_benefits_section_subtitle: 'Acesso completo a tudo que um agente de viagem precisa para crescer e se destacar.',
  landing_steps_section_title: 'Como funciona',
  landing_steps_section_subtitle: 'Em 3 passos você já está aprendendo e evoluindo na sua carreira.',
  landing_testimonials_section_title: 'Histórias reais',
  landing_testimonials_section_subtitle: 'Agentes de viagem que transformaram sua carreira com a Universidade LV.',
  landing_faq_section_title: 'Perguntas frequentes',
  landing_about_checklist: 'Empresa especializada no mercado de turismo e viagens\nTreinamentos conduzidos por especialistas do setor\nCertificados reconhecidos no mercado\nComunidade exclusiva para agentes de viagem',
  landing_nav_labels: JSON.stringify({ benefits: 'O que oferecemos', steps: 'Como funciona', about: 'Sobre', testimonials: 'Depoimentos', faq: 'FAQ' }),
  landing_nav_order: JSON.stringify(['benefits', 'steps', 'about', 'testimonials', 'faq', 'leads']),
  landing_nav_custom_items: JSON.stringify([]),
  landing_partners: JSON.stringify([]),
  landing_partners_section_title: 'Parceiros e companhias',
  landing_seals: JSON.stringify([]),
  landing_section_order: JSON.stringify(['stats', 'partners', 'benefits', 'perks', 'steps', 'about', 'testimonials', 'faq', 'leads', 'cta']),
  landing_perks_section_title: 'Muito além do conhecimento',
  landing_perks_section_subtitle: 'Participar dos treinamentos da Universidade LV é uma experiência completa. Você aprende, se conecta e ainda concorre a benefícios exclusivos do setor.',
  landing_perks: JSON.stringify([
    { icon: 'GraduationCap', title: 'Conhecimento especializado', description: 'Treinamentos práticos com especialistas do setor, atualizados com as tendências do mercado de viagens.' },
    { icon: 'Gift',          title: 'Sorteio de brindes',         description: 'Participantes dos treinamentos concorrem a brindes e prêmios especiais sorteados ao longo do ano.' },
    { icon: 'Plane',         title: 'Famtours exclusivos',        description: 'Oportunidades de conhecer destinos nacionais e internacionais por meio de viagens de familiarização.' },
    { icon: 'Ticket',        title: 'Cortesias e benefícios',     description: 'Acesso a cortesias, convites e benefícios especiais oferecidos por parceiros da Litoral Verde.' },
  ]),
  landing_faq: JSON.stringify([
    { question: 'Quem pode participar?', answer: 'A Universidade LV é exclusiva para agentes de viagem e consultores de turismo cadastrados na plataforma.' },
    { question: 'Posso acessar o conteúdo quando quiser?', answer: 'Sim! Todos os cursos, módulos e replays de treinamentos ficam disponíveis 24h por dia para você acessar no seu próprio ritmo.' },
    { question: 'Os certificados têm validade?', answer: 'Os certificados emitidos pela Universidade LV têm validade indeterminada e são registrados em nome do agente.' },
    { question: 'Como funciona a comunidade TamoJuntoLV?', answer: 'É um espaço exclusivo para membros trocarem experiências, dicas e novidades do setor de turismo.' },
  ]),
  landing_countdown_active: '',
  landing_countdown_date: '',
  landing_countdown_title: 'Próximo treinamento ao vivo',
  landing_lead_form_active: '',
  landing_lead_form_title: 'Fique por dentro das novidades',
  landing_lead_form_subtitle: 'Cadastre-se e receba em primeira mão informações sobre treinamentos, dicas e oportunidades exclusivas para agentes de viagem.',
  landing_lead_form_cta_text: 'Quero receber novidades',
  landing_lead_form_success_message: 'Obrigado! Em breve você receberá nossas novidades.',
  landing_lgpd_active: 'true',
  landing_lgpd_text: 'Este site utiliza cookies para melhorar sua experiência. Ao continuar navegando, você concorda com nossa Política de Privacidade e com o uso de cookies essenciais.',
  landing_lgpd_button_text: 'Aceitar e continuar',
  landing_lgpd_link_text: '',
  landing_lgpd_link_url: '',
  training_hero_title: 'Treinamentos',
  training_hero_description: 'Acesse conteúdos exclusivos, participe das sessões ao vivo com nossa equipe e assista quando quiser nos replays. Tudo pensado para acelerar o seu desenvolvimento.',
  training_hero_color: 'primary',
  training_whatsapp_url: '',
  training_whatsapp_phrase: 'Participe do grupo e não perca nada.',
  training_whatsapp_cta_text: 'Entrar no grupo do WhatsApp',
  nav_order: JSON.stringify([
    '/admin',
    '/admin/cursos',
    '/admin/membros',
    '/admin/comunicados',
    '/admin/documentos',
    '/dashboard/comunidade',
    '/admin/marketing',
    '/admin/relatorios',
    '/admin/seo',
    '/admin/faq',
    '/admin/configuracoes',
  ]),
  marketing_sections: JSON.stringify([
    { key: 'visual', label: 'Materiais Visuais', type: 'visual' },
    { key: 'link',   label: 'Links Úteis',        type: 'link'   },
  ]),
  seo_title: 'Universidade LV',
  seo_description: 'Plataforma de aprendizado exclusiva para agentes de viagem. Cursos, módulos e certificados online.',
  seo_keywords: 'cursos online, agentes de viagem, capacitação, universidade, turismo',
  seo_og_image: '',
  seo_canonical_url: '',
  seo_google_verification: '',
  seo_robots: 'index,follow',
  seo_author: 'Universidade LV',
  aeo_featured_snippet: '',
  aeo_faq: JSON.stringify([]),
  geo_business_description: '',
  geo_target_audience: '',
  geo_key_facts: '',
}

export async function getSettings(): Promise<Settings> {
  try {
    const supabase = await createClient()
    const { data } = await supabase.from('site_settings').select('key, value')
    const map: Record<string, string> = {}
    for (const row of data ?? []) map[row.key] = row.value
    return {
      site_name: map.site_name ?? DEFAULTS.site_name,
      site_tagline: map.site_tagline ?? DEFAULTS.site_tagline,
      primary_color: map.primary_color ?? DEFAULTS.primary_color,
      logo_url: map.logo_url ?? DEFAULTS.logo_url,
      login_logo_url: map.login_logo_url ?? DEFAULTS.login_logo_url,
      login_logo_dark_url: map.login_logo_dark_url ?? DEFAULTS.login_logo_dark_url,
      login_messages: map.login_messages ?? DEFAULTS.login_messages,
      login_heading: map.login_heading ?? DEFAULTS.login_heading,
      login_subheading: map.login_subheading ?? DEFAULTS.login_subheading,
      login_register_text: map.login_register_text ?? DEFAULTS.login_register_text,
      loading_image_url: map.loading_image_url ?? DEFAULTS.loading_image_url,
      certificate_template: map.certificate_template ?? DEFAULTS.certificate_template,
      certificate_signatory_name: map.certificate_signatory_name ?? DEFAULTS.certificate_signatory_name,
      certificate_signatory_role: map.certificate_signatory_role ?? DEFAULTS.certificate_signatory_role,
      certificate_custom_url: map.certificate_custom_url ?? DEFAULTS.certificate_custom_url,
      certificate_name_x: map.certificate_name_x ?? DEFAULTS.certificate_name_x,
      certificate_name_y: map.certificate_name_y ?? DEFAULTS.certificate_name_y,
      certificate_name_font: map.certificate_name_font ?? DEFAULTS.certificate_name_font,
      certificate_name_size: map.certificate_name_size ?? DEFAULTS.certificate_name_size,
      certificate_name_color: map.certificate_name_color ?? DEFAULTS.certificate_name_color,
      marketing_sections: map.marketing_sections ?? DEFAULTS.marketing_sections,
      nav_order: map.nav_order ?? DEFAULTS.nav_order,
      member_area_subtitle: map.member_area_subtitle ?? DEFAULTS.member_area_subtitle,
      member_nav_labels: map.member_nav_labels ?? DEFAULTS.member_nav_labels,
      member_nav_order: map.member_nav_order ?? DEFAULTS.member_nav_order,
      dashboard_hero_tagline: map.dashboard_hero_tagline ?? DEFAULTS.dashboard_hero_tagline,
      dashboard_destaque: map.dashboard_destaque ?? DEFAULTS.dashboard_destaque,
      onboarding_steps: map.onboarding_steps ?? DEFAULTS.onboarding_steps,
      faq_assistant_name: map.faq_assistant_name ?? DEFAULTS.faq_assistant_name,
      faq_assistant_subtitle: map.faq_assistant_subtitle ?? DEFAULTS.faq_assistant_subtitle,
      sidebar_training_active: map.sidebar_training_active ?? DEFAULTS.sidebar_training_active,
      sidebar_training_label: map.sidebar_training_label ?? DEFAULTS.sidebar_training_label,
      sidebar_magazine: map.sidebar_magazine ?? DEFAULTS.sidebar_magazine,
      sidebar_magazine_label: map.sidebar_magazine_label ?? DEFAULTS.sidebar_magazine_label,
      sidebar_social_links: map.sidebar_social_links ?? DEFAULTS.sidebar_social_links,
      sidebar_social_label: map.sidebar_social_label ?? DEFAULTS.sidebar_social_label,
      tamojunto: map.tamojunto ?? DEFAULTS.tamojunto,
      tamojunto_winners: map.tamojunto_winners ?? DEFAULTS.tamojunto_winners,
      podviajar: map.podviajar ?? DEFAULTS.podviajar,
      landing_hero_title: map.landing_hero_title ?? DEFAULTS.landing_hero_title,
      landing_hero_subtitle: map.landing_hero_subtitle ?? DEFAULTS.landing_hero_subtitle,
      landing_hero_image_url: map.landing_hero_image_url ?? DEFAULTS.landing_hero_image_url,
      landing_hero_cta_text: map.landing_hero_cta_text ?? DEFAULTS.landing_hero_cta_text,
      landing_about_active: map.landing_about_active ?? DEFAULTS.landing_about_active,
      landing_about_title: map.landing_about_title || DEFAULTS.landing_about_title,
      landing_about_text: map.landing_about_text || DEFAULTS.landing_about_text,
      landing_about_image_url: map.landing_about_image_url ?? DEFAULTS.landing_about_image_url,
      landing_benefits: map.landing_benefits ?? DEFAULTS.landing_benefits,
      landing_cta_title: map.landing_cta_title ?? DEFAULTS.landing_cta_title,
      landing_cta_subtitle: map.landing_cta_subtitle ?? DEFAULTS.landing_cta_subtitle,
      landing_cta_button_text: map.landing_cta_button_text ?? DEFAULTS.landing_cta_button_text,
      landing_stats: map.landing_stats ?? DEFAULTS.landing_stats,
      landing_steps: map.landing_steps ?? DEFAULTS.landing_steps,
      landing_testimonials: map.landing_testimonials ?? DEFAULTS.landing_testimonials,
      landing_faq: map.landing_faq ?? DEFAULTS.landing_faq,
      landing_hero_badge: map.landing_hero_badge ?? DEFAULTS.landing_hero_badge,
      landing_hero_video_url: map.landing_hero_video_url ?? DEFAULTS.landing_hero_video_url,
      landing_hero_secondary_cta_text: map.landing_hero_secondary_cta_text ?? DEFAULTS.landing_hero_secondary_cta_text,
      landing_benefits_section_title: map.landing_benefits_section_title ?? DEFAULTS.landing_benefits_section_title,
      landing_benefits_section_subtitle: map.landing_benefits_section_subtitle ?? DEFAULTS.landing_benefits_section_subtitle,
      landing_steps_section_title: map.landing_steps_section_title ?? DEFAULTS.landing_steps_section_title,
      landing_steps_section_subtitle: map.landing_steps_section_subtitle ?? DEFAULTS.landing_steps_section_subtitle,
      landing_testimonials_section_title: map.landing_testimonials_section_title ?? DEFAULTS.landing_testimonials_section_title,
      landing_testimonials_section_subtitle: map.landing_testimonials_section_subtitle ?? DEFAULTS.landing_testimonials_section_subtitle,
      landing_faq_section_title: map.landing_faq_section_title ?? DEFAULTS.landing_faq_section_title,
      landing_about_checklist: map.landing_about_checklist ?? DEFAULTS.landing_about_checklist,
      landing_nav_labels: map.landing_nav_labels ?? DEFAULTS.landing_nav_labels,
      landing_nav_order: map.landing_nav_order ?? DEFAULTS.landing_nav_order,
      landing_nav_custom_items: map.landing_nav_custom_items ?? DEFAULTS.landing_nav_custom_items,
      landing_partners: map.landing_partners ?? DEFAULTS.landing_partners,
      landing_partners_section_title: map.landing_partners_section_title ?? DEFAULTS.landing_partners_section_title,
      landing_seals: map.landing_seals ?? DEFAULTS.landing_seals,
      landing_section_order: map.landing_section_order ?? DEFAULTS.landing_section_order,
      landing_perks_section_title: map.landing_perks_section_title ?? DEFAULTS.landing_perks_section_title,
      landing_perks_section_subtitle: map.landing_perks_section_subtitle ?? DEFAULTS.landing_perks_section_subtitle,
      landing_perks: map.landing_perks ?? DEFAULTS.landing_perks,
      landing_countdown_active: map.landing_countdown_active ?? DEFAULTS.landing_countdown_active,
      landing_countdown_date: map.landing_countdown_date ?? DEFAULTS.landing_countdown_date,
      landing_countdown_title: map.landing_countdown_title ?? DEFAULTS.landing_countdown_title,
      landing_lead_form_active: map.landing_lead_form_active ?? DEFAULTS.landing_lead_form_active,
      landing_lead_form_title: map.landing_lead_form_title ?? DEFAULTS.landing_lead_form_title,
      landing_lead_form_subtitle: map.landing_lead_form_subtitle ?? DEFAULTS.landing_lead_form_subtitle,
      landing_lead_form_cta_text: map.landing_lead_form_cta_text ?? DEFAULTS.landing_lead_form_cta_text,
      landing_lead_form_success_message: map.landing_lead_form_success_message ?? DEFAULTS.landing_lead_form_success_message,
      landing_lgpd_active: map.landing_lgpd_active ?? DEFAULTS.landing_lgpd_active,
      landing_lgpd_text: map.landing_lgpd_text ?? DEFAULTS.landing_lgpd_text,
      landing_lgpd_button_text: map.landing_lgpd_button_text ?? DEFAULTS.landing_lgpd_button_text,
      landing_lgpd_link_text: map.landing_lgpd_link_text ?? DEFAULTS.landing_lgpd_link_text,
      landing_lgpd_link_url: map.landing_lgpd_link_url ?? DEFAULTS.landing_lgpd_link_url,
      training_hero_title: map.training_hero_title ?? DEFAULTS.training_hero_title,
      training_hero_description: map.training_hero_description ?? DEFAULTS.training_hero_description,
      training_hero_color: map.training_hero_color ?? DEFAULTS.training_hero_color,
      training_whatsapp_url: map.training_whatsapp_url ?? DEFAULTS.training_whatsapp_url,
      training_whatsapp_phrase: map.training_whatsapp_phrase ?? DEFAULTS.training_whatsapp_phrase,
      training_whatsapp_cta_text: map.training_whatsapp_cta_text ?? DEFAULTS.training_whatsapp_cta_text,
      seo_title: map.seo_title ?? DEFAULTS.seo_title,
      seo_description: map.seo_description ?? DEFAULTS.seo_description,
      seo_keywords: map.seo_keywords ?? DEFAULTS.seo_keywords,
      seo_og_image: map.seo_og_image ?? DEFAULTS.seo_og_image,
      seo_canonical_url: map.seo_canonical_url ?? DEFAULTS.seo_canonical_url,
      seo_google_verification: map.seo_google_verification ?? DEFAULTS.seo_google_verification,
      seo_robots: map.seo_robots ?? DEFAULTS.seo_robots,
      seo_author: map.seo_author ?? DEFAULTS.seo_author,
      aeo_featured_snippet: map.aeo_featured_snippet ?? DEFAULTS.aeo_featured_snippet,
      aeo_faq: map.aeo_faq ?? DEFAULTS.aeo_faq,
      geo_business_description: map.geo_business_description ?? DEFAULTS.geo_business_description,
      geo_target_audience: map.geo_target_audience ?? DEFAULTS.geo_target_audience,
      geo_key_facts: map.geo_key_facts ?? DEFAULTS.geo_key_facts,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export function getColorStyleTag(colorKey: string): string | null {
  if (colorKey === 'default' || !(colorKey in COLOR_PRESETS)) return null
  const preset = COLOR_PRESETS[colorKey as ColorKey]
  return `
    :root {
      --primary: oklch(${preset.light.primary});
      --primary-foreground: oklch(${preset.light.fg});
      --ring: oklch(${preset.light.primary});
      --sidebar-primary: oklch(${preset.light.primary});
      --sidebar-primary-foreground: oklch(${preset.light.fg});
    }
    .dark {
      --primary: oklch(${preset.dark.primary});
      --primary-foreground: oklch(${preset.dark.fg});
      --ring: oklch(${preset.dark.primary});
      --sidebar-primary: oklch(${preset.dark.primary});
      --sidebar-primary-foreground: oklch(${preset.dark.fg});
    }
  `
}
