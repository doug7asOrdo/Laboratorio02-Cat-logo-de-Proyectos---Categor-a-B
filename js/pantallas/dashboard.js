import { obtenerDatos } from '../api.js';
import { crearElemento, mostrarError, crearAvisoCache, mostrarAvisoReintento } from '../helper.js';
import { guardarEquipoFavorito, leerEquipoFavorito, fechaDeCache } from '../storage.js';

const selectEl = document.getElementById('dashboard-select-equipo');
const contenidoEl = document.getElementById('dashboard-contenido');

// Una paleta pequeña y fija de acentos lo se elige uno según el id del equipo para que cadamismo color.
const PALETA_ACENTOS = ['#d4a24c', '#4c86d4', '#4cd48f', '#d44c6d', '#a44cd4', '#d4a24c'];

export async function iniciarDashboard() {
  selectEl.innerHTML = '<option>Cargando equipos...</option>';

  let equipos;
  try {
    const respuesta = await obtenerDatos('/get/teams', {
      onReintento: (codigo, esperaMs) => mostrarAvisoReintento(contenidoEl, codigo, esperaMs),
    });
    equipos = respuesta.datos.teams || respuesta.datos;
  } catch (error) {
    mostrarError(contenidoEl, 'No se pudo cargar la lista de equipos.');
    return;
  }

  selectEl.innerHTML = '';
  for (const equipo of equipos) {
    const opcion = crearElemento('option', null, equipo.name_en);
    opcion.value = equipo.id;
    selectEl.appendChild(opcion);
  }

  const favoritoGuardado = leerEquipoFavorito();
  if (favoritoGuardado) {
    selectEl.value = favoritoGuardado;
  }

  selectEl.addEventListener('change', () => {
    guardarEquipoFavorito(selectEl.value);
    renderizarDashboard(selectEl.value, equipos);
  });

  renderizarDashboard(selectEl.value, equipos);//pinta dash del equipo select fav o save
}

async function renderizarDashboard(equipoId, equipos) {
  aplicarColorDeAcento(equipoId);
  contenidoEl.innerHTML = 'Cargando datos del equipo...';

  const equipo = equipos.find((e) => e.id === equipoId);

  let respuestaJuegos;
  let respuestaGrupos;
  try {
    respuestaJuegos = await obtenerDatos('/get/games', {
      onReintento: (codigo, esperaMs) => mostrarAvisoReintento(contenidoEl, codigo, esperaMs),
    });
    respuestaGrupos = await obtenerDatos('/get/groups', {
      onReintento: (codigo, esperaMs) => mostrarAvisoReintento(contenidoEl, codigo, esperaMs),
    });
  } catch (error) {

    mostrarError(contenidoEl, 'No hay datos disponibles (ni en línea ni guardados) para este equipo.');
    return;
  }

  contenidoEl.innerHTML = '';

  if (respuestaJuegos.desdeCache || respuestaGrupos.desdeCache) {
    contenidoEl.appendChild(crearAvisoCache(fechaDeCache('/get/games')));
  }

  const juegos = respuestaJuegos.datos.games || respuestaJuegos.datos;
  const grupos = respuestaGrupos.datos.groups || respuestaGrupos.datos;

  contenidoEl.appendChild(crearElemento('h3', null, equipo ? equipo.name_en : 'Equipo'));

  // --- Partidos del equipo ---
  const partidosDelEquipo = juegos.filter(
    (j) => j.home_team_id === equipoId || j.away_team_id === equipoId
  );
  contenidoEl.appendChild(crearElemento('h4', null, 'Sus partidos'));
  if (partidosDelEquipo.length === 0) {
    contenidoEl.appendChild(crearElemento('p', null, 'Aún no tiene partidos asignados.'));
  }
  for (const partido of partidosDelEquipo) {
    contenidoEl.appendChild(
      crearElemento(
        'div',
        'tarjeta-partido',
        `${partido.local_date} — ${partido.home_team_name_en || partido.home_team_label} vs ${partido.away_team_name_en || partido.away_team_label}`
      )
    );
  }

  // --- Posición en el grupo ---
  const grupoDelEquipo = grupos.find((g) =>
    g.teams.some((t) => t.team_id === equipoId)
  );
  contenidoEl.appendChild(crearElemento('h4', null, 'Posición en su grupo'));
  if (grupoDelEquipo) {
    const filaEquipo = grupoDelEquipo.teams.find((t) => t.team_id === equipoId);
    contenidoEl.appendChild(
      crearElemento(
        'p',
        null,
        `Grupo ${grupoDelEquipo.name} · Puntos: ${filaEquipo.pts} · Goles a favor: ${filaEquipo.gf} · Goles en contra: ${filaEquipo.ga}`
      )
    );
  } else {
    contenidoEl.appendChild(crearElemento('p', null, 'No se encontró información de grupo.'));
  }
}

function aplicarColorDeAcento(equipoId) {
  const idNumerico = String(equipoId)
    .split('')
    .reduce((suma, caracter) => suma + caracter.charCodeAt(0), 0);
  const color = PALETA_ACENTOS[idNumerico % PALETA_ACENTOS.length];
  document.documentElement.style.setProperty('--acento', color);
}