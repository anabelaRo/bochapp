import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Cuidador = {
  id: string
  nombre: string
}

type Tarifa = {
  id: string
  cuidador_id: string
  vigente_desde: string
  valor_hora: number
  viatico_diario: number
}

function Tarifas() {
  const [cuidadores, setCuidadores] = useState<Cuidador[]>([])
  const [tarifas, setTarifas] = useState<Tarifa[]>([])

  const [cuidadorSeleccionado, setCuidadorSeleccionado] =
    useState('')

  const [vigenteDesde, setVigenteDesde] = useState('')
  const [valorHora, setValorHora] = useState('')
  const [viatico, setViatico] = useState('')

  const [cargandoCuidadores, setCargandoCuidadores] =
    useState(true)

  const [cargandoTarifas, setCargandoTarifas] =
    useState(false)

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    cargarCuidadores()
  }, [])

  const cargarCuidadores = async () => {
    setCargandoCuidadores(true)
    setError('')

    const { data, error } = await supabase
      .from('cuidadores')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre')

    if (error) {
      setError(error.message)
    } else {
      setCuidadores(data ?? [])
    }

    setCargandoCuidadores(false)
  }

  const cargarTarifas = async (
    cuidadorId: string
  ) => {
    setCargandoTarifas(true)
    setError('')

    const { data, error } = await supabase
      .from('tarifas_cuidadores')
      .select('*')
      .eq('cuidador_id', cuidadorId)
      .order('vigente_desde', {
        ascending: false,
      })

    if (error) {
      setError(error.message)
    } else {
      setTarifas(data ?? [])
    }

    setCargandoTarifas(false)
  }

  const seleccionarCuidador = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const cuidadorId = e.target.value

    setCuidadorSeleccionado(cuidadorId)
    setTarifas([])
    setError('')

    if (cuidadorId) {
      cargarTarifas(cuidadorId)
    }
  }

  const agregarTarifa = async (
    e: React.FormEvent
  ) => {
    e.preventDefault()

    setError('')

    if (!cuidadorSeleccionado) {
      setError('Seleccioná un cuidador')
      return
    }

    if (!vigenteDesde) {
      setError('Ingresá la fecha de vigencia')
      return
    }

    if (
      !valorHora ||
      Number(valorHora) <= 0
    ) {
      setError('Ingresá un valor hora válido')
      return
    }

    if (
      !viatico ||
      Number(viatico) < 0
    ) {
      setError('Ingresá un viático válido')
      return
    }

    setGuardando(true)

    const { error } = await supabase
      .from('tarifas_cuidadores')
      .insert({
        cuidador_id: cuidadorSeleccionado,
        vigente_desde: vigenteDesde,
        valor_hora: Number(valorHora),
        viatico_diario: Number(viatico),
      })

    if (error) {
      if (error.code === '23505') {
        setError(
          'Ya existe una tarifa para este cuidador con esa fecha.'
        )
      } else {
        setError(error.message)
      }

      setGuardando(false)
      return
    }

    setVigenteDesde('')
    setValorHora('')
    setViatico('')

    await cargarTarifas(
      cuidadorSeleccionado
    )

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

  const cuidadorActual =
    cuidadores.find(
      (cuidador) =>
        cuidador.id ===
        cuidadorSeleccionado
    )

  return (
    <div className="pagina-container">
      <div className="pagina-header">
        <h1>Tarifas</h1>

        <p className="pagina-subtitulo">
          Administrá los valores de cada
          cuidador y mantené su histórico.
        </p>
      </div>

      {/* =========================
          SELECCIONAR CUIDADOR
          ========================= */}

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Seleccionar cuidador</h2>

            <p>
              Elegí el cuidador para consultar
              o agregar tarifas.
            </p>
          </div>
        </div>

        {cargandoCuidadores ? (
          <p className="texto-secundario">
            Cargando cuidadores...
          </p>
        ) : cuidadores.length === 0 ? (
          <div className="estado-vacio">
            <div className="estado-icono">
              ♙
            </div>

            <h3>
              No hay cuidadores activos
            </h3>

            <p>
              Primero necesitás agregar un
              cuidador.
            </p>
          </div>
        ) : (
          <div className="campo">
            <label htmlFor="cuidador">
              Cuidador
            </label>

            <select
              id="cuidador"
              value={cuidadorSeleccionado}
              onChange={
                seleccionarCuidador
              }
            >
              <option value="">
                Seleccioná un cuidador
              </option>

              {cuidadores.map(
                (cuidador) => (
                  <option
                    key={cuidador.id}
                    value={cuidador.id}
                  >
                    {cuidador.nombre}
                  </option>
                )
              )}
            </select>
          </div>
        )}
      </section>

      {error && (
        <div className="mensaje-error">
          {error}
        </div>
      )}

      {cuidadorSeleccionado && (
        <>
          {/* =========================
              NUEVA TARIFA
              ========================= */}

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>
                  Nueva tarifa
                </h2>

                <p>
                  {cuidadorActual?.nombre}
                </p>
              </div>
            </div>

            <form
              onSubmit={agregarTarifa}
              className="formulario"
            >
              <div className="form-grid">
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

              <div className="formulario-acciones">
                <button
                  type="submit"
                  disabled={guardando}
                >
                  {guardando
                    ? 'Guardando...'
                    : 'Agregar tarifa'}
                </button>
              </div>
            </form>
          </section>

          {/* =========================
              HISTÓRICO
              ========================= */}

          <section className="seccion-listado">
            <div className="seccion-titulo">
              <div>
                <h2>
                  Histórico de tarifas
                </h2>

                <p>
                  {tarifas.length}{' '}
                  {tarifas.length === 1
                    ? 'tarifa'
                    : 'tarifas'}
                </p>
              </div>
            </div>

            {cargandoTarifas ? (
              <div className="estado-vacio">
                <p>
                  Cargando tarifas...
                </p>
              </div>
            ) : tarifas.length === 0 ? (
              <div className="estado-vacio">
                <div className="estado-icono">
                  $
                </div>

                <h3>
                  Sin tarifas configuradas
                </h3>

                <p>
                  Agregá la primera tarifa
                  utilizando el formulario
                  de arriba.
                </p>
              </div>
            ) : (
              <>
                {/* DESKTOP */}

                <div className="tabla-container tarifas-tabla-desktop">
                  <table>
                    <thead>
                      <tr>
                        <th>
                          Vigente desde
                        </th>

                        <th>
                          Valor hora
                        </th>

                        <th>
                          Viático diario
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {tarifas.map(
                        (
                          tarifa,
                          index
                        ) => (
                          <tr
                            key={
                              tarifa.id
                            }
                            className={
                              index === 0
                                ? 'fila-actual'
                                : ''
                            }
                          >
                            <td>
                              <div className="fecha-tarifa">
                                {
                                  tarifa.vigente_desde
                                }

                                {index ===
                                  0 && (
                                  <span className="badge-actual">
                                    Actual
                                  </span>
                                )}
                              </div>
                            </td>

                            <td>
                              <strong>
                                {formatearMonto(
                                  Number(
                                    tarifa.valor_hora
                                  )
                                )}
                              </strong>
                            </td>

                            <td>
                              {formatearMonto(
                                Number(
                                  tarifa.viatico_diario
                                )
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>

                {/* MOBILE */}

                <div className="tarifas-mobile">
                  {tarifas.map(
                    (
                      tarifa,
                      index
                    ) => (
                      <article
                        key={
                          tarifa.id
                        }
                        className={`tarifa-card ${
                          index === 0
                            ? 'tarifa-actual'
                            : ''
                        }`}
                      >
                        <div className="tarifa-card-header">
                          <div>
                            <span className="tarifa-label">
                              Vigente desde
                            </span>

                            <strong>
                              {
                                tarifa.vigente_desde
                              }
                            </strong>
                          </div>

                          {index ===
                            0 && (
                            <span className="badge-actual">
                              Actual
                            </span>
                          )}
                        </div>

                        <div className="tarifa-card-datos">
                          <div>
                            <span>
                              Valor hora
                            </span>

                            <strong>
                              {formatearMonto(
                                Number(
                                  tarifa.valor_hora
                                )
                              )}
                            </strong>
                          </div>

                          <div>
                            <span>
                              Viático diario
                            </span>

                            <strong>
                              {formatearMonto(
                                Number(
                                  tarifa.viatico_diario
                                )
                              )}
                            </strong>
                          </div>
                        </div>
                      </article>
                    )
                  )}
                </div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  )
}

export default Tarifas
