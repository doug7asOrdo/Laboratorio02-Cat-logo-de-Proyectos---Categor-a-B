import { obtenerDatos } from '../api.js';
import { crearElemento, mostrarError, crearAvisoCache, mostrarAvisoReintento } from '../helper.js';
import { fechaDeCache } from '../storage.js';

const selectEl = document.getElementById('matriz-select-grupo');
const contenedorEl = document.getElementById('matriz-tabla-contenedor');

let mapaEquipos = {};
let gruposPorLetra = {};
let celdasPorParPartido = {};

export async function iniciarMatriz() {
  contenedorEl.innerHTML = 'Cargando grupos y equipos...';

  let grupos;
  let equipos;
  try {
    const respuestaGrupos = await obtenerDatos('/get/groups', {
      onReintento: (codigo, esperaMs) => mostrarAvisoReintento(contenedorEl, codigo, esperaMs),
    });
    grupos = respuestaGrupos.datos.groups || respuestaGrupos.datos;

    const respuestaEquipos = await obtenerDatos('/get/teams', {
      onReintento: (codigo, esperaMs) => mostrarAvisoReintento(contenedorEl, codigo, esperaMs),
    });
    equipos = respuestaEquipos.datos.teams || respuestaEquipos.datos;
  } catch (error) {
    mostrarError(contenedorEl, 'No se pudieron cargar los grupos o los equipos.');
    return;
  }

  mapaEquipos = {};
  for (const equipo of equipos) mapaEquipos[equipo.id] = equipo;

  gruposPorLetra = {};

  for (const grupo of grupos) gruposPorLetra[grupo.name] = grupo;//API real ussa el campo name para la letra de grupo

  selectEl.innerHTML = '';
  for (const letra of Object.keys(gruposPorLetra).sort()) {
    const opcion = crearElemento('option', null, `Grupo ${letra}`);
    opcion.value = letra;
    selectEl.appendChild(opcion);
  }

  selectEl.addEventListener('change', () => renderizarMatriz(selectEl.value));
  renderizarMatriz(selectEl.value);
}

async function renderizarMatriz(letraGrupo) {
  const grupo = gruposPorLetra[letraGrupo];
  const equiposDelGrupo = grupo.teams.map((t) => mapaEquipos[t.team_id]);

  contenedorEl.innerHTML = '';
  celdasPorParPartido = {};

  const avisoEl = crearElemento('div');
  contenedorEl.appendChild(avisoEl);

  const tabla = construirTablaVacia(equiposDelGrupo);
  contenedorEl.appendChild(tabla);


  // se pasa onReintento para que, si la API responde 429 o 500, el
  // usuario vea el countdown del backoff exponencial en avisoEl, en
  // vez de que la espera ocurra en silencio sin nada visual.
  await cargarResultados(letraGrupo, avisoEl);
}

// Pide /get/games y actualiza la matriz. Si falla (sin caché disponible),
// pinta el error junto con un botón de reintento que vuelve a llamar
// esta misma función — así, sin importar cuántas veces falle seguidas,
// SIEMPRE queda un botón visible para volver a intentarlo.
async function cargarResultados(letraGrupo, avisoEl) {
  try {
    const respuesta = await obtenerDatos('/get/games', {
      onReintento: (codigo, esperaMs) => mostrarAvisoReintento(avisoEl, codigo, esperaMs),
    });
    const juegos = respuesta.datos.games || respuesta.datos;
    actualizarCeldasConResultados(juegos, letraGrupo);

    avisoEl.innerHTML = '';
    if (respuesta.desdeCache) {
      avisoEl.appendChild(crearAvisoCache(fechaDeCache('/get/games')));
    }
  } catch (error) {
    avisoEl.innerHTML = '';
    const aviso = crearElemento('p', 'aviso-error', '⚠ No se pudieron cargar los resultados. La matriz queda en "Pendiente".');
    const botonReintentar = crearElemento('button', 'sede-boton', 'Reintentar resultados');
    botonReintentar.addEventListener('click', () => cargarResultados(letraGrupo, avisoEl));
    avisoEl.appendChild(botonReintentar);
    avisoEl.appendChild(aviso);
  }
}

function construirTablaVacia(equiposDelGrupo) {
  const tabla = crearElemento('table', 'matriz-tabla');

  const filaCabecera = crearElemento('tr');
  filaCabecera.appendChild(crearElemento('th', null, ''));
  for (const equipo of equiposDelGrupo) {
    filaCabecera.appendChild(crearElemento('th', null, equipo ? equipo.fifa_code : '?'));
  }
  tabla.appendChild(filaCabecera);

  for (const equipoFila of equiposDelGrupo) {
    const fila = crearElemento('tr');
    fila.appendChild(crearElemento('th', null, equipoFila ? equipoFila.fifa_code : '?'));

    for (const equipoColumna of equiposDelGrupo) {
      const esDiagonal = equipoFila && equipoColumna && equipoFila.id === equipoColumna.id;
      const celda = crearElemento('td', esDiagonal ? 'diagonal' : null, esDiagonal ? '—' : 'Pendiente');
      fila.appendChild(celda);

      if (!esDiagonal && equipoFila && equipoColumna) {
        const clave = [equipoFila.id, equipoColumna.id].sort().join('-');
        if (!celdasPorParPartido[clave]) celdasPorParPartido[clave] = [];
        celdasPorParPartido[clave].push(celda);
      }
    }
    tabla.appendChild(fila);
  }

  return tabla;
}

function actualizarCeldasConResultados(juegos, letraGrupo) {
  const juegosDelGrupo = juegos.filter((j) => j.group === letraGrupo);
  for (const juego of juegosDelGrupo) {
    const clave = [juego.home_team_id, juego.away_team_id].sort().join('-');
    const celdas = celdasPorParPartido[clave];
    if (!celdas) continue;

    const textoResultado = juego.finished === 'TRUE'
      ? `${juego.home_score} - ${juego.away_score}`
      : 'Pendiente';

    for (const celda of celdas) {
      celda.textContent = textoResultado;
    }
  }
}