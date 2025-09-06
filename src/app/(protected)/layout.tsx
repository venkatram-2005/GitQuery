import { SidebarProvider } from '@/components/ui/sidebar'
import ClientUserButton from "./ClientUserButton";
<div className="ml-auto">
  <ClientUserButton />
</div>

import {AppSidebar} from './app-sidebar'

type Props = {
    children: React.ReactNode
}

const SideBarLayout = ({children} : Props) => {
  return (
    <SidebarProvider>
        <AppSidebar/>
        <main className='w-full m-2'>
            <div className='flex items-center gap-2 border-sidebar-border bg-sidebar border shadow rounded-md p-2 px-4'>
               <h1 className="font-bold text-center mx-auto">GitQuery : A RAG Powered GitHub Repository Assistant</h1>
               <div className='ml-auto'></div>
               <ClientUserButton/>
            </div>

            <div className='h-4'></div>
            {/* {Main Content} */}
            <div className='border-sidebar-border bg-sidebar border shadow rounded-md overflow-y-scroll h-[calc(100vh-6rem)] p-4'>
                {children}
            </div>
        </main>
    </SidebarProvider>
  )
}

export default SideBarLayout
