'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { uploadAvatar, updateProfile, updatePassword } from '@/app/actions/profile'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Camera, Loader2, KeyRound } from 'lucide-react'

type Props = {
  userId: string
  fullName: string
  email: string
  avatarUrl: string
}

export function ProfileFormCompact({ fullName, email, avatarUrl }: Props) {
  const [currentAvatar, setCurrentAvatar] = useState(avatarUrl)
  const [nameValue, setNameValue] = useState(fullName)
  const [isUploading, startUpload] = useTransition()
  const [isSaving, startSave] = useTransition()
  const [isChangingPw, startChangePw] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const initials = nameValue
    ? nameValue.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : email[0]?.toUpperCase() ?? 'U'

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCurrentAvatar(URL.createObjectURL(file))
    const fd = new FormData()
    fd.append('avatar', file)
    startUpload(async () => {
      const r = await uploadAvatar(fd)
      if (r?.error) { toast.error(r.error); setCurrentAvatar(avatarUrl) }
      else if (r?.url) { setCurrentAvatar(r.url); toast.success('Foto atualizada!'); router.refresh() }
    })
  }

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData()
    fd.append('full_name', nameValue)
    startSave(async () => {
      const r = await updateProfile(fd)
      if (r?.error) toast.error(r.error)
      else { toast.success('Perfil salvo!'); router.refresh() }
    })
  }

  function handlePasswordChange(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const form = e.currentTarget
    startChangePw(async () => {
      const r = await updatePassword(fd)
      if (r?.error) toast.error(r.error)
      else { toast.success('Senha alterada!'); form.reset() }
    })
  }

  return (
    <div className="space-y-5">
      {/* Informações pessoais */}
      <div className="bg-card border rounded-xl p-5">
        <form onSubmit={handleSave}>
          <div className="flex gap-5 items-start">
            {/* Avatar */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <div className="relative group">
                <Avatar className="w-16 h-16">
                  {currentAvatar && <AvatarImage src={currentAvatar} alt="Foto" />}
                  <AvatarFallback className="text-xl">{initials}</AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={isUploading}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {isUploading
                    ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                    : <Camera className="w-4 h-4 text-white" />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={isUploading}
                className="text-xs text-primary hover:underline"
              >
                {isUploading ? 'Enviando...' : 'Alterar foto'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            {/* Campos */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="full_name" className="text-xs text-muted-foreground">Nome completo</Label>
                <Input
                  id="full_name"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  placeholder="Seu nome"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="email" className="text-xs text-muted-foreground">Email</Label>
                <Input id="email" value={email} readOnly disabled className="mt-1 opacity-60" />
              </div>
              <div className="sm:col-span-2 flex justify-end pt-1">
                <Button type="submit" size="sm" disabled={isSaving} className="w-full sm:w-auto">
                  {isSaving ? 'Salvando...' : 'Salvar alterações'}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Alterar senha */}
      <div className="bg-card border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <KeyRound className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm text-foreground">Alterar senha</span>
        </div>
        <form onSubmit={handlePasswordChange}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="password" className="text-xs text-muted-foreground">Nova senha</Label>
              <Input id="password" name="password" type="password" placeholder="Mínimo 6 caracteres" className="mt-1" required />
            </div>
            <div>
              <Label htmlFor="confirm" className="text-xs text-muted-foreground">Confirmar senha</Label>
              <Input id="confirm" name="confirm" type="password" placeholder="Repita a senha" className="mt-1" required />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button type="submit" variant="outline" size="sm" disabled={isChangingPw} className="w-full sm:w-auto">
                {isChangingPw ? 'Alterando...' : 'Alterar senha'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
