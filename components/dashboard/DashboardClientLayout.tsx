'use client';

import { useState } from 'react';
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileSidebar } from "./MobileSidebar";
import SocketWrapper from "../SocketWrapper";
import TimezoneWrapper from "./TimezoneWrapper";
import { PhoenixWrapper } from "../phoenix/PhoenixWrapper";

interface DashboardClientLayoutProps {
  usuario: any;
  children: React.ReactNode;
}

export function DashboardClientLayout({ usuario, children }: DashboardClientLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <PhoenixWrapper>
      <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden">
        
        {/* Detector de zona horaria */}
        <TimezoneWrapper initialTimezone={usuario.timezone || 'America/Mexico_City'} />
        
        {/* Sidebar Desktop (oculto en móvil) */}
        <Sidebar usuario={usuario} />

        {/* Sidebar Móvil */}
        <MobileSidebar 
          isOpen={isMobileMenuOpen} 
          onClose={() => setIsMobileMenuOpen(false)}
        >
          <Sidebar usuario={usuario} isMobile={true} onClose={() => setIsMobileMenuOpen(false)} />
        </MobileSidebar>

        <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
          {/* Topbar con botón de menú */}
          <Topbar 
            usuario={usuario} 
            onMenuClick={() => setIsMobileMenuOpen(true)} 
          />

          <main className="w-full flex-grow p-4 md:p-6">
            {children}
          </main>
        </div>

        {/* Componentes de Socket.IO */}
        <SocketWrapper />
      </div>
    </PhoenixWrapper>
  );
}
