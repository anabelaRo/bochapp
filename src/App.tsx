import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'

import { supabase } from './lib/supabase'

import Login from './componentes/Login'
import Layout from './componentes/Layout'

import Inicio from './paginas/Inicio'
import Cuidadores from './paginas/Cuidadores'
import Tarifas from './paginas/Tarifas'
import Horarios from './paginas/Horarios'
import Feriados from './paginas/Feriados'
import Liquidacion from './paginas/Liquidacion'
import Excepciones from './paginas/Excepciones'
import Sueldo from './paginas/Sueldo'
import type { Pagina } from '../types'

function App() {
  const [sesion, setSesion] =
    useState<Session | null>(null)

  const [cargando, setCargando] =
    useState(true)

  const [pagina, setPagina] =
    useState<Pagina>('inicio')

  useEffect(() => {
    const obtenerSesion = async () => {
      const { data } =
        await supabase.auth.getSession()

      setSesion(data.session)
      setCargando(false)
    }

    obtenerSesion()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSesion(session)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  if (cargando) {
    return (
      <div className="main-content">
        <p>Cargando...</p>
      </div>
    )
  }

  if (!sesion) {
    return <Login />
  }

  const mostrarPagina = () => {
    switch (pagina) {
      case 'cuidadores':
        return <Cuidadores />

      case 'tarifas':
        return <Tarifas />

      case 'horarios':
        return <Horarios />

      case 'feriados':
        return <Feriados />

      case 'excepciones':
        return <Excepciones />

      case 'liquidacion':
        return <Liquidacion />

      case 'sueldo':
        return <Sueldo />

      case 'inicio':
      default:
        return (
          <Inicio
            irACuidadores={() =>
              setPagina('cuidadores')
            }
            irATarifas={() =>
              setPagina('tarifas')
            }
            irAHorarios={() =>
              setPagina('horarios')
            }
            irAFeriados={() =>
              setPagina('feriados')
            }
            irAExcepciones={() =>
              setPagina('excepciones')
            }
            irALiquidacion={() =>
              setPagina('liquidacion')
            }
            irASueldo={() =>
              setPagina('sueldo')
            }
          />
        )
    }
  }

  return (
    <Layout
      paginaActual={pagina}
      navegar={setPagina}
    >
      {mostrarPagina()}
    </Layout>
  )
}

export default App
