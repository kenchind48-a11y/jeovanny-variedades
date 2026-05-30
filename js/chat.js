/* ========================================
   JEOVANNY VARIEDADES - Sistema de Chat
   Chat interno entre cliente y soporte
   ======================================== */

const chatState = {
    mensajes: []
};

function inicializarChat() {
    cargarMensajes();
    configurarEventosChat();
    mostrarMensajes();
    mostrarProductosSeleccionados();
}

function cargarMensajes() {
    const datos = localStorage.getItem('jv_chat_mensajes');
    if (!datos) {
        chatState.mensajes = [];
        return;
    }
    try {
        chatState.mensajes = JSON.parse(datos);
    } catch (error) {
        chatState.mensajes = [];
        console.error('Error cargando mensajes:', error);
    }
}

function guardarMensajes() {
    localStorage.setItem('jv_chat_mensajes', JSON.stringify(chatState.mensajes));
}

function mostrarMensajes() {
    const container = document.getElementById('messageList');
    if (!container) return;

    if (chatState.mensajes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">💬</div>
                <h3>Tu chat está listo</h3>
                <p>Escribe un mensaje para comenzar la conversación con soporte.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    chatState.mensajes.forEach(mensaje => {
        container.appendChild(crearElementoMensaje(mensaje));
    });
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
}

function crearElementoMensaje(mensaje) {
    const item = document.createElement('div');
    item.className = `message ${mensaje.esAdmin ? 'admin' : 'user'}`;

    const fecha = new Date(mensaje.fecha).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    item.innerHTML = `
        <div>
            <div class="message-bubble">
                <strong style="display:block; margin-bottom:0.35rem;">${mensaje.remitente}</strong>
                <p>${mensaje.texto}</p>
            </div>
            <div class="message-time">${fecha}</div>
        </div>
    `;
    return item;
}

function mostrarProductosSeleccionados() {
    const preview = document.getElementById('selectedProductsPreview');
    if (!preview) return;

    const productos = obtenerProductosSeleccionados();
    if (productos.length === 0) {
        preview.innerHTML = `
            <div class="empty-state">
                <p>No hay productos seleccionados.</p>
            </div>
        `;
        return;
    }

    preview.innerHTML = productos.map(producto => `
        <div class="preview-card">
            <h4>${producto.nombre}</h4>
            <p>${producto.categoria}</p>
            <span>$${producto.precio.toFixed(2)}</span>
        </div>
    `).join('');
}

function enviarMensaje(event) {
    if (event) event.preventDefault();

    const nombre = document.getElementById('chatName')?.value.trim() || 'Cliente';
    const email = document.getElementById('chatEmail')?.value.trim() || '';
    const texto = document.getElementById('chatInput')?.value.trim();

    if (!texto) {
        if (typeof mostrarToast === 'function') {
            mostrarToast('Escribe tu consulta antes de enviar.', 'error');
            return;
        }
        alert('Escribe tu consulta antes de enviar.');
        return;
    }

    const nuevoMensaje = {
        id: Date.now(),
        remitente: nombre,
        texto,
        esAdmin: false,
        fecha: new Date().toISOString()
    };

    chatState.mensajes.push(nuevoMensaje);
    guardarMensajes();
    mostrarMensajes();
    guardarConsulta({
        nombre,
        email,
        mensaje: texto,
        productos: obtenerProductosSeleccionados()
    });

    const input = document.getElementById('chatInput');
    if (input) {
        input.value = '';
        input.focus();
    }

    if (typeof mostrarToast === 'function') {
        mostrarToast('Consulta enviada, pronto recibirás respuesta.');
    }

    setTimeout(responderAdmin, 1200);
}

function responderAdmin() {
    const respuestas = [
        '¡Hola! Gracias por tu mensaje, estamos revisando tu consulta.',
        'Gracias por contactarnos. Pronto te respondemos con más detalles.',
        'En breve uno de nuestros agentes te apoyará.',
        'Hemos recibido tu mensaje. Gracias por elegirnos.',
        'Un momento, estamos verificando la información de tu pedido.'
    ];

    const respuesta = respuestas[Math.floor(Math.random() * respuestas.length)];
    const mensaje = {
        id: Date.now(),
        remitente: 'Soporte JEOVANNY VARIEDADES',
        texto: respuesta,
        esAdmin: true,
        fecha: new Date().toISOString()
    };

    chatState.mensajes.push(mensaje);
    guardarMensajes();
    mostrarMensajes();
}

function limpiarChat() {
    if (!confirm('¿Deseas eliminar todo el historial de chat?')) {
        return;
    }
    chatState.mensajes = [];
    guardarMensajes();
    mostrarMensajes();
    if (typeof mostrarToast === 'function') {
        mostrarToast('Historial de chat eliminado.', 'success');
    }
}

function registrarServiceWorkerChat() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('../sw.js').catch(() => {
            console.warn('Service Worker no registrado en chat.');
        });
    }
}

function regresarATiendaChat() {
    const fallback = '../index.html';
    if (window.history.length > 1 && document.referrer && !document.referrer.includes('chat.html')) {
        window.history.back();
        setTimeout(() => {
            if (window.location.pathname.endsWith('/chat.html')) {
                window.location.href = fallback;
            }
        }, 250);
        return;
    }
    window.location.href = fallback;
}

function configurarEventosChat() {
    document.getElementById('chatForm')?.addEventListener('submit', enviarMensaje);
    document.getElementById('clearChat')?.addEventListener('click', limpiarChat);
    document.getElementById('returnHomeButton')?.addEventListener('click', regresarATiendaChat);
}

document.addEventListener('DOMContentLoaded', () => {
    registrarServiceWorkerChat();
    if (document.getElementById('messageList')) {
        inicializarChat();
    }
});
