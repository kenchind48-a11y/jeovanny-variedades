/* ========================================
   JEOVANNY VARIEDADES - Gestión de Categorías
   Lógica de categorías para la interfaz
   ======================================== */

/**
 * Renderiza las categorías en el selector
 * @param {string} contenedorSelector - Selector CSS del contenedor
 * @param {Function} onCategorySelect - Callback cuando se selecciona
 */
function renderizarCategorias(contenedorSelector = '.categories-container', onCategorySelect = null) {
    const contenedor = document.querySelector(contenedorSelector);
    if (!contenedor) return;
    
    const categorias = obtenerCategorias();
    contenedor.innerHTML = '';
    
    // Botón Todos
    const btnTodos = document.createElement('button');
    btnTodos.className = 'category-btn active';
    btnTodos.textContent = '📂 Todos';
    btnTodos.onclick = () => {
        document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
        btnTodos.classList.add('active');
        if (onCategorySelect) onCategorySelect('Todos');
    };
    contenedor.appendChild(btnTodos);
    
    // Botones de categorías
    categorias.forEach(categoria => {
        const btn = document.createElement('button');
        btn.className = 'category-btn';
        btn.textContent = `${categoria.icono} ${categoria.nombre}`;
        btn.onclick = () => {
            document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (onCategorySelect) onCategorySelect(categoria.nombre);
        };
        contenedor.appendChild(btn);
    });
}

/**
 * Renderiza las opciones de categoría en un select
 * @param {string} selectSelector - Selector CSS del select
 */
function renderizarCategoriaSelect(selectSelector = 'select[name="categoria"]') {
    const select = document.querySelector(selectSelector);
    if (!select) return;
    
    const categorias = obtenerCategorias();
    select.innerHTML = '<option value="">Seleccionar categoría...</option>';
    
    categorias.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.nombre;
        option.textContent = cat.nombre;
        select.appendChild(option);
    });
}

/**
 * Abre modal para crear nueva categoría
 */
function abrirModalNuevaCategoria() {
    const modal = document.getElementById('categoryModal');
    if (!modal) return;
    
    const content = modal.querySelector('.modal-content');
    content.innerHTML = `
        <div class="modal-header">
            <h2>Nueva Categoría</h2>
            <button class="modal-close" onclick="cerrarModal('categoryModal')">&times;</button>
        </div>
        <form id="formNuevaCategoria" onsubmit="guardarNuevaCategoria(event)">
            <div class="form-group">
                <label class="form-label">Nombre de la Categoría</label>
                <input type="text" name="nombre" class="form-input" required>
            </div>
            <div class="form-group">
                <label class="form-label">Descripción</label>
                <textarea name="descripcion" class="form-textarea"></textarea>
            </div>
            <div style="display: flex; gap: 0.8rem;">
                <button type="submit" class="btn-primary btn-full">Crear</button>
                <button type="button" class="btn-secondary btn-full" onclick="cerrarModal('categoryModal')">Cancelar</button>
            </div>
        </form>
    `;
    
    modal.classList.add('active');
}

/**
 * Guarda una nueva categoría
 * @param {Event} event - Evento del formulario
 */
function guardarNuevaCategoria(event) {
    event.preventDefault();
    
    const nombre = document.querySelector('[name="nombre"]').value;
    const descripcion = document.querySelector('[name="descripcion"]').value;
    
    if (!nombre.trim()) {
        mostrarAlerta('El nombre es requerido', 'error');
        return;
    }
    
    const categoria = crearCategoria(nombre, descripcion);
    
    if (categoria) {
        mostrarAlerta('Categoría creada exitosamente', 'success');
        cerrarModal('categoryModal');
        // Actualizar lista de categorías
        renderizarCategoriaSelect();
        renderizarCategorias('.categories-container');
    } else {
        mostrarAlerta('La categoría ya existe', 'error');
    }
}

/**
 * Abre modal para editar categoría
 * @param {number} categoriaId - ID de la categoría
 */
function abrirModalEditarCategoria(categoriaId) {
    const categoria = obtenerCategoriaPorId(categoriaId);
    if (!categoria) return;
    
    const modal = document.getElementById('categoryModal');
    if (!modal) return;
    
    const content = modal.querySelector('.modal-content');
    content.innerHTML = `
        <div class="modal-header">
            <h2>Editar Categoría</h2>
            <button class="modal-close" onclick="cerrarModal('categoryModal')">&times;</button>
        </div>
        <form id="formEditarCategoria" onsubmit="guardarEdicionCategoria(event, ${categoriaId})">
            <div class="form-group">
                <label class="form-label">Nombre</label>
                <input type="text" name="nombre" class="form-input" value="${categoria.nombre}" required>
            </div>
            <div class="form-group">
                <label class="form-label">Descripción</label>
                <textarea name="descripcion" class="form-textarea">${categoria.descripcion}</textarea>
            </div>
            <div style="display: flex; gap: 0.8rem;">
                <button type="submit" class="btn-primary btn-full">Guardar</button>
                <button type="button" class="btn-secondary btn-full" onclick="cerrarModal('categoryModal')">Cancelar</button>
            </div>
        </form>
    `;
    
    modal.classList.add('active');
}

/**
 * Guarda la edición de una categoría
 * @param {Event} event - Evento del formulario
 * @param {number} categoriaId - ID de la categoría
 */
function guardarEdicionCategoria(event, categoriaId) {
    event.preventDefault();
    
    const nombre = document.querySelector('[name="nombre"]').value;
    const descripcion = document.querySelector('[name="descripcion"]').value;
    
    if (!nombre.trim()) {
        mostrarAlerta('El nombre es requerido', 'error');
        return;
    }
    
    if (actualizarCategoria(categoriaId, { nombre, descripcion })) {
        mostrarAlerta('Categoría actualizada', 'success');
        cerrarModal('categoryModal');
        renderizarCategoriaSelect();
        renderizarCategorias('.categories-container');
    } else {
        mostrarAlerta('Error al actualizar', 'error');
    }
}

/**
 * Elimina una categoría con confirmación
 * @param {number} categoriaId - ID de la categoría
 */
function eliminarCategoriaConfirm(categoriaId) {
    const categoria = obtenerCategoriaPorId(categoriaId);
    if (!categoria) return;
    
    if (confirm(`¿Eliminar la categoría "${categoria.nombre}"?`)) {
        if (eliminarCategoria(categoriaId)) {
            mostrarAlerta('Categoría eliminada', 'success');
            renderizarCategoriaSelect();
            renderizarCategorias('.categories-container');
        } else {
            mostrarAlerta('No se puede eliminar: contiene productos', 'error');
        }
    }
}

/**
 * Obtiene el nombre de la categoría más usada
 * @returns {string} Nombre de categoría
 */
function obtenerCategoriaMasUsada() {
    const productos = obtenerProductos();
    if (productos.length === 0) return '';
    
    const contador = {};
    productos.forEach(p => {
        contador[p.categoria] = (contador[p.categoria] || 0) + 1;
    });
    
    return Object.keys(contador).reduce((a, b) => 
        contador[a] > contador[b] ? a : b
    );
}

/**
 * Obtiene estadísticas de categorías
 * @returns {Object} Estadísticas
 */
function obtenerEstadisticasCategorias() {
    const productos = obtenerProductos();
    const categorias = obtenerCategorias();
    const stats = {};
    
    categorias.forEach(cat => {
        const count = productos.filter(p => p.categoria === cat.nombre).length;
        stats[cat.nombre] = count;
    });
    
    return stats;
}

/**
 * Genera HTML tabla de categorías para admin
 * @returns {string} HTML de la tabla
 */
function generarTablaCategoriasHTML() {
    const categorias = obtenerCategorias();
    const stats = obtenerEstadisticasCategorias();
    
    if (categorias.length === 0) {
        return '<tr><td colspan="4" style="text-align: center; padding: 2rem;">No hay categorías</td></tr>';
    }
    
    return categorias.map(cat => `
        <tr>
            <td>${cat.icono} ${cat.nombre}</td>
            <td>${cat.descripcion}</td>
            <td>${stats[cat.nombre] || 0} productos</td>
            <td>
                <button class="btn-edit" onclick="abrirModalEditarCategoria(${cat.id})">Editar</button>
                <button class="btn-delete" onclick="eliminarCategoriaConfirm(${cat.id})">Eliminar</button>
            </td>
        </tr>
    `).join('');
}
