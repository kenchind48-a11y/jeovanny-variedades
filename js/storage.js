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
        imagen: producto.imagen || '📦',
        fechaCreacion: new Date().toISOString()
    };
    productos.push(nuevoProducto);
    escribirStorage(STORAGE_KEYS.PRODUCTOS, productos);
    return nuevoProducto;
}

function actualizarProducto(id, datosActualizados) {
    const productos = obtenerProductos();
    const index = productos.findIndex(item => item.id === id);
    if (index === -1) return false;

    const precioActualizado = Number(datosActualizados.precio ?? productos[index].precio);
    const disponibleActualizado = typeof datosActualizados.disponible === 'boolean'
        ? datosActualizados.disponible
        : productos[index].disponible;

    productos[index] = {
        ...productos[index],
        ...datosActualizados,
        precio: Number.isFinite(precioActualizado) ? precioActualizado : productos[index].precio,
        disponible: disponibleActualizado,
        id: productos[index].id,
        fechaCreacion: productos[index].fechaCreacion
    };
    escribirStorage(STORAGE_KEYS.PRODUCTOS, productos);
    return true;
}

function eliminarProducto(id) {
    const productos = obtenerProductos();
    const index = productos.findIndex(item => item.id === id);
    if (index === -1) return false;
    productos.splice(index, 1);
    escribirStorage(STORAGE_KEYS.PRODUCTOS, productos);
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

document.addEventListener('DOMContentLoaded', inicializarDatos);
