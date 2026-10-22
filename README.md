# Pronóstico del clima

Aplicación web de una sola página (SPA) que permite escribir el nombre de una ciudad y consultar su clima actual: temperatura, humedad relativa y precipitación.

La app no tiene backend propio. Todo ocurre en el navegador, que consulta directamente las APIs públicas y gratuitas de [Open-Meteo](https://open-meteo.com), sin necesidad de API key.

## Funcionalidades

- Búsqueda por nombre de ciudad (máximo 100 caracteres), con clic en **Buscar** o tecla Enter.
- Validación de entrada: el campo vacío o con solo espacios no genera solicitudes.
- Resultados: nombre de la ciudad, temperatura en °C, humedad en % y precipitación en mm.
- Mensajes de error claros para ciudad no encontrada, fallos de red, timeouts, respuestas inválidas o datos incompletos.
- Botón **Limpiar** que borra el campo, los resultados y los errores, y cancela una búsqueda en curso.
- Indicador de carga mientras se consultan las APIs.

## Tecnologías

- [TypeScript](https://www.typescriptlang.org/) en modo estricto, sin frameworks de UI.
- [Vite](https://vite.dev/) como bundler y servidor de desarrollo.
- [Vitest](https://vitest.dev/) con entorno jsdom para las pruebas.
- [fast-check](https://fast-check.dev/) para pruebas basadas en propiedades.
- [Testing Library](https://testing-library.com/) para pruebas de componentes.

## Requisitos previos

- Node.js (probado con la versión 22.16). Vite 8 y Vitest 5 requieren una versión LTS reciente.
- npm.

## Instalación y uso

```bash
npm install
npm run dev
```

Abre la URL que muestra Vite (por defecto `http://localhost:5173`).

## Scripts

| Comando           | Descripción                                                  |
|-------------------|--------------------------------------------------------------|
| `npm run dev`     | Servidor de desarrollo con recarga en caliente.              |
| `npm run build`   | Verifica tipos con `tsc` y genera la versión de producción en `dist/`. |
| `npm run preview` | Sirve localmente la versión generada en `dist/`.             |
| `npm test`        | Ejecuta la suite completa de pruebas una vez (`vitest --run`). |

## Arquitectura

La aplicación se organiza en capas, de la presentación hacia los clientes HTTP:

```
Componentes UI  →  WeatherController  →  GeocodingService / ForecastService  →  Clientes HTTP
```

- **Componentes** (`src/components/`): formulario de búsqueda, visualización del clima, indicador de carga y mensaje de error.
- **Controlador** (`src/WeatherController.ts`): orquesta el flujo de búsqueda y el reinicio.
- **Servicios** (`src/services/`): validan y mapean las respuestas de las APIs a tipos de dominio. Devuelven resultados tipados (`success` / `error`), sin lanzar excepciones.
- **Clientes HTTP** (`src/clients/`): construyen las URLs y ejecutan `fetch` con timeout mediante `AbortController`.
- **Utilidades** (`src/utils/`): formateo numérico y textos de error.

El punto de entrada es `src/main.ts`, que llama a `mountApp` en `src/app.ts` para conectar las capas.

### Flujo de una búsqueda

1. El usuario envía un nombre de ciudad. Se recorta con `trim()`.
2. Se consulta la **Geocoding API** para obtener latitud y longitud.
3. Con las coordenadas se consulta la **Forecast API** para obtener los valores actuales.
4. Se muestran los resultados o el mensaje de error correspondiente.

## APIs utilizadas

| API          | Endpoint                                              | Uso                                    | Timeout |
|--------------|-------------------------------------------------------|----------------------------------------|---------|
| Geocoding    | `https://geocoding-api.open-meteo.com/v1/search`      | Nombre de ciudad → coordenadas         | 10 s    |
| Forecast     | `https://api.open-meteo.com/v1/forecast`              | Coordenadas → clima actual             | 30 s    |

La Forecast API se amplió a 30 segundos porque en pruebas reales tardó unos 15 segundos desde algunas redes.

## Pruebas

```bash
npm test
```

La suite incluye:

- **Pruebas basadas en propiedades** (fast-check) para las propiedades de corrección del diseño, como la construcción de URLs, la extracción de coordenadas, la detección de datos incompletos, el formateo numérico y la limpieza de resultados.
- **Pruebas unitarias** de clientes, servicios, componentes y controlador, incluidos timeouts y errores de red simulados.
- **Pruebas de integración** que recorren el flujo completo con clientes simulados.

Las pruebas no realizan llamadas reales a las APIs.

## Estructura del proyecto

```
weather-forecast-app/
├── index.html
├── src/
│   ├── main.ts                 # Punto de entrada
│   ├── app.ts                  # Montaje y cableado de capas
│   ├── WeatherController.ts    # Orquestación de la búsqueda
│   ├── styles.css
│   ├── types/                  # Tipos del dominio
│   ├── clients/                # Clientes HTTP y timeout
│   ├── services/               # Lógica de negocio y validación
│   ├── components/             # Componentes de UI
│   └── utils/                  # Formateo y mensajes de error
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Documentación de diseño

El proyecto se diseñó a partir de tres documentos ubicados en la carpeta superior del repositorio:

- `requirements.md`: requisitos y criterios de aceptación.
- `design.md`: arquitectura, modelos de datos, propiedades de corrección y estrategia de errores.
- `tasks-v2.md`: plan de implementación.

## Limitaciones conocidas

- Solo muestra el clima actual; no hay pronósticos por horas o días.
- La búsqueda depende de la disponibilidad de Open-Meteo.
- Ante una ciudad con nombre ambiguo, se usa el primer resultado de la geocodificación.
- La interfaz no se ha probado en todos los navegadores.

## Licencia

ISC
