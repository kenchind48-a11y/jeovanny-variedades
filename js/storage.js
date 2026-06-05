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

const MAX_IMAGE_FILE_SIZE = 8 * 1024 * 1024;

function _parseImageId(ref) {
    if (typeof ref === 'number' && Number.isFinite(ref)) return ref;
    if (typeof ref !== 'string') return null;
    if (ref.startsWith('idb:')) {
        const id = Number(ref.split(':')[1]);
        return Number.isFinite(id) ? id : null;
    }
    const numeric = Number(ref);
    return Number.isFinite(numeric) ? numeric : null;
}

function _dataUrlToBlob(dataUrl) {
    const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/);
    if (!match) return null;
    const mime = match[1];
    const base64 = match[2];
    const binStr = atob(base64);
    const len = binStr.length;
    const arr = new Uint8Array(len);
    for (let i = 0; i < len; i++) arr[i] = binStr.charCodeAt(i);
    return new Blob([arr], { type: mime });
}

async function _compressImageBlob(blob) {
    if (!blob || !(blob instanceof Blob)) {
        throw new Error('El archivo no es una imagen válida.');
    }
    if (blob.size > MAX_IMAGE_FILE_SIZE) {
        throw new Error('La imagen excede el tamaño máximo de 8 MB.');
    }

    const imageBitmap = await createImageBitmap(blob);
    const maxSide = 1200;
    let width = imageBitmap.width;
    let height = imageBitmap.height;
    const ratio = Math.min(maxSide / width, maxSide / height, 1);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imageBitmap, 0, 0, width, height);

    let outputType = blob.type || 'image/jpeg';
    if (!/^image\//.test(outputType)) {
        outputType = 'image/jpeg';
    }
    if (outputType === 'image/gif') {
        outputType = 'image/png';
    }

    const quality = outputType === 'image/png' ? undefined : 0.8;
    return new Promise((resolve, reject) => {
        canvas.toBlob(result => {
            if (result) {
                resolve(result);
            } else {
                reject(new Error('No se pudo optimizar la imagen.'));
            }
        }, outputType, quality);
    });
}

async function guardarImagen(input) {
    let blob = null;
    if (typeof input === 'string' && input.startsWith('data:image/')) {
        blob = _dataUrlToBlob(input);
    } else if (input instanceof Blob) {
        blob = input;
    }
    if (!blob) {
        throw new Error('La imagen no es válida o no se puede procesar.');
    }

    const optimizedBlob = await _compressImageBlob(blob);
    const db = await initImageDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('images', 'readwrite');
        const store = tx.objectStore('images');
        const req = store.add({ blob: optimizedBlob, mime: optimizedBlob.type, created: new Date().toISOString() });
        req.onsuccess = () => {
            const id = req.result;
            tx.oncomplete = () => resolve(id);
        };
        req.onerror = () => reject(req.error || new Error('Error almacenando imagen en IndexedDB'));
    });
}

async function getImageBlobById(imageId) {
    const id = _parseImageId(imageId);
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
        req.onerror = () => reject(req.error || new Error('Error leyendo imagen desde IndexedDB'));
    });
}

async function getImageUrlById(imageId) {
    const blob = await getImageBlobById(imageId);
    if (!blob) return null;
    return URL.createObjectURL(blob);
}

async function deleteImageById(imageId) {
    const id = _parseImageId(imageId);
    if (!Number.isFinite(id)) return false;
    const db = await initImageDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('images', 'readwrite');
        const store = tx.objectStore('images');
        const req = store.delete(id);
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error || new Error('Error eliminando imagen de IndexedDB'));
    });
}

async function migrarImagenesAIndexedDB() {
    try {
        const productos = obtenerProductos();
        let cambios = false;
        for (let i = 0; i < productos.length; i++) {
            const p = productos[i];
            if (!p) continue;

            let imagenId = null;
            if (Number.isFinite(p.imagenId)) {
                imagenId = p.imagenId;
            } else if (typeof p.imagen === 'string') {
                if (p.imagen.startsWith('idb:')) {
                    imagenId = _parseImageId(p.imagen);
                } else if (p.imagen.startsWith('data:image/')) {
                    try {
                        imagenId = await guardarImagen(p.imagen);
                    } catch (e) {
                        console.warn('[storage][migrate] No se pudo optimizar o guardar imagen de producto', p.id, e);
                    }
                }
            }

            if (imagenId !== null && imagenId !== undefined) {
                p.imagenId = imagenId;
            } else if (p.imagen !== undefined) {
                p.imagenId = null;
            }

            if (p.imagen !== undefined) {
                delete p.imagen;
                cambios = true;
            }
        }

        if (cambios) {
            escribirStorage(STORAGE_KEYS.PRODUCTOS, productos);
            console.log('[storage][migrate] Migración completada. Tamaño jv_productos:', tamanoStorageProductosHumano());
            if (typeof window.renderizarProductos === 'function') window.renderizarProductos();
            if (typeof window.renderizarProductosAdmin === 'function') window.renderizarProductosAdmin();
        }
    } catch (e) {
        console.warn('[storage][migrate] Error durante migración:', e);
    }
}

function obtenerImagenIdDeProducto(producto) {
    if (!producto) return null;
    if (Number.isFinite(producto.imagenId)) return producto.imagenId;
    if (typeof producto.imagen === 'string' && producto.imagen.startsWith('idb:')) {
        return _parseImageId(producto.imagen);
    }
    return null;
}

// Función utilitaria para que UI cargue imágenes desde IDB
window.cargarImagenesDesdeIDB = async function(root = document) {
    try {
        const imgs = Array.from((root || document).querySelectorAll('img[data-image-id], img[data-idb]'));
        for (const img of imgs) {
            const datasetId = img.dataset.imageId || img.dataset.idb;
            if (!datasetId) continue;
            const imageId = _parseImageId(datasetId);
            if (!Number.isFinite(imageId)) continue;
            try {
                const url = await getImageUrlById(imageId);
                if (url) {
                    img.src = url;
                    img.classList.remove('hidden');
                    img.removeAttribute('data-image-id');
                    img.removeAttribute('data-idb');
                }
            } catch (e) {
                console.warn('[storage] Error cargando imagen IndexedDB', datasetId, e);
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

async function guardarProducto(producto) {
    const precio = Number(producto.precio ?? 0);
    let imagenId = null;
    if (typeof producto.imagenId === 'number' && Number.isFinite(producto.imagenId)) {
        imagenId = producto.imagenId;
    }
    if (producto.imagenFile) {
        imagenId = await guardarImagen(producto.imagenFile);
    }

    const nuevoProducto = {
        id: Date.now(),
        nombre: producto.nombre || '',
        categoria: producto.categoria || 'Sin categoría',
        precio: Number.isFinite(precio) ? precio : 0,
        descripcion: producto.descripcion || '',
        disponible: producto.disponible === true,
        imagenId: imagenId !== null ? imagenId : null,
        fechaCreacion: new Date().toISOString()
    };

    console.log('[storage] Productos antes de guardar:', obtenerProductos().length);
    const productos = obtenerProductos();
    productos.push(nuevoProducto);
    try {
        escribirStorage(STORAGE_KEYS.PRODUCTOS, productos);
        console.log('[storage] Producto guardado. Productos ahora:', obtenerProductos().length);
        console.log('[storage] Tamaño jv_productos:', tamanoStorageProductosHumano());
        return nuevoProducto;
    } catch (e) {
        console.error('[storage] Error al escribir productos en localStorage:', e);
        return null;
    }
}

async function actualizarProducto(id, datosActualizados) {
    const productos = obtenerProductos();
    const index = productos.findIndex(item => item.id === id);
    if (index === -1) return false;

    const precioActualizado = Number(datosActualizados.precio ?? productos[index].precio);
    const disponibleActualizado = typeof datosActualizados.disponible === 'boolean'
        ? datosActualizados.disponible
        : productos[index].disponible;

    let imagenIdActualizado = productos[index].imagenId ?? null;
    if (datosActualizados.imagenFile) {
        try {
            const nuevoId = await guardarImagen(datosActualizados.imagenFile);
            const antiguoId = imagenIdActualizado;
            imagenIdActualizado = nuevoId;
            if (Number.isFinite(antiguoId)) {
                await deleteImageById(antiguoId);
            }
        } catch (e) {
            console.error('[storage] No se pudo guardar la nueva imagen:', e);
            return false;
        }
    } else if (typeof datosActualizados.imagenId !== 'undefined') {
        if (datosActualizados.imagenId === null && Number.isFinite(imagenIdActualizado)) {
            await deleteImageById(imagenIdActualizado);
        }
        imagenIdActualizado = datosActualizados.imagenId;
    }

    productos[index] = {
        ...productos[index],
        ...datosActualizados,
        imagenId: imagenIdActualizado !== null ? imagenIdActualizado : null,
        precio: Number.isFinite(precioActualizado) ? precioActualizado : productos[index].precio,
        disponible: disponibleActualizado,
        id: productos[index].id,
        fechaCreacion: productos[index].fechaCreacion
    };
    delete productos[index].imagen;
    delete productos[index].imagenFile;

    try {
        escribirStorage(STORAGE_KEYS.PRODUCTOS, productos);
        console.log('[storage] Producto actualizado. Tamaño jv_productos:', tamanoStorageProductosHumano());
        return true;
    } catch (e) {
        console.error('[storage] Error al actualizar producto en localStorage:', e);
        return false;
    }
}

function eliminarProducto(id) {
    const productos = obtenerProductos();
    const index = productos.findIndex(item => item.id === id);
    if (index === -1) return false;
    const [removed] = productos.splice(index, 1);
    escribirStorage(STORAGE_KEYS.PRODUCTOS, productos);
    try {
        if (removed && Number.isFinite(removed.imagenId)) {
            deleteImageById(removed.imagenId).catch(err => console.warn('[storage] No se pudo eliminar imagen IndexedDB:', err));
        }
    } catch (e) {
        console.warn('[storage] Error durante limpieza IndexedDB al eliminar producto', e);
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

async function inicializarDatos() {
    const productos = obtenerProductos();
    const categorias = obtenerCategorias();
    if (productos.length > 0 || categorias.length > 0) {
        return;
    }

    crearCategoria('Accesorios', 'Accesorios para el hogar');
    crearCategoria('Electrónica', 'Productos electrónicos');
    crearCategoria('Ropa', 'Prendas de vestir');
    crearCategoria('Decoración', 'Artículos de decoración');

    await guardarProducto({
        nombre: 'Auriculares Bluetooth',
        categoria: 'Electrónica',
        precio: 45.99,
        descripcion: 'Auriculares inalámbricos con excelente sonido',
        disponible: true
    });
    await guardarProducto({
        nombre: 'Cargador Rápido',
        categoria: 'Electrónica',
        precio: 25.50,
        descripcion: 'Cargador USB-C de 65W',
        disponible: true
    });
    await guardarProducto({
        nombre: 'Lámpara LED',
        categoria: 'Decoración',
        precio: 35.00,
        descripcion: 'Lámpara decorativa con control remoto',
        disponible: true
    });
    await guardarProducto({
        nombre: 'Reloj de Pared',
        categoria: 'Decoración',
        precio: 28.99,
        descripcion: 'Reloj minimalista para cualquier espacio',
        disponible: true
    });
    await guardarProducto({
        nombre: 'Cable USB',
        categoria: 'Accesorios',
        precio: 12.99,
        descripcion: 'Cable USB 3.0 de 2 metros',
        disponible: true
    });
    await guardarProducto({
        nombre: 'Funda para Teléfono',
        categoria: 'Accesorios',
        precio: 18.50,
        descripcion: 'Funda protectora con diseño moderno',
        disponible: true
    });
    await guardarProducto({
        nombre: 'Camiseta Premium',
        categoria: 'Ropa',
        precio: 32.00,
        descripcion: 'Camiseta de algodón 100%',
        disponible: true
    });
    await guardarProducto({
        nombre: 'Pantalón Casual',
        categoria: 'Ropa',
        precio: 55.00,
        descripcion: 'Pantalón cómodo para uso diario',
        disponible: false
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
    (async () => {
        try {
            await inicializarDatos();
        } catch (e) {
            console.warn('[storage] inicializarDatos fallo', e);
        }

        try {
            await migrarImagenesAIndexedDB();
        } catch (err) {
            console.warn('[storage] migrarImagenesAIndexedDB fallo', err);
        }
    })();
});
