import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Cuidador = {
  id: string
  nombre: string
}

type Excepcion = {
  id: string
  cuidador_id: string
  fecha: string
  tipo: 'CAMBIO' | 'CANCELACION'
  hora_inicio: string | null
  hora_fin: string | null
}

function Excepciones() {
  const [cuidadores, setCuidadores] = useState<Cuidador[]>([])
  const [excepciones, setExcepciones] = useState<Excepcion[]>([])

  const [cuidadorSeleccionado, setCuidadorSeleccionado] =
    useState('')

  const [fecha, setFecha] = useState('')
  const [tipo, setTipo] = useState<'CAMBIO' | 'CANCELACION'>(
    'CAMBIO'
  )

  const [horaInicio, setHoraInicio] = useState('')
  const [horaFin, setHoraFin] = useState('')

  const [cargandoCuidadores, setCargandoCuidadores] =
    useState(true)

  const [cargandoExcepciones, setCargandoExcepciones] =
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

  const cargarExcepciones = async (cuidadorId: string) => {
    setCargandoExcepciones(true)
    setError('')

    const { data, error } = await supabase
      .from('excepciones_horarios')
      .select('*')
      .eq('cuidador_id', cuidadorId)
      .order('fecha')
      .order('hora_inicio')

    if (error) {
      setError(error.message)
    } else {
      setExcepciones(data ?? [])
    }

    setCargandoExcepciones(false)
  }

  const seleccionarCuidador = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const cuidadorId = e.target.value

    setCuidadorSeleccionado(cuidadorId)
    setExcepciones([])
    setError('')

    if (cuidadorId) {
      cargarExcepciones(cuidadorId)
    }
  }

  const agregarExcepcion = async (
    e: React.FormEvent
  ) => {
    e.preventDefault()

    setError('')

    if (!cuidadorSeleccionado) {
      setError('Seleccioná un cuidador')
      return
    }

    if (!fecha) {
      setError('Ingresá una fecha')
      return
    }

    if (
      tipo === 'CAMBIO' &&
      (!horaInicio || !horaFin)
    ) {
      setError(
        'Ingresá la hora de inicio y la hora de fin'
      )
      return
    }

    if (
      tipo === 'CAMBIO' &&
      horaInicio >= horaFin
    ) {
      setError(
        'La hora de inicio debe ser anterior a la hora de fin'
      )
      return
    }

    // Una cancelación no puede coexistir
    // con otros turnos del mismo día.
    if (tipo === 'CANCELACION') {
      const { data: existentes, error } =
        await supabase
          .from('excepciones_horarios')
          .select('id')
          .eq('cuidador_id', cuidadorSeleccionado)
          .eq('fecha', fecha)

      if (error) {
        setError(error.message)
        return
      }

      if (existentes && existentes.length > 0) {
        setError(
          'Ya existen excepciones para ese día. Eliminá primero los turnos existentes antes de registrar una cancelación.'
        )
        return
      }
    }

    // Un turno no puede agregarse si existe
    // una cancelación para ese día.
    if (tipo === 'CAMBIO') {
      const { data: cancelaciones, error } =
        await supabase
          .from('excepciones_horarios')
          .select('id')
          .eq('cuidador_id', cuidadorSeleccionado)
          .eq('fecha', fecha)
          .eq('tipo', 'CANCELACION')

      if (error) {
        setError(error.message)
        return
      }

      if (
        cancelaciones &&
        cancelaciones.length > 0
      ) {
        setError(
          'Ese día está cancelado. Eliminá la cancelación antes de agregar un turno.'
        )
        return
      }
    }

    setGuardando(true)

    const { error } = await supabase
      .from('excepciones_horarios')
      .insert({
        cuidador_id: cuidadorSeleccionado,
        fecha,
        tipo,
        hora_inicio:
          tipo === 'CAMBIO'
            ? horaInicio
            : null,
        hora_fin:
          tipo === 'CAMBIO'
            ? horaFin
            : null,
      })

    if (error) {
      setError(error.message)
      setGuardando(false)
      return
    }

    setFecha('')
    setHoraInicio('')
    setHoraFin('')

    await cargarExcepciones(
      cuidadorSeleccionado
    )

    setGuardando(false)
  }

  const eliminarExcepcion = async (
    excepcionId: string
  ) => {
    const confirmar = window.confirm(
      '¿Querés eliminar esta excepción?'
    )

    if (!confirmar) {
      return
    }

    setError('')

    const { error } = await supabase
      .from('excepciones_horarios')
      .delete()
      .eq('id', excepcionId)

    if (error) {
      setError(error.message)
      return
    }

    await cargarExcepciones(
      cuidadorSeleccionado
    )
  }

  const formatearFecha = (fecha: string) => {
    const [anio, mes, dia] =
      fecha.split('-')

    return `${dia}/${mes}/${anio}`
  }

  return (
    <div>
      <h1>Excepciones de horarios</h1>

      <div>
        <label htmlFor="cuidador">
          Cuidador
        </label>

        <br />

        {cargandoCuidadores ? (
          <p>Cargando cuidadores...</p>
        ) : (
          <select
            id="cuidador"
            value={cuidadorSeleccionado}
            onChange={seleccionarCuidador}
          >
            <option value="">
              Seleccioná un cuidador
            </option>

            {cuidadores.map((cuidador) => (
              <option
                key={cuidador.id}
                value={cuidador.id}
              >
                {cuidador.nombre}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && <p>{error}</p>}

      {cuidadorSeleccionado && (
        <>
          <hr />

          <h2>Agregar excepción</h2>

          <form onSubmit={agregarExcepcion}>
            <div>
              <label htmlFor="fecha">
                Fecha
              </label>

              <br />

              <input
                id="fecha"
                type="date"
                value={fecha}
                onChange={(e) =>
                  setFecha(e.target.value)
                }
              />
            </div>

            <div>
              <label htmlFor="tipo">
                Tipo
              </label>

              <br />

              <select
                id="tipo"
                value={tipo}
                onChange={(e) =>
                  setTipo(
                    e.target.value as
                      | 'CAMBIO'
                      | 'CANCELACION'
                  )
                }
              >
                <option value="CAMBIO">
                  Cambio de horario
                </option>

                <option value="CANCELACION">
                  Cancelación
                </option>
              </select>
            </div>

            {tipo === 'CAMBIO' && (
              <>
                <div>
                  <label htmlFor="horaInicio">
                    Hora inicio
                  </label>

                  <br />

                  <input
                    id="horaInicio"
                    type="time"
                    value={horaInicio}
                    onChange={(e) =>
                      setHoraInicio(
                        e.target.value
                      )
                    }
                  />
                </div>

                <div>
                  <label htmlFor="horaFin">
                    Hora fin
                  </label>

                  <br />

                  <input
                    id="horaFin"
                    type="time"
                    value={horaFin}
                    onChange={(e) =>
                      setHoraFin(
                        e.target.value
                      )
                    }
                  />
                </div>
              </>
            )}

            <br />

            <button
              type="submit"
              disabled={guardando}
            >
              {guardando
                ? 'Guardando...'
                : 'Agregar excepción'}
            </button>
          </form>

          <hr />

          <h2>Excepciones registradas</h2>

          {cargandoExcepciones ? (
            <p>
              Cargando excepciones...
            </p>
          ) : excepciones.length === 0 ? (
            <p>
              Este cuidador no tiene
              excepciones.
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Horario</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {excepciones.map(
                  (excepcion) => (
                    <tr
                      key={excepcion.id}
                    >
                      <td>
                        {formatearFecha(
                          excepcion.fecha
                        )}
                      </td>

                      <td>
                        {excepcion.tipo ===
                        'CAMBIO'
                          ? 'Cambio de horario'
                          : 'Cancelación'}
                      </td>

                      <td>
                        {excepcion.tipo ===
                        'CAMBIO'
                          ? `${excepcion.hora_inicio?.substring(
                              0,
                              5
                            )} - ${excepcion.hora_fin?.substring(
                              0,
                              5
                            )}`
                          : '-'}
                      </td>

                      <td>
                        <button
                          onClick={() =>
                            eliminarExcepcion(
                              excepcion.id
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

export default Excepciones