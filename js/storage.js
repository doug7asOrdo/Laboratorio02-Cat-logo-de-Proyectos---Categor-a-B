const PREFIJO = 'lab2-isw521:';
 
export function guardarEnCache(endpoint, datos) {
    const registro = {
        datos,
        guardadoEn: new Date().toISOString(),
    };
    try {
        localStorage.setItem(PREFIJO + endpoint, JSON.stringify(registro));
    } catch (error) { 
        console.warn('No se pudo guardar en caché:', endpoint, error);
    }
}

export function leerDeCache(endpoint) {
    const contenido = localStorage.getItem(PREFIJO + endpoint);
    if (!contenido) return null;
    try {
        const registro = JSON.parse(contenido);
        return registro.datos;
    } catch (error) {
        return null;
    }
}

export function fechaDeCache(endpoint) {
    const contenido = localStorage.getItem(PREFIJO + endpoint);
    if (!contenido) return null;
    try {
        const registro = JSON.parse(contenido);
        return new Date(registro.guardadoEn).toLocaleTimeString();
    } catch (error) {
        return null;
    }
}
  
export function guardarEquipoFavorito(teamId) {
    localStorage.setItem(PREFIJO + 'equipoFavorito', teamId);
}
 
export function leerEquipoFavorito() {
    return localStorage.getItem(PREFIJO + 'equipoFavorito');
}