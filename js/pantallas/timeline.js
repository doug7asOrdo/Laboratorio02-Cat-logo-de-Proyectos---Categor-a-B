import { obtenerDatos } from '../api.js';
import { crearElemento, mostrarError, formatearFecha, parsearFechaPartido, mostrarAvisoReintento } from '../helper.js';

const TAMANO_BLOQUE = 10;

const listaEl = document.getElementById('timeline-lista');
const centinelaEl = document.getElementById('timeline-centinela');

let todosLosPartidos = [];
let siguienteIndice = 0;
let observador = null;

export async function iniciarTimeline() {
  listaEl.innerHTML = 'Cargando los 104 partidos...';

  if (observador) {
    observador.disconnect();
    observador = null;
  }
  todosLosPartidos = [];
  siguienteIndice = 0;

  try {
    const respuesta = await obtenerDatos('/get/games', {
      onReintento: (codigo, esperaMs) => mostrarAvisoReintento(listaEl, codigo, esperaMs),
    });
    const juegos = respuesta.datos.games || respuesta.datos;

    // Ordenar cronológicamente por local_date antes de insertar nada.
    todosLosPartidos = [...juegos].sort(
      (a, b) => parsearFechaPartido(a.local_date) - parsearFechaPartido(b.local_date)
    );
  } catch (error) {
    listaEl.innerHTML = '';
    mostrarError(listaEl, 'No se pudieron cargar los partidos.');
    const botonReintentar = crearElemento('button', 'sede-boton', 'Reintentar');
    botonReintentar.addEventListener('click', () => iniciarTimeline());
    listaEl.appendChild(botonReintentar);
    return;
  }

  listaEl.innerHTML = '';
  insertarSiguienteBloque();
  configurarObservador();
}

function insertarSiguienteBloque() {
  const bloque = todosLosPartidos.slice(siguienteIndice, siguienteIndice + TAMANO_BLOQUE);
  for (const partido of bloque) {
    const tarjeta = crearElemento(
      'div',
      'tarjeta-partido',
      `${formatearFecha(partido.local_date)} — ${partido.home_team_name_en || partido.home_team_label} vs ${partido.away_team_name_en || partido.away_team_label}`
    );
    listaEl.appendChild(tarjeta);
  }
  siguienteIndice += bloque.length;

  if (siguienteIndice >= todosLosPartidos.length && observador) {
    observador.disconnect();
  }
}

function configurarObservador() {
  observador = new IntersectionObserver((entradas) => {
    const centinelaVisible = entradas[0].isIntersecting;
    if (centinelaVisible && siguienteIndice < todosLosPartidos.length) {
      insertarSiguienteBloque();
    }
  });
  observador.observe(centinelaEl);
}