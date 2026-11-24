/*
 * APARCA | Versión estática para GitHub Pages.
 * Solo necesita HTML, CSS y JavaScript.
 * Los datos se guardan en localStorage del navegador, NO en una base de datos.
 * Las funciones están separadas por bloques para facilitar su explicación.
 */
'use strict';

// ========== 1. Datos, usuarios y funciones compartidas ==========
const CLAVE_DATOS = 'aparca_github_pages_v1';
const CLAVE_SESION = 'aparca_usuario_actual_v1';
const $ = (id) => document.getElementById(id);
const dinero = (n) => '$' + Number(n || 0).toFixed(2) + ' MXN';
const escapar = (s) => String(s ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const fechaTexto = (d) => d ? new Date(d).toLocaleString('es-MX', {dateStyle:'medium',timeStyle:'short'}) : '—';
const fechaLocal = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,16);
const nombreCompleto = u => [u.nombre,u.primerApellido,u.segundoApellido].filter(Boolean).join(' ');
const textoEstado = {apartada:'Apartada / Pendiente de llegada',en_curso:'En curso / Ocupado',finalizada:'Finalizada',cancelada:'Cancelada'};
const claseEstado = {apartada:'amarillo',en_curso:'rojo',finalizada:'verde',cancelada:''};
const duracionTexto = d => d === 'indefinido' ? 'Tiempo indefinido' : d + ' hora' + (d === '1' ? '' : 's');
const idNuevo = () => Math.floor(Date.now() + Math.random() * 100000);
let datos, avisoPendiente = null, cajonSeleccionado = null;

// SHA-256 y salt: evita guardar una contraseña escrita directamente en localStorage.
// No sustituye a la autenticación en un servidor: cualquier dato del navegador es manipulable.
async function hashClave(clave, salt) {
  const entrada = new TextEncoder().encode(salt + ':' + clave);
  const resultado = await crypto.subtle.digest('SHA-256', entrada);
  return Array.from(new Uint8Array(resultado), x=>x.toString(16).padStart(2,'0')).join('');
}
function guardar() { localStorage.setItem(CLAVE_DATOS, JSON.stringify(datos)); }
function usuarioActual() {
  const id = Number(sessionStorage.getItem(CLAVE_SESION));
  return datos.usuarios.find(u => u.id === id && u.activo) || null;
}
function obtenerReserva(id) { return datos.reservas.find(r => r.id === Number(id)); }
function obtenerCajon(id) { return datos.cajones.find(c => c.id === Number(id)); }
function seccionDe(c) { return datos.secciones.find(s => s.id === c?.seccionId); }
function garajeDe(c) { return datos.garajes.find(g => g.id === seccionDe(c)?.garajeId); }
function pagoDe(r) { return datos.pagos.find(p => p.reservaId === r.id); }
function reservasPropias() { const u=usuarioActual(); return datos.reservas.filter(r=>r.usuarioId===u?.id).sort((a,b)=>b.id-a.id); }
function asignacion(cajonId) { return datos.reservas.find(r=>r.cajonId===cajonId && ['apartada','en_curso'].includes(r.estado)); }
function estadoCajon(c) { if(!c.activo || c.fisico==='fuera_servicio') return 'fuera_servicio';const r=asignacion(c.id);return r?.estado==='en_curso'||c.fisico==='ocupado'?'ocupado':r?'apartado':'disponible'; }
function horaFin(res) { return res.duracion === 'indefinido' ? Infinity : new Date(res.inicio).getTime()+Number(res.duracion)*3600000; }
function conflicto(cajon, inicio, duracion) {
  // Dos reservas del mismo cajón no pueden cruzarse en el tiempo.
  const comienzo = new Date(inicio).getTime();
  const fin = duracion==='indefinido' ? Infinity : comienzo+Number(duracion)*3600000;
  return datos.reservas.some(r => r.cajonId===cajon.id && ['apartada','en_curso'].includes(r.estado) && (r.estado==='en_curso' || (comienzo<horaFin(r) && new Date(r.inicio).getTime()<fin)));
}
function mostrarAviso(texto, error=false) { avisoPendiente={texto,error}; }
function ir(ruta, texto) { if(texto) mostrarAviso(texto); if(location.hash==='#'+ruta) dibujar();else location.hash=ruta; }
function comprobarUsuario(r) { const u=usuarioActual(); if(!u || r?.usuarioId!==u.id){ir('/reservas','No puedes consultar esta reserva.');return false}return true; }
function crearTicketQR(cadena) {
  // La biblioteca externa calcula el QR; el SVG es totalmente local y escaneable.
  try {
    const qr = new CodigoQR(0,1); qr.addData(cadena); qr.make();
    const n=qr.getModuleCount(), margen=4; let dibujo='';
    for(let y=0;y<n;y++) for(let x=0;x<n;x++) if(qr.isDark(y,x)) dibujo+=`<rect x="${x+margen}" y="${y+margen}" width="1" height="1"/>`;
    return `<div class="qr"><svg viewBox="0 0 ${n+8} ${n+8}" role="img" aria-label="Código QR"><rect width="100%" height="100%" fill="white"/><g fill="black">${dibujo}</g></svg></div>`;
  } catch(e) { return '<p>No se pudo crear el código QR.</p>'; }
}

async function iniciarDatos(){
  try { datos=JSON.parse(localStorage.getItem(CLAVE_DATOS)); } catch { datos=null; }
  if(datos?.usuarios && datos?.garajes) return;
  const adminSalt='admin-inicial', adminHash=await hashClave('AparcaAdmin2026!',adminSalt);
  const usuarioSalt='usuario-ejemplo', usuarioHash=await hashClave('Usuario123!',usuarioSalt);
  datos={
    usuarios:[
      {id:1,nombre:'Administrador',primerApellido:'Principal',segundoApellido:'Aparca',email:'admin@aparca.com',telefono:'7220000000',salt:adminSalt,hash:adminHash,rol:'admin',activo:true},
      {id:2,nombre:'Usuario',primerApellido:'Ejemplo',segundoApellido:'Aparca',email:'usuario@aparca.com',telefono:'7221111111',salt:usuarioSalt,hash:usuarioHash,rol:'usuario',activo:true}
    ],
    garajes:[{id:1,nombre:'Torre Norte',direccion:'Zona Centro, Toluca',horario:'24 horas',tarifa:20,activo:true},{id:2,nombre:'Plaza Centro',direccion:'Centro, Toluca',horario:'07:00 a 23:00',tarifa:25,activo:true},{id:3,nombre:'Estacionamiento Sur',direccion:'Zona Sur, Toluca',horario:'24 horas',tarifa:18,activo:true}],
    secciones:[{id:1,garajeId:1,nombre:'Nivel 1',activo:true},{id:2,garajeId:1,nombre:'Nivel 2',activo:true},{id:3,garajeId:2,nombre:'Zona A',activo:true},{id:4,garajeId:2,nombre:'Zona B',activo:true},{id:5,garajeId:3,nombre:'Planta baja',activo:true},{id:6,garajeId:3,nombre:'Primer piso',activo:true}],
    cajones:[], reservas:[],pagos:[],movimientos:[]
  };
  // Se crean 6 cajones A1...A6 o B1...B6 en cada sección.
  for(const s of datos.secciones){const prefijo=s.id%2?'A':'B';for(let i=1;i<=6;i++) datos.cajones.push({id:idNuevo()+i+s.id*100, seccionId:s.id,codigo:prefijo+i, fisico:'disponible',activo:true});}
  guardar();
}

// ========== 2. Componentes visuales reutilizables ==========
const iconos={inicio:'<path d="M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5M9 21v-8h6v8"/>',reservas:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M8 15h3M13 15h3"/>',comprobantes:'<path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z"/><path d="M8 8h8M8 12h8M8 16h5"/>',perfil:'<circle cx="12" cy="7.5" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>'};
const icono=(k)=>`<svg viewBox="0 0 24 24" aria-hidden="true">${iconos[k]}</svg>`;
const titulo=(t,sub='')=>`<div class="encabezado"><div class="etiqueta">Aparca</div><h1>${escapar(t)}</h1>${sub?`<p class="subtitulo">${escapar(sub)}</p>`:''}</div>`;
const boton=(ruta,texto,extra='')=>`<a class="btn ${extra}" href="#${ruta}">${escapar(texto)}</a>`;
const item=(nombre,valor)=>`<div class="detalle-dato"><span>${escapar(nombre)}</span><strong>${escapar(valor)}</strong></div>`;
const pastilla=(str,clase='')=>`<span class="pill ${clase}">${escapar(str)}</span>`;
const acceso=(u,ruta)=>{
 if(u?.rol==='admin') return ['admin','usuarios'].some(k=>ruta.startsWith('/'+k))||ruta==='/perfil';
 if(u?.rol==='usuario') return true;
 return ruta==='/'||['/login','/registro','/recuperar','/restablecer'].includes(ruta);
};
function encabezado(u){
  const top=u?.rol==='admin' ? [['/admin','Resumen'],['/admin/usuarios','Usuarios'],['/perfil','Mi perfil']]
    : u ? [] : [['/login','Iniciar sesión'],['/registro','Crear cuenta']];
  return `<header class="barra"><a href="#${u?.rol==='admin'?'/admin':u?'/inicio':'/'}" class="marca">Aparca</a><nav class="menu-top" aria-label="Navegación superior">${top.map(([url,label])=>`<a href="#${url}" class="${(location.hash==='#'+url)?'activo':''}">${label}</a>`).join('')}</nav></header>`;
}
function navegacion(u,ruta){
 if(u?.rol!=='usuario')return '';
 const rutas=[['/inicio','Inicio','inicio'],['/reservas','Reservas','reservas'],['/comprobantes','Comprobantes','comprobantes'],['/perfil','Mi perfil','perfil']];
 const activa=ruta.includes('ticket')||ruta.includes('pago')||ruta.startsWith('/reserva')?'/reservas':ruta.startsWith('/estacionamiento')?'/inicio':ruta.startsWith('/comprobante')?'/comprobantes':ruta;
 return `<nav class="menu-inferior" aria-label="Menú del usuario">${rutas.map(([url,label,ico])=>`<a href="#${url}" class="${url===activa?'activo':''}">${icono(ico)}<span>${label}</span></a>`).join('')}</nav>`;
}
function formularioCampo(nombre,tipo,etiqueta,valor='',atributos=''){
 return `<label>${escapar(etiqueta)}<input name="${nombre}" type="${tipo}" value="${escapar(valor)}" ${atributos}></label>`;
}
function cabeceraReserva(r){const c=obtenerCajon(r.cajonId),g=garajeDe(c);return `${item('Folio',r.folio)}${item('Estacionamiento',g?.nombre||'—')}${item('Cajón',c?.codigo||'—')}${item('Fecha y hora de reserva',fechaTexto(r.inicio))}${item('Duración',duracionTexto(r.duracion))}${item('Estado',textoEstado[r.estado])}`;}
function cobrar(res,metodo){if(datos.pagos.some(p=>p.reservaId===res.id))throw Error('Esta reserva ya tiene un pago registrado.');if(res.estado!=='finalizada')throw Error('Primero debes registrar la salida.');const pago={id:idNuevo(),reservaId:res.id,folio:'P-'+idNuevo().toString().slice(-7),metodo,total:res.total,fecha:new Date().toISOString()};datos.pagos.push(pago);guardar();return pago;}

// ========== 3. Pantallas públicas: inicio, cuenta y recuperación ==========
function vistaPublica(){return `<div class="inicio-publico"><div class="logo">Aparca</div><h2>Encuentra y reserva tu lugar</h2><p>Consulta estacionamientos, aparta un cajón y utiliza tu ticket QR.</p><div class="acciones-inicio">${boton('/login','Iniciar sesión','full')}${boton('/registro','Crear cuenta','sec full')}</div></div>`;}
function vistaLogin(){return `<div class="panel-small">${titulo('Iniciar sesión','Accede con tu correo y contraseña.')}
 <div class="card"><form class="form" data-form="login">${formularioCampo('email','email','Correo electrónico','','required autocomplete="username"')}${formularioCampo('clave','password','Contraseña','','required autocomplete="current-password"')}<button class="btn full" type="submit">Iniciar sesión</button>${boton('/recuperar','¿Olvidaste tu contraseña?','sec full')}</form></div><p class="muted">¿No tienes cuenta? <a href="#/registro">Crear cuenta</a></p></div>`;}
function vistaRegistro(){return `<div class="panel-small">${titulo('Crear cuenta','Completa tus datos personales.')}
 <div class="card"><form class="form" data-form="registro">
 ${formularioCampo('nombre','text','Nombre(s)','','required maxlength="60"')}
 <div class="form-grid">${formularioCampo('primerApellido','text','Primer apellido','','required maxlength="60"')}${formularioCampo('segundoApellido','text','Segundo apellido','','required maxlength="60"')}</div>
 ${formularioCampo('email','email','Correo electrónico','','required')}${formularioCampo('telefono','tel','Teléfono','','required inputmode="numeric" maxlength="10" pattern="[0-9]{10}"')}
 ${formularioCampo('clave','password','Contraseña','','required minlength="8"')}${formularioCampo('confirmar','password','Confirmar contraseña','','required minlength="8"')}
 <button class="btn full">Crear cuenta</button>${boton('/login','Ya tengo cuenta','sec full')}</form></div></div>`;}
function vistaRecuperar(){return `<div class="panel-small">${titulo('Recuperar contraseña','Restablece el acceso a tu cuenta.')}
 <div class="card"><form data-form="recuperar" class="form">${formularioCampo('email','email','Correo electrónico','','required')}<button class="btn full">Continuar</button></form></div></div>`;}
function vistaRestablecer(){const obj=JSON.parse(sessionStorage.getItem('aparca_codigo')||'null');if(!obj)return vistaRecuperar();return `<div class="panel-small">${titulo('Nueva contraseña','Completa la verificación de tu cuenta.')}
 <div class="card"><form class="form" data-form="restablecer"><label>Código de verificación<input type="text" name="codigo" required inputmode="numeric" maxlength="6"></label>${formularioCampo('clave','password','Nueva contraseña','','required minlength="8"')}${formularioCampo('confirmar','password','Confirmar contraseña','','required minlength="8"')}<button class="btn full">Guardar contraseña</button></form></div><p class="muted">Código de esta sesión: <strong>${escapar(obj.codigo)}</strong></p></div>`;}

// ========== 4. Usuario: estacionamientos, reservas y tickets ==========
function vistaInicio(){return `${titulo('Estacionamientos','Consulta la disponibilidad aproximada.')}
 <div class="grid">${datos.garajes.filter(g=>g.activo).map(g=>{const c=datos.cajones.filter(x=>seccionDe(x)?.garajeId===g.id);const libre=c.filter(x=>estadoCajon(x)==='disponible').length;return `<div class="card"><h2>${escapar(g.nombre)}</h2><p>${escapar(g.direccion)}</p><p>${pastilla(libre+' disponibles','verde')} <small>de ${c.length} cajones</small></p><p><strong>${dinero(g.tarifa)}</strong> / hora</p>${boton('/estacionamiento/'+g.id,'Ver estacionamiento','full')}</div>`;}).join('')}</div>`;}
function vistaEstacionamiento(id){const g=datos.garajes.find(x=>x.id===Number(id));if(!g)return vistaInicio();let secciones=datos.secciones.filter(s=>s.garajeId===g.id&&s.activo);
 return `${titulo(g.nombre, g.direccion+' · '+g.horario)}<div class="card"><p><strong>Tarifa:</strong> ${dinero(g.tarifa)} por hora</p><div class="leyenda"><span><b class="dot verde"></b>Disponible</span><span><b class="dot amarillo"></b>Apartado</span><span><b class="dot rojo"></b>Ocupado</span></div><p class="muted">Selecciona un cajón verde para reservar.</p></div>
 ${secciones.map(s=>{let cajones=datos.cajones.filter(c=>c.seccionId===s.id);return `<section class="card"><h2>${escapar(s.nombre)}</h2><div class="cajones">${cajones.map(c=>{const estado=estadoCajon(c),className=estado==='disponible'?'verde':estado==='apartado'?'amarillo':'rojo';return `<button class="cajon ${className}" ${estado==='disponible'?`data-slot="${c.id}"`:'disabled'} title="Cajón ${escapar(c.codigo)}: ${estado}">${escapar(c.codigo)}</button>`;}).join('')}</div></section>`;}).join('')}${boton('/inicio','Volver a estacionamientos','sec')}`;}
function vistaNuevaReserva(id){const c=obtenerCajon(id);if(!c || estadoCajon(c)!=='disponible')return `<div class="card"><h2>Cajón no disponible</h2><p>Selecciona otro espacio para continuar.</p>${boton('/inicio','Ver estacionamientos')}</div>`; const g=garajeDe(c);
 return `<div class="panel-medium">${titulo('Confirmar reserva',g.nombre+' · '+seccionDe(c).nombre+' · Cajón '+c.codigo)}<div class="card"><form class="form" data-form="reservar"><input type="hidden" name="cajonId" value="${c.id}">
 ${formularioCampo('inicio','datetime-local','Fecha y hora de entrada',fechaLocal(),'required')}
 <label>Duración<select name="duracion" id="duracion" required><option value="1">1 hora</option><option value="2">2 horas</option><option value="3">3 horas</option><option value="4">4 horas</option><option value="indefinido">Tiempo indefinido</option></select></label>
 <div class="pago-total" id="precio-estimado">Costo estimado: ${dinero(g.tarifa)}</div><p class="muted">El cobro final se calcula según el tiempo de estancia.</p><button class="btn full">Confirmar cajón</button>${boton('/estacionamiento/'+g.id,'Elegir otro cajón','sec full')}</form></div></div>`;}
function vistaReservaConfirmada(id){const r=obtenerReserva(id);if(!r || !comprobarUsuario(r))return '';return `<div class="panel-medium">${titulo('Reserva confirmada','Tu cajón fue apartado correctamente.')}
 <div class="card">${pastilla('Apartado / Pendiente de llegada','amarillo')}${cabeceraReserva(r)}</div>${boton('/ticket/'+r.id,'Generar Ticket QR','full')}${boton('/reservas','Mis reservas','sec full')}</div>`;}
function vistaTicket(id){const r=obtenerReserva(id);if(!r || !comprobarUsuario(r))return ''; const p=pagoDe(r);return `<div class="panel-medium">${titulo('Ticket QR','Presenta este código al lector instalado en el cajón.')}
 <div class="card"><h2>Ticket ${escapar(r.folio)}</h2>${crearTicketQR('APARCA|'+r.token)}${cabeceraReserva(r)}<hr class="separador"><p class="muted">Al llegar, acerca el QR de tu teléfono al lector físico del cajón.</p>
 ${r.estado==='apartada'?`<button class="btn full" data-do="entrada" data-id="${r.id}">Habilitar espacio</button><button class="btn sec full" data-do="cancelar" data-id="${r.id}" style="margin-top:10px">Cancelar reserva</button>`:''}
 ${r.estado==='en_curso'?`<button class="btn full" data-do="salida" data-id="${r.id}">Registrar salida</button>`:''}
 ${r.estado==='finalizada'?`<div class="pago-total">Total: ${dinero(r.total)}</div>${p?boton('/comprobante/'+r.id,'Ver comprobante','full'):boton('/pago/'+r.id,'Pagar estancia','full')}`:''}
 </div>${boton('/reservas','Volver a mis reservas','sec full')}</div>`;}
function vistaReservas(){const reservas=reservasPropias();return `${titulo('Mis reservas','Consulta tus tickets y estancias.')}
 ${reservas.length?`<div class="lista">${reservas.map(r=>{const c=obtenerCajon(r.cajonId),g=garajeDe(c);return `<div class="card"><div class="linea"><h2>${escapar(g?.nombre||'Estacionamiento')} · ${escapar(c?.codigo||'Cajón')}</h2>${pastilla(textoEstado[r.estado],claseEstado[r.estado])}</div><p>Folio: <strong>${escapar(r.folio)}</strong></p><p class="muted">${fechaTexto(r.inicio)} · ${duracionTexto(r.duracion)}</p><div class="btn-row">${boton('/ticket/'+r.id,'Ver ticket','small')}${r.estado==='finalizada'&&!pagoDe(r)?boton('/pago/'+r.id,'Pagar','sec small'):''}</div></div>`;}).join('')}</div>`:`<div class="card"><p>Aún no tienes reservas.</p>${boton('/inicio','Buscar estacionamiento')}</div>`}`;}

// ========== 5. Usuario: pagos y comprobantes ==========
function vistaPago(id){const r=obtenerReserva(id);if(!r || !comprobarUsuario(r))return '';if(r.estado!=='finalizada')return vistaTicket(id);if(pagoDe(r))return vistaComprobante(id);
 return `<div class="panel-medium">${titulo('Elegir pago','Selecciona cómo pagar tu estancia.')}
 <div class="card"><div class="pago-total">Total: ${dinero(r.total)}</div><div class="pago-metodos"><a href="#/pago-app/${r.id}" class="pago-opcion"><div class="pago-icono">▤</div><div><strong>Pagar en la app</strong><small>Tarjeta desde tu teléfono · Recibo digital</small></div><b>›</b></a><a href="#/pago-terminal/${r.id}" class="pago-opcion"><div class="pago-icono">▦</div><div><strong>Pagar en terminal al salir</strong><small>Presenta el QR al lector y paga allí</small></div><b>›</b></a></div></div>${boton('/ticket/'+r.id,'Consultar resumen','sec full')}</div>`;}
function vistaPagarApp(id){const r=obtenerReserva(id);if(!r || !comprobarUsuario(r))return '';if(r.estado!=='finalizada'||pagoDe(r))return vistaPago(id);
 return `<div class="panel-small">${titulo('Pagar en la app','Pago con tarjeta.')}
 <div class="card"><div class="pago-total">Total: ${dinero(r.total)}</div><form class="form" data-form="pagar-app"><input name="reservaId" type="hidden" value="${r.id}">
 ${formularioCampo('tarjeta','text','Número de tarjeta','','required inputmode="numeric" autocomplete="off" placeholder="0000 0000 0000 0000" maxlength="19" pattern="[0-9 ]{19}"')}
 <div class="form-grid">${formularioCampo('vencimiento','text','Vencimiento','','required placeholder="MM/AA" maxlength="5" pattern="[0-9]{2}/[0-9]{2}"')}${formularioCampo('cvv','password','CVV','','required maxlength="3" pattern="[0-9]{3}" inputmode="numeric"')}</div>
 <button class="btn full">Confirmar pago</button>${boton('/pago/'+r.id,'Volver a métodos','sec full')}</form></div></div>`;}
function vistaPagarTerminal(id){const r=obtenerReserva(id);if(!r || !comprobarUsuario(r))return '';if(r.estado!=='finalizada'||pagoDe(r))return vistaPago(id);
 return `<div class="panel-small">${titulo('Pagar en la terminal','Presenta el ticket de salida en la terminal del estacionamiento.')}
 <div class="card"><div class="pago-total">Total: ${dinero(r.total)}</div>${crearTicketQR('APARCA-PAGO|'+r.token)}<p>Folio: <strong>${escapar(r.folio)}</strong></p><button class="btn full" data-do="pago-terminal" data-id="${r.id}">Confirmar pago</button>${boton('/pago/'+r.id,'Volver a métodos','sec full')}</div></div>`;}
function vistaComprobantes(){const res=reservasPropias().filter(r=>pagoDe(r));return `${titulo('Mis comprobantes','Historial de tus pagos.')}${res.length?`<div class="lista">${res.map(r=>{const p=pagoDe(r);return `<div class="card"><h2>${escapar(p.folio)} · ${dinero(p.total)}</h2><p>${escapar(garajeDe(obtenerCajon(r.cajonId))?.nombre||'Aparca')}</p><p class="muted">${fechaTexto(p.fecha)}</p>${boton('/comprobante/'+r.id,'Ver comprobante','small')}</div>`;}).join('')}</div>`:`<div class="card"><p>No hay pagos registrados.</p>${boton('/reservas','Ver mis reservas')}</div>`}`;}
function vistaComprobante(id){const r=obtenerReserva(id);if(!r || !comprobarUsuario(r))return '';const p=pagoDe(r);if(!p)return vistaPago(id);
 return `<div class="panel-small">${titulo('Pago aprobado','Recibo digital.')}
 <div class="card"><div class="estado-pago">Pago confirmado</div>${item('Folio',p.folio)}${item('Reserva',r.folio)}${item('Cajón',obtenerCajon(r.cajonId)?.codigo||'—')}${item('Tiempo',r.minutos+' min')}${item('Importe',dinero(p.total))}${item('Método',p.metodo==='app'?'Tarjeta · App':'Terminal')}${item('Fecha',fechaTexto(p.fecha))}</div>${boton('/comprobantes','Mis comprobantes','full')}${boton('/inicio','Volver al inicio','sec full')}</div>`;}

// ========== 6. Mi perfil (Usuario y Administrador) ==========
function vistaPerfil(){const u=usuarioActual();return `<div class="panel-medium">${titulo('Mi perfil','Consulta y actualiza tus datos personales.')}
 <div class="card"><form class="form" data-form="perfil">
 ${formularioCampo('nombre','text','Nombre(s)',u.nombre,'required')}
 <div class="form-grid">${formularioCampo('primerApellido','text','Primer apellido',u.primerApellido,'required')}${formularioCampo('segundoApellido','text','Segundo apellido',u.segundoApellido,'required')}</div>
 ${formularioCampo('email','email','Correo electrónico',u.email,'required')}${formularioCampo('telefono','tel','Teléfono',u.telefono,'required maxlength="10" pattern="[0-9]{10}"')}
 <hr class="separador"><p class="muted">Para cambiar la contraseña, completa los campos siguientes.</p>${formularioCampo('clave','password','Nueva contraseña','','minlength="8"')}${formularioCampo('confirmar','password','Confirmar nueva contraseña','','minlength="8"')}
 <button class="btn full">Guardar cambios</button></form></div><button class="btn sec full" data-do="salir-cuenta">Cerrar sesión</button></div>`;}

// ========== 7. Administrador: navegación superior y funciones de control ==========
function vistaAdmin(){
  const ocupados=datos.cajones.filter(c=>estadoCajon(c)==='ocupado').length;
  const apartados=datos.cajones.filter(c=>estadoCajon(c)==='apartado').length;
  const disponibles=datos.cajones.filter(c=>estadoCajon(c)==='disponible').length;
  const pendientes=datos.reservas.filter(r=>r.estado==='finalizada'&&!pagoDe(r)).length;
  const m=[['Cajones disponibles',disponibles],['Apartados',apartados],['Ocupados',ocupados],['Pagos pendientes',pendientes]];
  return `${titulo('Resumen','Administración general de estacionamientos.')}
    <div class="grid metricas">${m.map(([k,v])=>`<div class="card metrica"><span>${k}</span><strong>${v}</strong></div>`).join('')}</div>
    <h2>Gestión</h2><div class="grid">
    ${[['Estacionamientos y secciones','Agregar estacionamientos, secciones y cajones.','/admin/garajes'],['Cajones','Consultar disponibilidad y actualizar estados.','/admin/cajones'],['Reservas','Revisar entradas, salidas y reservaciones.','/admin/reservas'],['Cobros','Consultar pagos registrados y pendientes.','/admin/pagos']].map(([n,t,r])=>`<div class="card"><h3>${n}</h3><p class="muted">${t}</p>${boton(r,'Abrir apartado','full')}</div>`).join('')}
    </div>`;
}
function vistaAdminUsuarios(){return `${titulo('Usuarios','Consulta y administra las cuentas registradas.')}
 <div class="card tabla-wrap"><table class="tabla"><thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Acción</th></tr></thead><tbody>
 ${datos.usuarios.map(u=>`<tr><td>${escapar(nombreCompleto(u))}</td><td>${escapar(u.email)}</td><td>${escapar(u.rol)}</td><td>${u.activo?'Activo':'Inactivo'}</td><td>${u.rol==='usuario'?`<button class="btn small ${u.activo?'sec':''}" data-do="toggle-usuario" data-id="${u.id}">${u.activo?'Desactivar':'Activar'}</button>`:'—'}</td></tr>`).join('')}</tbody></table></div>`;}
function vistaAdminGarajes(){return `${titulo('Estacionamientos y secciones','Agrega espacios y configura su tarifa.')}
 <div class="grid">${datos.garajes.map(g=>{const ss=datos.secciones.filter(s=>s.garajeId===g.id);return `<section class="card"><div class="linea"><h2>${escapar(g.nombre)}</h2>${pastilla(g.activo?'Activo':'Inactivo',g.activo?'verde':'rojo')}</div><p>${escapar(g.direccion)}</p><p><strong>${dinero(g.tarifa)}</strong> / hora</p><p><strong>Secciones:</strong> ${ss.map(s=>escapar(s.nombre)).join(', ')||'Ninguna'}</p><form data-form="tarifa" class="form"><input type="hidden" name="garajeId" value="${g.id}"><label>Tarifa por hora<input type="number" name="tarifa" min="1" step="0.01" value="${g.tarifa}" required></label><button class="btn sec small">Actualizar tarifa</button></form></section>`;}).join('')}</div>
 <div class="grid" style="margin-top:20px"><div class="card"><h2>Agregar estacionamiento</h2><form class="form" data-form="nuevo-garaje">${formularioCampo('nombre','text','Nombre','','required')}${formularioCampo('direccion','text','Dirección','','required')}${formularioCampo('horario','text','Horario','24 horas','required')}${formularioCampo('tarifa','number','Tarifa por hora','20','required min="1" step="0.01"')}<button class="btn full">Guardar estacionamiento</button></form></div>
 <div class="card"><h2>Agregar sección</h2><form class="form" data-form="nueva-seccion"><label>Estacionamiento<select name="garajeId">${datos.garajes.map(g=>`<option value="${g.id}">${escapar(g.nombre)}</option>`).join('')}</select></label>${formularioCampo('nombre','text','Nombre de la sección','','required placeholder="Ej. Nivel 3"')}${formularioCampo('cantidad','number','Cantidad de cajones','6','required min="1" max="50"')}<label>Prefijo de cajones<select name="prefijo"><option>A</option><option>B</option><option>C</option><option>D</option><option>E</option><option>F</option></select></label><button class="btn full">Crear sección y cajones</button></form></div></div>
 ${boton('/admin','Volver al resumen','sec')}`;}
function vistaAdminCajones(){
 const gId=Number(sessionStorage.getItem('aparca_filtro_garaje'))||datos.garajes[0]?.id;
 const g=datos.garajes.find(x=>x.id===gId)||datos.garajes[0];
 const s=datos.secciones.filter(x=>x.garajeId===g?.id);
 const cajones=datos.cajones.filter(c=>s.some(k=>k.id===c.seccionId));
 return `${titulo('Cajones','Consulta y administra los espacios.')}
 <div class="card"><label>Estacionamiento <select id="filtro-garaje" class="input">${datos.garajes.map(x=>`<option value="${x.id}" ${x.id===g?.id?'selected':''}>${escapar(x.nombre)}</option>`).join('')}</select></label>
 <div class="leyenda"><span><b class="dot verde"></b>Disponible</span><span><b class="dot amarillo"></b>Apartado</span><span><b class="dot rojo"></b>Ocupado</span></div></div>
 <div class="tabla-wrap card"><table class="tabla"><thead><tr><th>Sección</th><th>Cajón</th><th>Estado</th><th>Control</th></tr></thead><tbody>
 ${cajones.map(c=>{const e=estadoCajon(c);return `<tr><td>${escapar(seccionDe(c)?.nombre||'—')}</td><td>${escapar(c.codigo)}</td><td>${pastilla(e,e==='disponible'?'verde':e==='apartado'?'amarillo':'rojo')}</td><td><div class="btn-row">${e==='disponible'?`<button class="btn small sec" data-do="bloquear" data-id="${c.id}">Bloquear</button>`:e==='fuera_servicio'?`<button class="btn small" data-do="desbloquear" data-id="${c.id}">Liberar</button>`:e==='apartado'?`<button class="btn small" data-do="admin-entrada" data-id="${c.id}">Habilitar</button>`:e==='ocupado'?`<button class="btn small" data-do="admin-salida" data-id="${c.id}">Registrar salida</button>`:''}</div></td></tr>`;}).join('')}</tbody></table></div>${boton('/admin','Volver al resumen','sec')}`;
}
function vistaAdminReservas(){return `${titulo('Reservas','Consulta las reservaciones y movimientos.')}
 <div class="card tabla-wrap"><table class="tabla"><thead><tr><th>Folio</th><th>Usuario</th><th>Cajón</th><th>Fecha</th><th>Estado</th><th>Acción</th></tr></thead><tbody>${datos.reservas.slice().reverse().map(r=>{
 const u=datos.usuarios.find(x=>x.id===r.usuarioId),c=obtenerCajon(r.cajonId);return `<tr><td>${escapar(r.folio)}</td><td>${escapar(u?nombreCompleto(u):'—')}</td><td>${escapar(c?.codigo||'—')}</td><td>${fechaTexto(r.inicio)}</td><td>${pastilla(textoEstado[r.estado],claseEstado[r.estado])}</td><td>${r.estado==='apartada'?`<button class="btn small" data-do="entrada" data-id="${r.id}">Entrada</button>`:r.estado==='en_curso'?`<button class="btn small" data-do="salida" data-id="${r.id}">Salida</button>`:r.estado==='finalizada'&&!pagoDe(r)?`<button class="btn small" data-do="admin-pago" data-id="${r.id}">Registrar pago</button>`:'—'}</td></tr>`;}).join('')}</tbody></table></div>${boton('/admin','Volver al resumen','sec')}`;}
function vistaAdminPagos(){const pendientes=datos.reservas.filter(r=>r.estado==='finalizada'&&!pagoDe(r));return `${titulo('Cobros','Consulta pagos y estancias pendientes.')}
 <h2>Pendientes de pago</h2><div class="lista">${pendientes.length?pendientes.map(r=>`<div class="card"><div class="linea"><strong>${escapar(r.folio)} · ${dinero(r.total)}</strong><button class="btn small" data-do="admin-pago" data-id="${r.id}">Registrar pago</button></div></div>`).join(''):'<div class="card">No hay pagos pendientes.</div>'}</div>
 <h2 style="margin-top:22px">Pagos registrados</h2><div class="card tabla-wrap"><table class="tabla"><thead><tr><th>Folio</th><th>Reserva</th><th>Importe</th><th>Método</th><th>Fecha</th></tr></thead><tbody>${datos.pagos.slice().reverse().map(p=>`<tr><td>${escapar(p.folio)}</td><td>${escapar(obtenerReserva(p.reservaId)?.folio||'—')}</td><td>${dinero(p.total)}</td><td>${p.metodo==='app'?'App':'Terminal'}</td><td>${fechaTexto(p.fecha)}</td></tr>`).join('')}</tbody></table></div>${boton('/admin','Volver al resumen','sec')}`;}

// ========== 8. Enrutador: elige la pantalla según la URL #/ruta ==========
function dibujar(){
 let ruta=(location.hash||'#/').slice(1).split('?')[0],u=usuarioActual();
 if(ruta==='/') ruta=u?(u.rol==='admin'?'/admin':'/inicio'):'/';
 if(!u && !acceso(u,ruta)) {location.hash='/login';return;}
 if(u?.rol==='admin'&&!acceso(u,ruta)){location.hash='/admin';return;}
 if(u?.rol==='usuario' && ruta.startsWith('/admin')){location.hash='/inicio';return;}
 let contenido=''; const parte=ruta.split('/').filter(Boolean);
 if(ruta==='/')contenido=vistaPublica();
 else if(ruta==='/login')contenido=u?vistaInicio():vistaLogin();
 else if(ruta==='/registro')contenido=vistaRegistro();
 else if(ruta==='/recuperar')contenido=vistaRecuperar();
 else if(ruta==='/restablecer')contenido=vistaRestablecer();
 else if(ruta==='/inicio')contenido=vistaInicio();
 else if(parte[0]==='estacionamiento')contenido=vistaEstacionamiento(parte[1]);
 else if(parte[0]==='reserva'&&parte[1]==='nueva')contenido=vistaNuevaReserva(parte[2]);
 else if(parte[0]==='reserva'&&parte[1]==='confirmada')contenido=vistaReservaConfirmada(parte[2]);
 else if(parte[0]==='ticket')contenido=vistaTicket(parte[1]);
 else if(ruta==='/reservas')contenido=vistaReservas();
 else if(ruta==='/comprobantes')contenido=vistaComprobantes();
 else if(parte[0]==='comprobante')contenido=vistaComprobante(parte[1]);
 else if(parte[0]==='pago')contenido=vistaPago(parte[1]);
 else if(parte[0]==='pago-app')contenido=vistaPagarApp(parte[1]);
 else if(parte[0]==='pago-terminal')contenido=vistaPagarTerminal(parte[1]);
 else if(ruta==='/perfil')contenido=vistaPerfil();
 else if(ruta==='/admin')contenido=vistaAdmin();
 else if(ruta==='/admin/usuarios')contenido=vistaAdminUsuarios();
 else if(ruta==='/admin/garajes')contenido=vistaAdminGarajes();
 else if(ruta==='/admin/cajones')contenido=vistaAdminCajones();
 else if(ruta==='/admin/reservas')contenido=vistaAdminReservas();
 else if(ruta==='/admin/pagos')contenido=vistaAdminPagos();
 else contenido=`${titulo('No se encontró la página')}${boton('/','Ir al inicio')}`;
 $('app').innerHTML=`<div class="${u?.rol==='usuario'?'usuario-activo':u?.rol==='admin'?'admin-activo':'sin-sesion'}">${encabezado(u)}<main class="contenedor" id="contenido">${contenido}</main><footer class="pie">Aparca</footer>${navegacion(u,ruta)}</div>`;
 if(avisoPendiente){const a=avisoPendiente;avisoPendiente=null;const div=document.createElement('div');div.className='alerta'+(a.error?' error':'');div.role=a.error?'alert':'status';div.innerHTML=`<div><strong>${a.error?'Revisa lo siguiente':'Listo'}</strong><span>${escapar(a.texto)}</span></div><button type="button" aria-label="Cerrar aviso">×</button>`;document.body.appendChild(div);const cerrar=()=>div.remove();div.querySelector('button').onclick=cerrar;setTimeout(cerrar,6000);}
 const duration=$('duracion');if(duration){const update=()=>{const c=obtenerCajon(new URLSearchParams(location.search).get('cajon'));const id=Number(document.querySelector('input[name="cajonId"]')?.value);const g=garajeDe(obtenerCajon(id));$('precio-estimado').textContent=duration.value==='indefinido'?'Costo: se calcula al salir':'Costo estimado: '+dinero(Number(duration.value)*Number(g?.tarifa||0));};duration.onchange=update;}
 window.scrollTo({top:0,behavior:'instant'});
}

// ========== 9. Formularios: las acciones fáciles de explicar ==========
function valor(form,nombre){return String(new FormData(form).get(nombre)||'').trim();}
function validarNombre(texto){return /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'-]{2,60}$/.test(texto);}
function validarClave(clave){return clave.length>=8 && /[a-z]/.test(clave) && /[A-Z]/.test(clave) && /\d/.test(clave);}
async function enviarFormulario(form){
 const accion=form.dataset.form, u=usuarioActual();
 if(accion==='registro'){
   const nombre=valor(form,'nombre'),primerApellido=valor(form,'primerApellido'),segundoApellido=valor(form,'segundoApellido'),email=valor(form,'email').toLowerCase(),telefono=valor(form,'telefono'),clave=valor(form,'clave');
   if(![nombre,primerApellido,segundoApellido].every(validarNombre))throw Error('Escribe el nombre y los dos apellidos usando letras.');
   if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))throw Error('Escribe un correo válido.');
   if(!/^\d{10}$/.test(telefono))throw Error('El teléfono debe tener 10 números.');
   if(datos.usuarios.some(x=>x.email===email))throw Error('Este correo ya tiene una cuenta.');
   if(!validarClave(clave))throw Error('La contraseña necesita al menos 8 caracteres, una mayúscula, una minúscula y un número.');
   if(clave!==valor(form,'confirmar'))throw Error('Las contraseñas no coinciden.');
   const salt=crypto.randomUUID();datos.usuarios.push({id:idNuevo(),nombre,primerApellido,segundoApellido,email,telefono,salt,hash:await hashClave(clave,salt),rol:'usuario',activo:true});guardar();ir('/login','Cuenta creada correctamente. Inicia sesión.');return;
 }
 if(accion==='login'){
   const email=valor(form,'email').toLowerCase(),clave=valor(form,'clave');const x=datos.usuarios.find(x=>x.email===email);
   if(!x||!x.activo||await hashClave(clave,x.salt)!==x.hash)throw Error('Correo o contraseña incorrectos.');
   sessionStorage.setItem(CLAVE_SESION,String(x.id));ir(x.rol==='admin'?'/admin':'/inicio','¡Bienvenido, '+x.nombre+'!');return;
 }
 if(accion==='recuperar'){
   const email=valor(form,'email').toLowerCase(),x=datos.usuarios.find(x=>x.email===email&&x.activo);
   if(!x)throw Error('No encontramos una cuenta con ese correo.');
   const codigo=String(Math.floor(100000+Math.random()*900000));sessionStorage.setItem('aparca_codigo',JSON.stringify({email,codigo,expira:Date.now()+300000}));ir('/restablecer','Código generado para esta sesión.');return;
 }
 if(accion==='restablecer'){
   const t=JSON.parse(sessionStorage.getItem('aparca_codigo')||'null');if(!t||t.expira<Date.now()||valor(form,'codigo')!==t.codigo)throw Error('El código es incorrecto o ha vencido.');
   const clave=valor(form,'clave');if(!validarClave(clave))throw Error('Utiliza una contraseña con 8 caracteres, mayúscula, minúscula y número.');if(clave!==valor(form,'confirmar'))throw Error('Las contraseñas no coinciden.');
   const x=datos.usuarios.find(u=>u.email===t.email);x.salt=crypto.randomUUID();x.hash=await hashClave(clave,x.salt);guardar();sessionStorage.removeItem('aparca_codigo');ir('/login','Contraseña actualizada.');return;
 }
 if(accion==='perfil'){
   const nombre=valor(form,'nombre'),primerApellido=valor(form,'primerApellido'),segundoApellido=valor(form,'segundoApellido'),email=valor(form,'email').toLowerCase(),telefono=valor(form,'telefono'),clave=valor(form,'clave');
   if(![nombre,primerApellido,segundoApellido].every(validarNombre))throw Error('Revisa el nombre y los apellidos.');
   if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))throw Error('Escribe un correo válido.');
   if(datos.usuarios.some(x=>x.email===email&&x.id!==u.id))throw Error('Este correo ya está registrado.');
   if(!/^\d{10}$/.test(telefono))throw Error('El teléfono debe tener 10 números.');
   if(clave){if(!validarClave(clave))throw Error('La contraseña debe tener mayúscula, minúscula, número y 8 caracteres.');if(clave!==valor(form,'confirmar'))throw Error('Las contraseñas no coinciden.');u.salt=crypto.randomUUID();u.hash=await hashClave(clave,u.salt);}
   Object.assign(u,{nombre,primerApellido,segundoApellido,email,telefono});guardar();ir('/perfil','Perfil actualizado correctamente.');return;
 }
 if(accion==='reservar'){
   if(!u||u.rol!=='usuario')throw Error('Inicia sesión como Usuario.');
   const c=obtenerCajon(valor(form,'cajonId')),inicio=valor(form,'inicio'),duracion=valor(form,'duracion');
   const timestamp=new Date(inicio).getTime();if(!c||!Number.isFinite(timestamp)||timestamp<Date.now()-5*60*1000)throw Error('Selecciona un cajón y una fecha válidos.');
   if(!['1','2','3','4','indefinido'].includes(duracion))throw Error('Selecciona una duración válida.');
   if(c.fisico!=='disponible'||conflicto(c,inicio,duracion))throw Error('Ese cajón ya está apartado. Selecciona otro.');
   const g=garajeDe(c),r={id:idNuevo(),folio:'R-'+idNuevo().toString().slice(-7),usuarioId:u.id,cajonId:c.id,inicio:new Date(timestamp).toISOString(),duracion,tarifa:g.tarifa,estado:'apartada',entrada:null,salida:null,minutos:null,total:null,token:crypto.randomUUID()};
   datos.reservas.push(r);guardar();ir('/reserva/confirmada/'+r.id,'Reserva registrada correctamente.');return;
 }
 if(accion==='pagar-app'){
   if(!u||u.rol!=='usuario')throw Error('Inicia sesión para pagar.');
   const r=obtenerReserva(valor(form,'reservaId'));if(!r||r.usuarioId!==u.id)throw Error('No tienes permiso para pagar esta reserva.');
   const tarjeta=valor(form,'tarjeta').replace(/\s/g,''),venc=valor(form,'vencimiento'),cvv=valor(form,'cvv');
   if(!/^\d{16}$/.test(tarjeta))throw Error('El número de tarjeta debe tener 16 dígitos.');
   const part=venc.match(/^(0[1-9]|1[0-2])\/(\d{2})$/);if(!part)throw Error('El vencimiento debe tener formato MM/AA.');
   const year=2000+Number(part[2]),month=Number(part[1]);if(year<new Date().getFullYear() || (year===new Date().getFullYear()&&month<new Date().getMonth()+1))throw Error('La tarjeta está vencida.');
   if(!/^\d{3}$/.test(cvv))throw Error('El CVV debe tener 3 números.');
   // No se guarda, transmite ni registra el número de tarjeta ni CVV.
   cobrar(r,'app');ir('/comprobante/'+r.id,'Pago registrado correctamente.');return;
 }
 if(accion==='nuevo-garaje'){
   if(u?.rol!=='admin')throw Error('Acceso exclusivo del Administrador.');const nombre=valor(form,'nombre'),direccion=valor(form,'direccion'),horario=valor(form,'horario'),tarifa=Number(valor(form,'tarifa'));
   if(!nombre||!direccion||!horario||!(tarifa>0))throw Error('Completa correctamente los datos del estacionamiento.');
   datos.garajes.push({id:idNuevo(),nombre,direccion,horario,tarifa,activo:true});guardar();ir('/admin/garajes','Estacionamiento registrado.');return;
 }
 if(accion==='nueva-seccion'){
   if(u?.rol!=='admin')throw Error('Acceso exclusivo del Administrador.');const gId=Number(valor(form,'garajeId')),nombre=valor(form,'nombre'),cantidad=Number(valor(form,'cantidad')),prefijo=valor(form,'prefijo');
   if(!datos.garajes.some(g=>g.id===gId)||!nombre||cantidad<1||cantidad>50||!/^[A-F]$/.test(prefijo))throw Error('Revisa los datos de la nueva sección.');
   if(datos.secciones.some(s=>s.garajeId===gId&&s.nombre.toLowerCase()===nombre.toLowerCase()))throw Error('Ya existe una sección con ese nombre.');
   const s={id:idNuevo(),garajeId:gId,nombre,activo:true};datos.secciones.push(s);
   for(let i=1;i<=cantidad;i++)datos.cajones.push({id:idNuevo()+i, seccionId:s.id,codigo:prefijo+i,fisico:'disponible',activo:true});guardar();ir('/admin/garajes','Sección y cajones creados correctamente.');return;
 }
 if(accion==='tarifa'){
   if(u?.rol!=='admin')throw Error('Acceso exclusivo del Administrador.');const g=datos.garajes.find(x=>x.id===Number(valor(form,'garajeId'))),tarifa=Number(valor(form,'tarifa'));if(!g||!(tarifa>0))throw Error('Escribe una tarifa válida.');g.tarifa=tarifa;guardar();ir('/admin/garajes','Tarifa actualizada.');return;
 }
}

// ========== 10. Botones de acción: entrada, salida, pago y administración ==========
function registrarEntrada(r){
 if(r.estado!=='apartada')throw Error('La reserva no está pendiente de llegada.');
 if(new Date(r.inicio).getTime()-Date.now()>30*60000)throw Error('La reserva todavía no está dentro del horario de llegada.');
 const c=obtenerCajon(r.cajonId);if(c.fisico==='ocupado'||c.fisico==='fuera_servicio')throw Error('El cajón no está listo para habilitarse.');
 r.estado='en_curso';r.entrada=new Date().toISOString();c.fisico='ocupado';guardar();
}
function registrarSalida(r){
 if(r.estado!=='en_curso')throw Error('Primero debes registrar la entrada.');
 const fin=new Date();r.salida=fin.toISOString();r.minutos=Math.max(1,Math.ceil((fin-new Date(r.entrada))/60000));r.total=Math.ceil(r.minutos/60)*Number(r.tarifa);r.estado='finalizada';
 const c=obtenerCajon(r.cajonId);c.fisico='disponible';guardar();
}
async function pulsar(b){
 const tipo=b.dataset.do,id=Number(b.dataset.id),u=usuarioActual(),r=obtenerReserva(id);
 if(tipo==='salir-cuenta'){sessionStorage.removeItem(CLAVE_SESION);ir('/','Has cerrado sesión.');return;}
 if(tipo==='toggle-usuario'){if(u?.rol!=='admin')throw Error('Solo el Administrador puede realizar esta acción.');const x=datos.usuarios.find(v=>v.id===id);if(!x||x.rol!=='usuario')throw Error('No puedes modificar esta cuenta.');x.activo=!x.activo;guardar();ir('/admin/usuarios','Estado del usuario actualizado.');return;}
 if(tipo==='bloquear'||tipo==='desbloquear'||tipo==='admin-entrada'||tipo==='admin-salida'){
   if(u?.rol!=='admin')throw Error('Acceso exclusivo del Administrador.');const c=obtenerCajon(id);if(!c)throw Error('No se encontró el cajón.');const reserva=asignacion(c.id);
   if(tipo==='bloquear'&&estadoCajon(c)==='disponible'){c.fisico='fuera_servicio';guardar();}
   else if(tipo==='desbloquear'&&c.fisico==='fuera_servicio'){c.fisico='disponible';guardar();}
   else if(tipo==='admin-entrada'&&reserva)registrarEntrada(reserva);
   else if(tipo==='admin-salida'&&reserva)registrarSalida(reserva);
   else if(tipo==='admin-salida'&&c.fisico==='ocupado'){c.fisico='disponible';guardar();}
   else throw Error('La acción no corresponde al estado del cajón.');
   datos.movimientos.push({adminId:u.id,accion:tipo,cajonId:c.id,fecha:new Date().toISOString()});guardar();ir('/admin/cajones','Estado del cajón actualizado.');return;
 }
 if(tipo==='admin-pago'){if(u?.rol!=='admin')throw Error('Acceso exclusivo del Administrador.');if(!r)throw Error('No se encontró la reserva.');cobrar(r,'terminal');ir('/admin/pagos','Pago registrado.');return;}
 if(!r)throw Error('No se encontró la reserva.');
 if(u?.rol!=='admin' && r.usuarioId!==u?.id)throw Error('No puedes modificar esta reserva.');
 if(tipo==='entrada'){registrarEntrada(r);ir(u.rol==='admin'?'/admin/reservas':'/ticket/'+r.id,'Entrada registrada correctamente.');return;}
 if(tipo==='salida'){registrarSalida(r);ir(u.rol==='admin'?'/admin/reservas':'/pago/'+r.id,'Salida registrada. Consulta el total de tu estancia.');return;}
 if(tipo==='cancelar'){if(r.estado!=='apartada')throw Error('Solo se pueden cancelar reservas pendientes.');if(!confirm('¿Quieres cancelar la reserva?'))return;r.estado='cancelada';guardar();ir('/reservas','Reserva cancelada correctamente.');return;}
 if(tipo==='pago-terminal'){cobrar(r,'terminal');ir('/comprobante/'+r.id,'Pago registrado.');return;}
}

document.addEventListener('submit',async evento=>{
 const form=evento.target.closest('form[data-form]');if(!form)return;evento.preventDefault();
 const botonEnviar=form.querySelector('button[type="submit"],button:not([type])');if(botonEnviar)botonEnviar.disabled=true;
 try{await enviarFormulario(form)}catch(err){mostrarAviso(err.message,true);dibujar()}finally{if(botonEnviar?.isConnected)botonEnviar.disabled=false}
});
document.addEventListener('click',async evento=>{
 const target=evento.target.closest('[data-do],[data-slot]');if(!target)return;
 if(target.hasAttribute('data-slot')){const c=obtenerCajon(target.dataset.slot);if(c&&estadoCajon(c)==='disponible')ir('/reserva/nueva/'+c.id);return;}
 target.disabled=true;try{await pulsar(target)}catch(err){mostrarAviso(err.message,true);dibujar()}finally{if(target.isConnected)target.disabled=false}
});
document.addEventListener('change',evento=>{
 if(evento.target.id==='filtro-garaje'){sessionStorage.setItem('aparca_filtro_garaje',evento.target.value);dibujar();}
});
document.addEventListener('input',evento=>{
 if(evento.target.name==='tarjeta'){const n=evento.target.value.replace(/\D/g,'').slice(0,16);evento.target.value=n.replace(/(\d{4})(?=\d)/g,'$1 ').trim();}
 if(evento.target.name==='vencimiento'){let n=evento.target.value.replace(/\D/g,'').slice(0,4);evento.target.value=n.length>2?n.slice(0,2)+'/'+n.slice(2):n;}
 if(evento.target.name==='cvv'){evento.target.value=evento.target.value.replace(/\D/g,'').slice(0,3);}
});
window.addEventListener('hashchange',dibujar);
(async()=>{await iniciarDatos();dibujar()})();