#!/usr/bin/env python3
"""
build.py — sincroniza el calendario "Música y Conciertos" de Google Calendar
con los datos curados de data/curado.json y genera data/events.json.

Uso:
    python3 build.py            # pull de Google Calendar + merge
    python3 build.py --offline  # sin red, usa data/events.json existente (regenera fechas relativas)

El sitio solo lee data/events.json, así que esto se puede correr por cron
cada hora y la web queda actualizada sola.
"""
import json
import os
import sys
from datetime import datetime, timezone, timedelta

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE) if os.path.basename(HERE) == "data" else HERE
DATA = os.path.join(ROOT, "data")
CURADO = os.path.join(DATA, "curado.json")
SALIDA = os.path.join(DATA, "events.json")

sys.path.insert(0, "/home/david/scripts/google-calendar")

LIMA = timezone(timedelta(hours=-5))
VENTANA_INI = "2026-01-01T00:00:00-05:00"
VENTANA_FIN = "2028-12-31T00:00:00-05:00"


def cargar_curado():
    with open(CURADO, encoding="utf-8") as f:
        return json.load(f)


def pull_calendario():
    """Devuelve lista de eventos crudos del calendario de música."""
    try:
        import event as gcal  # script existente de dsakiya
    except Exception as e:  # noqa: BLE001
        print(f"⚠️  no pude importar event.py ({e}); sigo en modo offline", file=sys.stderr)
        return None

    try:
        svc = gcal.get_service()
        resp = svc.events().list(
            calendarId=gcal.MUSIC_CAL,
            timeMin=VENTANA_INI,
            timeMax=VENTANA_FIN,
            singleEvents=True,
            orderBy="startTime",
            maxResults=250,
        ).execute()
        return resp.get("items", [])
    except Exception as e:  # noqa: BLE001
        print(f"⚠️  fallo al leer Google Calendar: {e}", file=sys.stderr)
        return None


def normalizar(raw):
    start = raw.get("start", {})
    end = raw.get("end", {})
    return {
        "summary": (raw.get("summary") or "").strip(),
        "start": start.get("dateTime") or start.get("date"),
        "end": end.get("dateTime") or end.get("date"),
        "all_day": "date" in start,
        "description": raw.get("description") or "",
        "location": raw.get("location") or "",
        "html_link": raw.get("htmlLink") or "",
        "gcal_id": raw.get("id") or "",
    }


def parse_iso(valor):
    if not valor:
        return None
    try:
        return datetime.fromisoformat(valor.replace("Z", "+00:00")).astimezone(LIMA)
    except ValueError:
        try:
            d = datetime.strptime(valor, "%Y-%m-%d")
            return d.replace(tzinfo=LIMA)
        except ValueError:
            return None


def fechas_relativas(dt):
    """Días que faltan y etiqueta humana."""
    if not dt:
        return None, ""
    hoy = datetime.now(LIMA).replace(hour=0, minute=0, second=0, microsecond=0)
    dias = (dt.replace(hour=0, minute=0, second=0, microsecond=0) - hoy).days
    if dias == 0:
        return dias, "HOY"
    if dias == 1:
        return dias, "MAÑANA"
    if dias < 0:
        return dias, f"HACE {abs(dias)} DÍAS"
    if dias < 7:
        return dias, f"EN {dias} DÍAS"
    if dias < 30:
        return dias, f"EN {round(dias / 7)} SEMANAS"
    return dias, f"EN {round(dias / 30)} MESES"


def merge(curado, crudos):
    """Cruza cada evento curado con su equivalente en el calendario."""
    por_resumen = {}
    for c in crudos or []:
        por_resumen.setdefault(c["summary"], c)

    salida = []
    usados = set()

    for item in curado["events"]:
        base = {k: v for k, v in item.items() if k not in ("match", "manual", "start", "end")}
        raw = None

        if item.get("match"):
            for resumen, cand in por_resumen.items():
                if item["match"].lower() in resumen.lower():
                    raw = cand
                    usados.add(id(cand))
                    break

        inicio = raw["start"] if raw else item.get("start")
        fin = raw["end"] if raw else item.get("end")
        dt = parse_iso(inicio)
        _, etiqueta = fechas_relativas(dt)

        base.update({
            "start": inicio,
            "end": fin,
            "countdown": etiqueta,
            "dias": fechas_relativas(dt)[0],
            "gcal_link": (raw or {}).get("html_link") or "",
            "en_calendario": raw is not None,
            "descripcion_gcal": (raw or {}).get("description", ""),
        })
        if item.get("manual") and raw is None:
            base["en_calendario"] = False
        salida.append(base)

    # eventos del calendario que no estén curados: entran como "sin ficha"
    for c in crudos or []:
        if id(c) in usados:
            continue
        dt = parse_iso(c["start"])
        dias, etiqueta = fechas_relativas(dt)
        salida.append({
            "slug": "auto-" + (c["gcal_id"][:8] or "evento"),
            "title": c["summary"].split("—")[0].strip().upper() or "EVENTO",
            "subtitle": " — ".join(x.strip() for x in c["summary"].split("—")[1:]) or None,
            "venue": (c["description"].split("Lugar:")[-1].split("\n")[0].strip()
                      if "Lugar:" in c["description"] else (c["location"] or "Por confirmar")),
            "address": c["location"] or "",
            "district": "Lima",
            "price": "Ver post",
            "price_from": None,
            "free": False,
            "genres": [],
            "tags": ["Nuevo"],
            "lineup": [],
            "poster": None,
            "tickets": None,
            "ig_post": None,
            "producers": [],
            "note": "",
            "start": c["start"],
            "end": c["end"],
            "countdown": etiqueta,
            "dias": dias,
            "gcal_link": c["html_link"],
            "en_calendario": True,
            "descripcion_gcal": c["description"],
            "auto": True,
        })

    salida.sort(key=lambda e: parse_iso(e["start"]) or datetime.max.replace(tzinfo=LIMA))
    return salida


def main():
    curado = cargar_curado()

    if "--offline" in sys.argv:
        crudos = None
        if os.path.exists(SALIDA):
            try:
                with open(SALIDA, encoding="utf-8") as f:
                    prev = json.load(f)
                curado["events"] = prev.get("events", curado["events"])
            except Exception:  # noqa: BLE001
                pass
    else:
        crudos_raw = pull_calendario()
        crudos = [normalizar(c) for c in crudos_raw] if crudos_raw is not None else None
        if crudos is None and os.path.exists(SALIDA):
            print("↩️  usando data/events.json previo", file=sys.stderr)
            with open(SALIDA, encoding="utf-8") as f:
                prev = json.load(f)
            curado["events"] = prev.get("events", [])

    eventos = merge(curado, crudos)
    doc = {
        "handle": curado.get("handle", "ruido.de.fondo.3000"),
        "ig_url": "https://instagram.com/" + curado.get("handle", "ruido.de.fondo.3000"),
        "generado": datetime.now(LIMA).isoformat(timespec="seconds"),
        "generado_legible": datetime.now(LIMA).strftime("%d.%m.%Y · %H:%M"),
        "fuente": "Google Calendar · Música y Conciertos",
        "total": len(eventos),
        "events": eventos,
    }

    os.makedirs(DATA, exist_ok=True)
    with open(SALIDA, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)
    # copia como JS para que el sitio funcione incluso abriendo file://
    with open(os.path.join(DATA, "events.js"), "w", encoding="utf-8") as f:
        f.write("window.__EVENTS__ = ")
        json.dump(doc, f, ensure_ascii=False)
        f.write(";\n")
    print(f"✅ {len(eventos)} eventos → {SALIDA}")


if __name__ == "__main__":
    main()
