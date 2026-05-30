# 🏪 JEOVANNY VARIEDADES

Una aplicación web profesional y moderna para gestionar un catálogo de productos con sistema de chat integrado y panel administrativo.

## ✨ Características

### 🛍️ Catálogo de Productos
- Visualización moderna de productos por categorías
- Búsqueda en tiempo real
- Información detallada de cada producto
- Sistema de disponibilidad (Disponible, Limitado, No Disponible)
- Carrito de compras funcional

### 💬 Sistema de Chat
- Chat interno entre clientes y administrador
- Mensajes en tiempo real
- Historial persistente en localStorage
- Capacidad de descargar conversaciones
- Respuestas automáticas simuladas

### ⚙️ Panel Administrador
- Dashboard con estadísticas completas
- Gestión CRUD completa de productos
- Importar/Exportar datos (CSV, JSON)
- Búsqueda avanzada en tabla
- Filtros por disponibilidad

### 🎨 Diseño
- Dark mode moderno y premium
- Responsive (funciona en móvil, tablet, desktop)
- Interfaz minimalista y elegante
- Animaciones suaves
- Apariencia de app móvil real

## 🛠️ Tecnologías

- **HTML5** - Estructura semántica
- **CSS3** - Estilos modernos con variables CSS
- **JavaScript Vanilla** - Sin dependencias externas
- **localStorage** - Persistencia de datos

## 📁 Estructura del Proyecto

```
JEOVANNY-VARIEDADES/
├── index.html                 # Página principal - Catálogo
├── css/
│   └── styles.css            # Estilos globales (2000+ líneas)
├── js/
│   ├── productos.js          # Gestión de productos
│   ├── app.js                # Lógica principal de la app
│   ├── chat.js               # Sistema de chat
│   └── admin.js              # Panel administrador
└── pages/
    ├── chat.html             # Página del chat
    └── admin.html            # Página del admin
```

## 🚀 Cómo Usar

### 1️⃣ Inicio Rápido

1. Abre `index.html` en tu navegador (no requiere servidor)
2. Explora el catálogo de productos
3. Usa la búsqueda para encontrar productos específicos
4. Haz clic en cualquier producto para ver detalles

### 2️⃣ Categorías

- Todos
- Calzado
- Accesorios
- Prendas
- Electrónica
- Mochilas

(Las categorías se generan automáticamente del catálogo)

### 3️⃣ Carrito

- Haz clic en "Agregar al Carrito" en detalles del producto
- El contador en el header muestra items en el carrito
- Los datos se guardan en localStorage

### 4️⃣ Chat

1. Haz clic en "💬 Chat" en el header
2. Escribe tu nombre (opcional)
3. Envía mensajes con el botón o presiona Enter
4. El admin responde automáticamente
5. Descarga o limpia el historial según necesites

### 5️⃣ Panel Admin

1. Haz clic en "⚙️ Admin"
2. Ve estadísticas en tiempo real
3. **Crear**: Haz clic en "➕ Nuevo"
4. **Editar**: Haz clic en "✎ Editar" en la tabla
5. **Eliminar**: Haz clic en "🗑 Eliminar" con confirmación
6. **Exportar/Importar**: Usa los botones correspondientes

## 📊 Datos de Ejemplo

La aplicación viene con 12 productos de ejemplo:

- Zapatillas Deportivas ($89.99)
- Bolsa de Deporte ($45.50)
- Cinturón Casual ($32.99)
- Gafas de Sol ($65.00)
- Gorro Deportivo ($25.99)
- Camiseta Básica ($19.99)
- Pantalón Deportivo ($55.00)
- Chaqueta Impermeable ($120.00)
- Botella de Agua ($28.50)
- Auriculares Inalámbricos ($150.00)
- Reloj Digital ($199.99)
- Mochila Ergonómica ($78.50)

## 🎨 Esquema de Colores

| Elemento | Color | Uso |
|----------|-------|-----|
| Fondo Principal | `#0f0f0f` | Fondo general |
| Tarjetas | `#1a1a1a` | Elementos principales |
| Primario | `#00c896` | Botones, acentos |
| Secundario | `#00a878` | Hover effects |
| Texto Principal | `#ffffff` | Texto principal |
| Texto Secundario | `#b0b0b0` | Descripciones |

## 💾 Persistencia de Datos

Todos los datos se guardan en `localStorage`:

- **productos** - Catálogo de productos
- **carrito** - Items en el carrito
- **mensajes_chat** - Historial de chat

Los datos persisten entre sesiones del navegador.

## 🔄 Flujo de Datos

```
usuarios
   ↓
index.html (Catálogo)
   ├→ productos.js (BD productos)
   ├→ app.js (Lógica UI)
   └→ styles.css (Estilos)
   
   ↓
   ├→ pages/chat.html → chat.js
   └→ pages/admin.html → admin.js
   
   ↓ (localStorage)
   
Datos persistentes en el navegador
```

## 🎯 Funciones Principales

### productos.js
- `obtenerCategorias()` - Obtiene todas las categorías
- `obtenerProductosPorCategoria(categoria)` - Filtra por categoría
- `agregarProducto(datos)` - Crea nuevo producto
- `actualizarProducto(id, datos)` - Edita producto
- `eliminarProducto(id)` - Borra producto
- `obtenerEstadisticas()` - Calcula estadísticas

### app.js
- `inicializarApp()` - Setup inicial
- `renderizarProductos(categoria)` - Muestra grid
- `buscarProductosApp()` - Búsqueda en tiempo real
- `agregarAlCarrito(id)` - Gestiona carrito
- `mostrarDetallesProducto(id)` - Modal de producto

### chat.js
- `inicializarChat()` - Setup del chat
- `enviarMensaje()` - Envía mensaje
- `responderAdmin()` - Respuesta automática
- `guardarMensajes()` - Persistencia
- `limpiarChat()` - Limpia historial

### admin.js
- `inicializarAdmin()` - Setup panel admin
- `renderizarTablaProductos()` - Tabla dinámica
- `abrirNuevoProducto()` - Modal para crear
- `abrirEdicionProducto(id)` - Modal para editar
- `exportarCSV()` - Descarga datos
- `importarJSON()` - Carga datos

## 📱 Responsive Design

La aplicación se adapta perfectamente a:
- 📱 Móviles (320px+)
- 📱 Tablets (768px+)
- 💻 Desktops (1024px+)
- 🖥️ Pantallas grandes (1440px+)

## 🔒 Almacenamiento Local

No se envía información a servidores externos. Todo se guarda localmente en:
- localStorage del navegador
- Cookies no utilizadas

## 📝 Comentarios en el Código

Todo el código está documentado con comentarios explicativos:
- Funciones documentadas con JSDoc
- Secciones claramente delimitadas
- Nombres de variables descriptivos
- Estructura clara y modular

## 🚀 Mejoras Futuras

Posibles mejoras para expandir la app:

1. **Backend**
   - Servidor Node.js/Python
   - Base de datos MongoDB/PostgreSQL
   - Autenticación real

2. **Funcionalidades**
   - Carrito de compra completo
   - Sistema de órdenes
   - Pagos en línea
   - Notificaciones en tiempo real
   - Imágenes personalizadas

3. **Admin**
   - Gestión de usuarios
   - Estadísticas avanzadas
   - Gráficos interactivos
   - Reportes automatizados

4. **UX/UI**
   - Temas personalizables
   - Modo claro
   - Idiomas múltiples
   - Modo offline

## 📞 Soporte

Para consultas o problemas, usa el sistema de chat integrado en la aplicación.

## 📄 Licencia

Aplicación de código abierto para uso personal y educativo.

---

**Versión:** 1.0.0  
**Última actualización:** Mayo 2026  
**Desarrollado con ❤️**
