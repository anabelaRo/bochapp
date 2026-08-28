import { supabase } from '../lib/supabase'

type Pagina =
  | 'inicio'
  | 'cuidadores'
  | 'tarifas'
  | 'horarios'
  | 'feriados'
  | 'excepciones'
  | 'liquidacion'

type SidebarProps = {
  paginaActual: Pagina
  navegar: (pagina: Pagina) => void
  abierto: boolean
  cerrar: () => void
}

type ItemMenuProps = {
  pagina: Pagina
  actual: Pagina
  texto: string
  icono: string
  navegar: (pagina: Pagina) => void
}

function ItemMenu({
  pagina,
  actual,
  texto,
  icono,
  navegar,
}: ItemMenuProps) {
  const activo = pagina === actual

  return (
    <button
      className={`sidebar-item ${
        activo ? 'activo' : ''
      }`}
      onClick={() => navegar(pagina)}
    >
      <span className="sidebar-icon">
        {icono}
      </span>

      <span>{texto}</span>
    </button>
  )
}

function Sidebar({
  paginaActual,
  navegar,
  abierto,
  cerrar,
}: SidebarProps) {
  const cerrarSesion = async () => {
    await supabase.auth.signOut()
  }

  return (
    <aside
      className={`sidebar ${
        abierto ? 'abierto' : ''
      }`}
    >
      <div className="sidebar-header">
        <div className="logo-icon">
          $
        </div>

        <div>
          <div className="logo-title">
            Pago Cuidadores
          </div>

          <div className="logo-subtitle">
            Gestión y liquidación
          </div>
        </div>

        <button
          className="sidebar-close"
          onClick={cerrar}
          aria-label="Cerrar menú"
        >
          ×
        </button>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-title">
          PRINCIPAL
        </div>

        <ItemMenu
          pagina="inicio"
          actual={paginaActual}
          texto="Inicio"
          icono="⌂"
          navegar={navegar}
        />

        <ItemMenu
          pagina="liquidacion"
          actual={paginaActual}
          texto="Liquidación"
          icono="$"
          navegar={navegar}
        />

        <div className="sidebar-section-title">
          CONFIGURACIÓN
        </div>

        <ItemMenu
          pagina="cuidadores"
          actual={paginaActual}
          texto="Cuidadores"
          icono="♙"
          navegar={navegar}
        />

        <ItemMenu
          pagina="tarifas"
          actual={paginaActual}
          texto="Tarifas"
          icono="▤"
          navegar={navegar}
        />

        <ItemMenu
          pagina="horarios"
          actual={paginaActual}
          texto="Horarios"
          icono="◷"
          navegar={navegar}
        />

        <ItemMenu
          pagina="excepciones"
          actual={paginaActual}
          texto="Excepciones"
          icono="!"
          navegar={navegar}
        />

        <ItemMenu
          pagina="feriados"
          actual={paginaActual}
          texto="Feriados"
          icono="▣"
          navegar={navegar}
        />
      </nav>

      <div className="sidebar-footer">
        <button
          className="logout-button"
          onClick={cerrarSesion}
        >
          <span>↪</span>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar

