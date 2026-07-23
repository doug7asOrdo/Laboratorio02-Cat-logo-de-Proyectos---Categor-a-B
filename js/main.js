import { iniciarSedes } from './pantallas/sedes.js';
import { iniciarAgenda } from './pantallas/agenda.js';
import { iniciarTimeline } from './pantallas/timeline.js';
import { iniciarDashboard } from './pantallas/dashboard.js';
import { iniciarMatriz } from './pantallas/matriz.js';

const inicializadores = {
  sedes: iniciarSedes,
  agenda: iniciarAgenda,
  timeline: iniciarTimeline,
  dashboard: iniciarDashboard,
  matriz: iniciarMatriz,
};

const pantallasYaIniciadas = new Set();

function mostrarPantalla(nombre) {
  // Oculta todas las secciones .pantalla y muestra solo la elegida.
  document.querySelectorAll('.pantalla').forEach((seccion) => {
    seccion.classList.toggle('oculta', seccion.id !== `pantalla-${nombre}`);
  });

  document.querySelectorAll('.menu__boton').forEach((boton) => {
    const esActivo = boton.dataset.pantalla === nombre;
    boton.classList.toggle('activo', esActivo);
    boton.setAttribute('aria-selected', String(esActivo));
  });

  if (!pantallasYaIniciadas.has(nombre)) {
    pantallasYaIniciadas.add(nombre);
    inicializadores[nombre]();
  }
}

document.querySelectorAll('.menu__boton').forEach((boton) => {
  boton.addEventListener('click', () => mostrarPantalla(boton.dataset.pantalla));
});

mostrarPantalla('sedes');