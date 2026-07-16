// Formato y reglas de presentación. Sin DOM, sin estado: puro cálculo.

export function dinero(valor) {
  return Number(valor || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: Number.isInteger(Number(valor)) ? 0 : 2,
  });
}

export function fechaCorta(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
  });
}

export function fechaHora(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function haceRato(iso) {
  if (!iso) return "";
  const minutos = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutos < 1) return "ahora";
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;
  return fechaCorta(iso);
}

export function enDias(dias) {
  return new Date(Date.now() + dias * 86400000).toISOString();
}

/** 55 1234 5678 → 5215512345678 (formato que exige wa.me) */
export function normalizarWhatsApp(telefono) {
  const digitos = String(telefono || "").replace(/\D/g, "");
  if (!digitos) return "";
  if (digitos.startsWith("521")) return digitos;
  if (digitos.startsWith("52")) return `521${digitos.slice(2)}`;
  if (digitos.length === 10) return `521${digitos}`;
  return digitos;
}

export function telefonoValido(telefono) {
  return String(telefono || "").replace(/\D/g, "").length >= 10;
}

export function correoValido(correo) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(correo || "").trim());
}

export function slug(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function etiquetaModo(valor) {
  const mapa = {
    both: "Entrega y recoger",
    delivery: "Solo entrega",
    pickup: "Solo recoger",
  };
  return mapa[valor] || "Entrega y recoger";
}

export function etiquetaTipo(tipo) {
  const mapa = {
    food: "Comida y bebida",
    retail: "Producto",
    service: "Servicio",
  };
  return mapa[tipo] || "Producto";
}

/** Precio final después del descuento. Nunca baja de cero. */
export function precioFinal(producto) {
  const base = Number(producto.price || 0);
  if (producto.discountType === "percent") {
    return Math.max(0, Math.round(base * (1 - Number(producto.discountValue || 0) / 100)));
  }
  if (producto.discountType === "amount") {
    return Math.max(0, base - Number(producto.discountValue || 0));
  }
  return base;
}

export function tieneDescuento(producto) {
  return precioFinal(producto) < Number(producto.price || 0);
}

export function estaPromocionado(producto) {
  if (!producto.featuredUntil) return false;
  return new Date(producto.featuredUntil).getTime() > Date.now();
}

// ---------- Horario: "abierto ahora" calculado, no inventado ----------
// horario = { 1: [["09:00","15:00"],["18:00","22:00"]], ... }  0 = domingo

export function estaAbierta(tienda, referencia) {
  // Ojo: si esto se usa como `lista.filter(estaAbierta)`, el segundo
  // argumento es el índice del arreglo, no una fecha. Se ignora lo que
  // no sea un Date en vez de reventar.
  const ahora = referencia instanceof Date ? referencia : new Date();
  const horario = tienda.schedule;
  if (!horario) return true; // sin horario configurado no bloqueamos la venta
  const franjas = horario[String(ahora.getDay())];
  if (!franjas || !franjas.length) return false;
  const minutos = ahora.getHours() * 60 + ahora.getMinutes();
  return franjas.some(([inicio, fin]) => {
    const a = aMinutos(inicio);
    const b = aMinutos(fin);
    return b > a ? minutos >= a && minutos < b : minutos >= a || minutos < b;
  });
}

export function proximaApertura(tienda, referencia) {
  const ahora = referencia instanceof Date ? referencia : new Date();
  const horario = tienda.schedule;
  if (!horario) return "";
  for (let salto = 0; salto < 7; salto += 1) {
    const dia = (ahora.getDay() + salto) % 7;
    const franjas = horario[String(dia)] || [];
    const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
    const proxima = franjas.find(([inicio]) => salto > 0 || aMinutos(inicio) > minutosAhora);
    if (proxima) {
      const nombres = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
      return salto === 0 ? `Abre a las ${proxima[0]}` : `Abre el ${nombres[dia]} a las ${proxima[0]}`;
    }
  }
  return "";
}

function aMinutos(hhmm) {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Distancia en km entre dos coordenadas (Haversine). */
export function distanciaKm(a, b) {
  if (!a?.lat || !a?.lng || !b?.lat || !b?.lng) return null;
  const R = 6371;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function rad(grados) {
  return (grados * Math.PI) / 180;
}

export function etiquetaDistancia(km) {
  if (km === null || km === undefined) return "";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

/** Tiempo estimado a partir de distancia real + preparación de la tienda. */
export function tiempoEstimado(km, minutosPrep = 15) {
  if (km === null || km === undefined) return "";
  const traslado = Math.round((km / 18) * 60) + 5; // ~18 km/h en moto de pueblo
  const total = minutosPrep + traslado;
  return `${total - 5}-${total + 10} min`;
}

export function csv(filas) {
  return filas
    .map((fila) =>
      fila
        .map((celda) => `"${String(celda ?? "").replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");
}

export function descargar(nombre, contenido, tipo = "text/csv;charset=utf-8;") {
  const blob = new Blob(["\ufeff" + contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  enlace.click();
  URL.revokeObjectURL(url);
}
