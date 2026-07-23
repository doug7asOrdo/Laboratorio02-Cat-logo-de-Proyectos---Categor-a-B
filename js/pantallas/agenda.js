import { obtenerDatos } from '../api.js';
import { crearElemento, mostrarAvisoReintento } from '../helper.js';

const columnasEl = document.getElementById('agenda-columnas');
const fechaActualEl = document.getElementById('agenda-fecha-actual');
const botonAnteriorEl = document.getElementById('agenda-anterior');
const botonSiguienteEl = document.getElementById('agenda-siguiente');

// Estado propio de esta pantalla.
let fechasConVariosPartidos = [];
let mapaEquipos = {};
let indiceActual = 0;

export async function iniciarAgenda() {
  pintarEsqueletos();

  let juegos;
  let equipos;
  try {
    const respuestaEquipos = await obtenerDatos('/get/teams', {
      onReintento: (codigo, esperaMs) => mostrarAvisoReintento(columnasEl, codigo, esperaMs),
    });
    equipos = respuestaEquipos.datos.teams || respuestaEquipos.datos;

    const respuestaJuegos = await obtenerDatos('/get/games', {
      onReintento: (codigo, esperaMs) => mostrarAvisoReintento(columnasEl, codigo, esperaMs),
    });
    juegos = respuestaJuegos.datos.games || respuestaJuegos.datos;
  } catch (error) {
    pintarEsqueletos();
    fechaActualEl.textContent = 'Sin datos disponibles por ahora';
    return;
  }

  mapaEquipos = indexarPorId(equipos);
  fechasConVariosPartidos = agruparYFiltrarFechasSimultaneas(juegos);

  botonAnteriorEl.addEventListener('click', () => cambiarFecha(-1));
  botonSiguienteEl.addEventListener('click', () => cambiarFecha(1));

  indiceActual = 0;
  renderizarFechaActual();
}

function indexarPorId(equipos) {
  const mapa = {};
  for (const equipo of equipos) mapa[equipo.id] = equipo;
  return mapa;
}

function agruparYFiltrarFechasSimultaneas(juegos) {
  const porFecha = {};
  for (const juego of juegos) {
    const soloFecha = juego.local_date.split(' ')[0];
    if (!porFecha[soloFecha]) porFecha[soloFecha] = [];
    porFecha[soloFecha].push(juego);
  }

  return Object.entries(porFecha)
    .filter(([, listaJuegos]) => listaJuegos.length >= 2)
    .sort((a, b) => {
      return a[0].localeCompare(b[0]);
    })
    .map(([fecha, listaJuegos]) => ({ fecha, listaJuegos }));
}

function cambiarFecha(direccion) {
  const nuevoIndice = indiceActual + direccion;
  if (nuevoIndice < 0 || nuevoIndice >= fechasConVariosPartidos.length) return;
  indiceActual = nuevoIndice;
  renderizarFechaActual();
}

function renderizarFechaActual() {
  if (fechasConVariosPartidos.length === 0) {
    fechaActualEl.textContent = 'No hay fechas con partidos simultáneos';
    columnasEl.innerHTML = '';
    return;
  }

  const { fecha, listaJuegos } = fechasConVariosPartidos[indiceActual];
  fechaActualEl.textContent = fecha;

  botonAnteriorEl.disabled = indiceActual === 0;
  botonSiguienteEl.disabled = indiceActual === fechasConVariosPartidos.length - 1;

  columnasEl.innerHTML = '';
  for (const juego of listaJuegos) {
    const local = mapaEquipos[juego.home_team_id];
    const visitante = mapaEquipos[juego.away_team_id];

    const columna = crearElemento('div', 'agenda-columna');
    columna.appendChild(
      crearElemento('h3', null, `${local ? local.name_en : juego.home_team_label} vs ${visitante ? visitante.name_en : juego.away_team_label}`)
    );
    columna.appendChild(crearElemento('p', null, `Grupo ${juego.group} · Estadio ${juego.stadium_id}`));
    columna.appendChild(
      crearElemento('p', null, juego.finished === 'TRUE'
        ? `Resultado: ${juego.home_score} - ${juego.away_score}`
        : 'Aún no se ha jugado')
    );
    columnasEl.appendChild(columna);
  }
}

function pintarEsqueletos() {
  columnasEl.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const columna = crearElemento('div', 'agenda-columna');
    columna.appendChild(crearElemento('div', 'esqueleto'));
    columna.appendChild(crearElemento('div', 'esqueleto'));
    columna.appendChild(crearElemento('div', 'esqueleto'));
    columnasEl.appendChild(columna);
  }
  fechaActualEl.textContent = 'Cargando...';
}