import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Cuidador = {
  id: string
  nombre: string
}

type Horario = {
  id: string
  cuidador_id: string
  dia_semana: number
  hora_inicio: string
  hora_fin: string
}

const diasSemana = [
  { valor: 1, nombre: 'Lunes' },
  { valor: 2, nombre: 'Martes' },
  { valor: 3, nombre: 'Miércoles' },
  { valor: 4, nombre: 'Jueves' },
  { valor: 5, nombre: 'Viernes' },
  { valor: 6, nombre: 'Sábado' },
  { valor: 0, nombre: 'Domingo' },
]

function Horarios() {
  const [cuidadores, setCuidadores] = useState<Cuidador[]>([])
  const [horarios, setHorarios] = useState<Horario[]>([])

  const [cuidadorSeleccionado, setCuidadorSeleccionado] =
    useState('')

  const [diaSemana, setDiaSemana] = useState('')
  const [horaInicio, setHoraInicio] = useState('')
  const [horaFin, setHoraFin] = useState('')

  const [cargandoCuidadores, setCargandoCuidadores] =
    useState(true)

  const [cargandoHorarios, setCargandoHorarios] =
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

  const cargarHorarios = async (
    cuidadorId: string
  ) => {
    setCargandoHorarios(true)
    setError('')

    const { data, error } = await supabase
      .from('horarios_cuidadores')
      .select('*')
      .eq('cuidador_id', cuidadorId)
      .order('dia_semana')
      .order('hora_inicio')

    if (error) {
      setError(error.message)
    } else {
      setHorarios(data ?? [])
    }

    setCargandoHorarios(false)
  }

  const seleccionarCuidador = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const cuidadorId = e.target.value

    setCuidadorSeleccionado(cuidadorId)
    setHorarios([])
    setError('')

    if (cuidadorId) {
      cargarHorarios(cuidadorId)
    }
  }

  const agregarHorario = async (
    e: React.FormEvent
  ) => {
    e.preventDefault()

    setError('')

    if (!cuidadorSeleccionado) {
      setError('Seleccioná un cuidador')
      return
    }

    if (!diaSemana) {
      setError('Seleccioná un día')
      return
    }

    if (!horaInicio || !horaFin) {
      setError(
        'Ingresá hora de inicio y hora de fin'
      )
      return
    }

    if (horaInicio >= horaFin) {
      setError(
        'La hora de inicio debe ser anterior a la hora de fin'
      )
      return
    }

    setGuardando(true)

    const { error } = await supabase
      .from('horarios_cuidadores')
      .insert({
        cuidador_id: cuidadorSeleccionado,
        dia_semana: Number(diaSemana),
        hora_inicio: horaInicio,
        hora_fin: horaFin,
      })

    if (error) {
      setError(error.message)
      setGuardando(false)
      return
    }

    setDiaSemana('')
    setHoraInicio('')
    setHoraFin('')

    await cargarHorarios(
      cuidadorSeleccionado
    )

    setGuardando(false)
  }

  const eliminarHorario = async (
    horarioId: string
  ) => {
    const confirmar = window.confirm(
      '¿Querés eliminar este horario?'
    )

    if (!confirmar) {
      return
    }

    setError('')

    const { error } = await supabase
      .from('horarios_cuidadores')
      .delete()
      .eq('id', horarioId)

    if (error) {
      setError(error.message)
      return
    }

    await cargarHorarios(
      cuidadorSeleccionado
    )
  }

  const obtenerNombreDia = (
    dia: number
  ) => {
    return (
      diasSemana.find(
        (item) => item.valor === dia
      )?.nombre ?? ''
    )
  }

  const cuidadorActual =
    cuidadores.find(
      (cuidador) =>
        cuidador.id ===
        cuidadorSeleccionado
    )

  const horariosPorDia =
    diasSemana
      .map((dia) => ({
        ...dia,
        horarios: horarios.filter(
          (horario) =>
            horario.dia_semana ===
            dia.valor
        ),
      }))
      .filter(
        (dia) => dia.horarios.length > 0
      )

  return (
    <div className="pagina-container">
      <div className="pagina-header">
        <h1>Horarios</h1>

        <p className="pagina-subtitulo">
          Configurá los días y horarios
          habituales de cada cuidador.
        </p>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Seleccionar cuidador</h2>

            <p>
              Elegí el cuidador cuyos horarios
              querés administrar.
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
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>
                  Agregar horario
                </h2>

                <p>
                  {cuidadorActual?.nombre}
                </p>
              </div>
            </div>

            <form
              onSubmit={agregarHorario}
              className="formulario"
            >
              <div className="form-grid">
                <div className="campo">
                  <label htmlFor="diaSemana">
                    Día
                  </label>

                  <select
                    id="diaSemana"
                    value={diaSemana}
                    onChange={(e) =>
                      setDiaSemana(
                        e.target.value
                      )
                    }
                  >
                    <option value="">
                      Seleccioná un día
                    </option>

                    {diasSemana.map(
                      (dia) => (
                        <option
                          key={dia.valor}
                          value={
                            dia.valor
                          }
                        >
                          {dia.nombre}
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div className="campo">
                  <label htmlFor="horaInicio">
                    Hora inicio
                  </label>

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

                <div className="campo">
                  <label htmlFor="horaFin">
                    Hora fin
                  </label>

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
              </div>

              <div className="formulario-acciones">
                <button
                  type="submit"
                  disabled={guardando}
                >
                  {guardando
                    ? 'Guardando...'
                    : 'Agregar horario'}
                </button>
              </div>
            </form>
          </section>

          <section className="seccion-listado">
            <div className="seccion-titulo">
              <div>
                <h2>
                  Horarios habituales
                </h2>

                <p>
                  {horarios.length}{' '}
                  {horarios.length === 1
                    ? 'turno configurado'
                    : 'turnos configurados'}
                </p>
              </div>
            </div>

            {cargandoHorarios ? (
              <div className="estado-vacio">
                <p>
                  Cargando horarios...
                </p>
              </div>
            ) : horarios.length === 0 ? (
              <div className="estado-vacio">
                <div className="estado-icono">
                  ◷
                </div>

                <h3>
                  Sin horarios configurados
                </h3>

                <p>
                  Agregá el primer horario
                  utilizando el formulario
                  de arriba.
                </p>
              </div>
            ) : (
              <div className="horarios-grid">
                {horariosPorDia.map(
                  (dia) => (
                    <article
                      className="dia-card"
                      key={dia.valor}
                    >
                      <div className="dia-card-header">
                        <h3>
                          {dia.nombre}
                        </h3>

                        <span>
                          {
                            dia.horarios
                              .length
                          }{' '}
                          {dia.horarios
                            .length ===
                          1
                            ? 'turno'
                            : 'turnos'}
                        </span>
                      </div>

                      <div className="turnos">
                        {dia.horarios.map(
                          (horario) => (
                            <div
                              className="turno"
                              key={
                                horario.id
                              }
                            >
                              <div className="turno-horario">
                                <span>
                                  {
                                    horario.hora_inicio
                                  }
                                </span>

                                <span className="turno-separador">
                                  →
                                </span>

                                <span>
                                  {
                                    horario.hora_fin
                                  }
                                </span>
                              </div>

                              <button
                                type="button"
                                className="boton-eliminar"
                                onClick={() =>
                                  eliminarHorario(
                                    horario.id
                                  )
                                }
                                aria-label={`Eliminar horario del ${obtenerNombreDia(
                                  horario.dia_semana
                                )}`}
                              >
                                ×
                              </button>
                            </div>
                          )
                        )}
                      </div>
                    </article>
                  )
                )}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

export default Horarios

