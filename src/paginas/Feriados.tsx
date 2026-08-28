import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Feriado = {
  id: string
  fecha: string
  nombre: string
}

function Feriados() {
  const [feriados, setFeriados] = useState<Feriado[]>([])

  const [fecha, setFecha] = useState('')
  const [nombre, setNombre] = useState('')

  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const cargarFeriados = async () => {
    setCargando(true)
    setError('')

    const { data, error } = await supabase
      .from('feriados')
      .select('*')
      .order('fecha')

    if (error) {
      setError(error.message)
    } else {
      setFeriados(data ?? [])
    }

    setCargando(false)
  }

  useEffect(() => {
    cargarFeriados()
  }, [])

  const agregarFeriado = async (
    e: React.FormEvent
  ) => {
    e.preventDefault()

    setError('')

    if (!fecha) {
      setError('Ingresá la fecha del feriado')
      return
    }

    if (!nombre.trim()) {
      setError('Ingresá el nombre del feriado')
      return
    }

    setGuardando(true)

    const { error } = await supabase
      .from('feriados')
      .insert({
        fecha,
        nombre: nombre.trim(),
      })

    if (error) {
      if (error.code === '23505') {
        setError(
          'Ya existe un feriado para esa fecha.'
        )
      } else {
        setError(error.message)
      }

      setGuardando(false)
      return
    }

    setFecha('')
    setNombre('')

    await cargarFeriados()

    setGuardando(false)
  }

  const eliminarFeriado = async (
    feriadoId: string
  ) => {
    const confirmar = window.confirm(
      '¿Querés eliminar este feriado?'
    )

    if (!confirmar) {
      return
    }

    setError('')

    const { error } = await supabase
      .from('feriados')
      .delete()
      .eq('id', feriadoId)

    if (error) {
      setError(error.message)
      return
    }

    await cargarFeriados()
  }

  return (
    <div>
      <h1>Feriados</h1>

      <h2>Agregar feriado</h2>

      <form onSubmit={agregarFeriado}>
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
          <label htmlFor="nombre">
            Nombre
          </label>

          <br />

          <input
            id="nombre"
            type="text"
            value={nombre}
            onChange={(e) =>
              setNombre(e.target.value)
            }
            placeholder="Nombre del feriado"
          />
        </div>

        {error && <p>{error}</p>}

        <button
          type="submit"
          disabled={guardando}
        >
          {guardando
            ? 'Guardando...'
            : 'Agregar feriado'}
        </button>
      </form>

      <hr />

      <h2>Feriados registrados</h2>

      {cargando ? (
        <p>Cargando feriados...</p>
      ) : feriados.length === 0 ? (
        <p>No hay feriados cargados.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Nombre</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {feriados.map((feriado) => (
              <tr key={feriado.id}>
                <td>{feriado.fecha}</td>

                <td>{feriado.nombre}</td>

                <td>
                  <button
                    onClick={() =>
                      eliminarFeriado(
                        feriado.id
                      )
                    }
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default Feriados