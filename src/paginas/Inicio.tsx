type InicioProps = {
  irACuidadores: () => void
  irATarifas: () => void
  irAHorarios: () => void
  irAFeriados: () => void
  irAExcepciones: () => void
  irALiquidacion: () => void
  irASueldo: () => void
}

type AccesoProps = {
  titulo: string
  descripcion: string
  icono: string
  onClick: () => void
}

function Acceso({
  titulo,
  descripcion,
  icono,
  onClick,
}: AccesoProps) {
  return (
    <button
      className="inicio-acceso"
      onClick={onClick}
    >
      <span className="inicio-acceso-icono">
        {icono}
      </span>

      <span className="inicio-acceso-contenido">
        <span className="inicio-acceso-titulo">
          {titulo}
        </span>

        <span className="inicio-acceso-descripcion">
          {descripcion}
        </span>
      </span>
    </button>
  )
}

function Inicio({
  irACuidadores,
  irATarifas,
  irAHorarios,
  irAFeriados,
  irAExcepciones,
  irALiquidacion,
  irASueldo,
}: InicioProps) {
  return (
    <div className="inicio-container">
      <div className="inicio-header">
        <h1>Pago de Cuidadores</h1>

        <p className="inicio-subtitle">
          Gestión de cuidadores y liquidaciones
        </p>
      </div>

      <div className="inicio-accesos">
        <Acceso
          titulo="Liquidación"
          descripcion="Calcular el pago mensual"
          icono="$"
          onClick={irALiquidacion}
        />

        <Acceso
          titulo="Sueldo"
          descripcion="Configurar sueldo y aumentos"
          icono="%"
          onClick={irASueldo}
        />

        <Acceso
          titulo="Cuidadores"
          descripcion="Administrar cuidadores"
          icono="♙"
          onClick={irACuidadores}
        />

        <Acceso
          titulo="Tarifas"
          descripcion="Configurar valores por hora"
          icono="▤"
          onClick={irATarifas}
        />

        <Acceso
          titulo="Horarios"
          descripcion="Configurar horarios habituales"
          icono="◷"
          onClick={irAHorarios}
        />

        <Acceso
          titulo="Excepciones"
          descripcion="Cambios y cancelaciones"
          icono="!"
          onClick={irAExcepciones}
        />

        <Acceso
          titulo="Feriados"
          descripcion="Administrar días feriados"
          icono="▣"
          onClick={irAFeriados}
        />
      </div>
    </div>
  )
}

export default Inicio