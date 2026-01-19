// ============================================
// PANEL ADMINISTRATIVO SMT CHIAPAS - MEJORADO
// ============================================

// IMPORTANTE: Reemplaza con tu URL de Google Apps Script
const API_URL = 'https://script.google.com/macros/s/AKfycbw4S5fvlmSL8HrXvHYz53c6izar-i9VFBKieBy2O1CsredvCGsVneMUajFqfbqVLQDNyg/exec';

let adminUser = null;
let adminToken = null;
let adminModalMap = null;

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    checkAdminSession();
});

// ============================================
// GESTIÓN DE SESIÓN
// ============================================

function checkAdminSession() {
    adminToken = localStorage.getItem('adminToken');
    const userData = localStorage.getItem('adminUser');
    
    if (adminToken && userData) {
        adminUser = JSON.parse(userData);
        showAdminDashboard();
    } else {
        showAdminLogin();
    }
}

function saveAdminSession(token, user) {
    localStorage.setItem('adminToken', token);
    localStorage.setItem('adminUser', JSON.stringify(user));
    adminToken = token;
    adminUser = user;
}

function clearAdminSession() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    adminToken = null;
    adminUser = null;
}

// ============================================
// NAVEGACIÓN
// ============================================

function showAdminLogin() {
    document.getElementById('admin-login-page').classList.remove('hidden');
    document.getElementById('admin-dashboard').classList.add('hidden');
}

function showAdminDashboard() {
    document.getElementById('admin-login-page').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.remove('hidden');
    
    if (adminUser) {
        document.getElementById('admin-name').textContent = adminUser.nombre_completo;
        document.getElementById('admin-email').textContent = adminUser.email;
        document.getElementById('admin-initials').textContent = getInitials(adminUser.nombre_completo);
        document.getElementById('admin-role-text').textContent = getRoleLabel(adminUser.rol);
    }
    
    loadAdminData();
}

// ============================================
// LOGIN
// ============================================

async function handleAdminLogin(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const data = {
        action: 'adminLogin',
        email: formData.get('email'),
        password: formData.get('password')
    };
    
    showLoading();
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            saveAdminSession(result.token, result.user);
            showToast('¡Bienvenido al panel administrativo!', 'success');
            showAdminDashboard();
        } else {
            showToast(result.message || 'Credenciales inválidas', 'error');
        }
    } catch (error) {
        console.error('Error en login admin:', error);
        showToast('Error de conexión. Verifica tu internet.', 'error');
    } finally {
        hideLoading();
    }
}

function handleAdminLogout() {
    if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
        clearAdminSession();
        showToast('Sesión cerrada exitosamente', 'success');
        showAdminLogin();
    }
}

// ============================================
// CARGAR DATOS
// ============================================

async function loadAdminData() {
    showLoading();
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'getAdminReports',
                token: adminToken
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            updateAdminStats(result.data, adminUser.rol);
            displayAdminReports(result.data, adminUser.rol);
        } else {
            showToast('Error al cargar datos', 'error');
            document.getElementById('admin-reports-list').innerHTML = `
                <div class="p-16 text-center">
                    <i class="fas fa-exclamation-triangle text-6xl text-red-300 mb-4"></i>
                    <p class="text-gray-500 text-xl font-bold mb-4">Error al cargar reportes</p>
                    <button onclick="loadAdminData()" class="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg">
                        <i class="fas fa-redo mr-2"></i>Reintentar
                    </button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error al cargar datos:', error);
        showToast('Error de conexión', 'error');
        document.getElementById('admin-reports-list').innerHTML = `
            <div class="p-16 text-center">
                <i class="fas fa-wifi-slash text-6xl text-gray-300 mb-4"></i>
                <p class="text-gray-500 text-xl font-bold mb-4">Sin conexión a internet</p>
                <button onclick="loadAdminData()" class="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg">
                    <i class="fas fa-redo mr-2"></i>Reintentar
                </button>
            </div>
        `;
    } finally {
        hideLoading();
    }
}

// ============================================
// ESTADÍSTICAS SEGÚN ROL
// ============================================

function updateAdminStats(reportes, rol) {
    const stats = document.getElementById('admin-stats');
    
    const total = reportes.length;
    const nuevos = reportes.filter(r => r.estado_actual === 'NUEVO').length;
    const proceso = reportes.filter(r => ['EN_REVISION_1', 'EN_REVISION_2'].includes(r.estado_actual)).length;
    const validados = reportes.filter(r => ['VALIDO', 'SANCION_ASIGNADA'].includes(r.estado_actual)).length;
    
    let statsHTML = '';
    
    if (rol === 'ENLACE_GENERAL' || rol === 'NOTIFICADOR') {
        // SUPERVISOR y NOTIFICADOR: Total, Nuevos, En Proceso
        statsHTML = `
            <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl shadow-2xl p-8 transform hover:scale-105 transition-all duration-300 border-2 border-blue-400">
                <div class="flex items-center justify-between mb-6">
                    <div class="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center shadow-xl">
                        <i class="fas fa-folder-open text-white text-3xl"></i>
                    </div>
                    <span class="px-4 py-2 bg-white/20 backdrop-blur-lg text-white rounded-full text-xs font-bold border border-white/30">TOTAL</span>
                </div>
                <div class="text-6xl font-extrabold text-white mb-3">${total}</div>
                <div class="text-blue-100 font-bold text-lg">Total de Reportes</div>
            </div>

            <div class="bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl shadow-2xl p-8 transform hover:scale-105 transition-all duration-300 border-2 border-amber-400">
                <div class="flex items-center justify-between mb-6">
                    <div class="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center shadow-xl">
                        <i class="fas fa-bell text-white text-3xl"></i>
                    </div>
                    <span class="px-4 py-2 bg-white/20 backdrop-blur-lg text-white rounded-full text-xs font-bold border border-white/30">NUEVOS</span>
                </div>
                <div class="text-6xl font-extrabold text-white mb-3">${nuevos}</div>
                <div class="text-amber-100 font-bold text-lg">Reportes Nuevos</div>
            </div>

            <div class="bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl shadow-2xl p-8 transform hover:scale-105 transition-all duration-300 border-2 border-purple-400">
                <div class="flex items-center justify-between mb-6">
                    <div class="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center shadow-xl">
                        <i class="fas fa-spinner text-white text-3xl"></i>
                    </div>
                    <span class="px-4 py-2 bg-white/20 backdrop-blur-lg text-white rounded-full text-xs font-bold border border-white/30">PROCESO</span>
                </div>
                <div class="text-6xl font-extrabold text-white mb-3">${proceso}</div>
                <div class="text-purple-100 font-bold text-lg">En Proceso</div>
            </div>
        `;
    } else if (rol === 'JURIDICO') {
        // JURÍDICO: Total, En Proceso, Validados
        statsHTML = `
            <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl shadow-2xl p-8 transform hover:scale-105 transition-all duration-300 border-2 border-blue-400">
                <div class="flex items-center justify-between mb-6">
                    <div class="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center shadow-xl">
                        <i class="fas fa-folder-open text-white text-3xl"></i>
                    </div>
                    <span class="px-4 py-2 bg-white/20 backdrop-blur-lg text-white rounded-full text-xs font-bold border border-white/30">TOTAL</span>
                </div>
                <div class="text-6xl font-extrabold text-white mb-3">${total}</div>
                <div class="text-blue-100 font-bold text-lg">Total de Reportes</div>
            </div>

            <div class="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-3xl shadow-2xl p-8 transform hover:scale-105 transition-all duration-300 border-2 border-yellow-400">
                <div class="flex items-center justify-between mb-6">
                    <div class="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center shadow-xl">
                        <i class="fas fa-hourglass-half text-white text-3xl"></i>
                    </div>
                    <span class="px-4 py-2 bg-white/20 backdrop-blur-lg text-white rounded-full text-xs font-bold border border-white/30">PROCESO</span>
                </div>
                <div class="text-6xl font-extrabold text-white mb-3">${proceso}</div>
                <div class="text-yellow-100 font-bold text-lg">En Revisión</div>
            </div>

            <div class="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl shadow-2xl p-8 transform hover:scale-105 transition-all duration-300 border-2 border-emerald-400">
                <div class="flex items-center justify-between mb-6">
                    <div class="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center shadow-xl">
                        <i class="fas fa-check-double text-white text-3xl"></i>
                    </div>
                    <span class="px-4 py-2 bg-white/20 backdrop-blur-lg text-white rounded-full text-xs font-bold border border-white/30">VALIDADOS</span>
                </div>
                <div class="text-6xl font-extrabold text-white mb-3">${validados}</div>
                <div class="text-emerald-100 font-bold text-lg">Validados</div>
            </div>
        `;
    }
    
    stats.innerHTML = statsHTML;
}

// ============================================
// MOSTRAR REPORTES
// ============================================

function displayAdminReports(reportes, rol) {
    const container = document.getElementById('admin-reports-list');
    
    let filteredReports = reportes;
    let titleText = 'Todos los Reportes';
    
    if (rol === 'NOTIFICADOR') {
        filteredReports = reportes.filter(r => r.estado_actual === 'NUEVO');
        titleText = 'Reportes Nuevos - Pendientes de Notificación';
    } else if (rol === 'JURIDICO') {
        filteredReports = reportes.filter(r => r.estado_actual === 'EN_REVISION_1');
        titleText = 'Reportes en Revisión Jurídica';
    }
    
    document.getElementById('reports-title').textContent = titleText;
    
    if (filteredReports.length === 0) {
        container.innerHTML = `
            <div class="p-20 text-center">
                <div class="inline-block w-32 h-32 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mb-6">
                    <i class="fas fa-inbox text-indigo-400 text-6xl"></i>
                </div>
                <h3 class="text-2xl font-extrabold text-gray-900 mb-3">No hay reportes pendientes</h3>
                <p class="text-gray-600 font-semibold text-lg">Todos los reportes han sido procesados</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = filteredReports.map(reporte => `
        <div class="p-8 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-300 border-l-4 border-transparent hover:border-indigo-600">
            <div class="flex items-start justify-between">
                <div class="flex-1">
                    <div class="flex items-center gap-4 mb-4">
                        <span class="text-2xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">${reporte.folio}</span>
                        <span class="${getEstadoClass(reporte.estado_actual)} px-4 py-2 rounded-full text-sm font-extrabold shadow-md">
                            ${getEstadoLabel(reporte.estado_actual)}
                        </span>
                        <span class="px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 rounded-full text-sm font-extrabold shadow-md">
                            ${getCategoriaLabel(reporte.categoria)}
                        </span>
                    </div>
                    <h4 class="text-xl font-extrabold text-gray-900 mb-3 hover:text-indigo-700 transition-colors">
                        ${reporte.tipo_infraccion}
                    </h4>
                    <p class="text-gray-700 text-base mb-4 line-clamp-2 font-medium">${reporte.descripcion}</p>
                    <div class="flex items-center gap-6 text-sm text-gray-600 mb-6">
                        <span class="flex items-center gap-2 font-semibold">
                            <i class="fas fa-calendar-alt text-indigo-600"></i>
                            ${formatDate(reporte.fecha_incidente)}
                        </span>
                        <span class="flex items-center gap-2 font-semibold">
                            <i class="fas fa-user text-purple-600"></i>
                            ${reporte.usuario_nombre || 'Usuario'}
                        </span>
                    </div>
                    
                    ${getActionButtons(reporte, rol)}
                </div>
            </div>
        </div>
    `).join('');
}

// ============================================
// BOTONES DE ACCIÓN
// ============================================

function getActionButtons(reporte, rol) {
    if (rol === 'ENLACE_GENERAL') {
        return `
            <div class="flex gap-4">
                <button onclick="viewReportDetailAdmin('${reporte.id}')" 
                    class="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold shadow-xl transform hover:scale-105 transition-all">
                    <i class="fas fa-eye mr-2"></i>Ver Detalle Completo
                </button>
            </div>
        `;
    }
    
    if (rol === 'NOTIFICADOR' && reporte.estado_actual === 'NUEVO') {
        return `
            <div class="flex gap-4 flex-wrap">
                <button onclick="viewReportDetailAdmin('${reporte.id}')" 
                    class="px-8 py-4 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-xl font-bold shadow-xl transform hover:scale-105 transition-all">
                    <i class="fas fa-eye mr-2"></i>Ver Detalle
                </button>
                <button onclick="notificarJuridico('${reporte.id}', true)" 
                    class="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl font-bold shadow-xl transform hover:scale-105 transition-all">
                    <i class="fas fa-check-circle mr-2"></i>SÍ - Notificar a Jurídico
                </button>
                <button onclick="notificarJuridico('${reporte.id}', false)" 
                    class="px-8 py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl font-bold shadow-xl transform hover:scale-105 transition-all">
                    <i class="fas fa-times-circle mr-2"></i>NO - Mantener Pendiente
                </button>
            </div>
        `;
    }
    
    if (rol === 'JURIDICO' && reporte.estado_actual === 'EN_REVISION_1') {
        return `
            <div class="space-y-4">
                <div class="flex gap-4">
                    <button onclick="viewReportDetailAdmin('${reporte.id}')" 
                        class="px-8 py-4 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white rounded-xl font-bold shadow-xl transform hover:scale-105 transition-all">
                        <i class="fas fa-eye mr-2"></i>Ver Detalle Completo
                    </button>
                    <button onclick="validarReporte('${reporte.id}', false)" 
                        class="px-8 py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white rounded-xl font-bold shadow-xl transform hover:scale-105 transition-all">
                        <i class="fas fa-ban mr-2"></i>NO es Válido
                    </button>
                </div>
                <div class="flex gap-4 items-center bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-xl border-2 border-emerald-200">
                    <input type="text" id="sancion-${reporte.id}" 
                        placeholder="Ej: Multa de $2,000 pesos o Suspensión de 30 días" 
                        class="flex-1 px-6 py-4 border-2 border-emerald-300 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold text-gray-900">
                    <button onclick="validarReporte('${reporte.id}', true)" 
                        class="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold shadow-xl transform hover:scale-105 transition-all whitespace-nowrap">
                        <i class="fas fa-gavel mr-2"></i>Validar y Asignar Sanción
                    </button>
                </div>
            </div>
        `;
    }
    
    return '';
}

// ============================================
// MODAL DE DETALLE COMPLETO
// ============================================

async function viewReportDetailAdmin(reporteId) {
    showLoading();
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'getReportDetail',
                reportId: reporteId,
                token: adminToken
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            displayAdminModal(result.data);
            document.getElementById('admin-detail-modal').classList.remove('hidden');
        } else {
            showToast('Error al cargar el detalle del reporte', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error de conexión', 'error');
    } finally {
        hideLoading();
    }
}

function displayAdminModal(reporte) {
    // Header
    document.getElementById('admin-modal-folio').textContent = reporte.folio;
    document.getElementById('admin-modal-fecha').textContent = `Creado el ${formatDate(reporte.fecha_creacion)}`;
    document.getElementById('admin-modal-estado-badge').textContent = getEstadoLabel(reporte.estado_actual);
    
    // Resumen
    document.getElementById('admin-modal-categoria').textContent = getCategoriaLabel(reporte.categoria);
    document.getElementById('admin-modal-tipo').textContent = reporte.tipo_infraccion;
    document.getElementById('admin-modal-fecha-incidente').textContent = formatDate(reporte.fecha_incidente);
    document.getElementById('admin-modal-estado-actual').textContent = getEstadoLabel(reporte.estado_actual);
    
    // Reportante
    document.getElementById('admin-modal-reportante-nombre').textContent = reporte.reportante_nombre || 'N/A';
    document.getElementById('admin-modal-reportante-email').textContent = reporte.reportante_email || 'N/A';
    document.getElementById('admin-modal-reportante-telefono').textContent = reporte.reportante_telefono || 'N/A';
    
    // Timeline
    const timeline = document.getElementById('admin-modal-timeline');
    const estados = [
        { key: 'NUEVO', label: 'Reporte Recibido', icon: 'fa-inbox', color: 'blue' },
        { key: 'EN_REVISION_1', label: 'Revisión Jurídica', icon: 'fa-balance-scale', color: 'yellow' },
        { key: 'VALIDO', label: 'Validado', icon: 'fa-check-circle', color: 'green' },
        { key: 'SANCION_ASIGNADA', label: 'Sanción Asignada', icon: 'fa-gavel', color: 'purple' },
        { key: 'CERRADO', label: 'Caso Cerrado', icon: 'fa-flag-checkered', color: 'gray' }
    ];
    
    const currentStateIndex = estados.findIndex(e => e.key === reporte.estado_actual);
    
    timeline.innerHTML = '<div class="space-y-6">' + estados.map((estado, index) => {
        const isPast = index <= currentStateIndex;
        const isCurrent = index === currentStateIndex;
        
        let fechaEstado = '';
        if (reporte.historial) {
            const histItem = reporte.historial.find(h => h.estado_nuevo === estado.key);
            if (histItem) fechaEstado = formatDate(histItem.fecha_cambio);
        }
        
        return `
            <div class="flex items-start gap-5">
                <div class="flex flex-col items-center">
                    <div class="w-16 h-16 rounded-2xl flex items-center justify-center transition-all shadow-xl ${
                        isPast ? `bg-gradient-to-br from-${estado.color}-500 to-${estado.color}-600` : 'bg-gray-200'
                    } ${isCurrent ? 'ring-4 ring-' + estado.color + '-300 scale-110' : ''}">
                        <i class="fas ${estado.icon} text-3xl ${isPast ? 'text-white' : 'text-gray-400'}"></i>
                    </div>
                    ${index < estados.length - 1 ? `
                        <div class="w-1 h-20 ${isPast ? `bg-${estado.color}-400` : 'bg-gray-200'} rounded-full"></div>
                    ` : ''}
                </div>
                <div class="flex-1 ${isPast ? '' : 'opacity-40'}">
                    <div class="flex items-center gap-3 mb-2">
                        <h4 class="font-extrabold text-xl text-gray-900">${estado.label}</h4>
                        ${isCurrent ? `
                            <span class="px-4 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full text-xs font-bold animate-pulse shadow-lg">
                                <i class="fas fa-circle text-xs mr-1"></i>Actual
                            </span>
                        ` : ''}
                    </div>
                    ${fechaEstado ? `
                        <p class="text-base font-bold text-${estado.color}-600 mb-1">
                            <i class="fas fa-calendar-check mr-2"></i>${fechaEstado}
                        </p>
                    ` : ''}
                    ${isPast && !isCurrent ? `
                        <p class="text-sm text-green-600 font-bold">
                            <i class="fas fa-check-double mr-1"></i>Completado
                        </p>
                    ` : ''}
                    ${!isPast ? `
                        <p class="text-sm text-gray-400 font-semibold">
                            <i class="fas fa-clock mr-1"></i>Pendiente
                        </p>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('') + '</div>';
    
    // Descripción
    document.getElementById('admin-modal-descripcion').textContent = reporte.descripcion;
    
    // Vehículo
    const vehiculoSection = document.getElementById('admin-modal-vehiculo-section');
    if (reporte.numero_ruta || reporte.numero_economico) {
        vehiculoSection.classList.remove('hidden');
        document.getElementById('admin-modal-ruta').textContent = reporte.numero_ruta || 'No especificado';
        document.getElementById('admin-modal-economico').textContent = reporte.numero_economico || 'No especificado';
    } else {
        vehiculoSection.classList.add('hidden');
    }
    
    // Ubicación
    const ubicacionSection = document.getElementById('admin-modal-ubicacion-section');
    if (reporte.ubicacion_texto) {
        ubicacionSection.classList.remove('hidden');
        document.getElementById('admin-modal-ubicacion-texto').textContent = reporte.ubicacion_texto;
        
        const mapDiv = document.getElementById('admin-modal-map');
        if (reporte.ubicacion_lat && reporte.ubicacion_lng) {
            mapDiv.classList.remove('hidden');
            setTimeout(() => {
                initAdminModalMap(reporte.ubicacion_lat, reporte.ubicacion_lng);
            }, 200);
        } else {
            mapDiv.classList.add('hidden');
        }
    } else {
        ubicacionSection.classList.add('hidden');
    }
    
    // Comentarios
    const comentariosContainer = document.getElementById('admin-modal-comentarios');
    if (reporte.comentarios && reporte.comentarios.length > 0) {
        comentariosContainer.innerHTML = reporte.comentarios.map(c => `
            <div class="bg-gradient-to-r from-white to-gray-50 rounded-2xl p-6 shadow-lg border-2 border-gray-100 hover:shadow-xl transition-all">
                <div class="flex items-center gap-4 mb-4">
                    <div class="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
                        <span class="text-white text-lg font-extrabold">${getInitials(c.usuario_nombre)}</span>
                    </div>
                    <div>
                        <p class="font-extrabold text-gray-900 text-lg">${c.usuario_nombre}</p>
                        <p class="text-sm text-gray-500 font-semibold">${formatDate(c.fecha_comentario)}</p>
                    </div>
                </div>
                <p class="text-gray-800 leading-relaxed font-medium text-base">${c.comentario}</p>
            </div>
        `).join('');
    } else {
        comentariosContainer.innerHTML = `
            <div class="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
                <i class="fas fa-comments text-6xl text-gray-300 mb-4"></i>
                <p class="text-gray-500 font-bold text-lg">Sin comentarios registrados</p>
            </div>
        `;
    }
}

function initAdminModalMap(lat, lng) {
    const mapElement = document.getElementById('admin-modal-map');
    if (!mapElement) return;
    
    if (adminModalMap) {
        adminModalMap.remove();
        adminModalMap = null;
    }
    
    try {
        adminModalMap = L.map('admin-modal-map', {
            center: [lat, lng],
            zoom: 15,
            zoomControl: true,
            scrollWheelZoom: false
        });
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(adminModalMap);
        
        const redIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });
        
        L.marker([lat, lng], { icon: redIcon }).addTo(adminModalMap)
            .bindPopup('<b>📍 Ubicación del Incidente</b>')
            .openPopup();
        
        setTimeout(() => {
            adminModalMap.invalidateSize();
        }, 100);
        
    } catch (error) {
        console.error('Error al inicializar mapa:', error);
    }
}

function closeAdminModal() {
    document.getElementById('admin-detail-modal').classList.add('hidden');
    if (adminModalMap) {
        adminModalMap.remove();
        adminModalMap = null;
    }
}

// ============================================
// ACCIONES ADMINISTRATIVAS
// ============================================

async function notificarJuridico(reporteId, notificar) {
    const mensaje = notificar 
        ? '¿Confirmas que deseas NOTIFICAR a Jurídico sobre este reporte?' 
        : '¿Confirmas que NO vas a notificar este reporte?';
    
    if (!confirm(mensaje)) return;
    
    showLoading();
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'notificarJuridico',
                token: adminToken,
                reporteId: reporteId,
                notificar: notificar
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(notificar ? '✓ Jurídico ha sido notificado exitosamente' : 'Reporte marcado como NO notificar', 'success');
            loadAdminData();
        } else {
            showToast(result.message || 'Error al procesar', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error de conexión', 'error');
    } finally {
        hideLoading();
    }
}

async function validarReporte(reporteId, esValido) {
    let sancion = '';
    
    if (esValido) {
        const input = document.getElementById(`sancion-${reporteId}`);
        sancion = input ? input.value.trim() : '';
        
        if (!sancion) {
            showToast('⚠️ Debes especificar la sanción que se aplicará', 'error');
            return;
        }
        
        if (!confirm(`¿Confirmas que el reporte ES VÁLIDO?\n\nSanción: "${sancion}"`)) {
            return;
        }
    } else {
        if (!confirm('¿Confirmas que el reporte NO ES VÁLIDO?\n\nEl reporte será rechazado.')) {
            return;
        }
    }
    
    showLoading();
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'validarReporte',
                token: adminToken,
                reporteId: reporteId,
                esValido: esValido,
                sancion: sancion
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(esValido ? '✓ Reporte validado y sanción asignada exitosamente' : 'Reporte marcado como NO válido', 'success');
            loadAdminData();
        } else {
            showToast(result.message || 'Error al validar', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error de conexión', 'error');
    } finally {
        hideLoading();
    }
}

// ============================================
// UTILIDADES
// ============================================

function getInitials(name) {
    if (!name) return '??';
    return name.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase();
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getRoleLabel(rol) {
    const labels = {
        'ENLACE_GENERAL': '👔 Supervisor General',
        'NOTIFICADOR': '📢 Notificador - Primera Revisión',
        'JURIDICO': '⚖️ Jurídico - Validación y Sanciones'
    };
    return labels[rol] || rol;
}

function getEstadoClass(estado) {
    const classes = {
        'NUEVO': 'bg-gradient-to-r from-blue-500 to-blue-600 text-white',
        'EN_REVISION_1': 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white',
        'VALIDO': 'bg-gradient-to-r from-green-500 to-emerald-500 text-white',
        'SANCION_ASIGNADA': 'bg-gradient-to-r from-purple-500 to-pink-500 text-white',
        'CERRADO': 'bg-gradient-to-r from-gray-500 to-gray-600 text-white',
        'RECHAZADO_1': 'bg-gradient-to-r from-red-500 to-rose-500 text-white'
    };
    return classes[estado] || 'bg-gray-200 text-gray-800';
}

function getEstadoLabel(estado) {
    const labels = {
        'NUEVO': '🆕 Nuevo',
        'EN_REVISION_1': '🔍 En Revisión',
        'VALIDO': '✅ Validado',
        'SANCION_ASIGNADA': '⚖️ Sancionado',
        'CERRADO': '🔒 Cerrado',
        'RECHAZADO_1': '❌ Rechazado'
    };
    return labels[estado] || estado;
}

function getCategoriaLabel(categoria) {
    const labels = {
        'CONDUCTOR': '👨‍✈️ Conductor',
        'UNIDAD': '🚌 Unidad/Vehículo',
        'SERVICIO': '🤝 Servicio',
        'DOCUMENTACION': '📄 Documentación',
        'RUTA': '🛣️ Ruta',
        'OTRO': '📋 Otro'
    };
    return labels[categoria] || categoria;
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const icons = {
        success: 'fa-check-circle',
        error: 'fa-times-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };
    
    const colors = {
        success: 'from-green-600 to-emerald-600',
        error: 'from-red-600 to-rose-600',
        warning: 'from-yellow-600 to-orange-600',
        info: 'from-blue-600 to-indigo-600'
    };
    
    const toast = document.createElement('div');
    toast.className = `bg-gradient-to-r ${colors[type]} text-white px-8 py-5 rounded-2xl shadow-2xl flex items-center gap-4 min-w-96 animate-slideInRight transform transition-all`;
    toast.innerHTML = `
        <i class="fas ${icons[type]} text-3xl"></i>
        <span class="font-bold text-lg flex-1">${message}</span>
        <button onclick="this.parentElement.remove()" class="hover:bg-white/20 p-2 rounded-lg transition-all">
            <i class="fas fa-times text-xl"></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-x-full');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

function showLoading() {
    let overlay = document.getElementById('loading-overlay');
    
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'fixed inset-0 bg-black/60 backdrop-blur-md z-[70] flex items-center justify-center';
        overlay.innerHTML = `
            <div class="bg-white rounded-3xl p-12 flex flex-col items-center gap-6 shadow-2xl">
                <div class="w-20 h-20 border-8 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                <p class="text-gray-900 font-extrabold text-2xl">Cargando...</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.remove();
}