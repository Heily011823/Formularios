// app.js — Niveles 3, 4 y 5 (usa el módulo validaciones.js)
import {
  reglas, validarCampo, validarFormulario, validarTelefono,
} from './validaciones.js';

const form = document.querySelector('#registro');
const boton = form.querySelector('button[type="submit"]');
const mensaje = document.querySelector('#mensaje');
const saludo = document.querySelector('#saludo');

// FormData con todos los campos; los teléfonos (mismo name) se leen con getAll
function leerDatos() {
  const fd = new FormData(form);
  const datos = Object.fromEntries(fd);
  datos.telefono = fd.getAll('telefono');
  return datos;
}

function mostrarError(nombre, mensajeError) {
  const campo = form.elements[nombre];
  const error = document.getElementById(`${nombre}-error`);
  campo.setAttribute('aria-invalid', mensajeError ? 'true' : 'false');
  if (error) error.textContent = mensajeError ?? '';
}

// ===== Validación al salir del campo =====
let errorCorreoAsync = null; // resultado de "¿el correo ya existe?"

form.addEventListener('focusout', (e) => {
  const nombre = e.target.name;
  if (!nombre) return;

  if (nombre === 'telefono') {
    mostrarErrorTel(e.target, validarTelefono(e.target.value));
    return;
  }
  if (!(nombre in reglas)) return;

  const datos = leerDatos();
  let error = validarCampo(nombre, datos);
  if (nombre === 'email' && !error) error = errorCorreoAsync; // no borrar el aviso asíncrono
  mostrarError(nombre, error);

  // si cambió la contraseña y ya hay confirmación escrita, revisarla también
  if (nombre === 'password' && datos.confirmar) {
    mostrarError('confirmar', validarCampo('confirmar', datos));
  }
});

// ===== Parte B: validación asíncrona del correo (con debounce) =====
const registrados = ['ana@mail.com', 'admin@mail.com']; // simula al servidor
const correoDisponible = (email) =>
  new Promise((ok) =>
    setTimeout(() => ok(!registrados.includes(email.toLowerCase())), 600));

function debounce(fn, ms) {
  let espera;
  return (...args) => {
    clearTimeout(espera);
    espera = setTimeout(() => fn(...args), ms);
  };
}

const revisarCorreo = debounce(async (email) => {
  console.log('Comprobando correo:', email); // solo debe verse al dejar de escribir
  if (validarCampo('email', { email })) return; // primero el formato
  mostrarError('email', 'Comprobando disponibilidad…');
  const libre = await correoDisponible(email);
  if (form.elements.email.value !== email) return; // ya escribió otra cosa
  errorCorreoAsync = libre
    ? null
    : 'Este correo ya tiene una cuenta. ¿Quieres iniciar sesión?';
  mostrarError('email', errorCorreoAsync);
}, 500);

form.elements.email.addEventListener('input', (e) => {
  errorCorreoAsync = null;
  revisarCorreo(e.target.value);
});

// ===== Parte C: teléfonos dinámicos (hasta 3) =====
const lista = document.querySelector('#telefonos');
const btnAgregar = document.querySelector('#agregar-telefono');
let contadorTel = 0; // id único aunque se quiten filas

function mostrarErrorTel(input, msg) {
  input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  const error = document.getElementById(input.getAttribute('aria-describedby'));
  if (error) error.textContent = msg ?? '';
}

function renumerarTelefonos() {
  [...lista.children].forEach((fila, i) => {
    fila.querySelector('label').textContent = `Teléfono ${i + 1}`;
  });
  btnAgregar.disabled = lista.children.length >= 3;
}

btnAgregar.addEventListener('click', () => {
  if (lista.children.length >= 3) return;
  const id = ++contadorTel;
  const fila = document.createElement('div');
  fila.className = 'fila-telefono';
  // innerHTML es seguro aquí: el contenido lo genera nuestro código, no el usuario
  fila.innerHTML = `
    <label for="tel-${id}">Teléfono</label>
    <input id="tel-${id}" name="telefono" type="tel" inputmode="tel"
           autocomplete="tel" aria-describedby="tel-${id}-error">
    <button type="button" class="quitar">Quitar</button>
    <p id="tel-${id}-error" class="error" aria-live="polite"></p>`;
  lista.append(fila);
  renumerarTelefonos();
  fila.querySelector('input').focus();
});

// Delegación de eventos: un solo listener para todos los botones «Quitar»
lista.addEventListener('click', (e) => {
  if (e.target.matches('.quitar')) {
    e.target.parentElement.remove();
    renumerarTelefonos();
    btnAgregar.focus();
  }
});

// ===== Envío =====
function limpiarFormulario() {
  form.reset();
  lista.replaceChildren();
  renumerarTelefonos();
  errorCorreoAsync = null;
  for (const nombre of Object.keys(reglas)) mostrarError(nombre, null);
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const datos = leerDatos();

  // 1) Reglas del módulo
  const errores = validarFormulario(datos);

  // 2) Correo ya registrado (por si envía antes de que termine el debounce)
  if (!errores.email && !(await correoDisponible(datos.email))) {
    errores.email = 'Este correo ya tiene una cuenta. ¿Quieres iniciar sesión?';
  }

  // 3) Mostrar TODOS los errores
  for (const nombre of Object.keys(reglas)) mostrarError(nombre, errores[nombre] ?? null);
  let hayErrorTel = false;
  for (const input of lista.querySelectorAll('input')) {
    const msg = validarTelefono(input.value);
    mostrarErrorTel(input, msg);
    if (msg) hayErrorTel = true;
  }

  // 4) Enfocar el primer campo con error
  if (Object.keys(errores).length || hayErrorTel) {
    form.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }

  boton.disabled = true;
  boton.textContent = 'Enviando…';
  mensaje.textContent = '';
  saludo.textContent = '';

  try {
    const cuerpo = { ...datos };
    delete cuerpo.confirmar; // no se envía la confirmación

    const res = await fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const creado = await res.json();
    mensaje.textContent = `¡Cuenta creada! Id: ${creado.id}`;

    // Nivel 5 · Parte B: textContent muestra <b>Ana</b> como texto (seguro).
    // saludo.innerHTML = `Hola, ${datos.nombre}`;   // <-- INSEGURO, solo para comparar
    saludo.textContent = `Hola, ${datos.nombre}`;

    limpiarFormulario();
  } catch (err) {
    mensaje.textContent = 'No se pudo enviar. Revisa tu conexión e inténtalo de nuevo.';
    console.error('Error al enviar el formulario:', err);
  } finally {
    boton.disabled = false;
    boton.textContent = 'Crear cuenta';
  }
});
