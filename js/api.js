 // js/api.js
//
// Toda llamada a la API pasa por esta única función. Siempre devuelve
// la MISMA forma de objeto sin importar si el dato vino de la red o
// de la caché, para que las pantallas no tengan que preguntar "¿esto
// es un array o un objeto envuelto?" cada vez que reciben datos.
//
//   { datos: [...], desdeCache: false }   -> vino de la red
//   { datos: [...], desdeCache: true }    -> vino de localStorage

import { guardarEnCache, leerDeCache } from './storage.js';

const URL_BASE = 'https://worldcup26.ir';


const MAX_REINTENTOS = 4; //5 intentos

function esperar(milisegundos) {
  return new Promise((resolver) => setTimeout(resolver, milisegundos));
}

function resolverConCacheOFallar(endpoint, error) { //cache o falla
  const guardado = leerDeCache(endpoint);
  if (guardado) {
    return { datos: guardado, desdeCache: true };
  }
  throw error;
}

export async function obtenerDatos(endpoint, { onReintento } = {}) {
  let intento = 0;

  while (intento <= MAX_REINTENTOS) {
    let respuesta;

    // --- Paso 1: intentar la petición de red ---
    try {
      respuesta = await fetch(URL_BASE + endpoint);
    } catch (errorDeRed) {
      // No hubo forma de contactar la API (sin conexión, DNS, etc.).
      if (intento === MAX_REINTENTOS) {
        return resolverConCacheOFallar(endpoint, errorDeRed);
      }
      const espera = 1000 * Math.pow(2, intento);
      if (onReintento) onReintento('red', espera, intento + 1);
      await esperar(espera);
      intento++;
      continue;
    }

    // --- Paso 2: la API respondió, pero con error de servidor o Estos SÍ se reintentan con backoff exponencial.
    if (respuesta.status === 429 || respuesta.status === 500) {
      if (intento === MAX_REINTENTOS) {
        const error = new Error(`La API respondió ${respuesta.status} tras ${MAX_REINTENTOS} reintentos`);
        return resolverConCacheOFallar(endpoint, error);
      }
      const espera = 1000 * Math.pow(2, intento);
      if (onReintento) onReintento(respuesta.status, espera, intento + 1);
      await esperar(espera);
      intento++;
      continue;
    }

    // --- Paso 3: cualquier otro error HTTP 
    if (!respuesta.ok) {
      const error = new Error(`Error HTTP ${respuesta.status}`);
      return resolverConCacheOFallar(endpoint, error);
    }

    // --- Paso 4: éxito. Guardamos copia en caché y devolvemos
    const datos = await respuesta.json();
    guardarEnCache(endpoint, datos);
    return { datos, desdeCache: false };
  }
}