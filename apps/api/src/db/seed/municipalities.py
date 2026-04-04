"""
Seed: Municipalities — 20 gerçekçi Balkan/Akdeniz belediyesi.
5 ülke × 4 belediye: TR, GR, RO, MK + 1 Arnavutluk test verisi.

Koordinatlar WKT formatında — PostGIS ST_GeomFromText ile dönüştürülür.
Nüfus ve alan verileri EUROSTAT / TÜİK referanslıdır.
"""
import asyncio
from dataclasses import dataclass

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.municipality import Municipality
from src.db.session import AsyncSessionLocal


@dataclass
class MunicipalityData:
    code: str
    country_code: str
    name: dict
    region: dict
    population: int
    area_km2: float
    # (lon, lat) centroid — WGS84
    lon: float
    lat: float


MUNICIPALITIES: list[MunicipalityData] = [
    # ── Turkey ──────────────────────────────────────────────────────────────
    MunicipalityData(
        code="TR-ANK", country_code="TR",
        name={"tr": "Ankara", "en": "Ankara", "el": "Άγκυρα", "ro": "Ankara", "mk": "Анкара"},
        region={"tr": "İç Anadolu", "en": "Central Anatolia", "el": "Κεντρική Ανατολία",
                "ro": "Anatolia Centrală", "mk": "Централна Анадолија"},
        population=5747325, area_km2=25706.0, lon=32.8597, lat=39.9334,
    ),
    MunicipalityData(
        code="TR-IZM", country_code="TR",
        name={"tr": "İzmir", "en": "Izmir", "el": "Σμύρνη", "ro": "Izmir", "mk": "Измир"},
        region={"tr": "Ege", "en": "Aegean", "el": "Αιγαίο", "ro": "Egee", "mk": "Егејски"},
        population=4394694, area_km2=11891.0, lon=27.1428, lat=38.4237,
    ),
    MunicipalityData(
        code="TR-BUR", country_code="TR",
        name={"tr": "Bursa", "en": "Bursa", "el": "Προύσα", "ro": "Bursa", "mk": "Бурса"},
        region={"tr": "Marmara", "en": "Marmara", "el": "Μαρμαράς", "ro": "Marmara",
                "mk": "Мармара"},
        population=3194720, area_km2=10804.0, lon=29.0601, lat=40.1828,
    ),
    MunicipalityData(
        code="TR-GAZ", country_code="TR",
        name={"tr": "Gaziantep", "en": "Gaziantep", "el": "Γκαζιάντεπ", "ro": "Gaziantep",
              "mk": "Газиантеп"},
        region={"tr": "Güneydoğu Anadolu", "en": "Southeastern Anatolia",
                "el": "Νοτιοανατολική Ανατολία", "ro": "Anatolia de Sud-Est",
                "mk": "Југоисточна Анадолија"},
        population=2154051, area_km2=6222.0, lon=37.3825, lat=37.0662,
    ),
    # ── Greece ──────────────────────────────────────────────────────────────
    MunicipalityData(
        code="GR-ATH", country_code="GR",
        name={"tr": "Atina", "en": "Athens", "el": "Αθήνα", "ro": "Atena", "mk": "Атина"},
        region={"tr": "Attika", "en": "Attica", "el": "Αττική", "ro": "Attica",
                "mk": "Атика"},
        population=664046, area_km2=38.96, lon=23.7275, lat=37.9838,
    ),
    MunicipalityData(
        code="GR-THE", country_code="GR",
        name={"tr": "Selanik", "en": "Thessaloniki", "el": "Θεσσαλονίκη",
              "ro": "Salonic", "mk": "Солун"},
        region={"tr": "Orta Makedonya", "en": "Central Macedonia",
                "el": "Κεντρική Μακεδονία", "ro": "Macedonia Centrală",
                "mk": "Централна Македонија"},
        population=325182, area_km2=19.88, lon=22.9444, lat=40.6401,
    ),
    MunicipalityData(
        code="GR-PAT", country_code="GR",
        name={"tr": "Patras", "en": "Patras", "el": "Πάτρα", "ro": "Patras", "mk": "Патра"},
        region={"tr": "Batı Yunanistan", "en": "Western Greece", "el": "Δυτική Ελλάδα",
                "ro": "Grecia de Vest", "mk": "Западна Грција"},
        population=170896, area_km2=73.01, lon=21.7346, lat=38.2466,
    ),
    MunicipalityData(
        code="GR-HER", country_code="GR",
        name={"tr": "Girit Heraklion", "en": "Heraklion", "el": "Ηράκλειο",
              "ro": "Heraklion", "mk": "Хераклион"},
        region={"tr": "Girit", "en": "Crete", "el": "Κρήτη", "ro": "Creta", "mk": "Крит"},
        population=173993, area_km2=109.03, lon=25.1442, lat=35.3387,
    ),
    # ── Romania ─────────────────────────────────────────────────────────────
    MunicipalityData(
        code="RO-BUC", country_code="RO",
        name={"tr": "Bükreş", "en": "Bucharest", "el": "Βουκουρέστι", "ro": "București",
              "mk": "Букурешт"},
        region={"tr": "Bükreş-İlfov", "en": "Bucharest-Ilfov",
                "el": "Βουκουρέστι-Ίλφοφ", "ro": "București-Ilfov",
                "mk": "Букурешт-Илфов"},
        population=1820195, area_km2=228.0, lon=26.1025, lat=44.4268,
    ),
    MunicipalityData(
        code="RO-CLJ", country_code="RO",
        name={"tr": "Cluj-Napoca", "en": "Cluj-Napoca", "el": "Κλουζ-Ναπόκα",
              "ro": "Cluj-Napoca", "mk": "Клуж-Напока"},
        region={"tr": "Kuzeybatı", "en": "Northwest", "el": "Βορειοδυτικά",
                "ro": "Nord-Vest", "mk": "Северозапад"},
        population=322108, area_km2=179.5, lon=23.5899, lat=46.7712,
    ),
    MunicipalityData(
        code="RO-TIM", country_code="RO",
        name={"tr": "Timişoara", "en": "Timișoara", "el": "Τιμισοάρα", "ro": "Timișoara",
              "mk": "Тимишоара"},
        region={"tr": "Batı", "en": "West", "el": "Δυτικά", "ro": "Vest", "mk": "Запад"},
        population=319279, area_km2=129.8, lon=21.2087, lat=45.7489,
    ),
    MunicipalityData(
        code="RO-IAS", country_code="RO",
        name={"tr": "Yaş", "en": "Iași", "el": "Ιάσιο", "ro": "Iași", "mk": "Јаши"},
        region={"tr": "Kuzeydoğu", "en": "Northeast", "el": "Βορειοανατολικά",
                "ro": "Nord-Est", "mk": "Североисток"},
        population=290422, area_km2=94.4, lon=27.5849, lat=47.1585,
    ),
    # ── North Macedonia ─────────────────────────────────────────────────────
    MunicipalityData(
        code="MK-SKO", country_code="MK",
        name={"tr": "Üsküp", "en": "Skopje", "el": "Σκόπια", "ro": "Skopje",
              "mk": "Скопје"},
        region={"tr": "Vardar", "en": "Vardar", "el": "Βάρνταρ", "ro": "Vardar",
                "mk": "Вардар"},
        population=544086, area_km2=571.46, lon=21.4316, lat=41.9981,
    ),
    MunicipalityData(
        code="MK-BIT", country_code="MK",
        name={"tr": "Manastır", "en": "Bitola", "el": "Μοναστήρι", "ro": "Bitola",
              "mk": "Битола"},
        region={"tr": "Pelagonia", "en": "Pelagonia", "el": "Πελαγονία",
                "ro": "Pelagonia", "mk": "Пелагонија"},
        population=74550, area_km2=798.0, lon=21.3433, lat=41.0297,
    ),
    MunicipalityData(
        code="MK-OHR", country_code="MK",
        name={"tr": "Ohri", "en": "Ohrid", "el": "Αχρίδα", "ro": "Ohrid", "mk": "Охрид"},
        region={"tr": "Güneybatı", "en": "Southwest", "el": "Νοτιοδυτικά",
                "ro": "Sud-Vest", "mk": "Југозапад"},
        population=42033, area_km2=389.0, lon=20.8016, lat=41.1231,
    ),
    MunicipalityData(
        code="MK-STI", country_code="MK",
        name={"tr": "Ştip", "en": "Štip", "el": "Στίπ", "ro": "Štip", "mk": "Штип"},
        region={"tr": "Doğu", "en": "East", "el": "Ανατολικά", "ro": "Est", "mk": "Исток"},
        population=43652, area_km2=583.0, lon=22.1974, lat=41.7458,
    ),
    # ── Albania (cross-border pilot) ─────────────────────────────────────────
    MunicipalityData(
        code="AL-TIR", country_code="AL",
        name={"tr": "Tiran", "en": "Tirana", "el": "Τίρανα", "ro": "Tirana", "mk": "Тирана"},
        region={"tr": "Tiran", "en": "Tirana County", "el": "Νομός Τιράνων",
                "ro": "Județul Tirana", "mk": "Округ Тирана"},
        population=910210, area_km2=41.8, lon=19.8189, lat=41.3275,
    ),
    MunicipalityData(
        code="AL-DUR", country_code="AL",
        name={"tr": "Dıraç", "en": "Durrës", "el": "Δυρράχιο", "ro": "Durrës",
              "mk": "Драч"},
        region={"tr": "Dıraç", "en": "Durrës County", "el": "Νομός Δυρραχίου",
                "ro": "Județul Durrës", "mk": "Округ Драч"},
        population=201335, area_km2=339.0, lon=19.4436, lat=41.3233,
    ),
    # ── Bulgaria (extended pilot) ─────────────────────────────────────────────
    MunicipalityData(
        code="BG-SOF", country_code="BG",
        name={"tr": "Sofya", "en": "Sofia", "el": "Σόφια", "ro": "Sofia", "mk": "Софија"},
        region={"tr": "Sofya İl", "en": "Sofia City", "el": "Σόφια Πόλη",
                "ro": "Sofia Oraș", "mk": "Град Софија"},
        population=1307439, area_km2=492.3, lon=23.3219, lat=42.6977,
    ),
    MunicipalityData(
        code="BG-PLO", country_code="BG",
        name={"tr": "Filibe", "en": "Plovdiv", "el": "Φιλιππούπολη", "ro": "Plovdiv",
              "mk": "Пловдив"},
        region={"tr": "Plovdiv İl", "en": "Plovdiv Oblast", "el": "Επαρχία Φιλιππούπολης",
                "ro": "Oblast Plovdiv", "mk": "Пловдивска Област"},
        population=346893, area_km2=101.9, lon=24.7489, lat=42.1354,
    ),
]


async def seed_municipalities(session: AsyncSession) -> int:
    inserted = 0
    for m in MUNICIPALITIES:
        exists = await session.scalar(
            select(Municipality.id).where(Municipality.code == m.code)
        )
        if exists:
            continue

        # Build approximate bounding box polygon around centroid (±0.3°)
        d = 0.3
        lon, lat = m.lon, m.lat
        wkt = (
            f"MULTIPOLYGON((("
            f"{lon-d} {lat-d}, {lon+d} {lat-d}, "
            f"{lon+d} {lat+d}, {lon-d} {lat+d}, "
            f"{lon-d} {lat-d}"
            f")))"
        )
        centroid_wkt = f"POINT({lon} {lat})"

        mun = Municipality(
            code=m.code,
            name=m.name,
            country_code=m.country_code,
            region=m.region,
            population_latest=m.population,
            area_km2=m.area_km2,
        )
        session.add(mun)
        await session.flush()

        # Set geometry via raw SQL (GeoAlchemy2 WKT insert)
        await session.execute(
            text("""
                UPDATE core.municipalities
                SET geometry = ST_GeomFromText(:wkt, 4326),
                    geometry_centroid = ST_GeomFromText(:centroid, 4326)
                WHERE id = :id
            """),
            {"wkt": wkt, "centroid": centroid_wkt, "id": str(mun.id)},
        )
        inserted += 1

    await session.commit()
    return inserted


async def main() -> None:
    async with AsyncSessionLocal() as session:
        count = await seed_municipalities(session)
        print(f"Seeded {count} new municipalities ({len(MUNICIPALITIES)} total)")


if __name__ == "__main__":
    asyncio.run(main())
