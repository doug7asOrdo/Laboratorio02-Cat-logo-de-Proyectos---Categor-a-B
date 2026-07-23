/**
 * Crea un elemento del DOM en una sola línea, en vez de usar
 * document.createElement + varias líneas de asignación.
 * Ejemplo: crearElemento('div', 'tarjeta', 'Hola') crea:
 *   <div class="tarjeta">Hola</div>
 */
export function crearElemento(etiqueta, clase, textoInterno) {
  const elemento = document.createElement(etiqueta);
  if (clase) elemento.className = clase;
  if (textoInterno !== undefined) elemento.textContent = textoInterno;
  return elemento;
}

/**
 * Convierte "06/11/2026 13:00" (formato de la API) en un objeto Date
 * real de JavaScript, para poder ordenar partidos cronológicamente.
 */
export function parsearFechaPartido(localDate) {
  const [fecha, hora] = localDate.split(' ');
  const [mes, dia, anio] = fecha.split('/');
  return new Date(`${anio}-${mes}-${dia}T${hora}:00`);
}

/**
 * Da formato legible en español a una fecha de partido.
 */
export function formatearFecha(localDate) {
  const fecha = parsearFechaPartido(localDate);
  return fecha.toLocaleDateString('es-CR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

/**
 * Muestra un mensaje de error local dentro de un contenedor específico,
 *Esta es la única forma permitida de reportar errores
 */
export function mostrarError(contenedor, mensaje) {
  contenedor.innerHTML = '';
  const aviso = crearElemento('p', 'aviso-error', `⚠ ${mensaje}`);
  contenedor.appendChild(aviso);
}

/**
 * Muestra un aviso de que los datos vienen de caché.
 */
export function crearAvisoCache(fechaTexto) {
  return crearElemento(
    'p',
    'aviso-cache',
    `🕓 Mostrando datos guardados (sin conexión) — actualizados por última vez a las ${fechaTexto}`
  );
}

/**
 * see ve un countdown en segundos dentro de un elemento, importnte para
 * el requisito del error 429. Devuelve una función para cancelarlo.
 */
export function iniciarCountdown(elemento, segundosTotales, textoBase) {
  let restante = segundosTotales;
  elemento.textContent = `${textoBase} ${restante}s`;

  const intervalo = setInterval(() => {
    restante--;
    // Actualizamos el texto siempre, incluso en el último segundo no mostrar el 0s
    elemento.textContent = `${textoBase} ${Math.max(restante, 0)}s`;
    if (restante <= 0) {
      clearInterval(intervalo);
    }
  }, 1000);

  return () => clearInterval(intervalo);
}

/**
 * Pinta, dentro de contenedor, un aviso de que se está reintentando
 * una petición fallida, con un countdown visible en segundos.
 * codigo puede ser 429, 500 o 'red' (falla de conexión).
 */
export function mostrarAvisoReintento(contenedor, codigo, esperaMs) {
  contenedor.innerHTML = '';

  let textoBase = 'Reintentando la petición en';
  if (codigo === 429) textoBase = 'Demasiadas solicitudes. Reintentando en';
  if (codigo === 500) textoBase = 'Error del servidor. Reintentando en';
  if (codigo === 'red') textoBase = 'Sin conexión. Reintentando en';

  const parrafo = crearElemento('p', 'aviso-cache');
  contenedor.appendChild(parrafo);

  const segundosTotales = Math.round(esperaMs / 1000);
  iniciarCountdown(parrafo, segundosTotales, textoBase);
}