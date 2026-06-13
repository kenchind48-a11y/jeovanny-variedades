/* ========================================
   JEOVANNY VARIEDADES - Panel Administrador
   Gestión de productos, categorías y consultas
   ======================================== */

const adminState = {
  productoEnEdicion: null,
  categoriaEnEdicion: null,
  tabActual: 'productos',
  busqueda: ''
};

async function inicializarAdmin() {
  console.log('ADMIN INICIADO');
  await inicializarDatos();
  renderizarTabActual();
  renderizarProductosAdmin();
  renderizarCategoriasAdmin();
  renderizarConsultasAdmin();
  mostrarEstadisticasAdmin();
  configurarEventosAdmin();
  console.log('⚙️ Panel admin inicializado');
}

function mostrarEstadisticasAdmin() {
  let productos;
  try {
    productos = JSON.parse(localStorage.getItem('jv_productos') || '[]');
  } catch (error) {
    console.warn('[admin] Error parseando jv_productos desde localStorage:', error);
    productos = obtenerProductos();
  }

  console.log('TOTAL PRODUCTOS:', productos.length);
  console.log('PRODUCTOS:', productos);

  const estadisticas = {
    totalProductos: productos.length,
    productosDisponibles: productos.filter(item => item.disponible).length,
    productosNoDisponibles: productos.filter(item => !item.disponible).length,
    valorTotal: productos.reduce((sum, item) => sum + (Number(item.precio) || 0), 0)
  };

  const tarjetas = {
    'total-productos': estadisticas.totalProductos,
    'disponibles': estadisticas.productosDisponibles,
    'valor-total': `$${estadisticas.valorTotal.toFixed(2)}`,
    'no-disponibles': estadisticas.productosNoDisponibles
  };

  Object.entries(tarjetas).forEach(([id, valor]) => {
    const elemento = document.querySelector(`[data-stat="${id}"]`);
    if (elemento) elemento.textContent = valor;
  });

  const valorTotalElemento = document.querySelector('[data-stat="valor-total"]');
  if (valorTotalElemento) {
    valorTotalElemento.textContent = `$${estadisticas.valorTotal.toFixed(2)}`;
  }
}

function renderizarProductosAdmin() {
  // Usar matchMedia para detectar viewport en lugar de window.innerWidth
  // Esto es más confiable para media queries
  const isMobile = window.matchMedia('(max-width: 768px)').matches || window.innerWidth <= 768;
  const productos = obtenerProductos();
  console.log('Productos encontrados:', productos.length);
  console.log(productos);
  console.log('Admin render mode:', isMobile ? 'mobile' : 'desktop');

  // Pre-render both views para que el contenido esté disponible
  // aunque el CSS cambie entre vista de tabla y tarjetas.
  renderizarProductosAdminDesktop();
  renderizarProductosAdminMobile();
}

function renderizarProductosAdminDesktop() {
  const tbody = document.getElementById('productsTableBody');
  if (!tbody) {
    console.error('[admin] No se encontró tbody#productsTableBody');
    return;
  }

  let productos = obtenerProductos();
  const termino = adminState.busqueda.trim().toLowerCase();

  if (termino) {
    productos = productos.filter(producto => {
      return producto.nombre.toLowerCase().includes(termino) ||
             producto.categoria.toLowerCase().includes(termino) ||
             producto.descripcion.toLowerCase().includes(termino);
    });
  }

  if (productos.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding:2rem; color:#808080;">
          No hay productos que coincidan con la búsqueda.
        </td>
      </tr>
    `;
    return;
  }

  try {
    tbody.innerHTML = productos.map(producto => {
      const estadoTexto = producto.disponible ? 'Disponible' : 'Agotado';
      const estadoClass = producto.disponible ? 'available' : 'unavailable';
      const botonDisponibilidad = producto.disponible ? 'Marcar agotado' : 'Marcar disponible';
      const imagenSource = typeof window.obtenerProductoImagenSource === 'function'
        ? window.obtenerProductoImagenSource(producto)
        : { url: null, imageId: null };
      const tieneUrl = _isValidHttpUrl(imagenSource.url);
      const tieneImagen = Number.isFinite(imagenSource.imageId);
      const imagenHtml = tieneUrl
        ? `<img src="${imagenSource.url}" alt="${producto.nombre}">`
        : tieneImagen
            ? `<img data-image-id="${imagenSource.imageId}" alt="${producto.nombre}">`
            : `<span class="thumb-placeholder">📦</span>`;

      return `
      <tr data-producto-id="${producto.id}">
        <td class="product-thumb-cell"><div class="product-thumb">${imagenHtml}</div></td>
        <td>${producto.id}</td>
        <td>${producto.nombre}</td>
        <td>${producto.categoria}</td>
        <td>$${Number(producto.precio || 0).toFixed(2)}</td>
        <td><span class="availability ${estadoClass}">${estadoTexto}</span></td>
        <td>
          <div class="table-actions" style="display:flex; gap:0.5rem; flex-wrap:wrap;">
            <button type="button" class="btn-secondary" data-action="toggle-disponibilidad">${botonDisponibilidad}</button>
            <button type="button" class="btn-primary" data-action="editar-producto">Editar</button>
            <button type="button" class="btn-secondary" data-action="eliminar-producto">Eliminar</button>
          </div>
        </td>
      </tr>
      `;
    }).join('');
    // Cargar imágenes desde IndexedDB (si las hay)
    if (window.cargarImagenesDesdeIDB) window.cargarImagenesDesdeIDB(tbody);
  } catch (error) {
    console.error('[admin] Error renderizando productos desktop:', error);
  }
}

function renderizarProductosAdminMobile() {
  const container = document.getElementById('cardsViewContainer');
  if (!container) {
    console.error('[admin] No se encontró div#cardsViewContainer');
    return;
  }

  let productos = obtenerProductos();
  const termino = adminState.busqueda.trim().toLowerCase();

  if (termino) {
    productos = productos.filter(producto => {
      return producto.nombre.toLowerCase().includes(termino) ||
             producto.categoria.toLowerCase().includes(termino) ||
             producto.descripcion.toLowerCase().includes(termino);
    });
  }

  if (productos.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:2rem; color:#808080;">
        No hay productos que coincidan con la búsqueda.
      </div>
    `;
    return;
  }

  try {
    container.innerHTML = productos.map(producto => {
      const estadoTexto = producto.disponible ? 'Disponible' : 'Agotado';
      const estadoClass = producto.disponible ? 'available' : 'unavailable';
      const botonDisponibilidad = producto.disponible ? 'Marcar agotado' : 'Marcar disponible';
      const imagenSource = typeof window.obtenerProductoImagenSource === 'function'
        ? window.obtenerProductoImagenSource(producto)
        : { url: null, imageId: null };
      const tieneUrl = _isValidHttpUrl(imagenSource.url);
      const tieneImagen = Number.isFinite(imagenSource.imageId);
      const imagenHtml = tieneUrl
        ? `<img src="${imagenSource.url}" alt="${producto.nombre}" style="width:100%; height:100%; object-fit:cover; display:block;">`
        : tieneImagen
            ? `<img data-image-id="${imagenSource.imageId}" alt="${producto.nombre}" style="width:100%; height:100%; object-fit:cover; display:block;">`
            : `<span style="display:grid; place-items:center; width:100%; height:100%; font-size:1.8rem;">📦</span>`;

      return `
      <div class="product-card-mobile" data-producto-id="${producto.id}">
        <div class="product-card-image">
          ${imagenHtml}
        </div>
        <div class="product-card-content">
          <div class="product-card-field">
            <span class="product-card-label">ID</span>
            <span class="product-card-value">${producto.id}</span>
          </div>
          <div class="product-card-field">
            <span class="product-card-label">Nombre</span>
            <span class="product-card-value">${producto.nombre}</span>
          </div>
          <div class="product-card-field">
            <span class="product-card-label">Categoría</span>
            <span class="product-card-value">${producto.categoria}</span>
          </div>
          <div class="product-card-field">
            <span class="product-card-label">Precio</span>
            <span class="product-card-value">$${Number(producto.precio || 0).toFixed(2)}</span>
          </div>
          <div class="product-card-field">
            <span class="product-card-label">Estado</span>
            <span class="availability ${estadoClass}">${estadoTexto}</span>
          </div>
        </div>
        <div class="product-card-actions">
          <button type="button" class="btn-secondary" data-action="toggle-disponibilidad">${botonDisponibilidad}</button>
          <button type="button" class="btn-primary" data-action="editar-producto">Editar</button>
          <button type="button" class="btn-secondary" data-action="eliminar-producto">Eliminar</button>
        </div>
      </div>
      `;
    }).join('');
    if (window.cargarImagenesDesdeIDB) window.cargarImagenesDesdeIDB(container);
  } catch (error) {
    console.error('[admin] Error renderizando productos mobile:', error);
  }
}

function abrirFormularioProducto(producto = null) {
  adminState.productoEnEdicion = producto;
  const categorias = obtenerCategorias();
  const opcionesCategorias = categorias.map(cat => `<option value="${cat.nombre}" ${producto && cat.nombre === producto.categoria ? 'selected' : ''}>${cat.nombre}</option>`).join('') || '<option value="Sin categoría" selected>Sin categoría</option>';

  const modalHtml = `
    <div class="modal-container">
      <div class="modal-header">
        <button type="button" class="modal-back-btn" data-close-modal>← Volver</button>
        <div class="modal-header-copy">
          <p class="eyebrow">${producto ? 'Editar producto' : 'Nuevo producto'}</p>
          <h2>${producto ? 'Editar producto' : 'Nuevo producto'}</h2>
        </div>
        <button type="button" class="modal-close" aria-label="Cerrar">×</button>
      </div>
      <form id="adminProductForm" class="product-form">
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-section">
              <div class="form-group">
                <label>Nombre *</label>
                <input name="nombre" class="form-input" type="text" value="${producto ? producto.nombre : ''}" required>
              </div>
              <div class="form-row-two">
                <div class="form-group form-group--category">
                  <label>Categoría *</label>
                  <div class="category-select-row">
                    <select name="categoria" class="form-select" required>
                      ${opcionesCategorias}
                    </select>
                    <button type="button" class="btn-mini" id="newCategoryFromProduct">+ Nueva categoría</button>
                  </div>
                </div>
                <div class="form-group">
                  <label>Precio *</label>
                  <input name="precio" class="form-input" type="number" step="0.01" value="${producto ? producto.precio : ''}" required>
                </div>
              </div>
              <div class="form-group">
                <label>Descripción *</label>
                <textarea name="descripcion" class="form-textarea" required>${producto ? producto.descripcion : ''}</textarea>
              </div>
              <div class="form-group form-group--checkbox">
                <label>
                  <input type="checkbox" name="disponible" ${producto && producto.disponible ? 'checked' : ''}>
                  Disponible
                </label>
              </div>
            </div>
            <aside class="image-panel">
              <div class="image-panel-header">
                <p>Imagen del producto</p>
                <span class="badge badge-accent">Previsualización</span>
              </div>
              <div class="image-upload">
                <div class="image-upload__dropzone" id="productImageDropzone">
                  <input type="file" name="imagen" id="productImageInput" accept="image/*" multiple class="image-upload__input">
                  <div class="image-upload__placeholder" id="productImagePlaceholder">
                    <span class="image-upload__icon">📷</span>
                    <p>Arrastra o selecciona uno o más archivos</p>
                    <small>JPG, PNG, GIF — max 5 MB por imagen</small>
                    <button type="button" class="btn-secondary" id="selectProductImageButton">Seleccionar</button>
                  </div>
                  <div class="image-upload__meta hidden" id="productImageMeta">
                    <span id="productImageCount"></span>
                  </div>
                  <div class="image-upload__progress hidden" id="productImageProgress">
                    <div class="image-upload__progress-bar" id="productImageProgressBar"></div>
                  </div>
                  <img class="image-upload__preview hidden" id="productImagePreview" alt="Vista previa del producto">
                </div>
              </div>
            </aside>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" data-close-modal>Cancelar</button>
          <button type="submit" class="btn-primary">${producto ? 'Guardar cambios' : 'Crear producto'}</button>
        </div>
      </form>
    </div>
  `;

  abrirModal(modalHtml);
  configurarImagenProducto(producto);
  document.getElementById('adminProductForm')?.addEventListener('submit', manejarEnvioProducto);
  document.getElementById('newCategoryFromProduct')?.addEventListener('click', abrirCategoriaRapida);
}

function actualizarCategoriasEnFormulario(categoriaSeleccionada = null) {
  const select = document.querySelector('#adminProductForm select[name="categoria"]');
  if (!select) return;

  const categorias = obtenerCategorias();
  if (categorias.length === 0) {
    select.innerHTML = '<option value="Sin categoría" selected>Sin categoría</option>';
    return;
  }

  select.innerHTML = categorias.map(cat => `
    <option value="${cat.nombre}">${cat.nombre}</option>
  `).join('');

  if (categoriaSeleccionada) {
    select.value = categoriaSeleccionada;
  }
}

function abrirCategoriaRapida() {
  const modalContent = document.getElementById('modalContent');
  if (!modalContent) return;

  const subModalHtml = `
    <div class="submodal">
      <div class="submodal-header">
        <div>
          <p class="eyebrow">Categoría rápida</p>
          <h3>Crear nueva categoría</h3>
        </div>
        <button type="button" class="submodal-close" aria-label="Cerrar">×</button>
      </div>
      <form id="quickCategoryForm">
        <div class="form-group">
          <label>Nombre *</label>
          <input name="nombre" class="form-input" type="text" required autofocus>
        </div>
        <div class="form-group">
          <label>Descripción</label>
          <textarea name="descripcion" class="form-textarea" rows="3"></textarea>
        </div>
        <div class="submodal-actions">
          <button type="submit" class="btn-primary">Guardar categoría</button>
          <button type="button" class="btn-secondary" data-close-mini-modal>Cancelar</button>
        </div>
      </form>
    </div>
  `;

  abrirMiniModal(subModalHtml);
}

function abrirMiniModal(contenidoHtml) {
  const modalContent = document.getElementById('modalContent');
  if (!modalContent) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'submodal-overlay';
  wrapper.innerHTML = contenidoHtml;
  modalContent.appendChild(wrapper);

  wrapper.querySelectorAll('[data-close-mini-modal], .submodal-close').forEach(element => {
    element.addEventListener('click', () => cerrarMiniModal(wrapper));
  });

  wrapper.addEventListener('click', event => {
    if (event.target === wrapper) {
      cerrarMiniModal(wrapper);
    }
  });

  document.getElementById('quickCategoryForm')?.addEventListener('submit', event => manejarEnvioCategoriaRapida(event, wrapper));
}

function cerrarMiniModal(wrapper) {
  wrapper?.remove();
}

function manejarEnvioCategoriaRapida(event, wrapper) {
  event.preventDefault();
  const form = event.target;
  const nombre = form.nombre.value.trim();
  const descripcion = form.descripcion.value.trim();

  if (!nombre) {
    if (typeof mostrarToast === 'function') {
      mostrarToast('El nombre de la categoría es obligatorio.', 'error');
      return;
    }
    alert('El nombre de la categoría es obligatorio.');
    return;
  }

  const creada = crearCategoria(nombre, descripcion);
  if (!creada) {
    if (typeof mostrarToast === 'function') {
      mostrarToast('Ya existe una categoría con ese nombre.', 'error');
      return;
    }
    alert('Ya existe una categoría con ese nombre.');
    return;
  }

  cerrarMiniModal(wrapper);
  actualizarCategoriasEnFormulario(creada.nombre);
  renderizarCategoriasAdmin();
  mostrarNotificacionAdmin('✅ Nueva categoría creada y seleccionada');
}

function configurarImagenProducto(producto) {
  const dropzone = document.getElementById('productImageDropzone');
  const inputFile = document.getElementById('productImageInput');
  const preview = document.getElementById('productImagePreview');
  const placeholder = document.getElementById('productImagePlaceholder');
  const selectButton = document.getElementById('selectProductImageButton');
  const imagenSource = producto ? (typeof window.obtenerProductoImagenSource === 'function' ? window.obtenerProductoImagenSource(producto) : { url: null, imageId: null }) : { url: null, imageId: null };
  const imagenInicial = imagenSource.url || (Number.isFinite(imagenSource.imageId) ? imagenSource.imageId : null);

  mostrarPreviewImagen(imagenInicial);

  inputFile?.addEventListener('change', async () => {
    const files = Array.from(inputFile.files || []);
    if (!files.length) return;
    const src = await leerImagen(files[0]);
    mostrarPreviewImagen(src, files.length);
  });

  dropzone?.addEventListener('dragover', event => {
    event.preventDefault();
    dropzone.classList.add('drag-over');
  });

  dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));

  dropzone?.addEventListener('drop', async event => {
    event.preventDefault();
    dropzone.classList.remove('drag-over');
    const files = Array.from(event.dataTransfer.files || []).filter(file => file.type.startsWith('image/'));
    if (!files.length || !inputFile) return;
    const dataTransfer = new DataTransfer();
    files.forEach(file => dataTransfer.items.add(file));
    inputFile.files = dataTransfer.files;
    const src = await leerImagen(files[0]);
    mostrarPreviewImagen(src, files.length);
  });

  selectButton?.addEventListener('click', () => inputFile?.click());
}

async function mostrarPreviewImagen(src, count = 1) {
  const preview = document.getElementById('productImagePreview');
  const placeholder = document.getElementById('productImagePlaceholder');
  const meta = document.getElementById('productImageMeta');
  const countLabel = document.getElementById('productImageCount');
  if (!preview || !placeholder) return;

  const previousUrl = preview.dataset.previewUrl;
  if (previousUrl && previousUrl.startsWith('blob:')) {
    URL.revokeObjectURL(previousUrl);
  }
  preview.dataset.previewUrl = '';

  if (meta && countLabel) {
    countLabel.textContent = `${count} imagen${count === 1 ? '' : 'es'} seleccionada${count === 1 ? '' : 's'}`;
    meta.classList.toggle('hidden', count === 0);
  }

  const imageId = typeof src === 'number'
      ? src
      : (typeof src === 'string' && src.startsWith('idb:') ? Number(src.split(':')[1]) : null);

  if (Number.isFinite(imageId)) {
    preview.removeAttribute('src');
    preview.dataset.imageId = imageId;
    preview.classList.remove('hidden');
    placeholder.classList.add('hidden');
    if (window.cargarImagenesDesdeIDB) {
      await window.cargarImagenesDesdeIDB(preview.parentElement || document);
    }
    return;
  }

  const esImagenValida = typeof src === 'string' && /^(blob:|https?:\/\/|\/)/.test(src);
  if (src && esImagenValida) {
    preview.src = src;
    preview.dataset.previewUrl = src;
    preview.classList.remove('hidden');
    placeholder.classList.add('hidden');
    preview.removeAttribute('data-image-id');
  } else {
    preview.src = '';
    preview.classList.add('hidden');
    placeholder.classList.remove('hidden');
    preview.removeAttribute('data-image-id');
  }
}

function actualizarProgresoImagen(percent) {
  const progressContainer = document.getElementById('productImageProgress');
  const progressBar = document.getElementById('productImageProgressBar');
  if (!progressContainer || !progressBar) return;
  progressContainer.classList.remove('hidden');
  progressBar.style.width = `${Math.min(100, Math.max(0, percent))}%`;
  if (percent >= 100) {
    setTimeout(() => {
      progressContainer.classList.add('hidden');
      progressBar.style.width = '0%';
    }, 500);
  }
}

function leerImagen(file) {
  if (!file || !file.type.startsWith('image/')) {
    return Promise.reject(new Error('El archivo debe ser una imagen.'));
  }
  return Promise.resolve(URL.createObjectURL(file));
}

async function manejarEnvioProducto(event) {
  event.preventDefault();
  const form = event.target;
  const archivosImagenes = Array.from(form.imagen?.files || []);
  const archivoImagen = archivosImagenes.length ? archivosImagenes[0] : null;

  let imagenes = adminState.productoEnEdicion ? (Array.isArray(adminState.productoEnEdicion.imagenes) ? adminState.productoEnEdicion.imagenes : []) : [];
  let imagen = adminState.productoEnEdicion?.imagen || null;

  if (archivoImagen) {
    if (typeof window.subirImagenCloudinary !== 'function') {
      throw new Error('subirImagenCloudinary no está disponible');
    }
    imagen = await window.subirImagenCloudinary(archivoImagen);
    imagenes = [imagen];
  }

  const datos = {
    nombre: form.nombre.value.trim(),
    categoria: form.categoria.value.trim() || 'Sin categoría',
    descripcion: form.descripcion.value.trim(),
    precio: Number(form.precio.value),
    imagenesFiles: [],
    imagenes,
    imagen,
    imagenId: adminState.productoEnEdicion ? adminState.productoEnEdicion.imagenId ?? null : null,
    disponible: form.disponible?.checked === true
  };

  if (!datos.nombre || !datos.categoria || !datos.descripcion || !Number.isFinite(datos.precio)) {
    if (typeof mostrarToast === 'function') {
      mostrarToast('Completa todos los campos correctamente.', 'error');
      return;
    }
    alert('Completa todos los campos correctamente.');
    return;
  }

  try {
    if (adminState.productoEnEdicion) {
      console.log('[admin] Productos antes de actualizar:', obtenerProductos().length);
      const actualizado = await actualizarProducto(adminState.productoEnEdicion.id, datos, {
        onProgress: percent => actualizarProgresoImagen(percent)
      });
      if (!actualizado) {
        throw new Error('No se pudo actualizar el producto.');
      }
      console.log('[admin] Producto actualizado. Productos ahora:', obtenerProductos().length);
      mostrarNotificacionAdmin('✅ Producto actualizado correctamente');
    } else {
      console.log('[admin] Productos antes de guardar:', obtenerProductos().length);
      const creado = await guardarProducto(datos, {
        onProgress: percent => actualizarProgresoImagen(percent)
      });
      if (!creado) {
        throw new Error('No se pudo guardar el producto.');
      }
      console.log('[admin] Producto creado. Productos ahora:', obtenerProductos().length);
      mostrarNotificacionAdmin('✅ Producto creado correctamente');
    }

    cerrarModal();
    renderizarProductosAdmin();
    mostrarEstadisticasAdmin();
  } catch (error) {
    console.error('[admin] Error guardando/actualizando producto:', error);
    mostrarNotificacionAdmin(`❌ ${error.message || 'Error al procesar el producto.'}`, 'error');
  }
}

function eliminarProductoAdmin(id) {
  const producto = obtenerProductoPorId(id);
  if (!producto) return;

  if (confirm(`¿Eliminar "${producto.nombre}" del inventario?`)) {
    eliminarProducto(id);
    mostrarNotificacionAdmin('🗑 Producto eliminado');
    renderizarProductosAdmin();
    mostrarEstadisticasAdmin();
  }
}

async function cambiarDisponibilidadProducto(id) {
  const producto = obtenerProductoPorId(id);
  if (!producto) return;

  await actualizarProducto(id, { disponible: !producto.disponible });
  renderizarProductosAdmin();
  mostrarEstadisticasAdmin();
}

function renderizarCategoriasAdmin() {
  const contenedor = document.getElementById('categoryListAdmin');
  if (!contenedor) return;

  let categorias = obtenerCategorias();
  const termino = adminState.busqueda.trim().toLowerCase();
  if (termino) {
    categorias = categorias.filter(categoria => {
      return categoria.nombre.toLowerCase().includes(termino) ||
        (categoria.descripcion || '').toLowerCase().includes(termino);
    });
  }

  if (categorias.length === 0) {
    contenedor.innerHTML = `
      <div class="empty-state">
        <p>No hay categorías que coincidan con la búsqueda.</p>
      </div>
    `;
    return;
  }

  contenedor.innerHTML = categorias.map(categoria => `
    <div class="category-card" data-category-id="${categoria.id}">
      <div>
        <h4>${categoria.nombre}</h4>
        <p>${categoria.descripcion}</p>
      </div>
      <div class="category-actions">
        <button type="button" class="btn-primary" data-action="editar-categoria">Editar</button>
        <button type="button" class="btn-secondary" data-action="eliminar-categoria">Eliminar</button>
      </div>
    </div>
  `).join('');
}

function abrirFormularioCategoria(categoria = null) {
  adminState.categoriaEnEdicion = categoria;

  const modalHtml = `
    <div class="modal-header">
      <button type="button" class="modal-back-btn" data-close-modal>← Volver</button>
      <h2>${categoria ? 'Editar categoría' : 'Nueva categoría'}</h2>
      <button type="button" class="modal-close" aria-label="Cerrar">×</button>
    </div>
    <form id="adminCategoryForm">
      <div class="form-group">
        <label>Nombre *</label>
        <input name="nombre" class="form-input" type="text" value="${categoria ? categoria.nombre : ''}" required>
      </div>
      <div class="form-group">
        <label>Descripción</label>
        <textarea name="descripcion" class="form-textarea">${categoria ? categoria.descripcion : ''}</textarea>
      </div>
      <div style="display:flex; gap:0.8rem; margin-top:1.5rem; flex-wrap:wrap;">
        <button type="submit" class="btn-primary">${categoria ? 'Guardar cambios' : 'Crear categoría'}</button>
        <button type="button" class="btn-secondary" data-close-modal>Cancelar</button>
      </div>
    </form>
  `;

  abrirModal(modalHtml);
  document.getElementById('adminCategoryForm')?.addEventListener('submit', manejarEnvioCategoria);
}

function manejarEnvioCategoria(event) {
  event.preventDefault();
  const form = event.target;
  const nombre = form.nombre.value.trim();
  const descripcion = form.descripcion.value.trim();

  if (!nombre) {
    if (typeof mostrarToast === 'function') {
      mostrarToast('El nombre de la categoría es obligatorio.', 'error');
      return;
    }
    alert('El nombre de la categoría es obligatorio.');
    return;
  }

  if (adminState.categoriaEnEdicion) {
    const actualizado = actualizarCategoria(adminState.categoriaEnEdicion.id, { nombre, descripcion });
    if (!actualizado) {
      if (typeof mostrarToast === 'function') {
        mostrarToast('No se pudo actualizar la categoría.', 'error');
        return;
      }
      alert('No se pudo actualizar la categoría.');
      return;
    }
    mostrarNotificacionAdmin('✅ Categoría actualizada');
  } else {
    const creada = crearCategoria(nombre, descripcion);
    if (!creada) {
      if (typeof mostrarToast === 'function') {
        mostrarToast('Ya existe una categoría con ese nombre.', 'error');
        return;
      }
      alert('Ya existe una categoría con ese nombre.');
      return;
    }
    mostrarNotificacionAdmin('✅ Categoría creada');
  }

  cerrarModal();
  renderizarCategoriasAdmin();
  renderizarProductosAdmin();
}

function eliminarCategoriaAdmin(id) {
  const categoria = obtenerCategoriaPorId(id);
  if (!categoria) return;

  if (confirm(`¿Eliminar la categoría "${categoria.nombre}"? Esto no eliminará los productos existentes.`)) {
    const eliminado = eliminarCategoria(id);
    if (!eliminado) {
      if (typeof mostrarToast === 'function') {
        mostrarToast('No se puede eliminar una categoría que está asociada a productos. Cambia o elimina primero los productos relacionados.', 'error');
        return;
      }
      alert('No se puede eliminar una categoría que está asociada a productos. Cambia o elimina primero los productos relacionados.');
      return;
    }
    mostrarNotificacionAdmin('🗑 Categoría eliminada');
    renderizarCategoriasAdmin();
    renderizarProductosAdmin();
  }
}

function renderizarConsultasAdmin() {
  const contenedor = document.getElementById('consultationList');
  if (!contenedor) return;

  const consultas = obtenerConsultas();
  if (consultas.length === 0) {
    contenedor.innerHTML = `
      <div class="empty-state">
        <p>No hay consultas registradas.</p>
      </div>
    `;
    return;
  }

  const termino = adminState.busqueda.trim().toLowerCase();
  const consultasFiltradas = termino ? consultas.filter(consulta => {
    return consulta.nombre.toLowerCase().includes(termino) ||
           consulta.email.toLowerCase().includes(termino) ||
           consulta.mensaje.toLowerCase().includes(termino);
  }) : consultas;

  contenedor.innerHTML = consultasFiltradas.map(consulta => {
    const fecha = new Date(consulta.fechaCreacion).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
    return `
      <div class="consultation-card" data-consulta-id="${consulta.id}">
        <div class="consultation-meta" style="display:flex; gap:0.75rem; flex-wrap:wrap; align-items:center; margin-bottom:0.75rem;">
          <span>#${consulta.id}</span>
          <span>${fecha}</span>
          <span>${consulta.respondido ? 'Respondido' : 'Pendiente'}</span>
        </div>
        <p><strong>${consulta.nombre}</strong> · ${consulta.email || 'Sin email'}</p>
        <p style="margin:0.75rem 0;">${consulta.mensaje}</p>
        ${consulta.productos && consulta.productos.length ? `
          <div style="margin-bottom:0.75rem; color:#a1a1a1; font-size:0.95rem;">
            Productos en consulta: ${consulta.productos.map(prod => prod.nombre).join(', ')}
          </div>
        ` : ''}
        <div class="consultation-actions" style="display:flex; gap:0.75rem; flex-wrap:wrap;">
          <button type="button" class="btn-primary" data-action="responder-consulta">${consulta.respondido ? 'Editar respuesta' : 'Responder'}</button>
          <button type="button" class="btn-secondary" data-action="eliminar-consulta">Eliminar</button>
        </div>
      </div>
    `;
  }).join('');
}

function abrirRespuestaConsulta(consultaId) {
  const consulta = obtenerConsultas().find(item => item.id === consultaId);
  if (!consulta) return;

  const modalHtml = `
    <div class="modal-header">
      <button type="button" class="modal-back-btn" data-close-modal>← Volver</button>
      <h2>Responder consulta</h2>
      <button type="button" class="modal-close" aria-label="Cerrar">×</button>
    </div>
    <form id="adminResponseForm">
      <div class="form-group">
        <label>Cliente</label>
        <input class="form-input" type="text" value="${consulta.nombre}" disabled>
      </div>
      <div class="form-group">
        <label>Mensaje</label>
        <textarea class="form-textarea" disabled>${consulta.mensaje}</textarea>
      </div>
      <div class="form-group">
        <label>Respuesta *</label>
        <textarea name="respuesta" class="form-textarea" required>${consulta.respuesta || ''}</textarea>
      </div>
      <div style="display:flex; gap:0.8rem; margin-top:1.5rem; flex-wrap:wrap;">
        <button type="submit" class="btn-primary">Guardar respuesta</button>
        <button type="button" class="btn-secondary" data-close-modal>Cancelar</button>
      </div>
    </form>
  `;

  abrirModal(modalHtml);
  document.getElementById('adminResponseForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const respuesta = event.target.respuesta.value.trim();
    if (!respuesta) {
      if (typeof mostrarToast === 'function') {
        mostrarToast('Escribe una respuesta antes de guardar.', 'error');
        return;
      }
      alert('Escribe una respuesta antes de guardar.');
      return;
    }
    responderConsulta(consultaId, respuesta);
    cerrarModal();
    mostrarNotificacionAdmin('✅ Respuesta guardada');
    renderizarConsultasAdmin();
  });
}

function abrirModal(contenidoHtml) {
  const modalOverlay = document.getElementById('modalOverlay');
  const modalContent = document.getElementById('modalContent');
  if (!modalOverlay || !modalContent) return;

  document.documentElement.classList.add('modal-open');
  document.body.classList.add('modal-open');

  modalContent.innerHTML = contenidoHtml;
  modalOverlay.classList.remove('hidden');
  modalContent.querySelectorAll('[data-close-modal], .modal-close').forEach(elemento => {
    elemento.addEventListener('click', cerrarModal);
  });
}

function cerrarModal() {
  const modalOverlay = document.getElementById('modalOverlay');
  const modalContent = document.getElementById('modalContent');
  if (!modalOverlay || !modalContent) return;

  modalOverlay.classList.add('hidden');
  modalContent.innerHTML = '';
  document.documentElement.classList.remove('modal-open');
  document.body.classList.remove('modal-open');
  adminState.productoEnEdicion = null;
  adminState.categoriaEnEdicion = null;
}

function volverAInicioAdmin() {
  const fallback = '../index.html';
  if (window.history.length > 1 && document.referrer && !document.referrer.includes('admin.html')) {
    window.history.back();
    setTimeout(() => {
      if (window.location.pathname.endsWith('/admin.html')) {
        window.location.href = fallback;
      }
    }, 250);
    return;
  }
  window.location.href = fallback;
}

function mostrarNotificacionAdmin(mensaje, tipo = 'success') {
  if (typeof mostrarToast === 'function') {
    mostrarToast(mensaje, tipo);
    return;
  }

  const notificacion = document.createElement('div');
  notificacion.style.cssText = `
    position: fixed;
    top: 80px;
    right: 20px;
    background-color: #00c896;
    color: #0f0f0f;
    padding: 1rem 1.5rem;
    border-radius: 0.5rem;
    font-weight: 600;
    z-index: 2000;
    box-shadow: 0 4px 12px rgba(0, 200, 150, 0.3);
  `;
  notificacion.textContent = mensaje;
  document.body.appendChild(notificacion);

  setTimeout(() => {
    notificacion.remove();
  }, 3000);
}

function logoutAdmin() {
  cerrarSesionAdmin();
  window.location.href = '../index.html';
}

function configurarEventosAdmin() {
  document.querySelectorAll('.tab-btn').forEach(boton => {
    boton.addEventListener('click', () => {
      adminState.tabActual = boton.dataset.tab || 'productos';
      adminState.busqueda = '';
      const searchInput = document.getElementById('adminSearch');
      if (searchInput) searchInput.value = '';
      renderizarTabActual();
      renderizarProductosAdmin();
      renderizarCategoriasAdmin();
      renderizarConsultasAdmin();
    });
  });

  document.getElementById('returnHomeButton')?.addEventListener('click', volverAInicioAdmin);
  document.getElementById('logoutButton')?.addEventListener('click', logoutAdmin);
  document.getElementById('adminAddButton')?.addEventListener('click', () => abrirFormularioProducto());
  document.getElementById('openCategoryForm')?.addEventListener('click', () => abrirFormularioCategoria());

  document.getElementById('adminSearch')?.addEventListener('input', event => {
    adminState.busqueda = event.target.value;
    if (adminState.tabActual === 'productos') {
      renderizarProductosAdmin();
    } else if (adminState.tabActual === 'categorias') {
      renderizarCategoriasAdmin();
    } else if (adminState.tabActual === 'consultas') {
      renderizarConsultasAdmin();
    }
  });

  document.getElementById('productsTableBody')?.addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const row = button.closest('tr') || button.closest('[data-producto-id]');
    const productoId = Number(row?.dataset.productoId);
    if (!productoId) return;

    switch (button.dataset.action) {
      case 'editar-producto':
        abrirFormularioProducto(obtenerProductoPorId(productoId));
        break;
      case 'eliminar-producto':
        eliminarProductoAdmin(productoId);
        break;
      case 'toggle-disponibilidad':
        cambiarDisponibilidadProducto(productoId);
        break;
    }
  });

  // Event listener para tarjetas móviles
  document.getElementById('cardsViewContainer')?.addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const card = button.closest('[data-producto-id]');
    const productoId = Number(card?.dataset.productoId);
    if (!productoId) return;

    switch (button.dataset.action) {
      case 'editar-producto':
        abrirFormularioProducto(obtenerProductoPorId(productoId));
        break;
      case 'eliminar-producto':
        eliminarProductoAdmin(productoId);
        break;
      case 'toggle-disponibilidad':
        cambiarDisponibilidadProducto(productoId);
        break;
      default:
        break;
    }
  });

  document.getElementById('categoryListAdmin')?.addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const card = button.closest('.category-card');
    const categoriaId = Number(card?.dataset.categoryId);
    if (!categoriaId) return;

    switch (button.dataset.action) {
      case 'editar-categoria':
        abrirFormularioCategoria(obtenerCategoriaPorId(categoriaId));
        break;
      case 'eliminar-categoria':
        eliminarCategoriaAdmin(categoriaId);
        break;
      default:
        break;
    }
  });

  document.getElementById('consultationList')?.addEventListener('click', event => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const card = button.closest('.consultation-card');
    const consultaId = Number(card?.dataset.consultaId);
    if (!consultaId) return;

    switch (button.dataset.action) {
      case 'responder-consulta':
        abrirRespuestaConsulta(consultaId);
        break;
      case 'eliminar-consulta':
        if (confirm('¿Eliminar esta consulta?')) {
          eliminarConsulta(consultaId);
          mostrarNotificacionAdmin('🗑 Consulta eliminada');
          renderizarConsultasAdmin();
        }
        break;
      default:
        break;
    }
  });

  const modalOverlay = document.getElementById('modalOverlay');
  modalOverlay?.addEventListener('click', event => {
    if (event.target === modalOverlay) {
      cerrarModal();
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      cerrarModal();
    }
  });

  // Event listener para cambios de tamaño de ventana (responsivo)
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      renderizarProductosAdmin();
    }, 250);
  });
}

function renderizarTabActual() {
  document.querySelectorAll('.tab-btn').forEach(boton => {
    boton.classList.toggle('active', boton.dataset.tab === adminState.tabActual);
  });

  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `${adminState.tabActual}Panel`);
  });
}

function registrarServiceWorkerAdmin() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('../sw.js').catch(() => {
      console.warn('Service Worker no registrado en admin.');
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!estaAutenticadoAdmin()) {
    window.location.href = '../index.html';
    return;
  }

  registrarServiceWorkerAdmin();

  if (document.querySelector('.admin-table')) {
    inicializarAdmin();
  }
});
