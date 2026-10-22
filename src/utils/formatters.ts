// Formateo de valores meteorológicos para la capa de presentación (requisito 5.3).
// Los servicios almacenan valores crudos; el formato se aplica solo al renderizar.

/** Temperatura con máximo 1 decimal y unidad °C. Ej: 8.4 → "8.4 °C" */
export function formatTemperature(value: number): string {
  return value.toFixed(1) + ' °C';
}

/** Humedad como entero y unidad %. Ej: 72.4 → "72 %" */
export function formatHumidity(value: number): string {
  return Math.round(value) + ' %';
}

/** Precipitación con máximo 1 decimal y unidad mm. Ej: 0 → "0.0 mm" */
export function formatPrecipitation(value: number): string {
  return value.toFixed(1) + ' mm';
}
