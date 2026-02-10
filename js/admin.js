/*************************************************
 * CONFIG
 *************************************************/
const API_URL = "https://script.google.com/macros/s/AKfycbzxI3PpNK3Hm8AbLCvrMUFcnX3q93HmuF32jynM9RkDwxJuAVhUcoFGw0mYJMYcRBSN/exec";
const ADMIN_PASSWORD = "jere2026";

/*************************************************
 * UTILIDADES
 *************************************************/
function normalizarTelefono(tel) {
  return tel ? String(tel).replace(/\D/g, '') : '';
}

function enviarWhatsappConfirmacion(reserva) {
  const telefono = normalizarTelefono(reserva.telefono);
  if (!telefono) return;

  const mensaje = `
Hola ${reserva.nombre_cliente || ''} 👋
Te confirmamos tu hora en *Jere Barber* ✂️

📅 Fecha: ${reserva.fecha}
⏰ Hora: ${reserva.hora}
💈 Servicio: ${reserva.servicio}

¡Te esperamos!
`.trim();

  window.open(
    `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`,
    '_blank'
  );
}

function enviarWhatsappCancelacion(reserva) {
  const telefono = normalizarTelefono(reserva.telefono);
  if (!telefono) return;

  const mensaje = `
Hola ${reserva.nombre_cliente || ''} 👋
Te informamos que tu reserva en *Jere Barber* ha sido *cancelada* ❌

📅 Fecha: ${reserva.fecha}
⏰ Hora: ${reserva.hora}
💈 Servicio: ${reserva.servicio}

Si deseas reagendar una nueva hora, escríbenos por este mismo medio.
`.trim();

  window.open(
    `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`,
    '_blank'
  );
}


/*************************************************
 * ESTADO
 *************************************************/
let reservasData = [];
let reservasFiltradas = [];

/*************************************************
 * AUTENTICACIÓN
 *************************************************/
function verificarAuth() {
  const auth = sessionStorage.getItem('adminAuth');

  if (auth !== ADMIN_PASSWORD) {
    const password = prompt('🔐 Ingresa la contraseña de administrador:');

    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem('adminAuth', password);
    } else {
      alert('❌ Contraseña incorrecta');
      window.location.href = 'index.html';
      return false;
    }
  }
  return true;
}

function cerrarSesion() {
  if (confirm('¿Seguro que quieres cerrar sesión?')) {
    sessionStorage.removeItem('adminAuth');
    window.location.href = 'index.html';
  }
}

async function cargarReservas() {
  const loader = document.getElementById('loader');
  const tabla = document.getElementById('tablaReservas');
  const sinResultados = document.getElementById('sinResultados');

  try {
    loader.style.display = 'block';
    tabla.style.display = 'none';
    sinResultados.style.display = 'none';

    const response = await fetch(`${API_URL}?action=getAll`, {
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error('Error HTTP ' + response.status);
    }

    const data = await response.json();

    reservasData = data.reservas || [];
    reservasFiltradas = [...reservasData];

    actualizarEstadisticas();
    renderizarTabla();

    if (reservasFiltradas.length === 0) {
      sinResultados.style.display = 'block';
    } else {
      tabla.style.display = 'block';
    }

  } catch (error) {
    console.error('❌ Error cargando reservas:', error);
    sinResultados.style.display = 'block';

  } finally {
    // 🔑 ESTO SOLUCIONA EL PROBLEMA EN MÓVIL
    loader.style.display = 'none';
  }
}


/*************************************************
 * ESTADÍSTICAS
 *************************************************/
function actualizarEstadisticas() {
  const hoy = new Date().toISOString().split('T')[0];

  document.getElementById('statPendientes').textContent =
    reservasData.filter(r => r.estado === 'pendiente').length;
  document.getElementById('statConfirmadas').textContent =
    reservasData.filter(r => r.estado === 'confirmado').length;
  document.getElementById('statCanceladas').textContent =
    reservasData.filter(r => r.estado === 'cancelado').length;
  document.getElementById('statHoy').textContent =
    reservasData.filter(r => r.fecha === hoy).length;
}

/*************************************************
 * RENDERIZAR TABLA
 *************************************************/
function renderizarTabla() {
  const tbody = document.getElementById('tbodyReservas');
  tbody.innerHTML = '';

  reservasFiltradas.forEach((reserva, index) => {
    const telefono = normalizarTelefono(reserva.telefono);

    const tr = document.createElement('tr');

    tr.innerHTML = `
      <td>${reserva.fecha}</td>
      <td>${reserva.hora}</td>
      <td>${reserva.nombre_cliente || 'Sin nombre'}</td>

      <td>
        ${telefono
          ? `<a href="https://wa.me/${telefono}" target="_blank" class="text-info">
               ${reserva.telefono}
             </a>`
          : 'N/A'}
      </td>

      <td>${reserva.servicio}</td>

      <td>
        <span class="badge ${
          reserva.estado === 'confirmado' ? 'bg-success' :
          reserva.estado === 'cancelado' ? 'bg-danger' :
          'bg-warning text-dark'
        }">
          ${reserva.estado}
        </span>
      </td>

      <td>
        <span class="badge bg-secondary">
          ${reserva.origen || 'web'}
        </span>
      </td>

      <td>
        ${reserva.estado === 'pendiente' ? `
          <button class="btn btn-success btn-sm me-1"
            onclick="cambiarEstado(${index}, 'confirmado')">
            ✔
          </button>
          <button class="btn btn-danger btn-sm"
            onclick="cambiarEstado(${index}, 'cancelado')">
            ✖
          </button>
        ` : '-'}
      </td>
    `;

    tbody.appendChild(tr);
  });
}


/*************************************************
 * CAMBIAR ESTADO
 *************************************************/
function cambiarEstado(index, nuevoEstado) {
  const reserva = reservasFiltradas[index];

  if (!confirm(`¿Seguro que deseas ${nuevoEstado} esta reserva?`)) return;

  actualizarEstado(reserva, nuevoEstado);
}

async function actualizarEstado(reserva, nuevoEstado) {
  const params = new URLSearchParams({
    action: 'updateStatus',
    fecha: reserva.fecha,
    hora: reserva.hora,
    estado: nuevoEstado
  });

  const response = await fetch(`${API_URL}?${params}`);
  const data = await response.json();

  if (!data.success) {
    alert('Error al actualizar estado');
    return;
  }

  if (nuevoEstado === 'confirmado') {
    enviarWhatsappConfirmacion(reserva);
  }

  if (nuevoEstado === 'cancelado') {
    enviarWhatsappCancelacion(reserva);
  }

  cargarReservas();
}

/*************************************************
 * INIT
 *************************************************/
if (verificarAuth()) {
  cargarReservas();
  setInterval(cargarReservas, 30000);
}
