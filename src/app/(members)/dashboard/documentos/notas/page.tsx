import { redirect } from 'next/navigation'

export default function NotasPage() {
  redirect('/dashboard/documentos/notas/pendentes')
}
