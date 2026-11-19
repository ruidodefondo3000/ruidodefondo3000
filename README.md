# Calendario · @ruido.de.fondo.3000

Sitio web de agenda de conciertos que se actualiza solo desde Google Calendar
(calendario secundario **"Música y Conciertos"**).

## Estructura

```
calendario/
├── index.html          ← selector de versiones
├── build.py            ← sincroniza Google Calendar → data/events.json
├── data/
│   ├── curado.json     ← fichas escritas a mano (lineup, precios, tags, links)
│   ├── events.json     ← salida generada (la que lee la web)
│   ├── events.js       ← misma data como JS (funciona abriendo en file://)
│   └── build.log
├── v1/                 ← POSTER / BRUTALIST
└── v2/                 ← RADAR / EDITORIAL NOCTURNO
```

## Cómo se actualiza

```bash
cd /home/david/opencode/calendario
python3 build.py
```

Ya está en cron cada 30 minutos:

```
*/30 * * * * cd /home/david/opencode/calendario && /usr/bin/python3 build.py >> data/build.log 2>&1
```

Flujo:
1. `build.py` lee los eventos del calendario de música vía `~/scripts/google-calendar/event.py`.
2. Los cruza con `data/curado.json` por coincidencia de texto en el título (`match`).
3. Genera `data/events.json` + `data/events.js` con fechas relativas ("EN 3 DÍAS") recalculadas.
4. La web solo lee ese archivo → queda actualizada sola.

Si agregas un evento nuevo al calendario y no está en `curado.json`, igual aparece en la web
pero con ficha mínima (título, fecha, link al evento). Para darle lineup y precios bonitos,
agregarlo a `curado.json`.

## Ver en el celular

```bash
cd /home/david/opencode/calendario && python3 -m http.server 8791 --bind 0.0.0.0
```

Desde el teléfono en la misma wifi: `http://192.168.100.190:8791/`

## Las dos versiones

**V1 · Poster / Brutalist** — negro, papel y verde ácido. Anton en tamaños absurdos,
marquee infinito, tarjetas tipo afiche. Es la versión "ruidosa".

**V2 · Radar / Editorial nocturno** — violeta y cian sobre negro azulado. Fecha próxima
destacada, barra de meses sticky, línea de tiempo. Es la versión "curada".

Ambas: mobile-first, detalle en bottom sheet con swipe-down, links a entradas / post de IG /
Google Calendar.

## Pendientes posibles

- Poster/afiche por evento (campo `poster` ya existe en el schema, vacío).
- Deploy público (GitHub Pages / Netlify) para compartir el link en la bio de IG.
- Meta tags OG para que el link se vea bien al compartirlo.
