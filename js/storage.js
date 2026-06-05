/* ========================================
   JEOVANNY VARIEDADES - Sistema de Almacenamiento
   Gestión de datos con localStorage
   ======================================== */

const STORAGE_KEYS = {
    PRODUCTOS: 'jv_productos',
    CATEGORIAS: 'jv_categorias',
    CONSULTAS: 'jv_consultas',
    SELECCIONADOS: 'jv_seleccionados'
};

function leerStorage(key) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : [];
    } catch (error) {
        console.error(`Error leyendo ${key}:`, error);
        return [];
    }
}

function _tamanoCadena(cadena) {
    return cadena ? new Blob([cadena]).size : 0;
}

function tamanoStorageProductosHumano() {
    try {
        const datos = localStorage.getItem(STORAGE_KEYS.PRODUCTOS);
        const bytes = _tamanoCadena(datos);
        if (!bytes) return '0 B';
        const unidades = ['B', 'KB', 'MB', 'GB'];
        let i = 0;
        let val = bytes;
        while (val >= 1024 && i < unidades.length - 1) { val /= 1024; i++; }
        return `${val.toFixed(2)} ${unidades[i]}`;
    } catch (e) {
        return 'n/a';
    }
}

/* IndexedDB para imágenes */
let _imageDBPromise = null;
function initImageDB() {
    if (_imageDBPromise) return _imageDBPromise;
    _imageDBPromise = new Promise((resolve, reject) => {
        if (!('indexedDB' in window)) {
            reject(new Error('IndexedDB no disponible'));
            return;
        }
        const req = indexedDB.open('jv_images', 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('images')) {
                db.createObjectStore('images', { keyPath: 'id', autoIncrement: true });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error('Error abriendo IDB'));
    });
    return _imageDBPromise;
}

function _base64ToBlob(base64, mime) {
    const binStr = atob(base64);
    const len = binStr.length;
    const arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) arr[i] = binStr.charCodeAt(i);
    return new Blob([arr], { type: mime });
}

async function storeImageFromDataUrl(dataUrl) {
    if (!dataUrl || typeof dataUrl !== 'string') return null;
    const m = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
    if (!m) return null;
    const mime = m[1];
    const base64 = m[2];
    const blob = _base64ToBlob(base64, mime);
    const db = await initImageDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('images', 'readwrite');
        const store = tx.objectStore('images');
        const req = store.add({ blob, mime, created: new Date().toISOString() });
        req.onsuccess = () => {
            const id = req.result;
            tx.oncomplete = () => resolve(id);
        };
        req.onerror = () => reject(req.error || new Error('Error almacenando imagen'));
    });
}

async function getImageBlobByKey(ref) {
    if (!ref || !ref.startsWith('idb:')) return null;
    const id = Number(ref.split(':')[1]);
    if (!Number.isFinite(id)) return null;
    const db = await initImageDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('images', 'readonly');
        const store = tx.objectStore('images');
        const req = store.get(id);
        req.onsuccess = () => {
            const record = req.result;
            resolve(record ? record.blob : null);
        };
        req.onerror = () => reject(req.error || new Error('Error leyendo imagen IDB'));
    });
}

async function getImageObjectUrl(ref) {
    const blob = await getImageBlobByKey(ref);
    if (!blob) return null;
    return URL.createObjectURL(blob);
}

async function deleteImageByKey(ref) {
    if (!ref || !ref.startsWith('idb:')) return false;
    const id = Number(ref.split(':')[1]);
    if (!Number.isFinite(id)) return false;
    const db = await initImageDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('images', 'readwrite');
        const store = tx.objectStore('images');
        const req = store.delete(id);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error || new Error('Error eliminando imagen IDB'));
    });
}

async function migrarImagenesALocalIDB() {
    try {
        const productos = obtenerProductos();
        let cambios = false;
        for (let i = 0; i < productos.length; i++) {
            const p = productos[i];
            if (p && typeof p.imagen === 'string' && p.imagen.startsWith('data:image/')) {
                try {
                    const id = await storeImageFromDataUrl(p.imagen);
                    if (id) {
                        p.imagen = `idb:${id}`;
                        cambios = true;
                        console.log('[storage][migrate] Migrada imagen de producto', p.id, '-> idb:' + id);
                    }
                } catch (e) {
                    console.warn('[storage][migrate] No se pudo migrar imagen de producto', p.id, e);
                }
            }
        }
        if (cambios) {
            escribirStorage(STORAGE_KEYS.PRODUCTOS, productos);
            console.log('[storage][migrate] Migración completada. Tamaño jv_productos:', tamanoStorageProductosHumano());
        }
    } catch (e) {
        console.warn('[storage][migrate] Error durante migración:', e);
    }
}

// Función utilitaria para que UI cargue imágenes desde IDB
window.cargarImagenesDesdeIDB = async function(root = document) {
    try {
        const imgs = Array.from((root || document).querySelectorAll('img[data-idb]'));
        for (const img of imgs) {
            const ref = img.dataset.idb;
            if (!ref) continue;
            try {
                const url = await getImageObjectUrl(ref);
                if (url) {
                    img.src = url;
                    img.classList.remove('hidden');
                    img.removeAttribute('data-idb');
                }
            } catch (e) {
                console.warn('[storage] Error cargando imagen IDB', ref, e);
            }
        }
    } catch (e) {
        console.warn('[storage] cargarImagenesDesdeIDB fallo', e);
    }
};

function escribirStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Error escribiendo ${key}:`, error);
    }
}

function obtenerProductos() {
    return leerStorage(STORAGE_KEYS.PRODUCTOS);
}

function guardarProducto(producto) {
    const productos = obtenerProductos();
    const precio = Number(producto.precio ?? 0);
    const nuevoProducto = {
        id: Date.now(),
        nombre: producto.nombre || '',
        categoria: producto.categoria || 'Sin categoría',
        precio: Number.isFinite(precio) ? precio : 0,
        descripcion: producto.descripcion || '',
        disponible: producto.disponible === true,
        // No almacenar data URLs en localStorage: si es data URL, guardamos placeholder y migramos a IDB async
        imagen: (typeof producto.imagen === 'string' && producto.imagen.startsWith('data:image/')) ? '📦' : (producto.imagen || '📦'),
        fechaCreacion: new Date().toISOString()
    };
    console.log('[storage] Productos antes de guardar:', productos.length);
    productos.push(nuevoProducto);
    try {
        escribirStorage(STORAGE_KEYS.PRODUCTOS, productos);
        console.log('[storage] Producto guardado. Productos ahora:', obtenerProductos().length);
        console.log('[storage] Tamaño jv_productos:', tamanoStorageProductosHumano());
        // Si el producto original incluía una data URL, guardarla en IDB y actualizar la referencia
        if (typeof producto.imagen === 'string' && producto.imagen.startsWith('data:image/')) {
            (async () => {
                try {
                    const id = await storeImageFromDataUrl(producto.imagen);
                    if (id) {
                        console.log('[storage] Imagen almacenada en IDB id=', id, 'para producto', nuevoProducto.id);
                        actualizarProducto(nuevoProducto.id, { imagen: 'idb:' + id });
                    }
                } catch (e) {
                    console.warn('[storage] No se pudo almacenar imagen en IDB:', e);
                }
            })();
        }
        return nuevoProducto;
    } catch (e) {
        const mensaje = (e && (e.name || '')).toString().toLowerCase();
        const esQuota = mensaje.includes('quota') || mensaje.includes('exceeded') || (e && e.code === 22);
        console.warn('[storage] Error al escribir productos en localStorage:', e);
        if (esQuota && nuevoProducto.imagen && typeof nuevoProducto.imagen === 'string') {
            console.warn('[storage] Posible QuotaExceededError por imagen base64. Intentando guardar sin la imagen.');
            // Eliminar imagen y reintentar
            nuevoProducto.imagen = '📦';
            // Reemplazar el último elemento
            productos[productos.length - 1] = nuevoProducto;
            try {
                escribirStorage(STORAGE_KEYS.PRODUCTOS, productos);
                console.log('[storage] Guardado exitoso sin imagen. Productos ahora:', obtenerProductos().length);
                console.log('[storage] Tamaño jv_productos:', tamanoStorageProductosHumano());
                return nuevoProducto;
            } catch (e2) {
                console.error('[storage] Segundo intento falló:', e2);
                return null;
            }
        }
        return null;
    }
}

function actualizarProducto(id, datosActualizados) {
    const productos = obtenerProductos();
    const index = productos.findIndex(item => item.id === id);
    if (index === -1) return false;

    const precioActualizado = Number(datosActualizados.precio ?? productos[index].precio);
    const disponibleActualizado = typeof datosActualizados.disponible === 'boolean'
        ? datosActualizados.disponible
        : productos[index].disponible;

    // Si se recibe una data URL en datosActualizados.imagen, no la guardamos directamente en localStorage.
    const esDataImage = typeof datosActualizados.imagen === 'string' && datosActualizados.imagen.startsWith('data:image/');
    const imagenTemporal = esDataImage ? productos[index].imagen || '📦' : datosActualizados.imagen;

    productos[index] = {
        ...productos[index],
        ...datosActualizados,
        imagen: imagenTemporal,
        precio: Number.isFinite(precioActualizado) ? precioActualizado : productos[index].precio,
        disponible: disponibleActualizado,
        id: productos[index].id,
        fechaCreacion: productos[index].fechaCreacion
    };
    try {
        escribirStorage(STORAGE_KEYS.PRODUCTOS, productos);
        console.log('[storage] Producto actualizado. Tamaño jv_productos:', tamanoStorageProductosHumano());
        // Si la imagen era data URL, almacenarla en IDB y actualizar la referencia
        if (esDataImage) {
            (async () => {
                try {
                    const imageId = await storeImageFromDataUrl(datosActualizados.imagen);
                    if (imageId) {
                        console.log('[storage] Imagen almacenada en IDB id=', imageId, 'para producto', id);
                        // actualizar el producto para apuntar a la referencia en IDB
                        actualizarProducto(id, { imagen: 'idb:' + imageId });
                    }
                } catch (e) {
                    console.warn('[storage] No se pudo almacenar imagen en IDB al actualizar:', e);
                }
            })();
        }
        return true;
    } catch (e) {
        const mensaje = (e && (e.name || '')).toString().toLowerCase();
        const esQuota = mensaje.includes('quota') || mensaje.includes('exceeded') || (e && e.code === 22);
        console.warn('[storage] Error al actualizar producto en localStorage:', e);
        if (esQuota && datosActualizados.imagen) {
            console.warn('[storage] QuotaExceededError al actualizar. Eliminando imagen y reintentando.');
            delete productos[index].imagen;
            try {
                escribirStorage(STORAGE_KEYS.PRODUCTOS, productos);
                console.log('[storage] Actualizado exitoso sin imagen.');
                return true;
            } catch (e2) {
                console.error('[storage] Reintento de actualización falló:', e2);
                return false;
            }
        }
        return false;
    }
}

function eliminarProducto(id) {
    const productos = obtenerProductos();
    const index = productos.findIndex(item => item.id === id);
    if (index === -1) return false;
    const [removed] = productos.splice(index, 1);
    escribirStorage(STORAGE_KEYS.PRODUCTOS, productos);
    // Si el producto eliminado tenía imagen almacenada en IDB, eliminarla también
    try {
        if (removed && typeof removed.imagen === 'string' && removed.imagen.startsWith('idb:')) {
            deleteImageByKey(removed.imagen).catch(err => console.warn('[storage] No se pudo eliminar imagen IDB:', err));
        }
    } catch (e) {
        console.warn('[storage] Error durante limpieza IDB al eliminar producto', e);
    }
    return true;
}

function obtenerProductoPorId(id) {
    return obtenerProductos().find(item => item.id === id) || null;
}

function obtenerProductosPorCategoria(categoria) {
    if (!categoria || categoria === 'Todos') {
        return obtenerProductos();
    }
    return obtenerProductos().filter(item => item.categoria === categoria);
}

function buscarProductos(termino) {
    const texto = termino.trim().toLowerCase();
    if (!texto) return obtenerProductos();
    return obtenerProductos().filter(producto => {
        return producto.nombre.toLowerCase().includes(texto) ||
            producto.descripcion.toLowerCase().includes(texto) ||
            producto.categoria.toLowerCase().includes(texto);
    });
}

function obtenerCategorias() {
    return leerStorage(STORAGE_KEYS.CATEGORIAS);
}

function crearCategoria(nombre, descripcion = '') {
    const categorias = obtenerCategorias();
    if (!nombre || categorias.some(item => item.nombre.toLowerCase() === nombre.toLowerCase())) {
        return null;
    }
    const nuevaCategoria = {
        id: Date.now(),
        nombre: nombre.trim(),
        descripcion: descripcion.trim(),
        icono: '📁',
        fechaCreacion: new Date().toISOString()
    };
    categorias.push(nuevaCategoria);
    escribirStorage(STORAGE_KEYS.CATEGORIAS, categorias);
    return nuevaCategoria;
}

function actualizarCategoria(id, datosActualizados) {
    const categorias = obtenerCategorias();
    const index = categorias.findIndex(item => item.id === id);
    if (index === -1) return false;
    categorias[index] = {
        ...categorias[index],
        ...datosActualizados,
        id: categorias[index].id,
        fechaCreacion: categorias[index].fechaCreacion
    };
    escribirStorage(STORAGE_KEYS.CATEGORIAS, categorias);
    return true;
}

function eliminarCategoria(id) {
    const categorias = obtenerCategorias();
    const categoria = categorias.find(item => item.id === id);
    if (!categoria) return false;
    const productos = obtenerProductos();
    if (productos.some(producto => producto.categoria === categoria.nombre)) {
        return false;
    }
    const resultado = categorias.filter(item => item.id !== id);
    escribirStorage(STORAGE_KEYS.CATEGORIAS, resultado);
    return true;
}

function obtenerCategoriaPorId(id) {
    return obtenerCategorias().find(item => item.id === id) || null;
}

function obtenerConsultas() {
    return leerStorage(STORAGE_KEYS.CONSULTAS);
}

function guardarConsulta(consulta) {
    const consultas = obtenerConsultas();
    const nuevaConsulta = {
        id: Date.now(),
        nombre: consulta.nombre || 'Cliente',
        email: consulta.email || '',
        telefono: consulta.telefono || '',
        mensaje: consulta.mensaje || '',
        productos: consulta.productos || [],
        respuesta: '',
        respondido: false,
        fechaCreacion: new Date().toISOString()
    };
    consultas.push(nuevaConsulta);
    escribirStorage(STORAGE_KEYS.CONSULTAS, consultas);
    return nuevaConsulta;
}

function responderConsulta(id, respuesta) {
    const consultas = obtenerConsultas();
    const index = consultas.findIndex(item => item.id === id);
    if (index === -1) return false;
    consultas[index] = {
        ...consultas[index],
        respuesta,
        respondido: true,
        fechaRespuesta: new Date().toISOString()
    };
    escribirStorage(STORAGE_KEYS.CONSULTAS, consultas);
    return true;
}

function eliminarConsulta(id) {
    const consultas = obtenerConsultas();
    const resultado = consultas.filter(item => item.id !== id);
    escribirStorage(STORAGE_KEYS.CONSULTAS, resultado);
    return true;
}

function obtenerSeleccionados() {
    const datos = localStorage.getItem(STORAGE_KEYS.SELECCIONADOS);
    try {
        return datos ? JSON.parse(datos) : [];
    } catch (error) {
        console.error('Error al obtener seleccionados:', error);
        return [];
    }
}

function iniciarSesionAdmin() {
    localStorage.setItem('adminAuth', 'true');
}

function cerrarSesionAdmin() {
    localStorage.removeItem('adminAuth');
}

function estaAutenticadoAdmin() {
    return localStorage.getItem('adminAuth') === 'true';
}

function agregarSeleccionado(productoId) {
    const seleccionados = obtenerSeleccionados();
    if (!seleccionados.includes(productoId)) {
        seleccionados.push(productoId);
        escribirStorage(STORAGE_KEYS.SELECCIONADOS, seleccionados);
    }
}

function removerSeleccionado(productoId) {
    const seleccionados = obtenerSeleccionados();
    const resultado = seleccionados.filter(id => id !== productoId);
    escribirStorage(STORAGE_KEYS.SELECCIONADOS, resultado);
}

function limpiarSeleccionados() {
    escribirStorage(STORAGE_KEYS.SELECCIONADOS, []);
}

function obtenerProductosSeleccionados() {
    const ids = obtenerSeleccionados();
    const productos = obtenerProductos();
    return ids.map(id => productos.find(producto => producto.id === id)).filter(Boolean);
}

function obtenerEstadisticas() {
    const productos = obtenerProductos();
    const totalProductos = productos.length;
    const productosDisponibles = productos.filter(item => item.disponible === true).length;
    const productosNoDisponibles = productos.filter(item => item.disponible === false).length;
    const valorTotal = productos.reduce((sum, item) => sum + (Number(item.precio) || 0), 0);
    return {
        totalProductos,
        productosDisponibles,
        productosNoDisponibles,
        valorTotal
    };
}

function inicializarDatos() {
    const productos = obtenerProductos();
    const categorias = obtenerCategorias();
    if (productos.length > 0 || categorias.length > 0) {
        return;
    }

    crearCategoria('Accesorios', 'Accesorios para el hogar');
    crearCategoria('Electrónica', 'Productos electrónicos');
    crearCategoria('Ropa', 'Prendas de vestir');
    crearCategoria('Decoración', 'Artículos de decoración');

    guardarProducto({
        nombre: 'Auriculares Bluetooth',
        categoria: 'Electrónica',
        precio: 45.99,
        descripcion: 'Auriculares inalámbricos con excelente sonido',
        cantidad: 10,
        imagen: '🎧'
    });
    guardarProducto({
        nombre: 'Cargador Rápido',
        categoria: 'Electrónica',
        precio: 25.50,
        descripcion: 'Cargador USB-C de 65W',
        cantidad: 18,
        imagen: '⚡'
    });
    guardarProducto({
        nombre: 'Lámpara LED',
        categoria: 'Decoración',
        precio: 35.00,
        descripcion: 'Lámpara decorativa con control remoto',
        cantidad: 8,
        imagen: '💡'
    });
    guardarProducto({
        nombre: 'Reloj de Pared',
        categoria: 'Decoración',
        precio: 28.99,
        descripcion: 'Reloj minimalista para cualquier espacio',
        cantidad: 6,
        imagen: '⏰'
    });
    guardarProducto({
        nombre: 'Cable USB',
        categoria: 'Accesorios',
        precio: 12.99,
        descripcion: 'Cable USB 3.0 de 2 metros',
        cantidad: 20,
        imagen: '🔌'
    });
    guardarProducto({
        nombre: 'Funda para Teléfono',
        categoria: 'Accesorios',
        precio: 18.50,
        descripcion: 'Funda protectora con diseño moderno',
        cantidad: 14,
        imagen: '📱'
    });
    guardarProducto({
        nombre: 'Camiseta Premium',
        categoria: 'Ropa',
        precio: 32.00,
        descripcion: 'Camiseta de algodón 100%',
        cantidad: 12,
        imagen: '👕'
    });
    guardarProducto({
        nombre: 'Pantalón Casual',
        categoria: 'Ropa',
        precio: 55.00,
        descripcion: 'Pantalón cómodo para uso diario',
        cantidad: 0,
        imagen: '👖'
    });
}

function mostrarToast(mensaje, tipo = 'success') {
    const contenedorId = 'toastContainer';
    let contenedor = document.getElementById(contenedorId);
    if (!contenedor) {
        contenedor = document.createElement('div');
        contenedor.id = contenedorId;
        contenedor.className = 'toast-container';
        document.body.appendChild(contenedor);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${tipo}`;
    toast.textContent = mensaje;

    contenedor.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3200);
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        inicializarDatos();
    } catch (e) {
        console.warn('[storage] inicializarDatos fallo', e);
    }
    // Intentar migrar imágenes data URL existentes a IndexedDB (si hay)
    migrarImagenesALocalIDB().catch(err => {
        console.warn('[storage] migrarImagenesALocalIDB fallo', err);
    });
});
