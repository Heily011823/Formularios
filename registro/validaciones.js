// validaciones.js
// Cada regla es una función PURA: recibe el valor (y todos los datos) y devuelve
// un mensaje de error, o null si está bien. No toca el DOM.

export const requerido = (msg = 'Este campo es obligatorio.') =>
  (v) => (v === undefined || v === null || String(v).trim() === '' ? msg : null);

export const longitud = (min, max) =>
  (v) => (v.length < min ? `Usa al menos ${min} caracteres.`
        : v.length > max ? `Usa como máximo ${max} caracteres.` : null);

export const formatoCorreo = () =>
  (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)
    ? null
    : 'Escribe un correo válido, por ejemplo ana@mail.com.');

export const rangoEntero = (min, max) => (v) => {
  const n = Number(v);
  if (!Number.isInteger(n)) return 'Escribe un número entero.';
  if (n < min) return `El valor mínimo es ${min}.`;
  if (n > max) return `El valor máximo es ${max}.`;
  return null;
};

export const igualA = (otroCampo, msg) =>
  (v, datos) => (v === datos[otroCampo] ? null : msg);

// Contraseña: al menos una letra y un número
export const letraYNumero = (msg = 'Incluye al menos una letra y un número.') =>
  (v) => (/(?=.*[A-Za-z])(?=.*\d)/.test(v) ? null : msg);

// Checkbox marcado: FormData lo envía como 'on'; si no está marcado, no aparece
export const aceptado = (msg = 'Debes aceptar los términos.') =>
  (v) => (v === 'on' ? null : msg);

// Teléfono: de 7 a 15 dígitos, con + opcional al inicio
export const telefono = (msg = 'Escribe de 7 a 15 dígitos, con + opcional al inicio.') =>
  (v) => (/^\+?\d{7,15}$/.test(v) ? null : msg);

// Las 7 reglas del registro en un solo lugar
export const reglas = {
  nombre:    [requerido(), longitud(3, 60)],
  email:     [requerido(), formatoCorreo()],
  password:  [requerido(), longitud(8, 64), letraYNumero()],
  confirmar: [requerido(), igualA('password', 'Las contraseñas no coinciden.')],
  edad:      [requerido(), rangoEntero(18, 120)],
  pais:      [requerido('Elige un país.')],
  terminos:  [aceptado()],
};

// Devuelve el primer error del campo, o null
export function validarCampo(nombre, datos) {
  for (const regla of reglas[nombre] ?? []) {
    const error = regla(datos[nombre] ?? '', datos);
    if (error) return error;
  }
  return null;
}

// Devuelve un objeto { campo: mensaje } solo con los campos con error
export function validarFormulario(datos) {
  const errores = {};
  for (const nombre of Object.keys(reglas)) {
    const error = validarCampo(nombre, datos);
    if (error) errores[nombre] = error;
  }
  return errores;
}

// Un teléfono suelto (vacío cuenta como error: o lo escribe o lo quita)
export function validarTelefono(valor) {
  return requerido('Escribe el teléfono o quítalo.')(valor) ?? telefono()(valor.trim());
}
