import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Sueldo = {
  id: string
  sueldo_inicial: number
  fecha_inicio: string
}

type Aumento = {
  id: string
  sueldo_id: string
  fecha: string
  porcentaje: number
}

function Sueldo() {
  const [sueldo, setSueldo] = useState<Sueldo | null>(null)
  const [aumentos, setAumentos] = useState<Aumento[]>([])

  const [sueldoInicial, setSueldoInicial] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')

  const [fechaAumento, setFechaAumento] = useState('')
  const [porcentaje, setPorcentaje] = useState('')

  const [cargando, setCargando] = useState(true)
  const [guardandoSueldo, setGuardandoSueldo] = useState(false)
  const [guardandoAumento, setGuardandoAumento] = useState(false)

  const [error, setError] = useState('')

  useEffect(() => {
    cargarSueldo()
  }, [])

  const cargarSueldo = async () => {
    setCargando(true)
    setError('')

    const { data, error } = await supabase
      .from('sueldos')
      .select('*')
      .order('fecha_inicio', {
        ascending: false,
      })
      .limit(1)

    if (error) {
      setError(error.message)
      setCargando(false)
      return
    }

    const sueldoActual = data?.[0] ?? null

    setSueldo(sueldoActual)

    if (sueldoActual) {
      await cargarAumentos(sueldoActual.id)
    }

    setCargando(false)
  }

  const cargarAumentos = async (sueldoId: string) => {
    const { data, error } = await supabase
      .from('aumentos_sueldo')
      .select('*')
      .eq('sueldo_id', sueldoId)
      .order('fecha', {
        ascending: true,
      })

    if (error) {
      setError(error.message)
      return
    }

    setAumentos(data ?? [])
  }

  const guardarSueldo = async (
    e: React.FormEvent
  ) => {
    e.preventDefault()

    setError('')

    if (
      !sueldoInicial ||
      Number(sueldoInicial) <= 0
    ) {
      setError('Ingresá un sueldo inicial válido')
      return
    }

    if (!fechaInicio) {
      setError('Ingresá la fecha de inicio')
      return
    }

    setGuardandoSueldo(true)

    if (sueldo) {
      const { error } = await supabase
        .from('sueldos')
        .update({
          sueldo_inicial: Number(sueldoInicial),
          fecha_inicio: fechaInicio,
        })
        .eq('id', sueldo.id)

      if (error) {
        setError(error.message)
        setGuardandoSueldo(false)
        return
      }
    } else {
      const { data, error } = await supabase
        .from('sueldos')
        .insert({
          sueldo_inicial: Number(sueldoInicial),
          fecha_inicio: fechaInicio,
        })
        .select()
        .single()

      if (error) {
        setError(error.message)
        setGuardandoSueldo(false)
        return
      }

      setSueldo(data)
    }

    await cargarSueldo()

    setGuardandoSueldo(false)
  }

  const agregarAumento = async (
    e: React.FormEvent
  ) => {
    e.preventDefault()

    setError('')

    if (!sueldo) {
      setError(
        'Primero tenés que configurar el sueldo inicial'
      )
      return
    }

    if (!fechaAumento) {
      setError(
        'Ingresá el mes del aumento'
      )
      return
    }

    if (
      !porcentaje ||
      Number(porcentaje) <= 0
    ) {
      setError(
        'Ingresá un porcentaje de aumento válido'
      )
      return
    }

    if (
      fechaAumento <
      sueldo.fecha_inicio
    ) {
      setError(
        'El aumento no puede ser anterior al inicio del sueldo'
      )
      return
    }

    setGuardandoAumento(true)

    const { error } = await supabase
      .from('aumentos_sueldo')
      .insert({
        sueldo_id: sueldo.id,
        fecha: fechaAumento,
        porcentaje: Number(porcentaje),
      })

    if (error) {
      if (error.code === '23505') {
        setError(
          'Ya existe un aumento registrado para ese mes.'
        )
      } else {
        setError(error.message)
      }

      setGuardandoAumento(false)
      return
    }

    setFechaAumento('')
    setPorcentaje('')

    await cargarAumentos(sueldo.id)

    setGuardandoAumento(false)
  }

  const eliminarAumento = async (
    aumentoId: string
  ) => {
    const confirmar = window.confirm(
      '¿Querés eliminar este aumento?'
    )

    if (!confirmar) {
      return
    }

    setError('')

    const { error } = await supabase
      .from('aumentos_sueldo')
      .delete()
      .eq('id', aumentoId)

    if (error) {
      setError(error.message)
      return
    }

    if (sueldo) {
      await cargarAumentos(sueldo.id)
    }
  }

  const calcularSueldoParaFecha = (
    fecha: string
  ) => {
    if (!sueldo) {
      return 0
    }

    let resultado =
      Number(sueldo.sueldo_inicial)

    const aumentosAplicables =
      aumentos
        .filter(
          (aumento) =>
            aumento.fecha <= fecha &&
            aumento.fecha >= sueldo.fecha_inicio
        )
        .sort(
          (a, b) =>
            new Date(a.fecha).getTime() -
            new Date(b.fecha).getTime()
        )

    for (const aumento of aumentosAplicables) {
      resultado =
        resultado *
        (1 +
          Number(aumento.porcentaje) /
            100)
    }

    return resultado
  }

  const calcularSueldoActual = () => {
    if (!sueldo) {
      return 0
    }

    const hoy = new Date()

    const fechaHoy =
      `${hoy.getFullYear()}-${String(
        hoy.getMonth() + 1
      ).padStart(2, '0')}-${String(
        hoy.getDate()
      ).padStart(2, '0')}`

    return calcularSueldoParaFecha(
      fechaHoy
    )
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

  const formatearFecha = (
    fecha: string
  ) => {
    const [anio, mes, dia] =
      fecha.split('-')

    return `${dia}/${mes}/${anio}`
  }

  if (cargando) {
    return <p>Cargando...</p>
  }

  return (
    <div>
      <h1>Sueldo</h1>

      {error && <p>{error}</p>}

      <h2>Sueldo inicial</h2>

      <form onSubmit={guardarSueldo}>
        <div>
          <label htmlFor="sueldoInicial">
            Sueldo inicial
          </label>

          <br />

          <input
            id="sueldoInicial"
            type="number"
            min="0"
            step="0.01"
            value={sueldoInicial}
            onChange={(e) =>
              setSueldoInicial(
                e.target.value
              )
            }
            placeholder="1000000"
          />
        </div>

        <div>
          <label htmlFor="fechaInicio">
            Fecha de inicio
          </label>

          <br />

          <input
            id="fechaInicio"
            type="date"
            value={fechaInicio}
            onChange={(e) =>
              setFechaInicio(
                e.target.value
              )
            }
          />
        </div>

        <br />

        <button
          type="submit"
          disabled={guardandoSueldo}
        >
          {guardandoSueldo
            ? 'Guardando...'
            : sueldo
              ? 'Actualizar sueldo'
              : 'Guardar sueldo'}
        </button>
      </form>

      {sueldo && (
        <>
          <hr />

          <h2>Sueldo actual</h2>

          <h1>
            {formatearMonto(
              calcularSueldoActual()
            )}
          </h1>

          <p>
            Sueldo inicial:{' '}
            {formatearMonto(
              Number(
                sueldo.sueldo_inicial
              )
            )}
          </p>

          <p>
            Desde:{' '}
            {formatearFecha(
              sueldo.fecha_inicio
            )}
          </p>

          <hr />

          <h2>Agregar aumento</h2>

          <form onSubmit={agregarAumento}>
            <div>
              <label htmlFor="fechaAumento">
                Mes del aumento
              </label>

              <br />

              <input
                id="fechaAumento"
                type="date"
                value={fechaAumento}
                onChange={(e) =>
                  setFechaAumento(
                    e.target.value
                  )
                }
              />
            </div>

            <div>
              <label htmlFor="porcentaje">
                Porcentaje
              </label>

              <br />

              <input
                id="porcentaje"
                type="number"
                min="0"
                step="0.01"
                value={porcentaje}
                onChange={(e) =>
                  setPorcentaje(
                    e.target.value
                  )
                }
                placeholder="5"
              />

              <span> %</span>
            </div>

            <br />

            <button
              type="submit"
              disabled={
                guardandoAumento
              }
            >
              {guardandoAumento
                ? 'Guardando...'
                : 'Agregar aumento'}
            </button>
          </form>

          <hr />

          <h2>
            Histórico de aumentos
          </h2>

          {aumentos.length === 0 ? (
            <p>
              No hay aumentos registrados.
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Aumento</th>
                  <th>Sueldo resultante</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {aumentos.map(
                  (aumento) => (
                    <tr
                      key={aumento.id}
                    >
                      <td>
                        {formatearFecha(
                          aumento.fecha
                        )}
                      </td>

                      <td>
                        {aumento.porcentaje}%
                      </td>

                      <td>
                        {formatearMonto(
                          calcularSueldoParaFecha(
                            aumento.fecha
                          )
                        )}
                      </td>

                      <td>
                        <button
                          onClick={() =>
                            eliminarAumento(
                              aumento.id
                            )
                          }
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  )
}

export default Sueldo

