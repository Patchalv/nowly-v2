'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Archive,
  CalendarCheck,
  CalendarDays,
  List,
  ListTodo,
  Repeat,
  User,
  Check,
  ChevronsUpDown,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { useWorkspaceStore } from '@/stores/workspace-store';

const navItems = [
  {
    title: 'Today',
    url: '/today',
    icon: CalendarCheck,
  },
  {
    title: 'Daily tasks',
    url: '/daily',
    icon: ListTodo,
  },
  {
    title: 'Weekly',
    url: '/weekly',
    icon: CalendarDays,
  },
  {
    title: 'All tasks',
    url: '/all-tasks',
    icon: List,
  },
  {
    title: 'Backlog',
    url: '/backlog',
    icon: Archive,
  },
  {
    title: 'Recurring tasks',
    url: '/recurring',
    icon: Repeat,
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { data: workspaces } = useWorkspaces();
  const { selectedWorkspaceId, setSelectedWorkspaceId } = useWorkspaceStore();

  // Find the currently selected workspace
  const selectedWorkspace =
    selectedWorkspaceId && workspaces
      ? workspaces.find((w) => w.id === selectedWorkspaceId)
      : null;

  // Determine display values
  const displayIcon = selectedWorkspace?.icon || 'M';
  const displayName = selectedWorkspace?.name || 'Master';
  const displayColor = selectedWorkspace?.color || undefined;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  id="sidebar-workspace-selector"
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div
                    className="flex aspect-square size-8 items-center justify-center rounded-lg text-sm font-semibold"
                    style={{
                      backgroundColor:
                        displayColor || 'hsl(var(--sidebar-primary))',
                      color: displayColor
                        ? '#fff'
                        : 'hsl(var(--sidebar-primary-foreground))',
                    }}
                  >
                    {displayIcon}
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">
                      {displayName}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                align="start"
                side="bottom"
                sideOffset={4}
              >
                <DropdownMenuLabel className="text-muted-foreground text-xs">
                  Workspaces
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => setSelectedWorkspaceId(null)}
                  className="gap-2 p-2"
                >
                  <div className="bg-background flex size-6 items-center justify-center rounded-sm border">
                    <span className="text-xs font-semibold">M</span>
                  </div>
                  <div className="font-medium">Master</div>
                  {!selectedWorkspaceId && <Check className="ml-auto size-4" />}
                </DropdownMenuItem>
                {workspaces && workspaces.length > 0 && (
                  <>
                    <DropdownMenuSeparator />
                    {workspaces.map((workspace) => (
                      <DropdownMenuItem
                        key={workspace.id}
                        onClick={() => setSelectedWorkspaceId(workspace.id)}
                        className="gap-2 p-2"
                      >
                        <div
                          className="flex size-6 items-center justify-center rounded-sm text-xs"
                          style={{
                            backgroundColor: workspace.color || '#6366f1',
                          }}
                        >
                          {workspace.icon || '📋'}
                        </div>
                        <div className="font-medium">{workspace.name}</div>
                        {selectedWorkspaceId === workspace.id && (
                          <Check className="ml-auto size-4" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.url}
                  tooltip={item.title}
                >
                  <Link href={item.url}>
                    <item.icon />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === '/account'}
              tooltip="Account"
            >
              <Link href="/account">
                <User />
                <span>Account</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
