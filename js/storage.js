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

const IMAGE_MIGRATION_STATE_KEY = 'jv_imagenes_migradas';
let legacyImageStorageEnabled = true;

const CLOUDINARY_CONFIG = {
    cloudName: 'YOUR_CLOUD_NAME',
    uploadPreset: 'YOUR_UPLOAD_PRESET',
    folder: 'jeovanny_variedades'
};

function getCloudinaryUploadUrl() {
    if (!CLOUDINARY_CONFIG.cloudName || !CLOUDINARY_CONFIG.uploadPreset) {
        throw new Error('Cloudinary no está configurado. Configura cloudName y uploadPreset.');
    }
    return `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/auto/upload`;
}

function leerStorage(key) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : [];
    } catch (error) {
        console.error(`Error leyendo ${key}:`, error);
        return [];
    }
}

function leerMigracionEstado() {
    try {
        const value = localStorage.getItem(IMAGE_MIGRATION_STATE_KEY);
        return value === 'true';
    } catch (error) {
        console.error('[storage] Error leyendo estado de migración:', error);
        return false;
    }
}

function guardarMigracionEstado(valor) {
    try {
        localStorage.setItem(IMAGE_MIGRATION_STATE_KEY, valor ? 'true' : 'false');
        sincronizarEstadoLegacy();
    } catch (error) {
        console.error('[storage] Error guardando estado de migración:', error);
    }
}

function sincronizarEstadoLegacy() {
    const migrado = leerMigracionEstado();
    legacyImageStorageEnabled = !migrado;
    console.debug('[IMAGES] legacy enabled:', legacyImageStorageEnabled);
}

function _isValidHttpUrl(value) {
    return typeof value === 'string' && /^(https?:\/\/)/.test(value);
}

function obtenerImagenesDeProducto(producto) {
    if (!producto || !Array.isArray(producto.imagenes)) return [];
    return producto.imagenes.filter(item => typeof item === 'string' && item.trim() !== '');
}

function obtenerProductoImagenSource(producto) {
    const urls = obtenerImagenesDeProducto(producto);
    if (urls.length) {
        return { url: urls[0], imageId: null };
    }
    if (typeof producto.imagen === 'string' && _isValidHttpUrl(producto.imagen)) {
        return { url: producto.imagen, imageId: null };
    }
    const imageId = obtenerImagenIdDeProducto(producto);
    if (Number.isFinite(imageId)) {
        return { url: null, imageId };
    }
    return { url: null, imageId: null };
}

window.obtenerProductoImagenSource = obtenerProductoImagenSource;
window.obtenerImagenesDeProducto = obtenerImagenesDeProducto;

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

async function uploadImageToCloudinary(file, onProgress = () => {}) {
    if (!(file instanceof Blob)) {
        throw new Error('El archivo debe ser un Blob o File válido.');
    }

    const optimizedBlob = await _compressImageBlob(file);
    const uploadUrl = getCloudinaryUploadUrl();
    const formData = new FormData();
    formData.append('file', optimizedBlob, file.name || 'image.jpg');
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    if (CLOUDINARY_CONFIG.folder) {
        formData.append('folder', CLOUDINARY_CONFIG.folder);
    }

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', uploadUrl);
        xhr.upload.addEventListener('progress', event => {
            if (event.lengthComputable) {
                onProgress(Math.round((event.loaded / event.total) * 100));
            }
        });
        xhr.onreadystatechange = () => {
            if (xhr.readyState !== 4) return;
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response && response.secure_url) {
                        resolve(response.secure_url);
                    } else {
                        reject(new Error('No se recibió secure_url de Cloudinary.'));
                    }
                } catch (error) {
                    reject(error);
                }
                return;
            }
            reject(new Error(`Error Cloudinary ${xhr.status}: ${xhr.responseText || xhr.statusText}`));
        };
        xhr.onerror = () => reject(new Error('Error de red subiendo imagen a Cloudinary.'));
        xhr.send(formData);
    });
}

async function uploadImagesToCloudinary(files, onProgress = () => {}) {
    if (!Array.isArray(files) || files.length === 0) return [];
    const results = [];
    for (let index = 0; index < files.length; index++) {
        const file = files[index];
        const url = await uploadImageToCloudinary(file, percent => {
            const totalPercent = Math.round(((index) / files.length) * 100 + percent / files.length);
            onProgress(totalPercent, index + 1, files.length);
        });
        results.push(url);
    }
    return results;
}

async function guardarImagen(input) {
    if (!legacyImageStorageEnabled) {
        throw new Error('El almacenamiento legacy de imágenes está deshabilitado.');
    }
    if (!(input instanceof Blob)) {
        throw new Error('La imagen debe ser un Blob o File válido.');
    }

    const optimizedBlob = await _compressImageBlob(input);
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
    if (!legacyImageStorageEnabled) {
        return null;
    }
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
                        const blob = _dataUrlToBlob(p.imagen);
                        if (blob) {
                            imagenId = await guardarImagen(blob);
                        }
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

async function migrarImagenesACloudinary(onProgress = () => {}) {
    try {
        const productos = obtenerProductos();
        let cambios = false;

        for (let i = 0; i < productos.length; i++) {
            const p = productos[i];
            if (!p) continue;

            if (Array.isArray(p.imagenes) && p.imagenes.length) {
                continue;
            }

            const originalImageId = obtenerImagenIdDeProducto(p);
            if (!Number.isFinite(originalImageId)) {
                continue;
            }

            const blob = await getImageBlobById(originalImageId);
            if (!blob) {
                console.warn('[storage][migrateCloudinary] No se encontró blob para imagenId', originalImageId);
                continue;
            }

            try {
                const url = await uploadImageToCloudinary(blob, percent => {
                    const totalPercent = Math.round((i / productos.length) * 100 + percent / productos.length);
                    onProgress(totalPercent, i + 1, productos.length);
                });
                p.imagenes = [url];
                cambios = true;
            } catch (error) {
                console.warn('[storage][migrateCloudinary] Error subiendo imagen a Cloudinary:', error);
            }
        }

        if (cambios) {
            escribirStorage(STORAGE_KEYS.PRODUCTOS, productos);
            console.log('[storage][migrateCloudinary] Migración a Cloudinary completada.');
            if (typeof window.renderizarProductos === 'function') window.renderizarProductos();
            if (typeof window.renderizarProductosAdmin === 'function') window.renderizarProductosAdmin();
        }
    } catch (e) {
        console.warn('[storage][migrateCloudinary] Error durante migración:', e);
    }
}

function verificarMigracionCompleta() {
    const productos = obtenerProductos();
    const total = productos.length;
    let migrados = 0;
    let pendientes = 0;

    for (const producto of productos) {
        if (!producto) continue;
        const tieneImagenes = Array.isArray(producto.imagenes) && producto.imagenes.length;
        const tieneLegacy = Number.isFinite(obtenerImagenIdDeProducto(producto));

        if (tieneImagenes) {
            migrados += 1;
        } else if (tieneLegacy) {
            pendientes += 1;
        } else {
            migrados += 1;
        }
    }

    return { total, migrados, pendientes };
}

async function ejecutarMigracionSiEsNecesario(onProgress = () => {}) {
    if (leerMigracionEstado()) {
        return verificarMigracionCompleta();
    }

    const resultado = verificarMigracionCompleta();
    if (resultado.pendientes === 0) {
        guardarMigracionEstado(true);
        legacyImageStorageEnabled = false;
        console.log('Migración completada. Migrados:', resultado.migrados, 'Pendientes:', resultado.pendientes);
        return resultado;
    }

    await migrarImagenesACloudinary(onProgress);
    const final = verificarMigracionCompleta();
    if (final.pendientes === 0) {
        guardarMigracionEstado(true);
        legacyImageStorageEnabled = false;
    }
    console.log('Migración completada. Migrados:', final.migrados, 'Pendientes:', final.pendientes);
    return final;
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
    if (!legacyImageStorageEnabled) {
        console.debug('[IMAGES] legacy disabled, skipping IDB load');
        return;
    }
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

async function limpiarImagenesLegacy() {
    if (!('indexedDB' in window)) {
        throw new Error('IndexedDB no disponible');
    }

    const db = await initImageDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('images', 'readwrite');
        const store = tx.objectStore('images');
        const req = store.clear();
        req.onsuccess = () => resolve(true);
        req.onerror = () => reject(req.error || new Error('Error limpiando imágenes legacy en IndexedDB'));
    });
}

window.verificarMigracionCompleta = verificarMigracionCompleta;
window.limpiarImagenesLegacy = limpiarImagenesLegacy;

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

async function guardarProducto(producto, options = {}) {
    const precio = Number(producto.precio ?? 0);
    const onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {};

    // Protección: no permitir base64 en `producto.imagen`
    if (producto && typeof producto.imagen === 'string' && producto.imagen.startsWith('data:image')) {
        throw new Error('Bloqueado: base64 detectado');
    }

    let imagenes = Array.isArray(producto.imagenes) ? producto.imagenes : [];
    // Si vienen archivos, subirlos (pero luego borramos la referencia para no persistir los Files)
    if (Array.isArray(producto.imagenesFiles) && producto.imagenesFiles.length) {
        imagenes = await uploadImagesToCloudinary(producto.imagenesFiles, onProgress);
    }

    // Asegurar que `producto.imagen` sea solo URL derivada de `imagenes` cuando existan
    if (Array.isArray(producto.imagenes) && producto.imagenes.length) {
        producto.imagen = producto.imagenes[0];
    }
    // Eliminar posibles referencias a File antes de persistir
    if (producto && typeof producto.imagenesFiles !== 'undefined') delete producto.imagenesFiles;

    const nuevoProducto = {
        id: Date.now(),
        nombre: producto.nombre || '',
        categoria: producto.categoria || 'Sin categoría',
        precio: Number.isFinite(precio) ? precio : 0,
        descripcion: producto.descripcion || '',
        disponible: producto.disponible === true,
        imagenes: imagenes.length ? imagenes : [],
        imagen: imagenes.length ? imagenes[0] : (typeof producto.imagen === 'string' && _isValidHttpUrl(producto.imagen) ? producto.imagen : null),
        imagenId: typeof producto.imagenId === 'number' && Number.isFinite(producto.imagenId) ? producto.imagenId : null,
        fechaCreacion: new Date().toISOString()
    };

    // Mostrar el producto que se va a persistir (debe contener solo URLs, no base64)
    console.log('[storage] Persistiendo producto:', { nombre: nuevoProducto.nombre, imagen: nuevoProducto.imagen });
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

async function actualizarProducto(id, datosActualizados, options = {}) {
    const productos = obtenerProductos();
    const index = productos.findIndex(item => item.id === id);
    if (index === -1) return false;

    const onProgress = typeof options.onProgress === 'function' ? options.onProgress : () => {};
    const precioActualizado = Number(datosActualizados.precio ?? productos[index].precio);
    const disponibleActualizado = typeof datosActualizados.disponible === 'boolean'
        ? datosActualizados.disponible
        : productos[index].disponible;

    // Protección: no permitir base64 en `datosActualizados.imagen`
    if (datosActualizados && typeof datosActualizados.imagen === 'string' && datosActualizados.imagen.startsWith('data:image')) {
        throw new Error('Bloqueado: base64 detectado');
    }

    let imagenesActualizadas = Array.isArray(productos[index].imagenes) ? productos[index].imagenes : [];
    if (Array.isArray(datosActualizados.imagenesFiles) && datosActualizados.imagenesFiles.length) {
        try {
            imagenesActualizadas = await uploadImagesToCloudinary(datosActualizados.imagenesFiles, onProgress);
        } catch (e) {
            console.error('[storage] No se pudo subir las nuevas imágenes a Cloudinary:', e);
            return false;
        }
    } else if (Array.isArray(datosActualizados.imagenes)) {
        imagenesActualizadas = datosActualizados.imagenes;
    }

    // Si hay un array `imagenes` enviado, asegurar que `imagen` apunte a la primera URL
    if (Array.isArray(datosActualizados.imagenes) && datosActualizados.imagenes.length) {
        datosActualizados.imagen = datosActualizados.imagenes[0];
    }
    // Eliminar referencia a Files antes de persistir
    if (typeof datosActualizados.imagenesFiles !== 'undefined') delete datosActualizados.imagenesFiles;

    let imagenIdActualizado = productos[index].imagenId ?? null;
    if (typeof datosActualizados.imagenId !== 'undefined') {
        if (datosActualizados.imagenId === null && Number.isFinite(imagenIdActualizado)) {
            await deleteImageById(imagenIdActualizado);
        }
        imagenIdActualizado = datosActualizados.imagenId;
    }

    productos[index] = {
        ...productos[index],
        ...datosActualizados,
        imagenes: imagenesActualizadas,
        imagen: imagenesActualizadas.length ? imagenesActualizadas[0] : (typeof datosActualizados.imagen === 'string' && _isValidHttpUrl(datosActualizados.imagen) ? datosActualizados.imagen : productos[index].imagen ?? null),
        imagenId: imagenIdActualizado !== null ? imagenIdActualizado : null,
        precio: Number.isFinite(precioActualizado) ? precioActualizado : productos[index].precio,
        disponible: disponibleActualizado,
        id: productos[index].id,
        fechaCreacion: productos[index].fechaCreacion
    };
    // Eliminar solo referencias a archivos temporales; conservar `imagen` (URL)
    delete productos[index].imagenFile;
    delete productos[index].imagenesFiles;

    // Mostrar el producto actualizado que se persistirá
    console.log('[storage] Persistiendo producto actualizado:', { nombre: productos[index].nombre, imagen: productos[index].imagen });

    try {
        // Protección final: impedir persistir base64 en `imagen`
        if (productos[index].imagen && typeof productos[index].imagen === 'string' && productos[index].imagen.startsWith('data:image')) {
            throw new Error('Bloqueado: base64 detectado');
        }
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
    sincronizarEstadoLegacy();
    (async () => {
        try {
            await inicializarDatos();
        } catch (e) {
            console.warn('[storage] inicializarDatos fallo', e);
        }

        try {
            await ejecutarMigracionSiEsNecesario();
        } catch (err) {
            console.warn('[storage] migración a Cloudinary falló', err);
        }
    })();
});
