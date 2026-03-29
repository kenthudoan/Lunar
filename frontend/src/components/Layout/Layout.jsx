import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import MobileNav from './MobileNav'

export default function Layout({ children, title, titleKey, onBack, headerExtra, hideLayout = false }) {
  // Play page uses its own full-screen layout
  if (hideLayout) {
    return <>{children ?? <Outlet />}</>
  }

  return (
    <div className="flex min-h-screen bg-[var(--bg-base)]">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Header title={title} titleKey={titleKey} onBack={onBack} extra={headerExtra} />

        {/* Page Content */}
        <main className="flex-1 pb-[68px] md:pb-0">
          {children ?? <Outlet />}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <MobileNav />
    </div>
  )
}
