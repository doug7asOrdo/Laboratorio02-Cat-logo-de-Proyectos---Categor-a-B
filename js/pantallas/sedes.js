import { obtenerDatos } from '../api.js';
import { crearElemento, mostrarError, crearAvisoCache, mostrarAvisoReintento } from '../helper.js';
import { fechaDeCache } from '../storage.js';

const listaSedesEl = document.getElementById('sedes-lista');
const contenedorPartidosEl = document.getElementById('sedes-partidos-contenedor');

export async function iniciarSedes() {
  listaSedesEl.innerHTML = 'Cargando sedes...';
  let listaSedes;
  try {
    const respuesta = await obtenerDatos('/get/stadiums', {
      onReintento: (codigo, esperaMs) => mostrarAvisoReintento(listaSedesEl, codigo, esperaMs),
    });
    const sedes = respuesta.datos;
    listaSedes = Array.isArray(sedes) ? sedes : sedes.stadiums || [];
  } catch (error) {
    mostrarError(listaSedesEl, 'No se pudieron cargar las sedes. Intenta de nuevo más tarde.');
    return;
  }

  let juegosPorSede = null;
  let errorJuegos = null;
  try {
    const respuestaJuegos = await obtenerDatos('/get/games', {
      onReintento: (codigo, esperaMs) => mostrarAvisoReintento(contenedorPartidosEl, codigo, esperaMs),
    });
    const listaJuegos = respuestaJuegos.datos.games || respuestaJuegos.datos;
    juegosPorSede = agruparPorSede(listaJuegos);
    if (respuestaJuegos.desdeCache) {
      errorJuegos = { esCache: true };
    }
  } catch (error) {
    errorJuegos = { esCache: false, mensaje: error.message };
  }

  renderizarBotonesYSecciones(listaSedes, juegosPorSede, errorJuegos);
}

function agruparPorSede(listaJuegos) {
  const mapa = {};
  for (const juego of listaJuegos) {
    if (!mapa[juego.stadium_id]) mapa[juego.stadium_id] = [];
    mapa[juego.stadium_id].push(juego);
  }
  return mapa;
}

function renderizarBotonesYSecciones(listaSedes, juegosPorSede, errorJuegos) {
  listaSedesEl.innerHTML = '';
  contenedorPartidosEl.innerHTML = '';

  for (const sede of listaSedes) {
    // --- Botón de la sede ---
    const boton = crearElemento('button', 'sede-boton', sede.name_en);
    boton.addEventListener('click', () => {

      document.querySelectorAll('.sede-boton').forEach((b) => b.classList.remove('activa'));
      boton.classList.add('activa');

      const prefiereMenosMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const seccion = document.getElementById(`sede-seccion-${sede.id}`);
      seccion.scrollIntoView({
        behavior: prefiereMenosMovimiento ? 'auto' : 'smooth',
        block: 'start',
      });
    });
    listaSedesEl.appendChild(boton);

    // --- Sección de partidos de esa sede ---
    const seccion = crearElemento('div', 'sede-seccion');
    seccion.id = `sede-seccion-${sede.id}`;
    seccion.appendChild(crearElemento('h3', null, `${sede.name_en} — ${sede.city_en}`));

    if (errorJuegos) {

      if (errorJuegos.esCache) {
        seccion.appendChild(crearAvisoCache(fechaDeCache('/get/games')));
        pintarPartidos(seccion, (juegosPorSede && juegosPorSede[sede.id]) || []);
      } else {
        mostrarError(seccion, 'No se pudieron cargar los partidos de esta sede.');
      }
    } else {
      pintarPartidos(seccion, juegosPorSede[sede.id] || []);
    }

    contenedorPartidosEl.appendChild(seccion);
  }
}

function pintarPartidos(contenedor, partidos) {
  if (partidos.length === 0) {
    contenedor.appendChild(crearElemento('p', null, 'Esta sede no tiene partidos asignados.'));
    return;
  }
  for (const partido of partidos) {
    const tarjeta = crearElemento(
      'div',
      'tarjeta-partido',
      `${partido.home_team_name_en || partido.home_team_label || '?'} vs ${partido.away_team_name_en || partido.away_team_label || '?'} — ${partido.local_date}`
    );
    contenedor.appendChild(tarjeta);
  }
}