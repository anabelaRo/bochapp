import { useState } from 'react'
import type { ReactNode } from 'react'
import Sidebar from './Sidebar.tsx'
import type { Pagina } from './types'

type LayoutProps = {
  children: ReactNode
  paginaActual: Pagina
  navegar: (pagina: Pagina) => void
}

function Layout({
  children,
  paginaActual,
  navegar,
}: LayoutProps) {
  const [menuAbierto, setMenuAbierto] =
    useState(false)

  const cambiarPagina = (pagina: Pagina) => {
    navegar(pagina)
    setMenuAbierto(false)
  }

  return (
    <div className="app-layout">
      <Sidebar
        paginaActual={paginaActual}
        navegar={cambiarPagina}
        abierto={menuAbierto}
        cerrar={() => setMenuAbierto(false)}
      />

      {menuAbierto && (
        <button
          className="sidebar-overlay"
          onClick={() => setMenuAbierto(false)}
          aria-label="Cerrar menú"
        />
      )}

      <div className="main-container">
        <header className="mobile-header">
          <button
            className="menu-button"
            onClick={() =>
              setMenuAbierto(true)
            }
            aria-label="Abrir menú"
          >
            ☰
          </button>

          <span>Pago Cuidadores</span>
        </header>

        <main className="main-content">
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout

