/* ========================================
   JEOVANNY VARIEDADES - Lógica Principal
   Gestiona la interfaz del catálogo
   ======================================== */

const ADMIN_PASSWORD = 'proyecto';
const appState = {
    categoriaActual: 'Todos',
    busqueda: '',
    soloDisponibles: false
};

async function inicializarApp() {
    await inicializarDatos();
    renderizarCategorias();
    renderizarProductos();
    actualizarContador();
    actualizarChatBadge();
    configurarEventos();
    configurarAccesoAdmin();
}

function configurarAccesoAdmin() {
    const adminButton = document.getElementById('adminButton');
    const adminNavButton = document.querySelector('.nav-btn[data-action="admin"]');
    const autenticado = estaAutenticadoAdmin();

    if (adminButton) {
        adminButton.textContent = autenticado ? '⚙️' : '🔒';
        adminButton.title = autenticado ? 'Panel administrador' : 'Acceder';
    }

    if (adminNavButton) {
        adminNavButton.style.display = autenticado ? 'grid' : 'none';
    }
}

function mostrarLoginModal() {
    const overlay = document.getElementById('loginModalOverlay');
    const content = document.getElementById('loginModalContent');
    if (!overlay || !content) return;

    document.documentElement.classList.add('modal-open');
    document.body.classList.add('modal-open');

    content.innerHTML = `
      <div class="modal-header" role="dialog" aria-modal="true" aria-labelledby="loginModalTitle">
        <div class="modal-brand">
          <div class="brand-logo modal-brand-logo">
            <img src="img/logo.png" alt="Logo JEOVANNY VARIEDADES">
          </div>
          <div class="brand-copy">
            <p id="loginModalTitle" class="brand-title">JEOVANNY VARIEDADES</p>
            <p class="brand-subtitle">Acceso administrador</p>
          </div>
        </div>
        <button type="button" class="modal-close" aria-label="Cerrar">×</button>
      </div>
      <div class="modal-body">
        <p class="section-subtitle">Introduce la contraseña para acceder al panel seguro.</p>
        <div class="form-group">
          <label for="adminPasswordInput">Contraseña</label>
          <input id="adminPasswordInput" class="form-input" type="password" autocomplete="current-password" placeholder="••••••••" />
        </div>
        <div class="login-error hidden" id="loginError">Contraseña incorrecta. Intenta de nuevo.</div>
        <div style="display:flex; gap:0.75rem; flex-wrap:wrap; align-items:center; margin-top:0.5rem;">
          <button id="loginSubmit" class="btn-primary">Entrar</button>
          <button id="loginCancel" class="btn-secondary" type="button">Cancelar</button>
        </div>
      </div>
    `;

    overlay.classList.remove('hidden');
    content.querySelector('.modal-close')?.addEventListener('click', cerrarLoginModal);
    document.getElementById('loginCancel')?.addEventListener('click', cerrarLoginModal);
    document.getElementById('loginSubmit')?.addEventListener('click', manejarLoginSubmit);
    document.getElementById('adminPasswordInput')?.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault();
            manejarLoginSubmit();
        }
    });
    overlay.addEventListener('click', cerrarLoginModalOnBackground, { once: true });
}

function cerrarLoginModalOnBackground(event) {
    const overlay = document.getElementById('loginModalOverlay');
    if (event.target === overlay) {
        cerrarLoginModal();
    }
}

function cerrarLoginModal() {
    const overlay = document.getElementById('loginModalOverlay');
    const content = document.getElementById('loginModalContent');
    if (!overlay || !content) return;

    overlay.classList.add('hidden');
    content.innerHTML = '';
    document.documentElement.classList.remove('modal-open');
    document.body.classList.remove('modal-open');
}

function manejarLoginSubmit() {
    const passwordInput = document.getElementById('adminPasswordInput');
    const errorMessage = document.getElementById('loginError');
    if (!passwordInput || !errorMessage) return;

    const valor = passwordInput.value.trim();
    if (valor === ADMIN_PASSWORD) {
        iniciarSesionAdmin();
        cerrarLoginModal();
        configurarAccesoAdmin();
        window.location.href = 'pages/admin.html';
        return;
    }

    errorMessage.classList.remove('hidden');
    errorMessage.style.opacity = '1';
}

function renderizarCategorias() {
    const lista = document.getElementById('categoryList');
    if (!lista) return;

    const categorias = ['Todos', ...obtenerCategorias().map(cat => cat.nombre)];
    lista.innerHTML = categorias.map(nombre => `
        <button type="button" class="category-pill${nombre === appState.categoriaActual ? ' active' : ''}">${nombre}</button>
    `).join('');

    lista.querySelectorAll('button').forEach(boton => {
        boton.addEventListener('click', () => {
            appState.categoriaActual = boton.textContent;
            renderizarCategorias();
            renderizarProductos();
        });
    });
}

function renderizarProductos() {
    const contenedor = document.getElementById('productsGrid');
    if (!contenedor) return;

    let productos = obtenerProductos();
    if (appState.categoriaActual !== 'Todos') {
        productos = productos.filter(item => item.categoria === appState.categoriaActual);
    }
    if (appState.soloDisponibles) {
        productos = productos.filter(item => item.disponible === true);
    }

    const termino = appState.busqueda.trim().toLowerCase();
    if (termino) {
        productos = productos.filter(item => {
            return item.nombre.toLowerCase().includes(termino) ||
                item.descripcion.toLowerCase().includes(termino) ||
                item.categoria.toLowerCase().includes(termino);
        });
    }

    document.getElementById('productInfo').textContent = productos.length
        ? `Mostrando ${productos.length} productos`
        : 'No se encontraron productos';

    const emptyState = document.getElementById('emptyState');
    if (productos.length === 0) {
        contenedor.innerHTML = '';
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    contenedor.innerHTML = '';
    productos.forEach(producto => contenedor.appendChild(crearTarjetaProducto(producto)));
    if (window.cargarImagenesDesdeIDB) window.cargarImagenesDesdeIDB(contenedor);
}

function crearTarjetaProducto(producto) {
    const card = document.createElement('article');
    card.className = 'product-card';

    const seleccionado = obtenerSeleccionados().includes(producto.id);
    const estadoClass = producto.disponible ? 'available' : 'unavailable';
    const estadoTexto = producto.disponible ? 'Disponible' : 'Agotado';
    const imagenId = typeof window.obtenerImagenIdDeProducto === 'function'
        ? window.obtenerImagenIdDeProducto(producto)
        : (producto.imagenId ?? null);
    const tieneImagen = Number.isFinite(imagenId);
    const imagenHtml = tieneImagen
        ? `<img data-image-id="${imagenId}" alt="${producto.nombre}">`
        : `<span>📦</span>`;

    card.innerHTML = `
        <div class="product-hero">${imagenHtml}</div>
        <div class="product-body">
            <div class="product-header">
                <h3 class="product-name">${producto.nombre}</h3>
                <span class="product-status ${estadoClass}">${estadoTexto}</span>
            </div>
            <p class="product-description">${producto.descripcion}</p>
            <div class="product-footer">
                <span class="product-price">$${producto.precio.toFixed(2)}</span>
                <button class="btn-select ${seleccionado ? 'selected' : ''}" type="button" ${!producto.disponible ? 'disabled' : ''}>
                    ${seleccionado ? '✓ Seleccionado' : 'Seleccionar'}
                </button>
            </div>
        </div>
    `;

    card.querySelector('button')?.addEventListener('click', () => toggleSeleccionar(producto.id));
    return card;
}

function toggleSeleccionar(productoId) {
    const seleccionados = obtenerSeleccionados();
    if (seleccionados.includes(productoId)) {
        removerSeleccionado(productoId);
    } else {
        agregarSeleccionado(productoId);
    }
    actualizarContador();
    actualizarChatBadge();
    renderizarProductos();
}

function actualizarContador() {
    const contador = document.getElementById('selectedCount');
    if (!contador) return;
    contador.textContent = obtenerSeleccionados().length;
}

function abrirConsulta() {
    if (obtenerSeleccionados().length === 0) {
        if (typeof mostrarToast === 'function') {
            mostrarToast('Selecciona al menos un producto antes de abrir el chat.', 'error');
            return;
        }
        alert('Selecciona al menos un producto antes de abrir el chat.');
        return;
    }
    window.location.href = 'pages/chat.html';
}

function alternarFiltroDisponibles() {
    appState.soloDisponibles = !appState.soloDisponibles;
    const boton = document.getElementById('filterAvailable');
    if (boton) {
        boton.textContent = appState.soloDisponibles ? 'Ver todos' : 'Solo disponibles';
    }
    renderizarProductos();
}

function actualizarChatBadge() {
    const badge = document.getElementById('fabCount');
    if (!badge) return;
    const contador = obtenerSeleccionados().length;
    badge.textContent = contador;
    badge.style.display = contador > 0 ? 'grid' : 'none';
}

function configurarEventos() {
    document.getElementById('searchInput')?.addEventListener('input', event => {
        appState.busqueda = event.target.value;
        renderizarProductos();
    });

    document.getElementById('openChat')?.addEventListener('click', abrirConsulta);
    document.getElementById('adminButton')?.addEventListener('click', () => {
        if (estaAutenticadoAdmin()) {
            window.location.href = 'pages/admin.html';
            return;
        }
        mostrarLoginModal();
    });

    document.querySelectorAll('.bottom-nav .nav-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.bottom-nav .nav-btn').forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const action = button.dataset.action;
            if (action === 'home') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
            if (action === 'categories') {
                document.querySelector('.categories-row')?.scrollIntoView({ behavior: 'smooth' });
            }
            if (action === 'chat') {
                abrirConsulta();
            }
            if (action === 'admin') {
                if (estaAutenticadoAdmin()) {
                    window.location.href = 'pages/admin.html';
                } else {
                    mostrarLoginModal();
                }
            }
        });
    });

    document.getElementById('filterAvailable')?.addEventListener('click', alternarFiltroDisponibles);
}

function registrarServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', async () => {
            try {
                const registro = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registrado con éxito:', registro.scope);
            } catch (error) {
                console.warn('No se pudo registrar el Service Worker:', error);
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    inicializarApp();
    registrarServiceWorker();
});
