// ============================================
// CONFIGURACIÓN GLOBAL - GOOGLE SHEETS VERSION
// ============================================

// IMPORTANTE: Reemplaza esta URL con la que te dio Google Apps Script
const API_URL = 'https://script.google.com/macros/s/AKfycbw4S5fvlmSL8HrXvHYz53c6izar-i9VFBKieBy2O1CsredvCGsVneMUajFqfbqVLQDNyg/exec';

let map = null;
let marker = null;
let currentUser = null;
let authToken = null;
let modalMap = null;
let currentReportId = null;

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    
    const today = new Date().toISOString().split('T')[0];
    const dateInputs = document.querySelectorAll('input[type="date"], input[type="datetime-local"]');
    dateInputs.forEach(input => {
        if (!input.hasAttribute('max')) {
            input.max = today;
        }
    });

    setupRealtimeValidations();
});

// ============================================
// GESTIÓN DE SESIÓN
// ============================================

function checkSession() {
    authToken = localStorage.getItem('authToken');
    const userData = localStorage.getItem('currentUser');
    
    if (authToken && userData) {
        currentUser = JSON.parse(userData);
        showDashboard();
    } else {
        showLanding();
    }
}

function saveSession(token, user) {
    localStorage.setItem('authToken', token);
    localStorage.setItem('currentUser', JSON.stringify(user));
    authToken = token;
    currentUser = user;
}

function clearSession() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    authToken = null;
    currentUser = null;
}

// ============================================
// NAVEGACIÓN ENTRE PÁGINAS
// ============================================

function showLanding() {
    hideAllPages();
    document.getElementById('landing-page').classList.remove('hidden');
}

function showLogin() {
    hideAllPages();
    document.getElementById('login-page').classList.remove('hidden');
}

function showRegister() {
    hideAllPages();
    document.getElementById('register-page').classList.remove('hidden');
    resetRegisterForm();
}

function showDashboard() {
    if (!authToken) {
        showLogin();
        return;
    }
    
    hideAllPages();
    document.getElementById('dashboard-page').classList.remove('hidden');
    
    if (currentUser) {
        document.getElementById('user-name').textContent = currentUser.nombre_completo;
        document.getElementById('user-name-welcome').textContent = currentUser.nombre_completo.split(' ')[0];
        document.getElementById('user-initials').textContent = getInitials(currentUser.nombre_completo);
        document.getElementById('user-email-display').textContent = currentUser.email;
    }
    
    loadDashboardData();
}

function showCreateReport() {
    if (!authToken) {
        showLogin();
        return;
    }
    
    hideAllPages();
    document.getElementById('create-report-page').classList.remove('hidden');
    resetReportForm();
    
    // Mostrar información del usuario en paso 4
    if (currentUser) {
        setTimeout(() => {
            document.getElementById('confirm-nombre').textContent = currentUser.nombre_completo;
            document.getElementById('confirm-email').textContent = currentUser.email;
            document.getElementById('confirm-telefono').textContent = currentUser.telefono || 'No proporcionado';
        }, 100);
    }
    
    setTimeout(() => {
        initMap();
    }, 200);
}

function hideAllPages() {
    const pages = ['landing-page', 'login-page', 'register-page', 'dashboard-page', 'create-report-page'];
    pages.forEach(pageId => {
        const page = document.getElementById(pageId);
        if (page) page.classList.add('hidden');
    });
}

// ============================================
// AUTENTICACIÓN - LOGIN
// ============================================

async function handleLogin(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const data = {
        action: 'login',
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
            saveSession(result.token, result.user);
            showToast('¡Bienvenido de nuevo!', 'success');
            showDashboard();
        } else {
            showToast(result.message || 'Error al iniciar sesión', 'error');
        }
    } catch (error) {
        console.error('Error en login:', error);
        showToast('Error de conexión. Verifica tu internet.', 'error');
    } finally {
        hideLoading();
    }
}

// ============================================
// AUTENTICACIÓN - REGISTRO
// ============================================

let currentRegisterStep = 1;

function resetRegisterForm() {
    currentRegisterStep = 1;
    document.getElementById('register-form').reset();
    showRegisterStep(1);
}

function nextRegisterStep(step) {
    if (step > currentRegisterStep) {
        if (!validateRegisterStep(currentRegisterStep)) {
            return;
        }
    }
    
    currentRegisterStep = step;
    showRegisterStep(step);
}

function showRegisterStep(step) {
    document.querySelectorAll('.register-step').forEach(s => s.classList.add('hidden'));
    const stepElement = document.getElementById(`register-step-${step}`);
    if (stepElement) stepElement.classList.remove('hidden');
    
    for (let i = 1; i <= 3; i++) {
        const indicator = document.getElementById(`step-${i}-indicator`);
        const line = indicator?.nextElementSibling;
        
        if (i < step) {
            indicator?.classList.remove('bg-gray-300', 'bg-emerald-600');
            indicator?.classList.add('bg-emerald-600');
            if (indicator) indicator.innerHTML = '<i class="fas fa-check"></i>';
            if (line) line.classList.replace('bg-gray-300', 'bg-emerald-600');
        } else if (i === step) {
            indicator?.classList.remove('bg-gray-300', 'bg-emerald-600');
            indicator?.classList.add('bg-emerald-600');
            if (indicator) indicator.textContent = i;
            if (line) line.classList.replace('bg-emerald-600', 'bg-gray-300');
        } else {
            indicator?.classList.remove('bg-emerald-600');
            indicator?.classList.add('bg-gray-300');
            if (indicator) indicator.textContent = i;
            if (line) line.classList.replace('bg-emerald-600', 'bg-gray-300');
        }
    }
}

function validateRegisterStep(step) {
    let isValid = true;
    
    if (step === 1) {
        const nombre = document.getElementById('nombre_completo')?.value.trim();
        if (!nombre || nombre.length < 3) {
            showToast('El nombre debe tener al menos 3 caracteres', 'error');
            isValid = false;
        }
    } else if (step === 2) {
        const email = document.getElementById('email')?.value.trim();
        const telefono = document.getElementById('telefono')?.value.trim();
        
        if (!isValidEmail(email)) {
            showToast('Email inválido', 'error');
            isValid = false;
        }
        
        if (telefono && telefono.length !== 10) {
            showToast('El teléfono debe tener 10 dígitos', 'error');
            isValid = false;
        }
    } else if (step === 3) {
        const password = document.getElementById('password')?.value;
        const confirmPassword = document.getElementById('password_confirm')?.value;
        
        if (!password || password.length < 8) {
            showToast('La contraseña debe tener al menos 8 caracteres', 'error');
            isValid = false;
        }
        
        if (password !== confirmPassword) {
            showToast('Las contraseñas no coinciden', 'error');
            isValid = false;
        }
    }
    
    return isValid;
}

async function handleRegister(event) {
    event.preventDefault();
    
    if (!validateRegisterStep(3)) {
        return;
    }
    
    const formData = new FormData(event.target);
    const data = {
        action: 'register',
        nombre_completo: formData.get('nombre_completo'),
        email: formData.get('email'),
        telefono: formData.get('telefono'),
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
            saveSession(result.token, result.user);
            showToast('¡Cuenta creada exitosamente! Bienvenido.', 'success');
            setTimeout(() => {
                showDashboard();
            }, 1000);
        } else {
            showToast(result.message || 'Error al registrar usuario', 'error');
        }
    } catch (error) {
        console.error('Error en registro:', error);
        showToast('Error de conexión. Verifica tu internet.', 'error');
    } finally {
        hideLoading();
    }
}

function handleLogout() {
    if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
        clearSession();
        showToast('Sesión cerrada exitosamente', 'success');
        showLanding();
    }
}

// ============================================
// DASHBOARD - CARGAR DATOS
// ============================================

async function loadDashboardData() {
    showLoading();
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'getMyReports',
                token: authToken
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            updateStats(result.data);
            displayReports(result.data);
        } else {
            showToast('Error al cargar reportes', 'error');
            document.getElementById('reports-list').innerHTML = `
                <div class="p-12 text-center">
                    <i class="fas fa-inbox text-6xl text-gray-300 mb-4"></i>
                    <p class="text-gray-500 text-lg">No hay reportes aún</p>
                    <button onclick="showCreateReport()" class="mt-4 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                        Crear Primer Reporte
                    </button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error al cargar dashboard:', error);
        showToast('Error de conexión', 'error');
        
        document.getElementById('reports-list').innerHTML = `
            <div class="p-12 text-center">
                <i class="fas fa-exclamation-triangle text-6xl text-red-300 mb-4"></i>
                <p class="text-gray-500 text-lg">Error al cargar reportes</p>
                <button onclick="loadDashboardData()" class="mt-4 px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                    <i class="fas fa-redo mr-2"></i>Reintentar
                </button>
            </div>
        `;
    } finally {
        hideLoading();
    }
}

function updateStats(reportes) {
    const total = reportes.length;
    const enProceso = reportes.filter(r => 
        ['NUEVO', 'EN_REVISION_1', 'EN_REVISION_2', 'APROBADO_1'].includes(r.estado_actual)
    ).length;
    const resueltos = reportes.filter(r => ['SANCION_ASIGNADA', 'CERRADO'].includes(r.estado_actual)).length;
    const sancionados = reportes.filter(r => r.estado_actual === 'SANCION_ASIGNADA').length;
    
    animateValue('total-reportes', 0, total, 1000);
    animateValue('reportes-proceso', 0, enProceso, 1000);
    animateValue('reportes-resueltos', 0, resueltos, 1000);
    animateValue('reportes-sancionados', 0, sancionados, 1000);
}

function displayReports(reportes) {
    const container = document.getElementById('reports-list');
    
    if (reportes.length === 0) {
        container.innerHTML = `
            <div class="p-12 text-center">
                <i class="fas fa-inbox text-6xl text-gray-300 mb-4"></i>
                <p class="text-gray-500 text-lg font-semibold mb-2">No tienes reportes aún</p>
                <p class="text-gray-400 mb-6">Crea tu primer reporte para comenzar</p>
                <button onclick="showCreateReport()" class="px-8 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 font-bold shadow-lg transform hover:scale-105 transition-all">
                    <i class="fas fa-plus-circle mr-2"></i>Crear Mi Primer Reporte
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = reportes.map(reporte => `
        <div class="p-6 hover:bg-gray-50 transition-all cursor-pointer group" onclick="viewReportDetail('${reporte.id}')">
            <div class="flex items-start justify-between">
                <div class="flex-1">
                    <div class="flex items-center gap-3 mb-3">
                        <span class="text-lg font-bold text-gray-900">${reporte.folio}</span>
                        <span class="${getEstadoClass(reporte.estado_actual)} px-3 py-1 rounded-full text-xs font-bold">
                            ${getEstadoLabel(reporte.estado_actual)}
                        </span>
                        <span class="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
                            ${getCategoriaLabel(reporte.categoria)}
                        </span>
                    </div>
                    <h4 class="text-lg font-bold text-gray-900 mb-2 group-hover:text-emerald-700 transition-colors">
                        ${reporte.tipo_infraccion}
                    </h4>
                    <p class="text-gray-600 text-sm mb-3 line-clamp-2">${reporte.descripcion}</p>
                    <div class="flex items-center gap-4 text-sm text-gray-500">
                        <span><i class="fas fa-calendar mr-1"></i>${formatDate(reporte.fecha_incidente)}</span>
                        ${reporte.ubicacion_texto ? `<span><i class="fas fa-map-marker-alt mr-1"></i>${reporte.ubicacion_texto.substring(0, 40)}...</span>` : ''}
                    </div>
                </div>
                <div class="ml-4">
                    <i class="fas fa-chevron-right text-gray-400 text-xl group-hover:text-emerald-600 group-hover:translate-x-1 transition-all"></i>
                </div>
            </div>
        </div>
    `).join('');
}

// ============================================
// CREAR REPORTE - PASOS
// ============================================

let currentReportStep = 1;

function resetReportForm() {
    currentReportStep = 1;
    const form = document.getElementById('create-report-form');
    if (form) form.reset();
    showReportStep(1);
}

function nextReportStep(step) {
    if (step > currentReportStep) {
        if (!validateReportStep(currentReportStep)) {
            return;
        }
    }
    
    currentReportStep = step;
    showReportStep(step);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showReportStep(step) {
    document.querySelectorAll('.report-step').forEach(s => s.classList.add('hidden'));
    const stepElement = document.getElementById(`report-step-${step}`);
    if (stepElement) stepElement.classList.remove('hidden');
    
    for (let i = 1; i <= 4; i++) {
        const indicator = document.getElementById(`report-step-${i}-indicator`);
        const line = indicator?.nextElementSibling;
        
        if (i < step) {
            indicator?.classList.remove('bg-gray-300', 'bg-emerald-600');
            indicator?.classList.add('bg-emerald-600');
            if (indicator) indicator.innerHTML = '<i class="fas fa-check"></i>';
            if (line) line.classList.replace('bg-gray-300', 'bg-emerald-600');
        } else if (i === step) {
            indicator?.classList.remove('bg-gray-300', 'bg-emerald-600');
            indicator?.classList.add('bg-emerald-600');
            if (indicator) indicator.textContent = i;
            if (line) line.classList.replace('bg-emerald-600', 'bg-gray-300');
        } else {
            indicator?.classList.remove('bg-emerald-600');
            indicator?.classList.add('bg-gray-300');
            if (indicator) indicator.textContent = i;
            if (line) line.classList.replace('bg-emerald-600', 'bg-gray-300');
        }
    }
}

function validateReportStep(step) {
    let isValid = true;
    
    if (step === 1) {
        const categoria = document.querySelector('input[name="categoria"]:checked');
        const tipoInfraccion = document.querySelector('input[name="tipo_infraccion"]')?.value.trim();
        const fechaIncidente = document.querySelector('input[name="fecha_incidente"]')?.value;
        
        if (!categoria) {
            showToast('Selecciona un tipo de reporte', 'error');
            isValid = false;
        }
        
        if (!tipoInfraccion || tipoInfraccion.length < 5) {
            showToast('Escribe un título descriptivo (mínimo 5 caracteres)', 'error');
            isValid = false;
        }
        
        if (!fechaIncidente) {
            showToast('Indica cuándo ocurrió el incidente', 'error');
            isValid = false;
        }
    } else if (step === 2) {
        const descripcion = document.querySelector('textarea[name="descripcion"]')?.value.trim();
        
        if (!descripcion || descripcion.length < 20) {
            showToast('La descripción debe tener al menos 20 caracteres', 'error');
            isValid = false;
        }
    }
    
    return isValid;
}

async function handleCreateReport(event) {
    event.preventDefault();
    
    if (!validateReportStep(4)) {
        return;
    }
    
    const formData = new FormData(event.target);
    
    const data = {
        action: 'createReport',
        token: authToken,
        tipo_infraccion: formData.get('tipo_infraccion'),
        categoria: formData.get('categoria'),
        descripcion: formData.get('descripcion'),
        fecha_incidente: formData.get('fecha_incidente'),
        numero_ruta: formData.get('numero_ruta') || null,
        numero_economico: formData.get('numero_economico') || null,
        ubicacion_texto: formData.get('ubicacion_texto') || null,
        ubicacion_lat: formData.get('ubicacion_lat') || null,
        ubicacion_lng: formData.get('ubicacion_lng') || null
    };
    
    showLoading();
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('¡Reporte creado exitosamente! Folio: ' + result.data.folio, 'success');
            setTimeout(() => {
                showDashboard();
            }, 2000);
        } else {
            showToast(result.message || 'Error al crear reporte', 'error');
        }
    } catch (error) {
        console.error('Error al crear reporte:', error);
        showToast('Error de conexión. Intenta nuevamente.', 'error');
    } finally {
        hideLoading();
    }
}

// ============================================
// MAPA INTERACTIVO - MEJORADO
// ============================================

function initMap() {
    const mapElement = document.getElementById('map');
    if (!mapElement) return;
    
    if (map) {
        map.remove();
        map = null;
    }
    
    // Coordenadas de Tuxtla Gutiérrez, Chiapas
    const defaultLat = 16.7516;
    const defaultLng = -93.1133;
    
    try {
        map = L.map('map', {
            center: [defaultLat, defaultLng],
            zoom: 13,
            zoomControl: true,
            attributionControl: true
        });
        
        // Agregar capa de tiles con mejor calidad
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19,
            minZoom: 10
        }).addTo(map);
        
        // Control de zoom en posición derecha
        map.zoomControl.setPosition('topright');
        
        // Click en el mapa para marcar ubicación
        map.on('click', function(e) {
            const lat = e.latlng.lat;
            const lng = e.latlng.lng;
            
            if (marker) {
                map.removeLayer(marker);
            }
            
            // Icono personalizado verde
            const greenIcon = L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });
            
            marker = L.marker([lat, lng], { icon: greenIcon }).addTo(map);
            marker.bindPopup('<b>Ubicación seleccionada</b><br>Lat: ' + lat.toFixed(6) + '<br>Lng: ' + lng.toFixed(6)).openPopup();
            
            document.getElementById('lat').value = lat.toFixed(6);
            document.getElementById('lng').value = lng.toFixed(6);
            
            showToast('✓ Ubicación marcada en el mapa', 'success');
        });
        
        // Forzar renderizado correcto del mapa
        setTimeout(() => {
            map.invalidateSize();
        }, 100);
        
    } catch (error) {
        console.error('Error al inicializar mapa:', error);
        showToast('Error al cargar el mapa', 'error');
    }
}

function getCurrentLocation() {
    if (!navigator.geolocation) {
        showToast('Tu navegador no soporta geolocalización', 'error');
        return;
    }
    
    showLoading();
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            
            if (!map) {
                hideLoading();
                showToast('El mapa no está inicializado', 'error');
                return;
            }
            
            map.setView([lat, lng], 16);
            
            if (marker) {
                map.removeLayer(marker);
            }
            
            // Icono rojo para ubicación actual
            const redIcon = L.icon({
                iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41]
            });
            
            marker = L.marker([lat, lng], { icon: redIcon }).addTo(map);
            marker.bindPopup('<b>📍 Tu ubicación actual</b><br>Lat: ' + lat.toFixed(6) + '<br>Lng: ' + lng.toFixed(6)).openPopup();
            
            document.getElementById('lat').value = lat.toFixed(6);
            document.getElementById('lng').value = lng.toFixed(6);
            
            hideLoading();
            showToast('✓ Ubicación actual obtenida', 'success');
        },
        (error) => {
            hideLoading();
            
            let errorMsg = 'No se pudo obtener tu ubicación';
            
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMsg = 'Debes permitir el acceso a tu ubicación';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMsg = 'Tu ubicación no está disponible';
                    break;
                case error.TIMEOUT:
                    errorMsg = 'La solicitud expiró. Intenta nuevamente';
                    break;
            }
            
            showToast(errorMsg, 'error');
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
        }
    );
}

// ============================================
// MODAL DE DETALLE - MEJORADO CON SEGUIMIENTO REAL
// ============================================

async function viewReportDetail(reportId) {
    currentReportId = reportId;
    showLoading();
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'getReportDetail',
                reportId: reportId,
                token: authToken
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            displayReportDetail(result.data);
            document.getElementById('report-detail-modal').classList.remove('hidden');
        } else {
            showToast('Error al cargar el reporte', 'error');
        }
    } catch (error) {
        console.error('Error al cargar detalle:', error);
        showToast('Error de conexión. Intenta nuevamente.', 'error');
    } finally {
        hideLoading();
    }
}

function displayReportDetail(reporte) {
    // Header
    document.getElementById('modal-folio').textContent = reporte.folio;
    document.getElementById('modal-fecha-creacion').textContent = `Creado el ${formatDate(reporte.fecha_creacion)}`;
    document.getElementById('modal-estado-badge-header').textContent = getEstadoLabel(reporte.estado_actual);
    
    // RESUMEN
    document.getElementById('modal-categoria-resumen').textContent = getCategoriaLabel(reporte.categoria);
    document.getElementById('modal-tipo-resumen').textContent = reporte.tipo_infraccion;
    document.getElementById('modal-fecha-resumen').textContent = formatDate(reporte.fecha_incidente);
    document.getElementById('modal-estado-resumen').textContent = getEstadoLabel(reporte.estado_actual);
    
    // DATOS DEL REPORTANTE
    document.getElementById('modal-reportante-nombre').textContent = reporte.reportante_nombre || currentUser?.nombre_completo || 'N/A';
    document.getElementById('modal-reportante-email').textContent = reporte.reportante_email || currentUser?.email || 'N/A';
    document.getElementById('modal-reportante-telefono').textContent = reporte.reportante_telefono || currentUser?.telefono || 'No proporcionado';
    
    // TIMELINE DE SEGUIMIENTO EN TIEMPO REAL
    const timeline = document.getElementById('modal-timeline');
    
    const estados = [
        { key: 'NUEVO', label: 'Reporte Recibido', icon: 'fa-plus-circle', color: 'blue', desc: 'Tu reporte ha sido recibido exitosamente' },
        { key: 'EN_REVISION_1', label: 'En Revisión Jurídica', icon: 'fa-search', color: 'yellow', desc: 'El área jurídica está revisando tu reporte' },
        { key: 'VALIDO', label: 'Reporte Validado', icon: 'fa-check-circle', color: 'green', desc: 'Tu reporte ha sido validado como procedente' },
        { key: 'SANCION_ASIGNADA', label: 'Sanción Asignada', icon: 'fa-gavel', color: 'purple', desc: 'Se ha asignado una sanción al infractor' },
        { key: 'CERRADO', label: 'Caso Cerrado', icon: 'fa-flag-checkered', color: 'gray', desc: 'El caso ha sido cerrado exitosamente' }
    ];
    
    const currentStateIndex = estados.findIndex(e => e.key === reporte.estado_actual);
    
    timeline.innerHTML = '<div class="space-y-6">' + estados.map((estado, index) => {
        const isPast = index <= currentStateIndex;
        const isCurrent = index === currentStateIndex;
        
        // Buscar fecha en historial
        let fechaEstado = '';
        if (reporte.historial && reporte.historial.length > 0) {
            const historialItem = reporte.historial.find(h => h.estado_nuevo === estado.key);
            if (historialItem) {
                fechaEstado = formatDate(historialItem.fecha_cambio);
            }
        }
        
        return `
            <div class="flex items-start gap-4">
                <div class="flex flex-col items-center">
                    <div class="w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                        isPast 
                            ? `bg-${estado.color}-100 ring-4 ${isCurrent ? `ring-${estado.color}-300` : 'ring-transparent'}` 
                            : 'bg-gray-100'
                    } ${isCurrent ? 'shadow-xl scale-110' : 'shadow-md'}">
                        <i class="fas ${estado.icon} text-2xl ${isPast ? `text-${estado.color}-600` : 'text-gray-400'}"></i>
                    </div>
                    ${index < estados.length - 1 ? `
                        <div class="w-1 h-20 ${isPast ? `bg-${estado.color}-300` : 'bg-gray-200'} rounded-full transition-all"></div>
                    ` : ''}
                </div>
                <div class="flex-1 ${isPast ? '' : 'opacity-50'} pb-4">
                    <div class="flex items-center gap-3 mb-2">
                        <h4 class="font-bold text-lg text-gray-900">${estado.label}</h4>
                        ${isCurrent ? `
                            <span class="px-3 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-full text-xs font-bold animate-pulse shadow-lg">
                                <i class="fas fa-circle text-xs mr-1"></i>Estado Actual
                            </span>
                        ` : ''}
                    </div>
                    <p class="text-sm text-gray-600 mb-2">${estado.desc}</p>
                    ${fechaEstado ? `
                        <p class="text-sm font-semibold text-${estado.color}-600">
                            <i class="fas fa-calendar-check mr-1"></i>${fechaEstado}
                        </p>
                    ` : ''}
                    ${isPast && !isCurrent ? `
                        <p class="text-xs text-green-600 mt-2 font-semibold">
                            <i class="fas fa-check-double mr-1"></i>Completado
                        </p>
                    ` : ''}
                    ${!isPast ? `
                        <p class="text-xs text-gray-400 mt-2">
                            <i class="fas fa-clock mr-1"></i>Pendiente
                        </p>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('') + '</div>';
    
    // Descripción
    document.getElementById('modal-descripcion').textContent = reporte.descripcion;
    
    // Información del Vehículo
    const vehiculoInfo = document.getElementById('modal-vehiculo-info');
    if (reporte.numero_ruta || reporte.numero_economico) {
        vehiculoInfo.classList.remove('hidden');
        document.getElementById('modal-numero-ruta').textContent = reporte.numero_ruta || 'No especificado';
        document.getElementById('modal-numero-economico').textContent = reporte.numero_economico || 'No especificado';
    } else {
        vehiculoInfo.classList.add('hidden');
    }
    
    // Ubicación
    const ubicacionInfo = document.getElementById('modal-ubicacion-info');
    if (reporte.ubicacion_texto) {
        ubicacionInfo.classList.remove('hidden');
        document.getElementById('modal-ubicacion').textContent = reporte.ubicacion_texto;
        
        const modalMapDiv = document.getElementById('modal-map');
        if (reporte.ubicacion_lat && reporte.ubicacion_lng) {
            modalMapDiv.classList.remove('hidden');
            setTimeout(() => {
                initModalMap(reporte.ubicacion_lat, reporte.ubicacion_lng);
            }, 200);
        } else {
            modalMapDiv.classList.add('hidden');
        }
    } else {
        ubicacionInfo.classList.add('hidden');
    }
    
    // Comentarios
    const comentariosContainer = document.getElementById('modal-comentarios');
    if (reporte.comentarios && reporte.comentarios.length > 0) {
        comentariosContainer.innerHTML = reporte.comentarios.map(c => `
            <div class="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all">
                <div class="flex items-center gap-3 mb-3">
                    <div class="w-10 h-10 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-full flex items-center justify-center shadow-md">
                        <span class="text-white text-sm font-bold">${getInitials(c.usuario_nombre)}</span>
                    </div>
                    <div>
                        <p class="font-semibold text-gray-900">${c.usuario_nombre}</p>
                        <p class="text-xs text-gray-500">${formatDate(c.fecha_comentario)}</p>
                    </div>
                </div>
                <p class="text-gray-700 leading-relaxed">${c.comentario}</p>
            </div>
        `).join('');
    } else {
        comentariosContainer.innerHTML = `
            <div class="text-center py-8 bg-gray-50 rounded-xl">
                <i class="fas fa-comments text-4xl text-gray-300 mb-3"></i>
                <p class="text-gray-500">Sin comentarios aún. Sé el primero en comentar.</p>
            </div>
        `;
    }
}

function initModalMap(lat, lng) {
    const modalMapElement = document.getElementById('modal-map');
    if (!modalMapElement) return;
    
    if (modalMap) {
        modalMap.remove();
        modalMap = null;
    }
    
    try {
        modalMap = L.map('modal-map', {
            center: [lat, lng],
            zoom: 15,
            zoomControl: true,
            attributionControl: true,
            scrollWheelZoom: false
        });
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors',
            maxZoom: 19
        }).addTo(modalMap);
        
        const blueIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });
        
        L.marker([lat, lng], { icon: blueIcon }).addTo(modalMap)
            .bindPopup('<b>Ubicación del Incidente</b><br>Lat: ' + lat + '<br>Lng: ' + lng)
            .openPopup();
        
        setTimeout(() => {
            modalMap.invalidateSize();
        }, 100);
        
    } catch (error) {
        console.error('Error al inicializar mapa del modal:', error);
    }
}

function closeReportDetail() {
    document.getElementById('report-detail-modal').classList.add('hidden');
    if (modalMap) {
        modalMap.remove();
        modalMap = null;
    }
    currentReportId = null;
}

async function addComment(event) {
    event.preventDefault();
    
    if (!currentReportId) {
        showToast('Error: Reporte no identificado', 'error');
        return;
    }
    
    const formData = new FormData(event.target);
    const comentario = formData.get('comentario');
    
    if (!comentario || comentario.trim().length < 3) {
        showToast('El comentario es muy corto', 'error');
        return;
    }
    
    showLoading();
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({
                action: 'addComment',
                reportId: currentReportId,
                comentario: comentario,
                token: authToken
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Comentario agregado exitosamente', 'success');
            event.target.reset();
            // Recargar detalle
            viewReportDetail(currentReportId);
        } else {
            showToast(result.message || 'Error al agregar comentario', 'error');
        }
    } catch (error) {
        console.error('Error al agregar comentario:', error);
        showToast('Error de conexión', 'error');
    } finally {
        hideLoading();
    }
}

// ============================================
// VALIDACIONES EN TIEMPO REAL
// ============================================

function setupRealtimeValidations() {
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.addEventListener('blur', function() {
            const email = this.value.trim();
            const feedback = document.getElementById('email-validation');
            
            if (feedback) {
                if (isValidEmail(email)) {
                    feedback.innerHTML = '<p class="text-xs text-green-600"><i class="fas fa-check-circle mr-1"></i>Email válido</p>';
                } else if (email.length > 0) {
                    feedback.innerHTML = '<p class="text-xs text-red-600"><i class="fas fa-times-circle mr-1"></i>Email inválido</p>';
                } else {
                    feedback.innerHTML = '';
                }
            }
        });
    }
    
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            validatePasswordStrength(this.value);
        });
    }
    
    const confirmPasswordInput = document.getElementById('password_confirm');
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', function() {
            const password = document.getElementById('password')?.value;
            const feedback = document.getElementById('password-match');
            
            if (feedback) {
                if (this.value === password && this.value.length > 0) {
                    feedback.innerHTML = '<p class="text-xs text-green-600"><i class="fas fa-check-circle mr-1"></i>Las contraseñas coinciden</p>';
                } else if (this.value.length > 0) {
                    feedback.innerHTML = '<p class="text-xs text-red-600"><i class="fas fa-times-circle mr-1"></i>Las contraseñas no coinciden</p>';
                } else {
                    feedback.innerHTML = '';
                }
            }
        });
    }
}

function validatePasswordStrength(password) {
    const feedback = document.getElementById('password-strength');
    
    if (!feedback) return;
    
    const strength = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password)
    };
    
    const score = Object.values(strength).filter(v => v).length;
    
    let html = '<div class="flex items-center gap-2 mb-2">';
    
    for (let i = 0; i < 4; i++) {
        if (i < score) {
            html += '<div class="flex-1 h-2 bg-emerald-600 rounded-full"></div>';
        } else {
            html += '<div class="flex-1 h-2 bg-gray-300 rounded-full"></div>';
        }
    }
    
    html += '</div>';
    
    if (score < 2) {
        html += '<p class="text-xs text-red-600"><i class="fas fa-exclamation-triangle mr-1"></i>Contraseña débil</p>';
    } else if (score < 3) {
        html += '<p class="text-xs text-yellow-600"><i class="fas fa-shield-alt mr-1"></i>Contraseña media</p>';
    } else if (score < 4) {
        html += '<p class="text-xs text-emerald-600"><i class="fas fa-check-circle mr-1"></i>Contraseña fuerte</p>';
    } else {
        html += '<p class="text-xs text-emerald-600"><i class="fas fa-check-double mr-1"></i>Contraseña muy fuerte</p>';
    }
    
    feedback.innerHTML = html;
}

// ============================================
// UTILIDADES
// ============================================

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getInitials(name) {
    if (!name) return '??';
    return name.split(' ')
        .map(word => word[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
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

function getEstadoClass(estado) {
    const classes = {
        'NUEVO': 'bg-blue-100 text-blue-800',
        'EN_REVISION_1': 'bg-yellow-100 text-yellow-800',
        'VALIDO': 'bg-green-100 text-green-800',
        'SANCION_ASIGNADA': 'bg-purple-100 text-purple-800',
        'CERRADO': 'bg-gray-100 text-gray-800',
        'RECHAZADO_1': 'bg-red-100 text-red-800'
    };
    return classes[estado] || 'bg-gray-100 text-gray-800';
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

function animateValue(id, start, end, duration) {
    const element = document.getElementById(id);
    if (!element) return;
    
    const range = end - start;
    const increment = range / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= end) {
            element.textContent = end;
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, 16);
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
        success: 'bg-green-600',
        error: 'bg-red-600',
        warning: 'bg-yellow-600',
        info: 'bg-blue-600'
    };
    
    const toast = document.createElement('div');
    toast.className = `${colors[type]} text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 min-w-80 animate-slideInRight`;
    toast.innerHTML = `
        <i class="fas ${icons[type]} text-2xl"></i>
        <span class="font-semibold flex-1">${message}</span>
        <button onclick="this.parentElement.remove()" class="ml-auto hover:opacity-80 transition-opacity">
            <i class="fas fa-times"></i>
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
        overlay.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center';
        overlay.innerHTML = `
            <div class="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-2xl">
                <div class="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                <p class="text-gray-700 font-semibold">Cargando...</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.remove();
    }
}