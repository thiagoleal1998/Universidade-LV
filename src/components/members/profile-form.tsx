'use client'

import { useRef, useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { uploadAvatar, updateProfile, updatePassword } from '@/app/actions/profile'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Camera, Loader2, KeyRound } from 'lucide-react'

type Props = {
  userId: string
  fullName: string
  email: string
  avatarUrl: string
}

export function ProfileForm({ fullName, email, avatarUrl }: Props) {
  const [currentAvatar, setCurrentAvatar] = useState(avatarUrl)
  const [nameValue, setNameValue] = useState(fullName)
  const [isUploading, startUpload] = useTransition()
  const [isSaving, startSave] = useTransition()
  const [isChangingPw, startChangePw] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Sincroniza quando o servidor retorna dados atualizados
  useEffect(() => { setCurrentAvatar(avatarUrl) }, [avatarUrl])
  useEffect(() => { setNameValue(fullName) }, [fullName])

  const initials = nameValue
    ? nameValue.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : email[0]?.toUpperCase() ?? 'U'

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const preview = URL.createObjectURL(file)
    setCurrentAvatar(preview)

    const formData = new FormData()
    formData.append('avatar', file)

    startUpload(async () => {
      const result = await uploadAvatar(formData)
      if (result?.error) {
        toast.error(result.error)
        setCurrentAvatar(avatarUrl)
      } else if (result?.url) {
        setCurrentAvatar(result.url)
        toast.success('Foto atualizada!')
        router.refresh()
      }
    })
  }

  function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData()
    formData.append('full_name', nameValue)

    startSave(async () => {
      const result = await updateProfile(formData)
      if (result?.error) toast.error(result.error)
      else {
        toast.success('Perfil salvo!')
        router.refresh()
      }
    })
  }

  return (
    <>
    <form onSubmit={handleSave} className="space-y-6">
      {/* Avatar */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative group">
          <Avatar className="w-20 h-20">
            {currentAvatar && <AvatarImage src={currentAvatar} alt="Foto de perfil" />}
            <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
          </Avatar>

          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={isUploading}
            className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            {isUploading
              ? <Loader2 className="w-5 h-5 text-white animate-spin" />
              : <Camera className="w-5 h-5 text-white" />
            }
          </button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="text-xs text-primary hover:underline"
          disabled={isUploading}
        >
          {isUploading ? 'Enviando...' : 'Alterar foto'}
        </button>
      </div>

      {/* Campos */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="full_name">Nome completo</Label>
          <Input
            id="full_name"
            name="full_name"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            placeholder="Seu nome"
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            value={email}
            readOnly
            disabled
            className="mt-1.5 opacity-60"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Para alterar o email, entre em contato com o suporte.
          </p>
        </div>
      </div>

      <Button type="submit" disabled={isSaving} className="w-full">
        {isSaving ? 'Salvando...' : 'Salvar alterações'}
      </Button>
    </form>

    <Separator className="my-6" />

    {/* Trocar senha */}
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const fd = new FormData(e.currentTarget)
        startChangePw(async () => {
          const result = await updatePassword(fd)
          if (result?.error) toast.error(result.error)
          else {
            toast.success('Senha alterada com sucesso!')
            ;(e.target as HTMLFormElement).reset()
          }
        })
      }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <KeyRound className="w-4 h-4 text-muted-foreground" />
        <span className="font-medium text-sm text-foreground">Alterar senha</span>
      </div>
      <div>
        <Label htmlFor="password">Nova senha</Label>
        <Input id="password" name="password" type="password" placeholder="Mínimo 6 caracteres" className="mt-1.5" required />
      </div>
      <div>
        <Label htmlFor="confirm">Confirmar nova senha</Label>
        <Input id="confirm" name="confirm" type="password" placeholder="Repita a senha" className="mt-1.5" required />
      </div>
      <Button type="submit" variant="outline" disabled={isChangingPw} className="w-full">
        {isChangingPw ? 'Alterando...' : 'Alterar senha'}
      </Button>
    </form>
    </>
  )
}
