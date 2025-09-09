'use client'

import { Sidebar, SidebarHeader, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { Bot, CreditCard, LayoutDashboard, MessageCircleDashed } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Image from "next/image"
import useProject from "@/hooks/use-project"

const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard
  },
  {
    title: "Q&A",
    url: "/qa",
    icon: Bot
  },
  {
    title: "Casual Chat",
    url: "/casualchat",
    icon: MessageCircleDashed
  },
  {
    title: "Billing",
    url: "/billing",
    icon: CreditCard
  },
]

// const projects = [
//   {
//     name: "Project 1",
//   },
//   {
//     name: "Project 2",
//   },
//   {
//     name: "Project 3",
//   },
// ]


export function AppSidebar() {
  const pathname = usePathname()
  const {open} = useSidebar()
  const {projects, projectId, setProjectId} = useProject()
  return (
    <Sidebar collapsible = 'icon' variant="floating">
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <Image src='/logo.png' alt='logo' width={40} height={40}/> 
          {open && (
            <h1 className="text-xl font-bold text-primary/80">
              GitQuery
            </h1>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            Applications
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(item => {
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link href={item.url} className={cn({
                        '!bg-primary !text-white': pathname === item.url
                      }, 'list-style-none')}>
                        <item.icon/>
                        <span> {item.title} </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
            })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupLabel>
            Your Projects
          </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              
              {
                //@ts-ignore
                projects?.map(project => {
                  return (
                    <SidebarMenuItem key={project.id}>
                      <SidebarMenuButton asChild>
                        <div onClick={() => setProjectId(project.id)}>
                          <div className="hover:cursor-pointer">
                            <div
                              className={cn(
                                "rounded-sm border size-6 flex items-center justify-center text-sm bg-white text-primary",
                                { "bg-primary text-white": project.id === projectId }
                              )}
                            >
                              {project.name[0]}
                            </div>
                          </div>
                          <span>{project.name}</span>
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>

                  )
                })
              }

              <div className="h-2"></div>
              {open && (
                <SidebarMenuItem>
                  <Link href='/create'>
                    <Button size='sm' variant="outline" className="w-fit hover: cursor-pointer">
                      <Plus />
                      Create Project
                    </Button>
                  </Link>
                </SidebarMenuItem>
              )}

            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>

    
  )
}