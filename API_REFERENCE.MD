# MikuVerse Community - Guía Completa de la API

¡Bienvenido al equipo! Este documento es tu guía definitiva para interactuar con el backend de MikuVerse. Cubre la API RESTful, los eventos de WebSockets (Socket.IO) y proporciona ejemplos prácticos de cómo usar cada funcionalidad desde el frontend.

## Tabla de Contenidos

1.  [Configuración Inicial del Frontend](#1-configuración-inicial-del-frontend)
    *   [1.1 Obtener Configuración del Frontend](#11-obtener-configuración-del-frontend)
2.  [API REST](#2-api-rest)
    *   [2.1 Autenticación](#21-autenticación)
        *   [2.1.1 Registro de Usuario Manual](#211-registro-de-usuario-manual)
        *   [2.1.2 Inicio de Sesión Manual](#212-inicio-de-sesión-manual)
        *   [2.1.3 Autenticación con Google (Flujo)](#213-autenticación-con-google-flujo)
        *   [2.1.4 Completar Registro de Google](#214-completar-registro-de-google)
    *   [2.2 Perfiles de Usuario](#22-perfiles-de-usuario)
        *   [2.2.1 Obtener Datos del Perfil del Usuario Autenticado](#221-obtener-datos-del-perfil-del-usuario-autenticado)
        *   [2.2.2 Obtener Perfil Público de Otro Usuario](#222-obtener-perfil-público-de-otro-usuario)
        *   [2.2.3 Actualizar el Perfil del Usuario Autenticado](#223-actualizar-el-perfil-del-usuario-autenticado)
    *   [2.3 Misceláneos](#23-misceláneos)
        *   [2.3.1 Health Check](#231-health-check)
3.  [API de WebSockets (Socket.IO)](#3-api-de-websockets-socketio)
    *   [3.1 Conexión](#31-conexión)
    *   [3.2 Eventos del Servidor (Escuchar)](#32-eventos-del-servidor-escuchar)
        *   [3.2.1 `connect` / `connect_error`](#321-connect--connect_error)
        *   [3.2.2 `user_profile`](#322-user_profile)
        *   [3.2.3 `receive_message`](#323-receive_message)
        *   [3.2.4 `message_deleted`](#324-message_deleted)
    *   [3.3 Eventos del Cliente (Emitir)](#33-eventos-del-cliente-emitir)
        *   [3.3.1 `request_chat_history`](#331-request_chat_history)
        *   [3.3.2 `send_message`](#332-send_message)
        *   [3.3.3 `delete_message`](#333-delete_message)

---

## 1. Configuración Inicial del Frontend

Antes de que un usuario pueda interactuar con las partes seguras de la API, el frontend necesita obtener la clave del sitio de Cloudflare Turnstile.

### 1.1 Obtener Configuración del Frontend

-   **Endpoint:** `GET /api/misc/config`
-   **Descripción:** Obtiene la configuración pública necesaria para el frontend. Actualmente, solo devuelve la `siteKey` de Cloudflare.
-   **Respuesta Exitosa (200 OK):**
    ```json
    {
      "cloudflareSiteKey": "your_cloudflare_site_key_here"
    }
    ```
-   **Uso:** Llama a este endpoint al cargar la página de login/registro para poder renderizar el widget de Turnstile.

**Ejemplo de Uso:**

```javascript
// Llamar al inicio de la página de login/registro
async function getCloudflareConfig() {
    try {
        const response = await fetch('/api/misc/config');
        const data = await response.json();
        const siteKey = data.cloudflareSiteKey;
        
        console.log('Cloudflare Site Key:', siteKey);
        // Aquí puedes renderizar el widget de Turnstile usando la siteKey
        // window.turnstile.render('#your-widget-div', { sitekey: siteKey });
        return siteKey;
    } catch (error) {
        console.error('Error al obtener la configuración de Cloudflare:', error);
        alert('No se pudo cargar la verificación de seguridad. Inténtalo de nuevo.');
        return null;
    }
}
// getCloudflareConfig();
```

---

## 2. API REST

Todas las peticiones a endpoints protegidos deben incluir un token JWT en la cabecera de autorización.

**Formato de la Cabecera:** `Authorization: Bearer <tu_jwt_token>`

### 2.1 Autenticación

#### 2.1.1 Registro de Usuario Manual

-   **Endpoint:** `POST /api/auth/register`
-   **Descripción:** Crea una nueva cuenta de usuario. Requiere verificación de Cloudflare.
-   **Cuerpo de la Petición (Body):**
    ```json
    {
      "username": "nuevo_usuario",       // (Requerido) Entre 3 y 30 caracteres. Puede contener letras, números, espacios, guiones bajos (_) y guiones (-). No puede empezar o terminar con espacios o guiones.
      "email": "usuario@ejemplo.com",  // (Requerido)
      "password": "una_contraseña",    // (Requerido)
      "avatarUrl": "https://url.com/a/mi/imagen.png", // (Opcional) URL válida.
      "turnstileToken": "el_token_de_cloudflare" // (Requerido)
    }
    ```
-   **Respuesta Exitosa (201 Created):**
    ```json
    {
      "message": "Usuario registrado con éxito. Ahora puedes iniciar sesión."
    }
    ```
-   **Respuestas de Error:**
    -   `400 Bad Request`: Faltan campos, formato inválido (username, email, avatarUrl si se provee).
    -   `409 Conflict`: El email o el nombre de usuario ya existen.

**Ejemplo de Uso:**

```javascript
// Suponiendo un formulario HTML con IDs: #reg-username, #reg-email, #reg-password
// Y un div para el widget de Turnstile: #turnstile-register-widget
async function registerUser(username, email, password, turnstileToken) {
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username,
                email: email,
                password: password,
                "turnstileToken": turnstileToken
            })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Error en el registro');
        }
        console.log('Registro exitoso:', data.message);
        alert(data.message);
        // Opcional: redirigir al login
        // window.location.href = '/index.html#login';
    } catch (error) {
        console.error('Error al registrar usuario:', error);
        alert('Error en el registro: ' + error.message);
    } finally {
        // Resetear el widget de Turnstile si está presente
        // if (window.turnstile) window.turnstile.reset('#turnstile-register-widget');
    }
}
// Ejemplo de uso:
// const token = window.turnstile.getResponse('#turnstile-register-widget');
// if (token) registerUser('JuanPerez', 'juan.perez@example.com', 'miContrasenaSegura123', token);
```

#### 2.1.2 Inicio de Sesión Manual

-   **Endpoint:** `POST /api/auth/login`
-   **Descripción:** Autentica a un usuario y devuelve un token JWT.
-   **Cuerpo de la Petición (Body):**
    ```json
    {
      "identifier": "nombre_de_usuario_o_email", // (Requerido) El backend detectará si es un email o un nombre de usuario.
      "password": "una_contraseña_segura",       // (Requerido)
      "turnstileToken": "el_token_de_cloudflare" // (Requerido)
    }
    ```
-   **Respuesta Exitosa (200 OK):**
    ```json
    {
      "token": "ey..." // Token JWT para usar en peticiones futuras (expira en 7 días)
    }
    ```
-   **Respuestas de Error:**
    -   `401 Unauthorized`: Credenciales incorrectas.

**Ejemplo de Uso:**

```javascript
// Suponiendo un formulario HTML con IDs: #login-identifier, #login-password
// Y un div para el widget de Turnstile: #turnstile-login-widget
async function loginUser(identifier, password, turnstileToken) {
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                identifier: identifier,
                password: password,
                "turnstileToken": turnstileToken
            })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Error en el login');
        }
        console.log('Login exitoso. Token:', data.token);
        localStorage.setItem('jwt_token', data.token); // Guardar el token
        window.location.href = '/app.html'; // Redirigir a la aplicación principal
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        alert('Error al iniciar sesión: ' + error.message);
    } finally {
        // Resetear el widget de Turnstile si está presente
        // if (window.turnstile) window.turnstile.reset('#turnstile-login-widget');
    }
}
// Ejemplo de uso:
// const token = window.turnstile.getResponse('#turnstile-login-widget');
// if (token) loginUser('juan.perez@example.com', 'miContrasenaSegura123', token);
// O con username: loginUser('JuanPerez', 'miContrasenaSegura123', token);
```

#### 2.1.3 Autenticación con Google (Flujo)

Este es un flujo de redirección:

1.  **Paso 1: Iniciar el Flujo**
    -   El usuario hace clic en un enlace que apunta a `GET /api/auth/google`.
    -   El backend lo redirige a la página de consentimiento de Google.

2.  **Paso 2: Callback de Google**
    -   Tras la autorización, Google redirige al usuario a `GET /api/auth/google/callback`. El backend gestiona esto automáticamente.
    -   **Si el usuario ya existe:** Se le redirige a `/app.html?token=<jwt_token>`. El frontend debe capturar este token de la URL y guardarlo.
    -   **Si es un usuario nuevo:** Se le redirige a `/index.html?tempToken=<temp_token>`. El frontend debe mostrar un formulario para completar el registro.

#### 2.1.4 Completar Registro de Google

-   **Endpoint:** `POST /api/auth/complete-google`
-   **Descripción:** Finaliza el registro de un usuario que se autenticó con Google por primera vez.
-   **Cuerpo de la Petición (Body):**
    ```json
    {
      "username": "usuario_elegido",      // (Requerido) Debe cumplir las mismas reglas que el registro manual.
      "password": "una_contraseña_elegida", // (Requerido)
      "tempToken": "el_temp_token_recibido_en_la_url", // (Requerido)
      "turnstileToken": "el_token_de_cloudflare" // (Requerido)
    }
    ```
-   **Respuesta Exitosa (201 Created):**
    ```json
    {
      "token": "ey..." // Token JWT de sesión final
    }
    ```
-   **Respuestas de Error:**
    -   `400 Bad Request`: Faltan campos, o el nombre de usuario tiene un formato inválido.
    -   `401 Unauthorized`: `tempToken` expirado o inválido.
    -   `409 Conflict`: El nombre de usuario o email (asociado al Google ID) ya existen.

**Ejemplo de Uso:**

```javascript
// Se asume que el `tempToken` viene de la URL (ej. /index.html?tempToken=...)
// Y un formulario con IDs: #google-username, #google-password, #google-temp-token (hidden)
async function completeGoogleRegistration(username, password, tempToken, turnstileToken) {
    try {
        const response = await fetch('/api/auth/complete-google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username,
                password: password,
                tempToken: tempToken,
                "turnstileToken": turnstileToken
            })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Error al completar registro');
        }
        console.log('Registro de Google completado. Token:', data.token);
        localStorage.setItem('jwt_token', data.token); // Guardar el token final
        window.location.href = '/app.html'; // Redirigir a la aplicación
    } catch (error) {
        console.error('Error al completar registro de Google:', error);
        alert('Error al completar registro: ' + error.message);
    } finally {
        // Resetear el widget de Turnstile
        // if (window.turnstile) window.turnstile.reset('#turnstile-google-widget');
    }
}
// Ejemplo de uso:
// const urlParams = new URLSearchParams(window.location.search);
// const tempToken = urlParams.get('tempToken');
// if (tempToken) {
//     // Mostrar el formulario de completar perfil
//     // Obtener username y password del usuario
//     const token = window.turnstile.getResponse('#turnstile-google-widget');
//     if (token) completeGoogleRegistration('NuevoUsuarioGoogle', 'nuevaPwd123', tempToken, token);
// }
```

### 2.2 Perfiles de Usuario

Todos los endpoints que modifican o requieren información privada del perfil necesitan un token JWT.

#### 2.2.1 Obtener Datos del Perfil del Usuario Autenticado

-   **Endpoint:** `GET /api/users/me`
-   **Descripción:** Obtiene los datos completos del perfil del usuario que está actualmente autenticado.
-   **Requiere Autorización:** Sí (`Authorization: Bearer <token>`).
-   **Respuesta Exitosa (200 OK):**
    ```json
    {
      "id": 1,
      "username": "UsuarioEjemplo",
      "email": "usuario@ejemplo.com",
      "avatarUrl": "https://api.dicebear.com/...",
      "bio": "¡Hola, soy un usuario de MikuVerse!",
      "role": "user",
      "createdAt": "2024-07-14T10:00:00.000Z",
      "updatedAt": "2024-07-14T11:00:00.000Z"
      // Otros campos internos como 'password' o 'googleId' NO son devueltos.
    }
    ```
-   **Respuestas de Error:**
    -   `401 Unauthorized`: No hay token o token inválido/expirado.
    -   `404 Not Found`: El usuario no existe (raro si el token es válido).

**Ejemplo de Uso:**

```javascript
async function getMyProfile() {
    const token = localStorage.getItem('jwt_token');
    if (!token) {
        console.warn('No hay token JWT para obtener el perfil.');
        return null;
    }
    try {
        const response = await fetch('/api/users/me', {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const user = await response.json();
        if (!response.ok) {
            throw new Error(user.message || 'Error al obtener mi perfil');
        }
        console.log('Mi perfil:', user);
        // Aquí puedes rellenar el formulario de edición de perfil
        // document.getElementById('profile-username').value = user.username;
        // document.getElementById('profile-email').value = user.email;
        // document.getElementById('profile-bio').value = user.bio || '';
        return user;
    } catch (error) {
        console.error('Error al obtener mi perfil:', error);
        alert('No se pudo cargar tu perfil: ' + error.message);
        return null;
    }
}
// getMyProfile(); // Llamar cuando la vista de "Mi Perfil" se active
```

#### 2.2.2 Obtener Perfil Público de Otro Usuario

-   **Endpoint:** `GET /api/users/:username`
-   **Descripción:** Obtiene la información pública de un usuario específico por su nombre de usuario.
-   **Requiere Autorización:** No. Es un endpoint público.
-   **Parámetros de Ruta:** `:username` (el nombre de usuario del perfil a buscar).
-   **Respuesta Exitosa (200 OK):**
    ```json
    {
      "username": "OtroUsuario",
      "avatarUrl": "https://api.dicebear.com/...",
      "bio": "Disfrutando de la comunidad.",
      "createdAt": "2024-07-10T09:00:00.000Z",
      "role": "user" // o "moderator", "admin"
    }
    ```
    *Nota: No se devuelve el `id` ni el `email` para proteger la privacidad.*
-   **Respuestas de Error:**
    -   `404 Not Found`: El usuario con ese nombre de usuario no existe.

**Ejemplo de Uso:**

```javascript
async function getUserPublicProfile(username) {
    try {
        const response = await fetch(`/api/users/${username}`);
        const user = await response.json();
        if (!response.ok) {
            throw new Error(user.message || 'Usuario no encontrado');
        }
        console.log('Perfil público de', username, ':', user);
        // Aquí puedes mostrar la información en la vista de perfil público
        // document.getElementById('public-profile-name').textContent = user.username;
        // document.getElementById('public-profile-bio').textContent = user.bio;
        return user;
    } catch (error) {
        console.error('Error al obtener perfil público:', error);
        alert('Error: ' + error.message);
        return null;
    }
}
// Ejemplo de uso (cuando se hace clic en un nombre de usuario en el chat):
// const targetUsername = "OtroUsuario"; // Viene del enlace clickeado
// getUserPublicProfile(targetUsername);
```

#### 2.2.3 Actualizar el Perfil del Usuario Autenticado

-   **Endpoint:** `PATCH /api/users/me`
-   **Descripción:** Permite al usuario autenticado actualizar su `username`, `avatarUrl`, `bio` o cambiar su `password`. Los campos son opcionales; solo envía los que deseas modificar.
-   **Requiere Autorización:** Sí (`Authorization: Bearer <token>`).
-   **Cuerpo de la Petición (Body):**
    ```json
    {
      "username": "NuevoNombre",          // (Opcional) Si se cambia, se validará el formato y unicidad.
      "avatarUrl": "https://nueva.url/imagen.png", // (Opcional) URL válida.
      "bio": "Mi nueva biografía actualizada.",  // (Opcional) Se saneará antes de guardar.
      "currentPassword": "tu_contraseña_actual", // (Opcional) REQUERIDO si se envía "newPassword".
      "newPassword": "tu_nueva_contraseña"       // (Opcional) Requiere "currentPassword".
    }
    ```
-   **Respuesta Exitosa (200 OK):**
    ```json
    {
      "message": "Perfil actualizado con éxito.",
      "token": "ey..." // ¡Nuevo token JWT! Solo se devuelve si el 'username' fue cambiado.
                       // El frontend DEBE reemplazar el token antiguo con este nuevo.
    }
    ```
-   **Respuestas de Error:**
    -   `400 Bad Request`: Formato de `username` o `avatarUrl` inválido, o falta `currentPassword` al intentar cambiar la contraseña.
    -   `401 Unauthorized`: No hay token, token inválido/expirado, o `currentPassword` incorrecta.
    -   `409 Conflict`: El `username` intentado ya está en uso.

**Ejemplo de Uso:**

```javascript
// Suponiendo un formulario con IDs: #profile-username, #profile-avatar-url, #profile-bio, etc.
async function updateMyProfile(newProfileData) {
    const token = localStorage.getItem('jwt_token');
    if (!token) {
        console.warn('No hay token JWT para actualizar el perfil.');
        return;
    }

    try {
        const response = await fetch('/api/users/me', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(newProfileData) // newProfileData puede contener: { username?, avatarUrl?, bio?, currentPassword?, newPassword? }
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || 'Error al actualizar perfil');
        }
        console.log('Perfil actualizado:', data.message);
        alert(data.message);

        if (data.token) { // Si el nombre de usuario cambió, se devuelve un nuevo token
            console.log('Nuevo token JWT recibido. Actualizando localStorage.');
            localStorage.setItem('jwt_token', data.token);
        }
        // Opcional: Volver a cargar los datos del perfil para asegurar la sincronización
        // await getMyProfile(); 

    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        alert('Error al actualizar perfil: ' + error.message);
    }
}
// Ejemplo de uso:
// const dataToUpdate = { 
//    bio: "Mi nueva biografía emocionante", 
//    newPassword: "passwordNuevo123", 
//    currentPassword: "passwordAntiguo"
// };
// updateMyProfile(dataToUpdate);
```

### 2.3 Misceláneos

#### 2.3.1 Health Check

-   **Endpoint:** `GET /api/health`
-   **Descripción:** Endpoint de estado para verificar que el backend está funcionando.
-   **Respuesta Exitosa (200 OK):**
    ```json
    {
      "status": "OK",
      "message": "MikuVerse Backend is running!"
    }
    ```

---

## 3. API de WebSockets (Socket.IO)

Para toda la comunicación en tiempo real.

### 3.1 Conexión

El cliente debe conectarse al servidor de Socket.IO proporcionando el token JWT en las opciones de autenticación.

```javascript
const token = localStorage.getItem('jwt_token');
const socket = io({
  auth: { token: token }
});
```

### 3.2 Eventos del Servidor (Escuchar)

El cliente debe registrar escuchadores para estos eventos que el servidor emite.

#### 3.2.1 `connect` / `connect_error`

-   **Evento:** `connect`
    -   **Descripción:** Se dispara cuando la conexión se establece con éxito. Es un buen momento para solicitar datos iniciales.
-   **Evento:** `connect_error`
    -   **Descripción:** Se dispara si la conexión falla (p. ej., token inválido).
    -   **Payload:** `(error)` - Un objeto de error. Si `error.message` contiene "Authentication error", se debe desloguear al usuario.

**Ejemplo de Uso:**

```javascript
// Esta parte generalmente se ejecuta una vez al cargar la app.html
const token = localStorage.getItem('jwt_token');
const socket = io({ auth: { token: token } });

socket.on('connect', () => {
    console.log('Socket.IO conectado al servidor.');
    // Aquí puedes solicitar el historial de chat o la información del usuario si aún no la tienes
});

socket.on('connect_error', (err) => {
    console.error('Error de conexión de Socket.IO:', err.message);
    if (err.message.includes('Authentication error')) {
        alert('Tu sesión ha expirado o es inválida. Por favor, vuelve a iniciar sesión.');
        localStorage.removeItem('jwt_token');
        window.location.href = '/index.html'; // Redirigir al login
    }
});
```

#### 3.2.2 `user_profile`

-   **Evento:** `user_profile`
    -   **Descripción:** El servidor envía los datos del perfil del usuario conectado justo después de la conexión. Esta es la información que se usa para rellenar "Mi Perfil".
    -   **Payload:**
        ```json
        {
          "username": "nombre_de_usuario",
          "email": "usuario@ejemplo.com",
          "avatarUrl": "https://...",
          "bio": "Mi biografía.",
          "role": "user" // o "moderator", "admin"
        }
        ```

**Ejemplo de Uso:**

```javascript
// Esta función se registra una vez al conectar el socket.
socket.on('user_profile', (user) => {
    console.log('Perfil de usuario recibido via Socket:', user);
    // Rellenar la UI de "Mi Perfil" con user.username, user.email, user.avatarUrl, user.bio, etc.
    // Ejemplo (adaptado a tu estructura MikuVerse.renderProfileView):
    // window.Client.renderProfileView(user);
});
```

#### 3.2.3 `receive_message`

-   **Evento:** `receive_message`
    -   **Descripción:** Se recibe un nuevo mensaje de chat en un canal.
    -   **Payload:**
        ```json
        {
          "id": 123,
          "content": "Hola a todos!", // Contenido HTML ya saneado
          "createdAt": "2023-10-27T10:00:00.000Z",
          "User": {
            "id": 1,
            "username": "usuario_que_envio",
            "avatarUrl": "https://..."
          }
        }
        ```

**Ejemplo de Uso:**

```javascript
// Esta función se registra una vez al conectar el socket.
// `renderMessage` es tu función actual que añade mensajes al DOM.
// socket.on('receive_message', (msg) => renderMessage(msg));
function renderMessage(msg) {
    console.log('Mensaje recibido:', msg);
    // Ejemplo simplificado de cómo añadirlo al DOM
    const chatDiv = document.getElementById('chat-messages'); // Asumiendo este ID
    if (chatDiv) {
        const msgElement = document.createElement('div');
        msgElement.innerHTML = `<b>${escapeHTML(msg.User.username)}:</b> ${escapeHTML(msg.content)}`;
        chatDiv.appendChild(msgElement);
        chatDiv.scrollTop = chatDiv.scrollHeight; // Auto-scroll
    }
}

// Función auxiliar para escapar HTML (debes tenerla en tu app.js)
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, (match) => ({
        '&': '&','<': '<','>': '>','"': '"',"'": ''',
    }[match]));
}
```

#### 3.2.4 `message_deleted`

-   **Evento:** `message_deleted`
    -   **Descripción:** Notifica que un moderador ha borrado un mensaje.
    -   **Payload:**
        ```json
        {
          "messageId": 123
        }
        ```
    -   **Acción:** El frontend debe encontrar y eliminar el elemento del DOM con el ID correspondiente.

**Ejemplo de Uso:**

```javascript
// Esta función se registra una vez al conectar el socket.
// socket.on('message_deleted', (data) => { /* ... */ });
socket.on('message_deleted', (data) => {
   const messageElement = document.getElementById(`message-${data.messageId}`);
   if (messageElement) {
       messageElement.remove(); // Elimina el elemento del DOM
       console.log('Mensaje eliminado del DOM:', data.messageId);
   }
});
```

### 3.3 Eventos del Cliente (Emitir)

El cliente emite estos eventos para realizar acciones en el servidor.

#### 3.3.1 `request_chat_history`

-   **Evento:** `request_chat_history`
    -   **Descripción:** Solicita el historial de mensajes de un canal específico.
    -   **Payload:**
        ```json
        {
          "channel": "global" // En el futuro, podría ser otro canal
        }
        ```
    -   **Callback (Respuesta del servidor):** El servidor responde a través de un callback.

**Ejemplo de Uso:**

```javascript
// Llamar cuando se activa la vista del chat o cuando se carga una nueva sala
function requestChatHistory(channel = 'global') {
    if (!socket || !socket.connected) {
        console.warn('Socket no conectado para solicitar historial.');
        return;
    }
    // EMITIR: request_chat_history con un callback para la respuesta
    socket.emit('request_chat_history', { channel: channel }, (response) => {
        if (response.error) {
            console.error('Error al cargar historial:', response.error);
            // Mostrar mensaje de error en la UI del chat
        } else {
            console.log('Historial de chat recibido:', response.history);
            // Iterar sobre response.history y renderizar cada mensaje
            // response.history.forEach(msg => renderMessage(msg, true)); // 'true' indica que es del historial
        }
    });
}
// Ejemplo de uso:
// requestChatHistory('global');
```

#### 3.3.2 `send_message`

-   **Evento:** `send_message`
    -   **Descripción:** Envía un nuevo mensaje al chat.
    -   **Payload:**
        ```json
        {
          "content": "Mi nuevo mensaje.", // El frontend NO necesita sanearlo.
          "channel": "global"
        }
        ```

**Ejemplo de Uso:**

```javascript
// Suponiendo un input de chat con ID #chat-input y un botón de enviar
function sendMessage(content, channel = 'global') {
    if (!socket || !socket.connected) {
        console.warn('Socket no conectado para enviar mensaje.');
        return;
    }
    if (content.trim() === '') {
        console.warn('No se puede enviar un mensaje vacío.');
        return;
    }
    // EMITIR: send_message
    socket.emit('send_message', { content: content, channel: channel });
    console.log('Mensaje enviado:', content);
    // Limpiar el input: document.getElementById('chat-input').value = '';
}
// Ejemplo de uso (desde un event listener):
// const chatInput = document.getElementById('chat-input');
// sendButton.addEventListener('click', () => sendMessage(chatInput.value));
// chatInput.addEventListener('keypress', (e) => {
//    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(chatInput.value); }
// });
```

#### 3.3.3 `delete_message`

-   **Evento:** `delete_message`
    -   **Descripción:** (Solo para moderadores/admins) Solicita borrar un mensaje.
    -   **Payload:**
        ```json
        {
          "messageId": 123
        }
        ```

**Ejemplo de Uso:**

```javascript
function deleteChatMessage(messageId) {
    if (!socket || !socket.connected) {
        console.warn('Socket no conectado para eliminar mensaje.');
        return;
    }
    if (!confirm('¿Estás seguro de que quieres eliminar este mensaje?')) {
        return;
    }
    // EMITIR: delete_message
    socket.emit('delete_message', { messageId: messageId });
    console.log('Solicitud para eliminar mensaje:', messageId);
}

// ESCUCHAR: message_deleted (para que todos los clientes eliminen el mensaje)
// socket.on('message_deleted', (data) => {
//    const messageElement = document.getElementById(`message-${data.messageId}`);
//    if (messageElement) {
//        messageElement.remove(); // Elimina el elemento del DOM
//        console.log('Mensaje eliminado del DOM:', data.messageId);
//    }
// });
```