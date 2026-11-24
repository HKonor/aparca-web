# Guía sencilla para explicar el código de APARCA en clase

## ¿Por qué se quitó PHP?

GitHub Pages sirve páginas HTML, CSS y JavaScript. PHP necesita un servidor que lo interprete. Por eso la versión para GitHub usa JavaScript para las acciones que antes hacía PHP, y guarda datos en el navegador. **No reemplaza al proyecto real en XAMPP**.

## Archivo index.html

Carga la hoja de estilos, la biblioteca del código QR y `app.js`. El elemento `<div id="app">` es donde JavaScript presenta la pantalla correspondiente.

## Archivo estilos.css

Declara las variables de colores (azul #2F5E89, gris, verde, amarillo y rojo), los botones, formularios, tarjetas, mapa de cajones y navegación. La barra de Usuario está fija abajo; en Administrador solo hay tres opciones en la barra superior.

## Archivo app.js: funciones clave

- `iniciarDatos()`: crea estacionamientos, secciones, cajones y cuentas de ejemplo la primera vez.
- `guardar()`: utiliza `localStorage.setItem()` para guardar la información del navegador.
- `usuarioActual()`: consulta el identificador de la sesión y obtiene la cuenta activa.
- `hashClave()`: calcula un hash de la contraseña con `crypto.subtle.digest`. Sirve para la maqueta; **no equivale a seguridad del lado del servidor**.
- `estadoCajon()`: revisa si el cajón está disponible, apartado, ocupado o fuera de servicio.
- `conflicto()`: comprueba si dos reservas usarían el mismo cajón en periodos que se cruzan.
- `crearTicketQR()`: convierte el token de una reserva en un código QR SVG.
- `dibujar()`: revisa la ruta que aparece después de `#` en la dirección y muestra la pantalla requerida.
- `enviarFormulario()`: revisa y guarda registro, login, perfil, reservas, pagos y cambios administrativos.
- `registrarEntrada()`: cambia una reserva de apartada a en curso.
- `registrarSalida()`: calcula los minutos de estancia y redondea el cobro a horas completas.
- `cobrar()`: registra un pago representativo y evita duplicados.
- `pulsar()`: ejecuta acciones de los botones de entrada, salida, cancelación y control del Administrador.

## Ejemplo de cálculo

Si la tarifa es $20 por hora y un coche permanece 2 horas y 58 minutos, se cobran 3 horas completas: 3 × $20 = $60 MXN.

## Funciones que todavía requieren backend

La autenticación compartida, el cobro bancario, la disponibilidad en varios dispositivos, el envío de correos y el control de lectores físicos no pueden implementarse con seguridad usando únicamente GitHub Pages.