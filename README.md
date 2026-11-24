# APARCA — Versión para GitHub Pages

Esta carpeta contiene la versión **estática** de APARCA, basada en el proyecto de XAMPP, con navegación de Usuario y Administrador.

## Qué contiene

- `index.html`: página inicial que carga la aplicación.
- `assets/css/estilos.css`: diseño blanco, azul y gris, con menú fijo inferior para Usuario y menú superior para Administrador.
- `assets/js/app.js`: registro, sesión, perfil, estacionamientos, secciones, cajones, reservas, entrada, salida, cálculo y pagos representativos.
- `assets/js/vendor/qr.js`: biblioteca incluida para generar el código QR (ver licencia).
- `.nojekyll`: impide que GitHub Pages intente procesar la carpeta con Jekyll.

El código tiene **comentarios en español** para facilitar su explicación.

## Cuentas iniciales para recorrer el diseño

| Perfil | Correo | Contraseña inicial |
| --- | --- | --- |
| Administrador | `admin@aparca.com` | `AparcaAdmin2026!` |
| Usuario | `usuario@aparca.com` | `Usuario123!` |

Las dos cuentas se crean **solo en el navegador en que se abre el proyecto**. El login es único: la aplicación determina qué menú mostrar según el rol de la cuenta.

## Publicar gratis en GitHub Pages

1. Entra a https://github.com/new y crea un **repositorio público** llamado, por ejemplo, `aparca-web`.
2. Descarga y extrae el ZIP. **Sube a la raíz del repositorio el contenido de esta carpeta**, no el ZIP comprimido. Debe quedar `index.html` directamente en la raíz, junto con `assets/`.
3. En el repositorio entra a **Settings → Pages**.
4. En **Build and deployment**, elige **Deploy from a branch**.
5. Selecciona `main`, carpeta **/(root)**, y pulsa **Save**.
6. Comprueba el enlace que GitHub muestre en la sección Pages. Puede tardar un poco en activarse.

Si el repositorio es `HKonor/aparca-web`, la dirección esperada, una vez publicada, es `https://hkonor.github.io/aparca-web/`. Este enlace **no está activo automáticamente**: depende de que crees el repositorio y habilites Pages.

### Alternativa con Git en Windows

Desde la carpeta descomprimida, después de crear el repositorio vacío en GitHub:

```powershell
git init
git add .
git commit -m "Publicar Aparca en GitHub Pages"
git branch -M main
git remote add origin https://github.com/HKonor/aparca-web.git
git push -u origin main
```

Solo ejecuta esos comandos dentro de la carpeta **APARCA_GitHub_Pages**. Si cambias el nombre del repositorio, también cambia su URL en `git remote add origin`.

## Limitaciones importantes de publicar sin servidor

GitHub Pages **no ejecuta PHP ni MySQL**. Por tanto, para poder recorrer las pantallas:

- Los usuarios, reservas, estacionamientos, pagos y movimientos se guardan en **`localStorage` de cada navegador**.
- La cuenta activa se guarda en `sessionStorage`.
- Los datos **no se sincronizan entre celulares o computadoras**. Cada navegador tiene su propia copia.
- El registro/login sirve para **demostrar el flujo**, no proporciona autenticación segura ni permisos reales. El administrador inicial aparece en el JavaScript público, como corresponde a esta demostración.
- No uses contraseñas reales, información personal sensible ni tarjetas bancarias auténticas.
- **No hay cobros reales**: los formularios de tarjeta y terminal registran un estado de pago en la simulación. Nunca se guarda el número de tarjeta ni el CVV.
- El QR se genera realmente, pero no valida acceso con sensores o lectores físicos.
- La recuperación de contraseña muestra un código en el propio navegador porque no existe servidor que envíe correo.

Para ponerlo en producción será necesaria la versión PHP/MySQL (o un servicio de backend), control seguro de cuentas, un proveedor de pagos y la comunicación con los lectores del estacionamiento.

## Funciones de la versión estática

**Usuario:** registro separado de primer y segundo apellido, login único, avisos de confirmación, perfil editable, buscador eliminado del inicio, cajones disponibles, selección de 1–4 horas o tiempo indefinido, ticket QR, reservas, cancelación, entrada, salida, elección de pago, comprobantes y cerrar sesión desde Mi perfil. El menú permanece fijo en la parte inferior.

**Administrador:** menú superior con Resumen, Usuarios y Mi perfil. Desde Resumen se gestionan estacionamientos, secciones, cajones, reservas y cobros. No hay acceso de visitante sin app en el login.

## Si necesitas comenzar de cero

Abre las herramientas del navegador (F12) → **Application / Almacenamiento** → **Local Storage** y elimina `aparca_github_pages_v1`. Recarga la página para recrear los datos iniciales. Esto solo reinicia ese navegador.