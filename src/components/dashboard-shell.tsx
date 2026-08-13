'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import { useAuth, type View } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Moon, Sun, LogOut, ChevronDown, KeyRound, Menu } from 'lucide-react'
import Image from 'next/image'
import { useTheme } from 'next-themes'
import { ChangePasswordDialog } from '@/components/change-password-dialog'
import { SiteFooter } from '@/components/site-footer'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

export type NavItem = {
  id: string
  label: string
  icon: React.ElementType
}

export function DashboardShell({
  nav,
  active,
  onNavigate,
  title,
  description,
  accent = 'Student',
  children,
}: {
  nav: NavItem[]
  active: string
  onNavigate: (id: string) => void
  title: string
  description?: string
  accent?: string
  children: React.ReactNode
}) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const { setTheme } = useTheme()
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const initials = (user?.name || 'U')
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r bg-sidebar">
        <div className="h-16 flex items-center gap-2 px-5 border-b">
          <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg border bg-card/80 shadow-sm">
            <Image
              src="/Attendx-logo.png"
              alt="AttendX logo"
              width={32}
              height={32}
              className="h-full w-full object-contain"
            />
          </div>
          <span className="font-bold tracking-tight">AttendX</span>
        </div>
        <div className="px-3 py-4">
          <p className="px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            {accent}
          </p>
          <nav className="space-y-1">
            {nav.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active === item.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent'
                }`}
              >
                <item.icon className="size-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </div>
        <div className="mt-auto p-3">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={() => router.push('/')}
          >
            <LogOut className="size-4 mr-2" />
            Back to home
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="min-h-16 border-b glass sticky top-0 z-30 flex items-center justify-between gap-3 px-4 md:px-6 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden shrink-0" aria-label="Open navigation">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[min(19rem,86vw)] p-0">
                <SheetHeader className="flex h-16 flex-row items-center gap-2 border-b px-5 text-left">
                  <div className="flex size-8 items-center justify-center overflow-hidden rounded-lg border bg-card">
                    <Image src="/Attendx-logo.png" alt="AttendX logo" width={32} height={32} className="size-full object-contain" />
                  </div>
                  <SheetTitle>AttendX</SheetTitle>
                </SheetHeader>
                <div className="p-3">
                  <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">{accent}</p>
                  <nav className="space-y-1" aria-label={`${accent} navigation`}>
                    {nav.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => { onNavigate(item.id); setMobileNavOpen(false) }}
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${active === item.id ? 'bg-primary text-primary-foreground' : 'hover:bg-sidebar-accent'}`}
                      >
                        <item.icon className="size-4" />
                        {item.label}
                      </button>
                    ))}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
            <div className="min-w-0">
              <p className="hidden text-xs font-medium uppercase tracking-wider text-muted-foreground sm:block">{accent}</p>
              <h1 className="font-semibold text-lg truncate">{title}</h1>
              {description && <p className="hidden text-sm text-muted-foreground md:block">{description}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(document.documentElement.classList.contains('dark') ? 'light' : 'dark')}
              aria-label="Toggle theme"
            >
              <Sun className="size-5 hidden dark:block" />
              <Moon className="size-5 block dark:hidden" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-accent transition-colors">
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm font-medium max-w-[120px] truncate">
                    {user?.name}
                  </span>
                  <ChevronDown className="size-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{user?.name}</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      {user?.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setPasswordOpen(true)}>
                  <KeyRound className="size-4 mr-2" />
                  Change password
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => logout()}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut className="size-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ChangePasswordDialog open={passwordOpen} onOpenChange={setPasswordOpen} />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-x-hidden">{children}</main>
        <SiteFooter compact />
      </div>
    </div>
  )
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'primary',
}: {
  label: string
  value: string | number
  icon: React.ElementType
  tone?: 'primary' | 'chart-2' | 'chart-3' | 'chart-4' | 'chart-5'
}) {
  const toneClass: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    'chart-2': 'bg-chart-2/10 text-chart-2',
    'chart-3': 'bg-chart-3/10 text-chart-3',
    'chart-4': 'bg-chart-4/10 text-chart-4',
    'chart-5': 'bg-chart-5/10 text-chart-5',
  }
  return (
    <div className="rounded-xl border bg-card p-4 md:p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className={`size-9 rounded-lg grid place-items-center ${toneClass[tone]}`}>
          <Icon className="size-5" />
        </div>
      </div>
      <div className="mt-2 text-2xl md:text-3xl font-bold tracking-tight">
        {value}
      </div>
    </div>
  )
}
