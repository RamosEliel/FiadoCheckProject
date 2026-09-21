# -*- coding: utf-8 -*-
"""Genera fiados_reales.json a partir de los cuadernos transcritos."""
from calendar import monthrange
from datetime import date, timedelta
import json
from pathlib import Path

REF = date(2026, 9, 21)  # fotos 18-sep-2026


def last_day(y, m):
    return date(y, m, monthrange(y, m)[1])


def limite(y, m, mode):
    return date(y, m, 16) if mode == "16" else last_day(y, m)


def estado_negocio(fecha_pago, fecha_limite, saldo):
    if saldo <= 0 and fecha_pago:
        return "pagado"
    dias = (REF - fecha_limite).days
    if dias > 30:
        return "vencido"
    if dias > 0:
        return "atrasado"
    return "atrasado"


def estado_bd(negocio):
    return {"pagado": "pagado", "vencido": "vencido", "atrasado": "vigente"}[negocio]


def antiguedad(created, as_of):
    return max(0, (as_of.year - created.year) * 12 + (as_of.month - created.month))


def iso(d):
    return d.isoformat()


clientes_src = []
creditos_src = []
abonos_src = []

# ── Tenderos (3 tiendas = 3 zips) ──────────────────────────────────────────
tenderos = [
    {
        "id_tendero": 901,
        "nombre_tienda": "Tienda cuaderno (zip 13.13.10)",
        "fuente": "WhatsApp Unknown 2026-09-21 at 13.13.10.zip",
    },
    {
        "id_tendero": 902,
        "nombre_tienda": "Tienda cartones (zip 13.12.54)",
        "fuente": "WhatsApp Unknown 2026-09-21 at 13.12.54.zip",
    },
    {
        "id_tendero": 903,
        "nombre_tienda": "Tienda cuaderno espiral (zip 13.12.18)",
        "fuente": "WhatsApp Unknown 2026-09-21 at 13.12.18.zip",
    },
]

# cuentas: nombre, tendero, created, items batches
# each batch: {mes, dia_credito, limite_mode, items:[{monto,desc}], abonos:[{monto,fecha}], pagado?}

C = 2001
CR = 5001
AB = 8001


def add_cliente(nombre, id_tendero, created, notas=""):
    global C
    cid = C
    C += 1
    clientes_src.append(
        {
            "id_cliente": cid,
            "id_tendero": id_tendero,
            "nombre_completo": nombre,
            "telefono": None,
            "direccion": None,
            "estado": "activo",
            "created_at": f"{created.isoformat()} 09:00:00",
            "antiguedad_meses": antiguedad(created, REF),
            "antiguedad_origen": "inferida_por_volumen_de_fiado",
            "notas": notas,
        }
    )
    return cid


def add_credito(cid, tid, fecha_credito, fecha_limite, items, abonos, descripcion, fuente, campos_inferidos):
    global CR, AB
    crid = CR
    CR += 1
    monto = sum(i["monto"] for i in items)
    pagado_sum = sum(a["monto"] for a in abonos)
    saldo = max(0, monto - pagado_sum)
    fecha_pago = max((a["fecha"] for a in abonos), default=None) if abonos and saldo == 0 else (
        abonos[-1]["fecha"] if abonos else None
    )
    if saldo == 0 and not fecha_pago:
        fecha_pago = fecha_limite - timedelta(days=2)
        if fecha_pago < fecha_credito:
            fecha_pago = fecha_credito
        abonos = [{"monto": monto, "fecha": fecha_pago, "origen": "inferida_jul_ago"}]
        pagado_sum = monto
        fecha_pago = fecha_pago
    negocio = estado_negocio(fecha_pago if saldo == 0 else None, fecha_limite, saldo)
    if negocio == "pagado" and saldo > 0:
        negocio = estado_negocio(None, fecha_limite, saldo)
    credito = {
        "id_credito": crid,
        "id_cliente": cid,
        "id_tendero": tid,
        "monto_total": monto,
        "saldo_pendiente": saldo,
        "descripcion": descripcion[:500],
        "fecha_credito": iso(fecha_credito),
        "fecha_limite_pago": iso(fecha_limite),
        "fecha_limite_pago_origen": campos_inferidos.get("limite_origen", "inferida_dia_16_o_fin_de_mes"),
        "estado": estado_bd(negocio),
        "estado_negocio": negocio,
        "created_at": f"{iso(fecha_credito)} 10:00:00",
        "fuente_foto": fuente,
        "line_items": items,
        "fecha_pago": iso(fecha_pago) if saldo == 0 and fecha_pago else None,
        "fecha_pago_origen": "cuaderno" if campos_inferidos.get("pago_en_foto") else (
            "inferida_julio_agosto" if saldo == 0 else None
        ),
    }
    creditos_src.append(credito)
    for a in abonos:
        abonos_src.append(
            {
                "id_abono": AB,
                "id_credito": crid,
                "id_cliente": cid,
                "monto": a["monto"],
                "fecha_abono": iso(a["fecha"]),
                "fecha_abono_origen": a.get("origen", "inferida_julio_agosto"),
                "created_at": f"{iso(a['fecha'])} 16:00:00",
            }
        )
        AB += 1
    return crid


# ═══════════════════════════════════════════════════════════════════════════
# TIENDA 1 — cuaderno
# ═══════════════════════════════════════════════════════════════════════════

p = add_cliente("Pancrando", 901, date(2025, 11, 3), "Cuenta larga; total anotado 210.200")
add_credito(
    p, 901, date(2026, 7, 3), limite(2026, 7, "16"),
    [
        {"monto": 3000, "descripcion": "fiado"},
        {"monto": 1500, "descripcion": "fiado"},
        {"monto": 1630, "descripcion": "fiado"},
        {"monto": 9300, "descripcion": "fiado"},
        {"monto": 13400, "descripcion": "fiado"},
        {"monto": 10200, "descripcion": "fiado"},
        {"monto": 18500, "descripcion": "fiado"},
        {"monto": 25000, "descripcion": "fiado"},
        {"monto": 7400, "descripcion": "fiado"},
        {"monto": 19000, "descripcion": "fiado"},
        {"monto": 19500, "descripcion": "fiado"},
        {"monto": 7500, "descripcion": "fiado"},
        {"monto": 4500, "descripcion": "fiado"},
        {"monto": 2500, "descripcion": "fiado"},
        {"monto": 3500, "descripcion": "fiado"},
        {"monto": 20400, "descripcion": "fiado"},
        {"monto": 1500, "descripcion": "fiado"},
    ],
    [{"monto": 168330, "fecha": date(2026, 7, 14), "origen": "inferida_julio_agosto"}],
    "Fiado julio Pancrando (columna izquierda; total cuaderno 210200)",
    "zip1/19.38.30.jpeg",
    {"limite_origen": "inferida_16_del_mes", "pago_en_foto": False},
)
add_credito(
    p, 901, date(2026, 8, 2), limite(2026, 8, "fin"),
    [
        {"monto": 6000, "descripcion": "fiado"},
        {"monto": 6400, "descripcion": "fiado"},
        {"monto": 8600, "descripcion": "fiado"},
        {"monto": 7800, "descripcion": "fiado"},
        {"monto": 7600, "descripcion": "fiado"},
        {"monto": 17600, "descripcion": "fiado"},
        {"monto": 8500, "descripcion": "fiado"},
        {"monto": 9400, "descripcion": "fiado"},
        {"monto": 18000, "descripcion": "fiado"},
        {"monto": 10000, "descripcion": "fiado"},
        {"monto": 8000, "descripcion": "fiado"},
        {"monto": 7600, "descripcion": "fiado"},
        {"monto": 14000, "descripcion": "fiado"},
        {"monto": 2400, "descripcion": "fiado"},
        {"monto": 7200, "descripcion": "fiado"},
        {"monto": 19500, "descripcion": "fiado"},
        {"monto": 6000, "descripcion": "fiado"},
        {"monto": 14600, "descripcion": "fiado"},
    ],
    [],
    "Fiado agosto Pancrando (columna derecha, saldo abierto)",
    "zip1/19.38.30.jpeg",
    {"limite_origen": "inferida_fin_de_mes"},
)
add_credito(
    p, 901, date(2026, 8, 18), limite(2026, 8, "fin"),
    [
        {"monto": 7100, "descripcion": "fiado"},
        {"monto": 6600, "descripcion": "fiado"},
        {"monto": 11500, "descripcion": "fiado"},
        {"monto": 5000, "descripcion": "fiado"},
        {"monto": 19700, "descripcion": "fiado"},
        {"monto": 8000, "descripcion": "fiado"},
        {"monto": 9000, "descripcion": "fiado"},
    ],
    [],
    "Cargos extra al pie de página Pancrando",
    "zip1/19.38.30.jpeg",
    {"limite_origen": "inferida_fin_de_mes"},
)

f = add_cliente("Firulata", 901, date(2025, 10, 12), "Saldo anotado 196.700")
add_credito(
    f, 901, date(2026, 7, 5), limite(2026, 7, "fin"),
    [
        {"monto": 16500, "descripcion": "fiado"},
        {"monto": 800, "descripcion": "fiado"},
        {"monto": 196700, "descripcion": "saldo arrastre"},
        {"monto": 50000, "descripcion": "fiado"},
        {"monto": 10500, "descripcion": "fiado"},
        {"monto": 21700, "descripcion": "fiado"},
        {"monto": 4700, "descripcion": "fiado"},
        {"monto": 6200, "descripcion": "fiado"},
        {"monto": 24000, "descripcion": "fiado"},
        {"monto": 17500, "descripcion": "fiado"},
        {"monto": 6000, "descripcion": "fiado"},
        {"monto": 6800, "descripcion": "fiado"},
        {"monto": 2400, "descripcion": "fiado"},
        {"monto": 4300, "descripcion": "fiado"},
        {"monto": 11800, "descripcion": "fiado"},
        {"monto": 6800, "descripcion": "fiado"},
        {"monto": 8300, "descripcion": "fiado"},
        {"monto": 12000, "descripcion": "fiado"},
        {"monto": 2500, "descripcion": "fiado"},
        {"monto": 29000, "descripcion": "fiado"},
        {"monto": 6200, "descripcion": "fiado"},
        {"monto": 6300, "descripcion": "fiado"},
        {"monto": 20300, "descripcion": "fiado"},
        {"monto": 7000, "descripcion": "fiado"},
        {"monto": 14000, "descripcion": "fiado"},
        {"monto": 10400, "descripcion": "fiado"},
        {"monto": 12000, "descripcion": "fiado"},
        {"monto": 4700, "descripcion": "fiado"},
        {"monto": 9000, "descripcion": "fiado"},
    ],
    [{"monto": 300000, "fecha": date(2026, 7, 28), "origen": "inferida_julio_agosto"}],
    "Firulata julio (columna izquierda)",
    "zip1/19.38.30 (1).jpeg",
    {"limite_origen": "inferida_fin_de_mes"},
)
add_credito(
    f, 901, date(2026, 8, 4), limite(2026, 8, "16"),
    [
        {"monto": 3000, "descripcion": "fiado"},
        {"monto": 4300, "descripcion": "fiado"},
        {"monto": 11000, "descripcion": "fiado"},
        {"monto": 11200, "descripcion": "fiado"},
        {"monto": 10900, "descripcion": "fiado"},
        {"monto": 17900, "descripcion": "fiado"},
    ],
    [],
    "Firulata agosto (columna derecha, abierto)",
    "zip1/19.38.30 (1).jpeg",
    {"limite_origen": "inferida_16_del_mes"},
)

y = add_cliente("Yoncarlos", 901, date(2026, 1, 20), "Fecha explícita 15 julio")
add_credito(
    y, 901, date(2026, 7, 15), limite(2026, 7, "fin"),
    [
        {"monto": 800, "descripcion": "fiado"},
        {"monto": 12000, "descripcion": "fiado"},
        {"monto": 5000, "descripcion": "fiado"},
        {"monto": 4000, "descripcion": "musita"},
        {"monto": 11000, "descripcion": "hueso"},
        {"monto": 1000, "descripcion": "papa"},
        {"monto": 104700, "descripcion": "fiado"},
        {"monto": 9800, "descripcion": "fiado"},
        {"monto": 3000, "descripcion": "digit"},
        {"monto": 20000, "descripcion": "boleta"},
        {"monto": 1600, "descripcion": "gelatina"},
        {"monto": 7600, "descripcion": "hueso"},
        {"monto": 3000, "descripcion": "agua"},
        {"monto": 50000, "descripcion": "cargador"},
        {"monto": 1000, "descripcion": "plata"},
        {"monto": 1500, "descripcion": "fiado"},
        {"monto": 10000, "descripcion": "fiado"},
        {"monto": 60000, "descripcion": "fiado"},
        {"monto": 5000, "descripcion": "plata"},
        {"monto": 500, "descripcion": "fiado"},
        {"monto": 7000, "descripcion": "plata"},
        {"monto": 17800, "descripcion": "fiado"},
        {"monto": 10000, "descripcion": "fiado"},
        {"monto": 100000, "descripcion": "fiado"},
        {"monto": 5000, "descripcion": "fiado"},
        {"monto": 9000, "descripcion": "fiado"},
        {"monto": 1700, "descripcion": "fiado"},
        {"monto": 4000, "descripcion": "colgate"},
        {"monto": 2700, "descripcion": "fiado"},
        {"monto": 7700, "descripcion": "fiado"},
        {"monto": 6000, "descripcion": "pagado anotado"},
        {"monto": 400, "descripcion": "fiado"},
    ],
    [
        {"monto": 59000, "fecha": date(2026, 7, 20), "origen": "cuaderno_total_parcial"},
        {"monto": 6000, "fecha": date(2026, 8, 5), "origen": "anotacion_pagado"},
    ],
    "Yoncarlos desde 15 julio",
    "zip1/19.38.30 (2).jpeg",
    {"limite_origen": "inferida_fin_de_mes", "pago_en_foto": True},
)

e = add_cliente("Elio", 901, date(2026, 3, 8), "Fecha explícita 7 de agosto")
add_credito(
    e, 901, date(2026, 8, 7), limite(2026, 8, "16"),
    [
        {"monto": 2000, "descripcion": "ampolletas"},
        {"monto": 1000, "descripcion": "cigarros"},
        {"monto": 2000, "descripcion": "ampolletas"},
        {"monto": 2700, "descripcion": "cigarros"},
        {"monto": 2000, "descripcion": "campo"},
        {"monto": 5000, "descripcion": "muestra violeta"},
        {"monto": 1400, "descripcion": "fiado"},
        {"monto": 2500, "descripcion": "fiado"},
        {"monto": 1400, "descripcion": "fiado"},
        {"monto": 2000, "descripcion": "fiado"},
        {"monto": 1400, "descripcion": "cigarro"},
        {"monto": 1000, "descripcion": "cafe"},
        {"monto": 12000, "descripcion": "fiado"},
        {"monto": 1700, "descripcion": "fiado"},
        {"monto": 1000, "descripcion": "fiado"},
        {"monto": 500, "descripcion": "fiado"},
        {"monto": 2000, "descripcion": "fiado"},
        {"monto": 2000, "descripcion": "fiado"},
        {"monto": 2000, "descripcion": "fiado"},
        {"monto": 4500, "descripcion": "fiado"},
        {"monto": 1000, "descripcion": "fiado"},
        {"monto": 2000, "descripcion": "fiado"},
        {"monto": 3500, "descripcion": "espinaza"},
        {"monto": 6000, "descripcion": "cigarros"},
        {"monto": 1400, "descripcion": "cigarro"},
    ],
    [{"monto": 65000, "fecha": date(2026, 8, 14), "origen": "inferida_julio_agosto"}],
    "Elio 7 de agosto",
    "zip1/19.38.30 (3).jpeg",
    {"limite_origen": "inferida_16_del_mes"},
)

ed = add_cliente("Eduvar", 901, date(2026, 5, 14))
add_credito(
    ed, 901, date(2026, 8, 10), limite(2026, 8, "fin"),
    [
        {"monto": 4000, "descripcion": "colgate"},
        {"monto": 77000, "descripcion": "arroz"},
        {"monto": 1700, "descripcion": "fiado"},
        {"monto": 1000, "descripcion": "fiado"},
        {"monto": 2000, "descripcion": "fiado"},
        {"monto": 250000, "descripcion": "fiado"},
        {"monto": 1000, "descripcion": "fiado"},
        {"monto": 2000, "descripcion": "fiado"},
        {"monto": 8000, "descripcion": "fiado"},
        {"monto": 7000, "descripcion": "plata"},
    ],
    [],
    "Eduvar — arroz, colgate y plata",
    "zip1/19.38.31.jpeg",
    {"limite_origen": "inferida_fin_de_mes"},
)

# ═══════════════════════════════════════════════════════════════════════════
# TIENDA 2 — cartones
# ═══════════════════════════════════════════════════════════════════════════

t = add_cliente("Tito", 902, date(2025, 12, 1), "Cartón 'Tito Agosto'")
add_credito(
    t, 902, date(2026, 8, 1), limite(2026, 8, "16"),
    [
        {"monto": 49500, "descripcion": "fiado"},
        {"monto": 13500, "descripcion": "fiado"},
        {"monto": 168000, "descripcion": "fiado"},
        {"monto": 28200, "descripcion": "fiado"},
        {"monto": 127000, "descripcion": "fiado"},
        {"monto": 20000, "descripcion": "fiado"},
        {"monto": 130000, "descripcion": "fiado"},
        {"monto": 20600, "descripcion": "fiado"},
        {"monto": 50000, "descripcion": "fiado"},
    ],
    [{"monto": 300000, "fecha": date(2026, 8, 12), "origen": "inferida_julio_agosto"}],
    "Tito agosto (cartón nominado)",
    "zip2/18.09.48.jpeg",
    {"limite_origen": "inferida_16_del_mes"},
)

c1 = add_cliente("Cliente cartón 1", 902, date(2026, 6, 10), "Sin nombre en el cartón")
add_credito(
    c1, 902, date(2026, 7, 8), limite(2026, 7, "fin"),
    [
        {"monto": 268000, "descripcion": "fiado"},
        {"monto": 24000, "descripcion": "fiado"},
        {"monto": 19000, "descripcion": "fiado"},
        {"monto": 12500, "descripcion": "fiado"},
    ],
    [{"monto": 323500, "fecha": date(2026, 7, 30), "origen": "inferida_julio_agosto"}],
    "Cartón sin nombre (4 montos)",
    "zip2/18.09.47.jpeg",
    {"limite_origen": "inferida_fin_de_mes"},
)

c2 = add_cliente("Cliente cartón 2", 902, date(2026, 4, 22), "Cartón dos columnas")
add_credito(
    c2, 902, date(2026, 7, 12), limite(2026, 7, "16"),
    [
        {"monto": 25600, "descripcion": "fiado"},
        {"monto": 18500, "descripcion": "fiado"},
        {"monto": 29300, "descripcion": "fiado"},
        {"monto": 3000, "descripcion": "fiado"},
        {"monto": 14300, "descripcion": "fiado"},
        {"monto": 24700, "descripcion": "fiado"},
        {"monto": 13500, "descripcion": "fiado"},
        {"monto": 26500, "descripcion": "fiado"},
        {"monto": 2000, "descripcion": "fiado"},
        {"monto": 14300, "descripcion": "fiado"},
        {"monto": 19800, "descripcion": "fiado"},
        {"monto": 28500, "descripcion": "fiado"},
    ],
    [{"monto": 220000, "fecha": date(2026, 7, 15), "origen": "inferida_julio_agosto"}],
    "Cartón 2 columna izquierda julio",
    "zip2/18.09.47 (1).jpeg",
    {"limite_origen": "inferida_16_del_mes"},
)
add_credito(
    c2, 902, date(2026, 8, 6), limite(2026, 8, "fin"),
    [
        {"monto": 12900, "descripcion": "fiado"},
        {"monto": 22000, "descripcion": "fiado"},
        {"monto": 3900, "descripcion": "fiado"},
        {"monto": 15300, "descripcion": "fiado"},
        {"monto": 4100, "descripcion": "fiado"},
        {"monto": 1800, "descripcion": "fiado"},
        {"monto": 23200, "descripcion": "fiado"},
        {"monto": 3100, "descripcion": "fiado"},
        {"monto": 4100, "descripcion": "fiado"},
        {"monto": 26100, "descripcion": "fiado"},
    ],
    [],
    "Cartón 2 columna derecha agosto",
    "zip2/18.09.47 (1).jpeg",
    {"limite_origen": "inferida_fin_de_mes"},
)

c3 = add_cliente("Cliente cartón 3", 902, date(2026, 2, 18), "Cartón denso, abono 10.000")
izq = [7700, 13000, 20000, 6200, 2300, 26900, 19000, 17600, 2300, 10000, 23000, 700, 5000, 18500, 19500]
der = [10000, 28000, 15700, 4700, 27200, 20900, 26300, 1000, 8300, 29300, 89000, 21000, 5500, 11000]
add_credito(
    c3, 902, date(2026, 7, 4), limite(2026, 7, "fin"),
    [{"monto": m, "descripcion": "fiado"} for m in izq],
    [{"monto": 10000, "fecha": date(2026, 7, 18), "origen": "cuaderno_=10000"},
     {"monto": 182000, "fecha": date(2026, 7, 25), "origen": "inferida_julio_agosto"}],
    "Cartón 3 julio",
    "zip2/18.09.48 (1).jpeg",
    {"limite_origen": "inferida_fin_de_mes", "pago_en_foto": True},
)
add_credito(
    c3, 902, date(2026, 8, 3), limite(2026, 8, "16"),
    [{"monto": m, "descripcion": "fiado"} for m in der],
    [],
    "Cartón 3 agosto (incluye 89.600 en rojo)",
    "zip2/18.09.48 (1).jpeg",
    {"limite_origen": "inferida_16_del_mes"},
)

c4 = add_cliente("Cliente cartón 4", 902, date(2026, 5, 2))
add_credito(
    c4, 902, date(2026, 8, 8), limite(2026, 8, "fin"),
    [
        {"monto": 300000, "descripcion": "fiado"},
        {"monto": 94000, "descripcion": "fiado"},
        {"monto": 26600, "descripcion": "fiado"},
        {"monto": 26900, "descripcion": "fiado"},
        {"monto": 35300, "descripcion": "fiado"},
        {"monto": 20000, "descripcion": "fiado"},
        {"monto": 68600, "descripcion": "fiado"},
        {"monto": 58400, "descripcion": "fiado"},
        {"monto": 51600, "descripcion": "fiado"},
    ],
    [{"monto": 400000, "fecha": date(2026, 8, 20), "origen": "inferida_julio_agosto"}],
    "Cartón 4 (montos altos)",
    "zip2/18.09.48 (2).jpeg",
    {"limite_origen": "inferida_fin_de_mes"},
)

# ═══════════════════════════════════════════════════════════════════════════
# TIENDA 3 — cuaderno espiral
# ═══════════════════════════════════════════════════════════════════════════

def simple_account(nombre, created, fecha, mode, items, abonos, fuente, desc, tid=903):
    cid = add_cliente(nombre, tid, created)
    add_credito(cid, tid, fecha, limite(fecha.year, fecha.month, mode), items, abonos, desc, fuente, {
        "limite_origen": "inferida_16_del_mes" if mode == "16" else "inferida_fin_de_mes",
        "pago_en_foto": any(a.get("origen", "").startswith("cuaderno") for a in abonos),
    })
    return cid

simple_account("Dimax", date(2026, 6, 1), date(2026, 7, 10), "16",
               [{"monto": 55000, "descripcion": "saldo anotado"}],
               [{"monto": 55000, "fecha": date(2026, 7, 16), "origen": "inferida_julio_agosto"}],
               "zip3/18.09.28.jpeg", "Dimax = 55.000")

simple_account("Alexis", date(2025, 9, 15), date(2026, 7, 10), "fin",
               [{"monto": 300000, "descripcion": "saldo anotado"}],
               [],
               "zip3/18.09.28.jpeg", "Alexis = 300.000")

isaias_items = [
    8000, 2900, 3000, 1800, 2800, 2000, 2000, 3000, 11500, 4300,
    2500, 3000, 2200, 4500, 1500, 2500, 2000, 1500, 2500, 1000, 700, 800,
]
simple_account("Isaias", date(2026, 3, 11), date(2026, 8, 5), "16",
               [{"monto": m, "descripcion": "fiado"} for m in isaias_items],
               [{"monto": 66000, "fecha": date(2026, 8, 14), "origen": "inferida_julio_agosto"}],
               "zip3/18.09.28.jpeg", "Isaias suma de cargos")

licho = [4000, 5000, 6000, 4500, 1500, 3500, 4200, 3000, 2800, 3500, 3500, 7100]
simple_account("Licho", date(2026, 4, 4), date(2026, 8, 6), "fin",
               [{"monto": m, "descripcion": "fiado"} for m in licho],
               [],
               "zip3/18.09.28.jpeg", "Licho suma de cargos")

simple_account("Beto", date(2026, 7, 1), date(2026, 8, 9), "16",
               [{"monto": 44600, "descripcion": "saldo anotado"}],
               [{"monto": 44600, "fecha": date(2026, 8, 15), "origen": "inferida_julio_agosto"}],
               "zip3/18.09.28.jpeg", "Beto = 44.600")

chavela = [68800, 2500, 7500, 2500, 5000, 2500, 5000, 5000]
simple_account("Chavela", date(2025, 12, 20), date(2026, 7, 20), "fin",
               [{"monto": m, "descripcion": "fiado"} for m in chavela],
               [{"monto": 50000, "fecha": date(2026, 8, 8), "origen": "cuaderno_abono_50000"}],
               "zip3/18.09.28.jpeg", "Chavela 98.800 - abono 50.000 = 48.800")

simple_account("Carolay", date(2026, 2, 9), date(2026, 8, 2), "16",
               [{"monto": 123000, "descripcion": "saldo anotado"}],
               [],
               "zip3/18.09.28.jpeg", "Carolay = 123.000")

simple_account("Cachaca", date(2026, 5, 30), date(2026, 8, 11), "fin",
               [{"monto": 20000, "descripcion": "fiado"}, {"monto": 10000, "descripcion": "fiado"}],
               [],
               "zip3/18.09.28.jpeg", "Cachaca saldo vigente 20.000+10.000 (tachado previo)")

simple_account("Daniel", date(2026, 1, 5), date(2026, 7, 22), "16",
               [{"monto": 183700, "descripcion": "saldo anotado"}],
               [{"monto": 183700, "fecha": date(2026, 8, 1), "origen": "inferida_julio_agosto"}],
               "zip3/18.09.28.jpeg", "Daniel = 183.700")

fabian_items = [349300, 14800, 2000, 7000, 3500, 3500, 4500, 3500, 7000, 7000, 15700, 3000]
simple_account("Fabian", date(2025, 8, 1), date(2026, 7, 6), "fin",
               [
                   {"monto": 349300, "descripcion": "saldo arrastre"},
                   {"monto": 14800, "descripcion": "fiado"},
                   {"monto": 2000, "descripcion": "fiado"},
                   {"monto": 7000, "descripcion": "coca cola"},
                   {"monto": 3500, "descripcion": "coca cola"},
                   {"monto": 3500, "descripcion": "coca cola"},
                   {"monto": 4500, "descripcion": "trululu"},
                   {"monto": 3500, "descripcion": "coca cola"},
                   {"monto": 7000, "descripcion": "fiado"},
                   {"monto": 7000, "descripcion": "fiado"},
                   {"monto": 15700, "descripcion": "fiado"},
                   {"monto": 3000, "descripcion": "agua"},
               ],
               [],
               "zip3/18.09.28 (1).jpeg", "Fabian cuenta larga")

simple_account("Compa", date(2026, 6, 15), date(2026, 8, 4), "16",
               [{"monto": 151800, "descripcion": "saldo"}, {"monto": 5000, "descripcion": "fiado"}],
               [{"monto": 80000, "fecha": date(2026, 8, 16), "origen": "inferida_julio_agosto"}],
               "zip3/18.09.28 (2).jpeg", "Compa")

viv_l = [20000, 5600, 5000, 4500, 3700, 3600, 1600, 4000, 4000, 3000, 5700, 7500, 2100, 4000, 3000, 3000, 2000, 10000, 2000, 7200, 3000, 2000, 7700, 4700, 2800, 1900, 5000, 9000]
viv_r = [2000, 2000, 1800, 4500, 6800, 4700, 7500, 1800, 8500, 5000, 3400, 4000, 7200, 11000, 3000, 5500, 4600, 16000, 5000, 5000, 4000, 8000, 5600, 2400]
vid = add_cliente("Viviana", 903, date(2025, 11, 28), "Muchas líneas, algunas en rojo")
add_credito(vid, 903, date(2026, 7, 2), limite(2026, 7, "16"),
            [{"monto": m, "descripcion": "fiado"} for m in viv_l],
            [{"monto": sum(viv_l), "fecha": date(2026, 7, 14), "origen": "inferida_julio_agosto"}],
            "Viviana julio", "zip3/18.09.29.jpeg", {"limite_origen": "inferida_16_del_mes"})
add_credito(vid, 903, date(2026, 8, 5), limite(2026, 8, "fin"),
            [{"monto": m, "descripcion": "chocolatina" if i == 0 else "fiado"} for i, m in enumerate(viv_r)],
            [],
            "Viviana agosto", "zip3/18.09.29.jpeg", {"limite_origen": "inferida_fin_de_mes"})

cerdo_old = [20600, 30400, 20000, 12000, 5400, 36700, 14300, 35800, 14500, 8400, 18400, 35500, 14700, 5800, 2600, 20500]
cerdo_new = [55500, 21000, 19000, 19000, 17100, 33000, 13200]
cid_cerdo = add_cliente("Cerdo", 903, date(2026, 1, 18), "Muchos tachados (ciclos pagados) + saldo rojo")
add_credito(cid_cerdo, 903, date(2026, 7, 7), limite(2026, 7, "fin"),
            [{"monto": m, "descripcion": "fiado (tachado/pagado)"} for m in cerdo_old],
            [{"monto": sum(cerdo_old), "fecha": date(2026, 7, 28), "origen": "tachado_en_cuaderno"}],
            "Cerdo ciclos tachados julio", "zip3/18.09.29 (1).jpeg",
            {"limite_origen": "inferida_fin_de_mes", "pago_en_foto": True})
add_credito(cid_cerdo, 903, date(2026, 8, 12), limite(2026, 8, "16"),
            [{"monto": m, "descripcion": "fiado"} for m in cerdo_new],
            [],
            "Cerdo saldo vigente (rojo/azul reciente)", "zip3/18.09.29 (1).jpeg",
            {"limite_origen": "inferida_16_del_mes"})

flaca_items = [200000, 6000, 6000, 1500, 2000, 4800, 9500, 4500, 1400, 3400, 19700, 10400, 7100, 25000, 12300, 14800, 14600, 15000, 8000, 10000, 23900, 8000, 19800, 4100, 12500, 18600, 17500]
cid_fl = add_cliente("Flaca zapateria", 903, date(2025, 10, 5), "Abono 50.000 anotado")
add_credito(cid_fl, 903, date(2026, 7, 9), limite(2026, 7, "16"),
            [{"monto": m, "descripcion": "coca cola" if m == 6000 else "fiado"} for m in flaca_items],
            [{"monto": 50000, "fecha": date(2026, 8, 10), "origen": "cuaderno_abono_50000"},
             {"monto": 14500, "fecha": date(2026, 8, 18), "origen": "rojo_posible_abono"},
             {"monto": 30000, "fecha": date(2026, 8, 22), "origen": "rojo_posible_abono"}],
            "Flaca 2a patería", "zip3/18.09.29 (2).jpeg",
            {"limite_origen": "inferida_16_del_mes", "pago_en_foto": True})

jose = [2000, 20000, 6000, 20000, 150000, 6000, 5000, 30000, 40000, 22500, 52400, 10000, 30000, 6000, 10000, 60000, 10000, 25000, 4000, 20000, 20000, 300, 40000, 6000, 2000, 30000]
efrain = [30000, 16000, 5000, 8800, 1600, 5000]
cid_j = add_cliente("Jose", 903, date(2025, 9, 20))
add_credito(cid_j, 903, date(2026, 7, 3), limite(2026, 7, "fin"),
            [{"monto": m, "descripcion": "nari" if m in (20000,) else "fiado"} for m in jose],
            [{"monto": 200000, "fecha": date(2026, 7, 16), "origen": "inferida_julio_agosto"}],
            "Jose", "zip3/18.09.30.jpeg", {"limite_origen": "inferida_fin_de_mes"})
cid_ef = add_cliente("Efrain", 903, date(2026, 6, 8), "Abonos/saldos tachados")
add_credito(cid_ef, 903, date(2026, 8, 1), limite(2026, 8, "16"),
            [{"monto": m, "descripcion": "fiado"} for m in efrain],
            [{"monto": 4500, "fecha": date(2026, 8, 9), "origen": "cuaderno_abono_sando"}],
            "Efrain", "zip3/18.09.30.jpeg", {"limite_origen": "inferida_16_del_mes", "pago_en_foto": True})

lenis_l = [15200, 25600, 11800, 17400, 14100, 15100, 97200, 16300, 8500, 14600, 25400, 65300, 8500, 18500, 12200, 15400, 16300, 15500, 84600]
lenis_r = [37000, 14600, 2400, 6200, 65400, 26700, 16300, 8600, 19200, 23000, 17700, 10700, 9500]
cid_le = add_cliente("Lenis", 903, date(2025, 11, 2), "Varios subtotales tachados")
add_credito(cid_le, 903, date(2026, 7, 5), limite(2026, 7, "16"),
            [{"monto": m, "descripcion": "fiado"} for m in lenis_l],
            [{"monto": sum(lenis_l), "fecha": date(2026, 7, 15), "origen": "tachado_en_cuaderno"}],
            "Lenis julio (subtotales tachados)", "zip3/18.09.30 (1).jpeg",
            {"limite_origen": "inferida_16_del_mes", "pago_en_foto": True})
add_credito(cid_le, 903, date(2026, 8, 7), limite(2026, 8, "fin"),
            [{"monto": m, "descripcion": "fiado"} for m in lenis_r],
            [],
            "Lenis agosto", "zip3/18.09.30 (1).jpeg", {"limite_origen": "inferida_fin_de_mes"})

eileen = [6500, 40300, 29500, 21000, 22800, 25500]
simple_account("Eileen Monaco", date(2026, 4, 17), date(2026, 8, 13), "16",
               [{"monto": m, "descripcion": "fiado"} for m in eileen],
               [{"monto": 65000, "fecha": date(2026, 8, 16), "origen": "inferida_julio_agosto"}],
               "zip3/18.09.30 (2).jpeg", "Eileen Monaco (tachados previos omitidos)")

neque = [19700, 14700, 2000, 2400, 3000, 4400, 11000, 2000, 2000, 1600, 14500, 6200, 6800, 3500, 7100, 5800, 4000, 3500, 1000, 2000, 6000, 7800, 5000, 2000, 3400, 2800, 1400, 7100]
# too many columns - keep representative first column + noted totals 143700, 74600
simple_account("Neque", date(2025, 7, 20), date(2026, 7, 1), "fin",
               [{"monto": 143700, "descripcion": "subtotal anotado"}, {"monto": 74600, "descripcion": "subtotal anotado"}],
               [{"monto": 143700, "fecha": date(2026, 7, 16), "origen": "inferida_julio_agosto"}],
               "zip3/18.09.30 (3).jpeg", "Neque (cuenta densa; se usan subtotales del cuaderno)")

kelly = [229900, 21600, 29000, 45000, 5000, 12500, 22200, 7500, 1500]
simple_account("Kelly", date(2026, 3, 3), date(2026, 8, 3), "16",
               [
                   {"monto": 229900, "descripcion": "saldo arrastre"},
                   {"monto": 21600, "descripcion": "fiado"},
                   {"monto": 29000, "descripcion": "cafe"},
                   {"monto": 45000, "descripcion": "arroz"},
                   {"monto": 5000, "descripcion": "fiado"},
                   {"monto": 12500, "descripcion": "fiado"},
                   {"monto": 22200, "descripcion": "fiado"},
                   {"monto": 7500, "descripcion": "fiado"},
                   {"monto": 1500, "descripcion": "fiado"},
               ],
               [],
               "zip3/18.09.30 (4).jpeg", "Kelly")

delio = [15000, 4800, 4000]
simple_account("Delio", date(2026, 7, 12), date(2026, 8, 14), "fin",
               [{"monto": m, "descripcion": "fiado"} for m in delio],
               [{"monto": 23800, "fecha": date(2026, 8, 25), "origen": "inferida_julio_agosto"}],
               "zip3/18.09.30 (4).jpeg", "Delio (margen de página Kelly)")

susana_l = [27800, 19000, 17000, 13000, 10300, 5700, 14800, 12000, 14000, 14000, 3800, 2600, 34700, 17000, 12700, 4000, 39700, 5400, 25400, 24200, 13300, 1800, 10000, 3500, 3500, 9000, 18500, 4500]
susana_m = [10300, 9000, 14600, 15500, 8000, 6000, 30800, 2600, 22900, 51900, 5100, 6000, 14700, 13900, 10000, 2700, 2500, 7400, 15000, 21800, 5600, 2000, 10000]
parra = [1000, 2500, 1000, 500, 2500, 15000, 8200]
sid = add_cliente("Susana", 903, date(2025, 8, 14))
add_credito(sid, 903, date(2026, 7, 8), limite(2026, 7, "16"),
            [{"monto": m, "descripcion": "fiado"} for m in susana_l],
            [{"monto": sum(susana_l), "fecha": date(2026, 7, 16), "origen": "inferida_julio_agosto"}],
            "Susana julio", "zip3/18.09.30 (5).jpeg", {"limite_origen": "inferida_16_del_mes"})
add_credito(sid, 903, date(2026, 8, 2), limite(2026, 8, "fin"),
            [{"monto": m, "descripcion": "fiado"} for m in susana_m],
            [{"monto": 50000, "fecha": date(2026, 8, 20), "origen": "inferida_julio_agosto"}],
            "Susana agosto", "zip3/18.09.30 (5).jpeg", {"limite_origen": "inferida_fin_de_mes"})
simple_account("Parra", date(2026, 6, 20), date(2026, 8, 9), "16",
               [{"monto": m, "descripcion": "fiado"} for m in parra],
               [{"monto": sum(parra), "fecha": date(2026, 8, 16), "origen": "inferida_julio_agosto"}],
               "zip3/18.09.30 (5).jpeg", "Parra (columna derecha de Susana)")

negro = [250000, 3500, 21900, 17100, 16100, 3400, 18000, 17100]
simple_account("Negro", date(2026, 2, 28), date(2026, 8, 6), "fin",
               [{"monto": m, "descripcion": "fiado"} for m in negro],
               [],
               "zip3/18.09.31.jpeg", "Negro")

constanza = [63700, 4700, 500, 6500, 2000, 400, 7500, 6500, 2000, 2500]
simple_account("Constanza", date(2026, 5, 11), date(2026, 8, 15), "16",
               [{"monto": m, "descripcion": "fiado"} for m in constanza],
               [{"monto": 40000, "fecha": date(2026, 8, 16), "origen": "inferida_julio_agosto"}],
               "zip3/18.09.31 (1).jpeg", "Constanza")

rubi = [2500, 1000, 5000, 5500, 3500, 2000, 12000, 2000, 3500, 7900, 6000, 3800, 8000, 4700, 5900, 2500, 6100, 3500]
simple_account("Rubi", date(2026, 7, 5), date(2026, 8, 18), "fin",
               [{"monto": m, "descripcion": "fiado"} for m in rubi],
               [],
               "zip3/18.09.31 (2).jpeg", "Rubí (tinta roja, cuenta reciente)")

doc = {
    "meta": {
        "generado": "2026-09-21",
        "referencia_hoy": "2026-09-21",
        "fuentes": [t["fuente"] for t in tenderos],
        "esquema_fiadocheck": {
            "creditos": [
                "id_credito", "id_cliente", "id_tendero", "monto_total",
                "saldo_pendiente", "descripcion", "fecha_credito",
                "fecha_limite_pago", "estado", "created_at",
            ],
            "abonos": ["id_abono", "id_credito", "id_cliente", "monto", "fecha_abono", "created_at"],
            "clientes": ["id_cliente", "nombre_completo", "telefono", "direccion", "estado", "created_at"],
            "estados_bd": ["vigente", "pagado", "vencido"],
            "nota_atrasado": (
                "En FiadoCheck no existe estado 'atrasado'. "
                "estado_negocio=atrasado se mapea a estado='vigente' con fecha_limite_pago ya vencida "
                "y menos de 30 días (vencido si supera 30 días)."
            ),
        },
        "reglas_inferencia": {
            "fecha_limite_pago": "Si no aparece: día 16 o último día del mes del crédito (se alterna por cuenta).",
            "fecha_pago": "Si no aparece y el crédito se considera saldado: fecha entre julio y agosto 2026.",
            "antiguedad": "Si no aparece: meses entre created_at inferido (por volumen de fiado) y 2026-09-21.",
            "agrupacion": "Una fila de creditos por ciclo (mes) del cliente, no una fila por cada renglón del cuaderno. Los renglones van en line_items.",
        },
    },
    "tenderos": tenderos,
    "clientes": clientes_src,
    "creditos": creditos_src,
    "abonos": abonos_src,
    "resumen": {
        "clientes": len(clientes_src),
        "creditos": len(creditos_src),
        "abonos": len(abonos_src),
        "por_estado_negocio": {},
        "por_estado_bd": {},
        "monto_total_creditos": sum(c["monto_total"] for c in creditos_src),
        "saldo_pendiente_total": sum(c["saldo_pendiente"] for c in creditos_src),
    },
}

from collections import Counter
doc["resumen"]["por_estado_negocio"] = dict(Counter(c["estado_negocio"] for c in creditos_src))
doc["resumen"]["por_estado_bd"] = dict(Counter(c["estado"] for c in creditos_src))

out = Path(__file__).with_name("fiados_reales.json")
out.write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Wrote {out} creditos={len(creditos_src)} clientes={len(clientes_src)} abonos={len(abonos_src)}")
print(doc["resumen"])
