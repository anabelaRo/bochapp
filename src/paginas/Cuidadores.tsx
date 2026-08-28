import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Tarifa = {
  id: string
  vigente_desde: string
  valor_hora: number
  viatico_diario: number
}

type Cuidador = {
  id: string
  nombre: string
  activo: boolean
  tarifas_cuidadores: Tarifa[]
}

function Cuidadores() {
  const [cuidadores, setCuidadores] = useState<Cuidador[]>([])

  const [nombre, setNombre] = useState('')
  const [valorHora, setValorHora] = useState('')
  const [viatico, setViatico] = useState('')
  const [vigenteDesde, setVigenteDesde] = useState('')

  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const cargarCuidadores = async () => {
    setCargando(true)
    setError('')

    const { data, error } = await supabase
      .from('cuidadores')
      .select(`
        *,
        tarifas_cuidadores (
          id,
          vigente_desde,
          valor_hora,
          viatico_diario
        )
      `)
      .order('nombre')

    if (error) {
      setError(error.message)
    } else {
      setCuidadores(data ?? [])
    }

    setCargando(false)
  }

  useEffect(() => {
    cargarCuidadores()
  }, [])

  const agregarCuidador = async (
    e: React.FormEvent
  ) => {
    e.preventDefault()

    setError('')

    if (!nombre.trim()) {
      setError(
        'Ingresá el nombre del cuidador'
      )
      return
    }

    if (!vigenteDesde) {
      setError(
        'Ingresá la fecha desde la cual es válida la tarifa'
      )
      return
    }

    if (
      !valorHora ||
      Number(valorHora) <= 0
    ) {
      setError(
        'Ingresá un valor hora válido'
      )
      return
    }

    if (
      !viatico ||
      Number(viatico) < 0
    ) {
      setError(
        'Ingresá un viático válido'
      )
      return
    }

    setGuardando(true)

    // Crear cuidador
    const {
      data: cuidador,
      error: errorCuidador,
    } = await supabase
      .from('cuidadores')
      .insert({
        nombre: nombre.trim(),
      })
      .select()
      .single()

    if (errorCuidador) {
      setError(errorCuidador.message)
      setGuardando(false)
      return
    }

    // Crear tarifa inicial
    const { error: errorTarifa } =
      await supabase
        .from('tarifas_cuidadores')
        .insert({
          cuidador_id: cuidador.id,
          vigente_desde: vigenteDesde,
          valor_hora: Number(valorHora),
          viatico_diario: Number(viatico),
        })

    if (errorTarifa) {
      // Si falla la tarifa, eliminamos
      // el cuidador recién creado.
      await supabase
        .from('cuidadores')
        .delete()
        .eq('id', cuidador.id)

      setError(errorTarifa.message)
      setGuardando(false)
      return
    }

    // Limpiar formulario
    setNombre('')
    setValorHora('')
    setViatico('')
    setVigenteDesde('')

    await cargarCuidadores()

    setGuardando(false)
  }

  const formatearMonto = (
    monto: number
  ) => {
    return new Intl.NumberFormat(
      'es-AR',
      {
        style: 'currency',
        currency: 'ARS',
        maximumFractionDigits: 2,
      }
    ).format(monto)
  }

  return (
    <div className="pagina-container">
      <div className="pagina-header">
        <h1>Cuidadores</h1>

        <p className="pagina-subtitulo">
          Administrá los cuidadores y sus
          tarifas iniciales.
        </p>
      </div>

      {/* =========================
          FORMULARIO
          ========================= */}

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Agregar cuidador</h2>

            <p>
              Completá los datos del cuidador
              y su tarifa inicial.
            </p>
          </div>
        </div>

        <form
          onSubmit={agregarCuidador}
          className="formulario"
        >
          <div className="form-grid">
            <div className="campo campo-completo">
              <label htmlFor="nombre">
                Nombre
              </label>

              <input
                id="nombre"
                type="text"
                value={nombre}
                onChange={(e) =>
                  setNombre(e.target.value)
                }
                placeholder="Nombre del cuidador"
              />
            </div>

            <div className="campo">
              <label htmlFor="vigenteDesde">
                Vigente desde
              </label>

              <input
                id="vigenteDesde"
                type="date"
                value={vigenteDesde}
                onChange={(e) =>
                  setVigenteDesde(
                    e.target.value
                  )
                }
              />
            </div>

            <div className="campo">
              <label htmlFor="valorHora">
                Valor hora
              </label>

              <div className="input-con-prefijo">
                <span>$</span>

                <input
                  id="valorHora"
                  type="number"
                  min="0"
                  step="0.01"
                  value={valorHora}
                  onChange={(e) =>
                    setValorHora(
                      e.target.value
                    )
                  }
                  placeholder="5000"
                />
              </div>
            </div>

            <div className="campo">
              <label htmlFor="viatico">
                Viático diario
              </label>

              <div className="input-con-prefijo">
                <span>$</span>

                <input
                  id="viatico"
                  type="number"
                  min="0"
                  step="0.01"
                  value={viatico}
                  onChange={(e) =>
                    setViatico(
                      e.target.value
                    )
                  }
                  placeholder="3000"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="mensaje-error">
              {error}
            </div>
          )}

          <div className="formulario-acciones">
            <button
              type="submit"
              disabled={guardando}
            >
              {guardando
                ? 'Guardando...'
                : 'Agregar cuidador'}
            </button>
          </div>
        </form>
      </section>

      {/* =========================
          LISTADO
          ========================= */}

      <section className="seccion-listado">
        <div className="seccion-titulo">
          <div>
            <h2>
              Cuidadores registrados
            </h2>

            <p>
              {cuidadores.length}{' '}
              {cuidadores.length === 1
                ? 'cuidador'
                : 'cuidadores'}
            </p>
          </div>
        </div>

        {cargando ? (
          <div className="estado-vacio">
            <p>Cargando cuidadores...</p>
          </div>
        ) : cuidadores.length === 0 ? (
          <div className="estado-vacio">
            <div className="estado-icono">
              ♙
            </div>

            <h3>
              No hay cuidadores
            </h3>

            <p>
              Agregá el primer cuidador
              utilizando el formulario de
              arriba.
            </p>
          </div>
        ) : (
          <div className="cuidadores-grid">
            {cuidadores.map(
              (cuidador) => {
                const tarifasOrdenadas = [
                  ...cuidador.tarifas_cuidadores,
                ].sort(
                  (a, b) =>
                    new Date(
                      b.vigente_desde
                    ).getTime() -
                    new Date(
                      a.vigente_desde
                    ).getTime()
                )

                const tarifaActual =
                  tarifasOrdenadas[0]

                return (
                  <article
                    className="cuidador-card"
                    key={cuidador.id}
                  >
                    <div className="cuidador-card-header">
                      <div className="cuidador-avatar">
                        {cuidador.nombre
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="cuidador-identidad">
                        <h3>
                          {cuidador.nombre}
                        </h3>

                        <span className="estado-activo">
                          Activo
                        </span>
                      </div>
                    </div>

                    <div className="cuidador-card-body">
                      {tarifaActual ? (
                        <>
                          <div className="dato-cuidador">
                            <span>
                              Valor hora
                            </span>

                            <strong>
                              {formatearMonto(
                                Number(
                                  tarifaActual.valor_hora
                                )
                              )}
                            </strong>
                          </div>

                          <div className="dato-cuidador">
                            <span>
                              Viático diario
                            </span>

                            <strong>
                              {formatearMonto(
                                Number(
                                  tarifaActual.viatico_diario
                                )
                              )}
                            </strong>
                          </div>

                          <div className="dato-cuidador">
                            <span>
                              Vigente desde
                            </span>

                            <strong>
                              {
                                tarifaActual.vigente_desde
                              }
                            </strong>
                          </div>
                        </>
                      ) : (
                        <div className="sin-tarifa">
                          <span className="sin-tarifa-icono">
                            !
                          </span>

                          <div>
                            <strong>
                              Sin tarifa
                              configurada
                            </strong>

                            <p>
                              Este cuidador
                              todavía no tiene
                              una tarifa.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </article>
                )
              }
            )}
          </div>
        )}
      </section>
    </div>
  )
}

export default Cuidadores