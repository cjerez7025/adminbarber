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

/**
 * Abre WhatsApp con detección inteligente:
 * - Móvil → whatsapp://send (app nativa, sin ventana en blanco)
 * - Desktop → https://wa.me/ (WhatsApp Web, nueva pestaña)
 */
function abrirWhatsApp(telefono, mensaje) {
  const textoEncoded = encodeURIComponent(mensaje);
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const link = document.createElement('a');
  link.href = isMobile
    ? `whatsapp://send?phone=${telefono}&text=${textoEncoded}`
    : `https://wa.me/${telefono}?text=${textoEncoded}`;
  link.rel = 'noopener noreferrer';
  if (!isMobile) link.target = '_blank';

  document.body.appendChild(link);
  link.click();
  setTimeout(() => document.body.removeChild(link), 100);
}

function enviarWhatsappConfirmacion(reserva) {
  const telefono = normalizarTelefono(reserva.telefono);
  if (!telefono) return;

  const mensaje = `Hola ${reserva.nombre_cliente || ''} 👋
Te confirmamos tu hora en *Jere Barber* ✂️

📅 Fecha: ${reserva.fecha}
⏰ Hora: ${reserva.hora}
💈 Servicio: ${reserva.servicio}

¡Te esperamos!`.trim();

  abrirWhatsApp(telefono, mensaje);
}

function enviarWhatsappCancelacion(reserva) {
  const telefono = normalizarTelefono(reserva.telefono);
  if (!telefono) return;

  const mensaje = `Hola ${reserva.nombre_cliente || ''} 👋
Te informamos que tu reserva en *Jere Barber* ha sido *cancelada* ❌

📅 Fecha: ${reserva.fecha}
⏰ Hora: ${reserva.hora}
💈 Servicio: ${reserva.servicio}

Si deseas reagendar, escríbenos por este mismo medio.`.trim();

  abrirWhatsApp(telefono, mensaje);
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
 * RENDERIZAR TABLA RESPONSIVE
 *************************************************/
function renderizarTabla() {
  const tbody = document.getElementById('tbodyReservas');
  tbody.innerHTML = '';

  // Detectar si es móvil
  const isMobile = window.innerWidth < 768;

  reservasFiltradas.forEach((reserva, index) => {
    const telefono = normalizarTelefono(reserva.telefono);

    const tr = document.createElement('tr');

    // En móvil: layout más compacto
    if (isMobile) {
      tr.innerHTML = `
        <td class="small">${reserva.fecha.split('-')[2]}/${reserva.fecha.split('-')[1]}</td>
        <td class="small">${reserva.hora}</td>
        <td class="small">
          ${reserva.nombre_cliente || 'S/N'}
          <br>
          <small class="text-muted">${reserva.servicio}</small>
        </td>
        <td>
          <span class="badge ${
            reserva.estado === 'confirmado' ? 'bg-success' :
            reserva.estado === 'cancelado' ? 'bg-danger' :
            'bg-warning text-dark'
          }">
            ${reserva.estado === 'confirmado' ? '✓' : reserva.estado === 'cancelado' ? '✗' : '⏳'}
          </span>
        </td>
        <td>
          ${reserva.estado === 'pendiente' ? `
            <div class="btn-group-vertical btn-group-sm">
              <button class="btn btn-success btn-sm px-2 py-1 mb-1"
                onclick="cambiarEstado(${index}, 'confirmado')"
                title="Confirmar">
                ✔
              </button>
              <button class="btn btn-danger btn-sm px-2 py-1"
                onclick="cambiarEstado(${index}, 'cancelado')"
                title="Cancelar">
                ✖
              </button>
            </div>
          ` : `
            <button class="btn btn-info btn-sm px-2 py-1"
              onclick="verDetalle(${index})"
              title="Ver">
              👁️
            </button>
          `}
        </td>
      `;
    } 
    // En desktop: layout completo
    else {
      tr.innerHTML = `
        <td>${reserva.fecha}</td>
        <td>${reserva.hora}</td>
        <td>${reserva.nombre_cliente || 'Sin nombre'}</td>

        <td class="hide-mobile">
          ${telefono
            ? `<a href="https://wa.me/${telefono}" target="_blank" class="text-info text-decoration-none">
                 <i class="bi bi-whatsapp me-1"></i>${reserva.telefono}
               </a>`
            : 'N/A'}
        </td>

        <td class="hide-mobile">${reserva.servicio}</td>

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
          <div class="btn-group btn-group-sm">
            ${reserva.estado === 'pendiente' ? `
              <button class="btn btn-success"
                onclick="cambiarEstado(${index}, 'confirmado')"
                title="Confirmar">
                <i class="bi bi-check-circle"></i>
              </button>
              <button class="btn btn-danger"
                onclick="cambiarEstado(${index}, 'cancelado')"
                title="Cancelar">
                <i class="bi bi-x-circle"></i>
              </button>
            ` : ''}
            <button class="btn btn-info"
              onclick="verDetalle(${index})"
              title="Ver detalle">
              <i class="bi bi-eye"></i>
            </button>
          </div>
        </td>
      `;
    }

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

  // Enviar WhatsApp según acción
  if (nuevoEstado === 'confirmado') {
    enviarWhatsappConfirmacion(reserva);
  }

  if (nuevoEstado === 'cancelado') {
    enviarWhatsappCancelacion(reserva);
  }

  // Recargar tabla
  cargarReservas();
}

/*************************************************
 * VER DETALLE (Mobile-Friendly)
 *************************************************/
function verDetalle(index) {
  const reserva = reservasFiltradas[index];
  
  const fechaObj = new Date(reserva.fecha + 'T00:00:00');
  const fechaFormato = fechaObj.toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const telefono = normalizarTelefono(reserva.telefono);

  const html = `
    <div class="list-group list-group-flush">
      
      <div class="list-group-item bg-dark text-white border-secondary">
        <div class="d-flex justify-content-between align-items-center">
          <small class="text-muted">Fecha</small>
          <strong>${fechaFormato}</strong>
        </div>
      </div>
      
      <div class="list-group-item bg-dark text-white border-secondary">
        <div class="d-flex justify-content-between align-items-center">
          <small class="text-muted">Hora</small>
          <strong class="text-info">${reserva.hora}</strong>
        </div>
      </div>
      
      <div class="list-group-item bg-dark text-white border-secondary">
        <div class="d-flex justify-content-between align-items-center">
          <small class="text-muted">Cliente</small>
          <strong>${reserva.nombre_cliente || 'Sin nombre'}</strong>
        </div>
      </div>
      
      <div class="list-group-item bg-dark text-white border-secondary">
        <div class="d-flex justify-content-between align-items-center">
          <small class="text-muted">Teléfono</small>
          ${telefono
            ? `<a href="https://wa.me/${telefono}" target="_blank" class="btn btn-success btn-sm">
                 <i class="bi bi-whatsapp me-1"></i>${reserva.telefono}
               </a>`
            : '<span>N/A</span>'}
        </div>
      </div>
      
      <div class="list-group-item bg-dark text-white border-secondary">
        <div class="d-flex justify-content-between align-items-center">
          <small class="text-muted">Servicio</small>
          <strong>${reserva.servicio}</strong>
        </div>
      </div>
      
      <div class="list-group-item bg-dark text-white border-secondary">
        <div class="d-flex justify-content-between align-items-center">
          <small class="text-muted">Estado</small>
          <span class="badge ${
            reserva.estado === 'confirmado' ? 'bg-success' :
            reserva.estado === 'cancelado' ? 'bg-danger' :
            'bg-warning text-dark'
          }">
            ${reserva.estado}
          </span>
        </div>
      </div>
      
      <div class="list-group-item bg-dark text-white border-secondary">
        <div class="d-flex justify-content-between align-items-center">
          <small class="text-muted">Origen</small>
          <span class="badge bg-secondary">${reserva.origen || 'web'}</span>
        </div>
      </div>
      
      ${reserva.timestamp ? `
        <div class="list-group-item bg-dark text-white border-secondary">
          <div class="d-flex justify-content-between align-items-center">
            <small class="text-muted">Creada</small>
            <small>${reserva.timestamp}</small>
          </div>
        </div>
      ` : ''}
      
    </div>
    
    ${reserva.estado === 'pendiente' ? `
      <div class="d-grid gap-2 mt-3">
        <button class="btn btn-success" onclick="cambiarEstadoDesdeModal(${index}, 'confirmado')">
          <i class="bi bi-check-circle me-2"></i>Confirmar Reserva
        </button>
        <button class="btn btn-danger" onclick="cambiarEstadoDesdeModal(${index}, 'cancelado')">
          <i class="bi bi-x-circle me-2"></i>Cancelar Reserva
        </button>
      </div>
    ` : ''}
  `;

  document.getElementById('modalDetalleBody').innerHTML = html;
  new bootstrap.Modal(document.getElementById('modalDetalle')).show();
}

/*************************************************
 * CAMBIAR ESTADO DESDE MODAL
 *************************************************/
function cambiarEstadoDesdeModal(index, nuevoEstado) {
  // Cerrar modal
  bootstrap.Modal.getInstance(document.getElementById('modalDetalle')).hide();
  
  // Cambiar estado
  cambiarEstado(index, nuevoEstado);
}
function filtrarReservas() {
  const filtroEstado = document.getElementById('filtroEstado')?.value || '';
  const filtroFecha = document.getElementById('filtroFecha')?.value || '';
  const filtroServicio = document.getElementById('filtroServicio')?.value || '';

  reservasFiltradas = reservasData.filter(reserva => {
    let cumpleFiltro = true;

    if (filtroEstado && reserva.estado !== filtroEstado) {
      cumpleFiltro = false;
    }

    if (filtroFecha && reserva.fecha !== filtroFecha) {
      cumpleFiltro = false;
    }

    if (filtroServicio && reserva.servicio !== filtroServicio) {
      cumpleFiltro = false;
    }

    return cumpleFiltro;
  });

  renderizarTabla();

  const tabla = document.getElementById('tablaReservas');
  const sinResultados = document.getElementById('sinResultados');

  if (reservasFiltradas.length === 0) {
    tabla.style.display = 'none';
    sinResultados.style.display = 'block';
  } else {
    tabla.style.display = 'block';
    sinResultados.style.display = 'none';
  }
}

function limpiarFiltros() {
  if (document.getElementById('filtroEstado')) {
    document.getElementById('filtroEstado').value = '';
  }
  if (document.getElementById('filtroFecha')) {
    document.getElementById('filtroFecha').value = '';
  }
  if (document.getElementById('filtroServicio')) {
    document.getElementById('filtroServicio').value = '';
  }
  filtrarReservas();
}

/*************************************************
 * CAMBIAR ESTADO DESDE MODAL
 *************************************************/
function cambiarEstadoDesdeModal(index, nuevoEstado) {
  // Cerrar modal
  bootstrap.Modal.getInstance(document.getElementById('modalDetalle')).hide();
  
  // Cambiar estado
  cambiarEstado(index, nuevoEstado);
}

/*************************************************
 * FILTROS
 *************************************************/
function filtrarReservas() {
  const filtroEstado = document.getElementById('filtroEstado')?.value || '';
  const filtroFecha = document.getElementById('filtroFecha')?.value || '';
  const filtroServicio = document.getElementById('filtroServicio')?.value || '';

  reservasFiltradas = reservasData.filter(reserva => {
    let cumpleFiltro = true;

    if (filtroEstado && reserva.estado !== filtroEstado) {
      cumpleFiltro = false;
    }

    if (filtroFecha && reserva.fecha !== filtroFecha) {
      cumpleFiltro = false;
    }

    if (filtroServicio && reserva.servicio !== filtroServicio) {
      cumpleFiltro = false;
    }

    return cumpleFiltro;
  });

  renderizarTabla();

  const tabla = document.getElementById('tablaReservas');
  const sinResultados = document.getElementById('sinResultados');

  if (reservasFiltradas.length === 0) {
    tabla.style.display = 'none';
    sinResultados.style.display = 'block';
  } else {
    tabla.style.display = 'block';
    sinResultados.style.display = 'none';
  }
}

function limpiarFiltros() {
  if (document.getElementById('filtroEstado')) {
    document.getElementById('filtroEstado').value = '';
  }
  if (document.getElementById('filtroFecha')) {
    document.getElementById('filtroFecha').value = '';
  }
  if (document.getElementById('filtroServicio')) {
    document.getElementById('filtroServicio').value = '';
  }
  filtrarReservas();
}

/*************************************************
 * INIT
 *************************************************/
if (verificarAuth()) {
  cargarReservas();
  setInterval(cargarReservas, 30000);
  
  // Re-renderizar al cambiar tamaño de ventana
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      renderizarTabla();
    }, 250);
  });
}