'use client'

import { useEffect } from 'react'
import { CertificateRendererPrint, type CertificateData } from '@/components/certificate-renderer'

// This page receives certificate data as search params and auto-triggers print
export default function ImprimirCertificadoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  useEffect(() => {
    const timer = setTimeout(() => window.print(), 600)
    return () => clearTimeout(timer)
  }, [])

  // We'll pass data via URL search params (base64 encoded JSON)
  return null
}
