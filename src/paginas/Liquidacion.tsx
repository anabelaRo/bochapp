import { useState } from 'react'
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

type Tarifa = {
  id: string
  cuidador_id: string
  vigente_desde: string
  valor_hora: number
  viatico_diario: number
}

type Feriado = {
  id: string
  fecha: string
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

type Turno = {
  horaInicio: string
  horaFin: string
  horas: number
}

type DetalleDia = {
  fecha: string
  diaSemana: string
  turnos: Turno[]
  horas: number
  feriado: boolean
  nombreFeriado: string
  valorHora: number
  viatico: number
  importeHoras: number
  importeViatico: number
  importeTotal: number
}

type ResumenCuidador = {
  cuidador: Cuidador
  horasNormales: number
  horasFeriado: number
  viaticos: number
  total: number
  detalle: DetalleDia[]
}

type Sueldo = {
  sueldo_inicial: number
  fecha_inicio: string
}

type Aumento = {
  fecha: string
  porcentaje: number
}

const nombresDias = [
  'Domingo',
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
]

const nombresMeses = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

function Liquidacion() {
  const fechaActual = new Date()

  const [mes, setMes] = useState(
    fechaActual.getMonth() + 1
  )

  const [anio, setAnio] = useState(
    fechaActual.getFullYear()
  )

  const [resultados, setResultados] = useState<
    ResumenCuidador[]
  >([])

  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [calculado, setCalculado] = useState(false)

  const [cuidadorDetalle, setCuidadorDetalle] =
    useState<string | null>(null)

  const [sueldo, setSueldo] =
    useState<number | null>(null)

  const obtenerCantidadDias = (
    anio: number,
    mes: number
  ) => {
    return new Date(anio, mes, 0).getDate()
  }

  const formatearFecha = (
    anio: number,
    mes: number,
    dia: number
  ) => {
    return `${anio}-${String(mes).padStart(
      2,
      '0'
    )}-${String(dia).padStart(2, '0')}`
  }

  const calcularHoras = (
    horaInicio: string,
    horaFin: string
  ) => {
    const [horaInicioNumero, minutosInicio] =
      horaInicio.split(':').map(Number)

    const [horaFinNumero, minutosFin] =
      horaFin.split(':').map(Number)

    const inicio =
      horaInicioNumero * 60 + minutosInicio

    const fin =
      horaFinNumero * 60 + minutosFin

    return (fin - inicio) / 60
  }

  const obtenerTarifaVigente = (
    tarifas: Tarifa[],
    fecha: string
  ) => {
    const tarifasValidas = tarifas
      .filter(
        (tarifa) =>
          tarifa.vigente_desde <= fecha
      )
      .sort(
        (a, b) =>
          new Date(b.vigente_desde).getTime() -
          new Date(a.vigente_desde).getTime()
      )

    return tarifasValidas[0] ?? null
  }

  const obtenerSueldoParaFecha = (
    sueldoInicial: Sueldo,
    aumentos: Aumento[],
    fecha: string
  ) => {
    let resultado = Number(
      sueldoInicial.sueldo_inicial
    )

    const aumentosAplicables = aumentos
      .filter(
        (aumento) =>
          aumento.fecha <= fecha &&
          aumento.fecha >=
            sueldoInicial.fecha_inicio
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
          Number(aumento.porcentaje) / 100)
    }

    return resultado
  }

  const obtenerSueldoDelMes = async () => {
    const primerDia = formatearFecha(
      anio,
      mes,
      1
    )

    const ultimoDia = formatearFecha(
      anio,
      mes,
      obtenerCantidadDias(anio, mes)
    )

    const {
      data: sueldoData,
      error: errorSueldo,
    } = await supabase
      .from('sueldos')
      .select('*')
      .order('fecha_inicio', {
        ascending: false,
      })
      .limit(1)

    if (errorSueldo) {
      throw new Error(errorSueldo.message)
    }

    const sueldoInicial = sueldoData?.[0]

    if (!sueldoInicial) {
      return null
    }

    const {
      data: aumentosData,
      error: errorAumentos,
    } = await supabase
      .from('aumentos_sueldo')
      .select('*')
      .eq('sueldo_id', sueldoInicial.id)
      .lte('fecha', ultimoDia)

    if (errorAumentos) {
      throw new Error(errorAumentos.message)
    }

    return obtenerSueldoParaFecha(
      sueldoInicial,
      aumentosData ?? [],
      ultimoDia >= primerDia
        ? ultimoDia
        : primerDia
    )
  }

  const calcularLiquidacion = async () => {
    setCargando(true)
    setError('')
    setResultados([])
    setCalculado(false)
    setCuidadorDetalle(null)
    setSueldo(null)

    try {
      const primerDia = formatearFecha(
        anio,
        mes,
        1
      )

      const ultimoDia = formatearFecha(
        anio,
        mes,
        obtenerCantidadDias(anio, mes)
      )

      const {
        data: cuidadores,
        error: errorCuidadores,
      } = await supabase
        .from('cuidadores')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre')

      if (errorCuidadores) {
        throw new Error(errorCuidadores.message)
      }

      const {
        data: horarios,
        error: errorHorarios,
      } = await supabase
        .from('horarios_cuidadores')
        .select('*')

      if (errorHorarios) {
        throw new Error(errorHorarios.message)
      }

      const {
        data: tarifas,
        error: errorTarifas,
      } = await supabase
        .from('tarifas_cuidadores')
        .select('*')
        .lte('vigente_desde', ultimoDia)

      if (errorTarifas) {
        throw new Error(errorTarifas.message)
      }

      const {
        data: feriados,
        error: errorFeriados,
      } = await supabase
        .from('feriados')
        .select('*')
        .gte('fecha', primerDia)
        .lte('fecha', ultimoDia)

      if (errorFeriados) {
        throw new Error(errorFeriados.message)
      }

      const {
        data: excepciones,
        error: errorExcepciones,
      } = await supabase
        .from('excepciones_horarios')
        .select('*')
        .gte('fecha', primerDia)
        .lte('fecha', ultimoDia)

      if (errorExcepciones) {
        throw new Error(errorExcepciones.message)
      }

      const sueldoDelMes =
        await obtenerSueldoDelMes()

      setSueldo(sueldoDelMes)

      const resultadosCalculados: ResumenCuidador[] =
        []

      for (const cuidador of cuidadores ?? []) {
        const horariosCuidador =
          (horarios ?? []).filter(
            (horario: Horario) =>
              horario.cuidador_id === cuidador.id
          )

        const tarifasCuidador =
          (tarifas ?? []).filter(
            (tarifa: Tarifa) =>
              tarifa.cuidador_id === cuidador.id
          )

        const excepcionesCuidador =
          (excepciones ?? []).filter(
            (excepcion: Excepcion) =>
              excepcion.cuidador_id ===
              cuidador.id
          )

        const detalle: DetalleDia[] = []

        let horasNormales = 0
        let horasFeriado = 0
        let viaticos = 0
        let total = 0

        const cantidadDias =
          obtenerCantidadDias(anio, mes)

        for (
          let dia = 1;
          dia <= cantidadDias;
          dia++
        ) {
          const fecha = new Date(
            anio,
            mes - 1,
            dia
          )

          const numeroDiaSemana =
            fecha.getDay()

          const fechaTexto = formatearFecha(
            anio,
            mes,
            dia
          )

          const excepcionesDelDia =
            excepcionesCuidador.filter(
              (excepcion) =>
                excepcion.fecha ===
                fechaTexto
            )

          let turnos: Turno[] = []

          if (excepcionesDelDia.length > 0) {
            const cancelacion =
              excepcionesDelDia.find(
                (excepcion) =>
                  excepcion.tipo ===
                  'CANCELACION'
              )

            if (cancelacion) {
              turnos = []
            } else {
              turnos =
                excepcionesDelDia
                  .filter(
                    (excepcion) =>
                      excepcion.tipo ===
                      'CAMBIO'
                  )
                  .map((excepcion) => ({
                    horaInicio:
                      excepcion.hora_inicio!,
                    horaFin:
                      excepcion.hora_fin!,
                    horas: calcularHoras(
                      excepcion.hora_inicio!,
                      excepcion.hora_fin!
                    ),
                  }))
            }
          } else {
            const horariosDelDia =
              horariosCuidador.filter(
                (horario: Horario) =>
                  horario.dia_semana ===
                  numeroDiaSemana
              )

            turnos = horariosDelDia.map(
              (horario: Horario) => ({
                horaInicio:
                  horario.hora_inicio,
                horaFin:
                  horario.hora_fin,
                horas: calcularHoras(
                  horario.hora_inicio,
                  horario.hora_fin
                ),
              })
            )
          }

          if (turnos.length === 0) {
            continue
          }

          const feriado = (
            feriados ?? []
          ).find(
            (item: Feriado) =>
              item.fecha === fechaTexto
          )

          const tarifa =
            obtenerTarifaVigente(
              tarifasCuidador,
              fechaTexto
            )

          if (!tarifa) {
            throw new Error(
              `El cuidador ${cuidador.nombre} no tiene una tarifa vigente para ${fechaTexto}.`
            )
          }

          const horasTotales =
            turnos.reduce(
              (sum, turno) =>
                sum + turno.horas,
              0
            )

          const importeHoras =
            horasTotales *
            Number(tarifa.valor_hora) *
            (feriado ? 2 : 1)

          const importeViatico =
            Number(tarifa.viatico_diario)

          const importeTotal =
            importeHoras + importeViatico

          if (feriado) {
            horasFeriado += horasTotales
          } else {
            horasNormales += horasTotales
          }

          viaticos += importeViatico
          total += importeTotal

          detalle.push({
            fecha: fechaTexto,
            diaSemana:
              nombresDias[numeroDiaSemana],
            turnos,
            horas: horasTotales,
            feriado: Boolean(feriado),
            nombreFeriado:
              feriado?.nombre ?? '',
            valorHora:
              Number(tarifa.valor_hora),
            viatico: importeViatico,
            importeHoras,
            importeViatico,
            importeTotal,
          })
        }

        resultadosCalculados.push({
          cuidador,
          horasNormales,
          horasFeriado,
          viaticos,
          total,
          detalle,
        })
      }

      setResultados(resultadosCalculados)
      setCalculado(true)
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Ocurrió un error al calcular la liquidación.'
      )
    } finally {
      setCargando(false)
    }
  }

  const totalConsolidado = resultados.reduce(
    (total, resultado) =>
      total + resultado.total,
    0
  )

  const diferencia =
    sueldo !== null
      ? sueldo - totalConsolidado
      : null

  const sueldoAlcanza =
    diferencia !== null && diferencia >= 0

  const formatearMonto = (monto: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      maximumFractionDigits: 2,
    }).format(monto)
  }

  const mostrarDetalle = (
    cuidadorId: string
  ) => {
    if (cuidadorDetalle === cuidadorId) {
      setCuidadorDetalle(null)
    } else {
      setCuidadorDetalle(cuidadorId)
    }
  }

  return (
    <div
      style={{
        maxWidth: '1100px',
        margin: '0 auto',
        padding: '20px',
        boxSizing: 'border-box',
      }}
    >
      <h1
        style={{
          marginBottom: '24px',
        }}
      >
        Liquidación
      </h1>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div>
          <label
            htmlFor="mes"
            style={{
              display: 'block',
              marginBottom: '6px',
              fontWeight: '600',
            }}
          >
            Mes
          </label>

          <select
            id="mes"
            value={mes}
            onChange={(e) =>
              setMes(Number(e.target.value))
            }
            style={{
              padding: '10px',
              minWidth: '160px',
            }}
          >
            {nombresMeses.map(
              (nombre, indice) => (
                <option
                  key={indice + 1}
                  value={indice + 1}
                >
                  {nombre}
                </option>
              )
            )}
          </select>
        </div>

        <div>
          <label
            htmlFor="anio"
            style={{
              display: 'block',
              marginBottom: '6px',
              fontWeight: '600',
            }}
          >
            Año
          </label>

          <select
            id="anio"
            value={anio}
            onChange={(e) =>
              setAnio(Number(e.target.value))
            }
            style={{
              padding: '10px',
              minWidth: '120px',
            }}
          >
            {Array.from(
              { length: 5 },
              (_, indice) =>
                fechaActual.getFullYear() -
                2 +
                indice
            ).map((anioDisponible) => (
              <option
                key={anioDisponible}
                value={anioDisponible}
              >
                {anioDisponible}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={calcularLiquidacion}
        disabled={cargando}
        style={{
          padding: '12px 18px',
          marginBottom: '20px',
          cursor: cargando
            ? 'default'
            : 'pointer',
        }}
      >
        {cargando
          ? 'Calculando...'
          : 'Calcular liquidación'}
      </button>

      {error && (
        <div
          style={{
            padding: '12px',
            marginBottom: '20px',
            border: '1px solid #cc0000',
            borderRadius: '6px',
          }}
        >
          {error}
        </div>
      )}

      {calculado && (
        <>
          <div
            style={{
              marginTop: '20px',
              marginBottom: '24px',
              padding: '20px',
              borderRadius: '10px',
              border:
                sueldo !== null
                  ? `2px solid ${
                      sueldoAlcanza
                        ? '#198754'
                        : '#dc3545'
                    }`
                  : '1px solid #ddd',
              backgroundColor:
                sueldo !== null
                  ? sueldoAlcanza
                    ? '#f0fff4'
                    : '#fff5f5'
                  : 'transparent',
            }}
          >
            <div
              style={{
                fontSize: '14px',
                marginBottom: '8px',
              }}
            >
              Total de la liquidación
            </div>

            <div
              style={{
                fontSize: '28px',
                fontWeight: '700',
                marginBottom: '16px',
              }}
            >
              {formatearMonto(
                totalConsolidado
              )}
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                marginBottom:
                  sueldo !== null
                    ? '16px'
                    : '0',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '13px',
                    marginBottom: '5px',
                  }}
                >
                  Sueldo disponible
                </div>

                <strong>
                  {sueldo !== null
                    ? formatearMonto(sueldo)
                    : 'No configurado'}
                </strong>
              </div>

              <div>
                <div
                  style={{
                    fontSize: '13px',
                    marginBottom: '5px',
                  }}
                >
                  Diferencia
                </div>

                <strong>
                  {diferencia !== null
                    ? formatearMonto(
                        Math.abs(diferencia)
                      )
                    : '-'}
                </strong>
              </div>
            </div>

            {sueldo !== null && (
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: '600',
                }}
              >
                {sueldoAlcanza
                  ? '✓ El sueldo alcanza para cubrir la liquidación.'
                  : '⚠ La liquidación supera el sueldo disponible.'}
              </div>
            )}

            <div
              style={{
                marginTop: '12px',
                fontSize: '16px',
              }}
            >
              {nombresMeses[mes - 1]} {anio}
            </div>
          </div>

          <h2
            style={{
              marginBottom: '16px',
            }}
          >
            Cuidadores
          </h2>

          <p
            style={{
              marginBottom: '20px',
            }}
          >
            {resultados.length} cuidadores
          </p>

          {resultados.length === 0 ? (
            <p>
              No hay cuidadores activos.
            </p>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              {resultados.map(
                (resultado) => (
                  <div
                    key={
                      resultado.cuidador.id
                    }
                    style={{
                      border: '1px solid #ddd',
                      borderRadius: '10px',
                      padding: '18px',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent:
                          'space-between',
                        alignItems:
                          'flex-start',
                        gap: '16px',
                        flexWrap: 'wrap',
                        marginBottom: '20px',
                      }}
                    >
                      <div>
                        <h3
                          style={{
                            margin:
                              '0 0 8px 0',
                          }}
                        >
                          {
                            resultado
                              .cuidador
                              .nombre
                          }
                        </h3>

                        <div
                          style={{
                            fontSize: '15px',
                          }}
                        >
                          {resultado.horasNormales +
                            resultado.horasFeriado}{' '}
                          horas trabajadas
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: '22px',
                          fontWeight: '700',
                          whiteSpace:
                            'nowrap',
                        }}
                      >
                        {formatearMonto(
                          resultado.total
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          'repeat(auto-fit, minmax(140px, 1fr))',
                        gap: '12px',
                        marginBottom: '18px',
                      }}
                    >
                      <div
                        style={{
                          padding: '12px',
                          borderRadius: '8px',
                          border:
                            '1px solid #eee',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '13px',
                            marginBottom: '6px',
                          }}
                        >
                          Normales
                        </div>

                        <strong>
                          {
                            resultado.horasNormales
                          }{' '}
                          hs
                        </strong>
                      </div>

                      <div
                        style={{
                          padding: '12px',
                          borderRadius: '8px',
                          border:
                            '1px solid #eee',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '13px',
                            marginBottom: '6px',
                          }}
                        >
                          Feriado
                        </div>

                        <strong>
                          {
                            resultado.horasFeriado
                          }{' '}
                          hs
                        </strong>
                      </div>

                      <div
                        style={{
                          padding: '12px',
                          borderRadius: '8px',
                          border:
                            '1px solid #eee',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '13px',
                            marginBottom: '6px',
                          }}
                        >
                          Viáticos
                        </div>

                        <strong>
                          {formatearMonto(
                            resultado.viaticos
                          )}
                        </strong>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        mostrarDetalle(
                          resultado
                            .cuidador
                            .id
                        )
                      }
                      style={{
                        width: '100%',
                        padding: '11px',
                      }}
                    >
                      {cuidadorDetalle ===
                      resultado.cuidador.id
                        ? 'Ocultar detalle'
                        : 'Ver detalle'}
                    </button>

                    {cuidadorDetalle ===
                      resultado.cuidador.id && (
                      <div
                        style={{
                          marginTop: '20px',
                          paddingTop: '20px',
                          borderTop:
                            '1px solid #ddd',
                        }}
                      >
                        <h3
                          style={{
                            marginBottom:
                              '16px',
                          }}
                        >
                          Detalle —{' '}
                          {
                            resultado
                              .cuidador
                              .nombre
                          }
                        </h3>

                        {resultado.detalle.length ===
                        0 ? (
                          <p>
                            No hay turnos
                            registrados
                            para este
                            cuidador en
                            el mes.
                          </p>
                        ) : (
                          <div
                            style={{
                              display:
                                'flex',
                              flexDirection:
                                'column',
                              gap: '12px',
                            }}
                          >
                            {resultado.detalle.map(
                              (
                                item,
                                indice
                              ) => (
                                <div
                                  key={`${item.fecha}-${indice}`}
                                  style={{
                                    padding:
                                      '14px',
                                    border:
                                      '1px solid #eee',
                                    borderRadius:
                                      '8px',
                                  }}
                                >
                                  <div
                                    style={{
                                      display:
                                        'flex',
                                      justifyContent:
                                        'space-between',
                                      gap: '12px',
                                      flexWrap:
                                        'wrap',
                                      marginBottom:
                                        '12px',
                                    }}
                                  >
                                    <strong>
                                      {item.fecha}
                                    </strong>

                                    <span>
                                      {
                                        item.diaSemana
                                      }
                                    </span>
                                  </div>

                                  <div
                                    style={{
                                      marginBottom:
                                        '12px',
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontSize:
                                          '13px',
                                        marginBottom:
                                          '5px',
                                      }}
                                    >
                                      Horario
                                    </div>

                                    <div>
                                      {item.turnos.map(
                                        (
                                          turno,
                                          turnoIndex
                                        ) => (
                                          <div
                                            key={
                                              turnoIndex
                                            }
                                            style={{
                                              marginBottom:
                                                '4px',
                                            }}
                                          >
                                            {
                                              turno.horaInicio
                                            }{' '}
                                            -{' '}
                                            {
                                              turno.horaFin
                                            }
                                          </div>
                                        )
                                      )}
                                    </div>
                                  </div>

                                  <div
                                    style={{
                                      display:
                                        'grid',
                                      gridTemplateColumns:
                                        'repeat(auto-fit, minmax(140px, 1fr))',
                                      gap: '10px',
                                    }}
                                  >
                                    <div>
                                      <div
                                        style={{
                                          fontSize:
                                            '12px',
                                          marginBottom:
                                            '4px',
                                        }}
                                      >
                                        Horas
                                      </div>

                                      <strong>
                                        {
                                          item.horas
                                        }{' '}
                                        hs
                                      </strong>
                                    </div>

                                    <div>
                                      <div
                                        style={{
                                          fontSize:
                                            '12px',
                                          marginBottom:
                                            '4px',
                                        }}
                                      >
                                        Feriado
                                      </div>

                                      <strong>
                                        {item.feriado
                                          ? item.nombreFeriado
                                          : 'No'}
                                      </strong>
                                    </div>

                                    <div>
                                      <div
                                        style={{
                                          fontSize:
                                            '12px',
                                          marginBottom:
                                            '4px',
                                        }}
                                      >
                                        Valor hora
                                      </div>

                                      <strong>
                                        {formatearMonto(
                                          item.valorHora
                                        )}
                                      </strong>
                                    </div>

                                    <div>
                                      <div
                                        style={{
                                          fontSize:
                                            '12px',
                                          marginBottom:
                                            '4px',
                                        }}
                                      >
                                        Viático
                                      </div>

                                      <strong>
                                        {formatearMonto(
                                          item.viatico
                                        )}
                                      </strong>
                                    </div>

                                    <div>
                                      <div
                                        style={{
                                          fontSize:
                                            '12px',
                                          marginBottom:
                                            '4px',
                                        }}
                                      >
                                        Importe horas
                                      </div>

                                      <strong>
                                        {formatearMonto(
                                          item.importeHoras
                                        )}
                                      </strong>
                                    </div>

                                    <div>
                                      <div
                                        style={{
                                          fontSize:
                                            '12px',
                                          marginBottom:
                                            '4px',
                                        }}
                                      >
                                        Total
                                      </div>

                                      <strong>
                                        {formatearMonto(
                                          item.importeTotal
                                        )}
                                      </strong>
                                    </div>
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Liquidacion
