"""
SCALD Indicator Catalog — canonical seed data.

These are the reference slugs for all three layers.
ETL pipelines and Airflow DAGs must reference indicators by slug only.

Usage:
    poetry run python -m src.db.seed.indicators
"""
import asyncio

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import Indicator
from src.db.session import AsyncSessionLocal

# ---------------------------------------------------------------------------
# Catalog definition
# Each entry maps exactly to one row in core.indicators.
# ---------------------------------------------------------------------------

INDICATOR_CATALOG: list[dict] = [
    # ──────────────────────────────────────────────────────────────────────────
    # LAYER 1 — CORE (mandatory)
    # ──────────────────────────────────────────────────────────────────────────

    # Population
    {
        "slug": "population_total",
        "layer": 1, "domain": "population", "is_mandatory": True,
        "unit": "person", "unit_per_area": "person/km2",
        "name": {
            "tr": "Toplam Nüfus", "en": "Total Population",
            "el": "Συνολικός Πληθυσμός", "ro": "Populație Totală",
            "mk": "Вкупно Население",
        },
        "description": {
            "tr": "Belediye sınırları içindeki toplam yerleşik nüfus",
            "en": "Total resident population within municipal boundaries",
            "el": "Συνολικός μόνιμος πληθυσμός εντός ορίων δήμου",
            "ro": "Populația rezidentă totală în limitele municipale",
            "mk": "Вкупно резидентно население во рамките на општинските граници",
        },
        "data_source_hint": "EUROSTAT, national census, municipal registry",
        "sort_order": 10,
    },
    {
        "slug": "population_density",
        "layer": 1, "domain": "population", "is_mandatory": True,
        "unit": "person/km2",
        "name": {
            "tr": "Nüfus Yoğunluğu", "en": "Population Density",
            "el": "Πυκνότητα Πληθυσμού", "ro": "Densitate Populației",
            "mk": "Густина на Население",
        },
        "data_source_hint": "Derived: population_total / area_km2",
        "sort_order": 11,
    },
    {
        "slug": "population_growth_rate",
        "layer": 1, "domain": "population", "is_mandatory": True,
        "unit": "%",
        "name": {
            "tr": "Nüfus Büyüme Oranı", "en": "Population Growth Rate",
            "el": "Ρυθμός Πληθυσμιακής Αύξησης", "ro": "Rata de Creștere a Populației",
            "mk": "Стапка на Пораст на Население",
        },
        "sort_order": 12,
    },

    # Water
    {
        "slug": "water_consumption_total",
        "layer": 1, "domain": "water", "is_mandatory": True,
        "unit": "m3/year", "unit_per_capita": "m3/person/year",
        "name": {
            "tr": "Toplam Su Tüketimi", "en": "Total Water Consumption",
            "el": "Συνολική Κατανάλωση Νερού", "ro": "Consum Total de Apă",
            "mk": "Вкупна Потрошувачка на Вода",
        },
        "data_source_hint": "Water utility annual report",
        "sort_order": 20,
    },
    {
        "slug": "water_loss_rate",
        "layer": 1, "domain": "water", "is_mandatory": True,
        "unit": "%",
        "name": {
            "tr": "Su Kayıp Oranı", "en": "Water Loss Rate (NRW)",
            "el": "Ποσοστό Απωλειών Νερού", "ro": "Rata de Pierderi de Apă",
            "mk": "Стапка на Загуби на Вода",
        },
        "description": {
            "tr": "Dağıtım sistemindeki kayıp su yüzdesi (NRW - Gelir Getirmeyen Su)",
            "en": "Percentage of water lost in distribution system (Non-Revenue Water)",
            "el": "Ποσοστό νερού που χάνεται στο δίκτυο διανομής (Αχρέωτο Νερό)",
            "ro": "Procentul de apă pierdut în sistemul de distribuție",
            "mk": "Процент на вода изгубена во дистрибутивниот систем",
        },
        "sort_order": 21,
    },
    {
        "slug": "wastewater_treatment_rate",
        "layer": 1, "domain": "water", "is_mandatory": True,
        "unit": "%",
        "name": {
            "tr": "Atık Su Arıtma Oranı", "en": "Wastewater Treatment Rate",
            "el": "Ποσοστό Επεξεργασίας Λυμάτων", "ro": "Rata de Tratare a Apelor Uzate",
            "mk": "Стапка на Третман на Отпадни Води",
        },
        "sort_order": 22,
    },

    # Waste
    {
        "slug": "municipal_solid_waste_total",
        "layer": 1, "domain": "waste", "is_mandatory": True,
        "unit": "tonne/year", "unit_per_capita": "kg/person/year",
        "name": {
            "tr": "Toplam Katı Atık", "en": "Municipal Solid Waste Total",
            "el": "Σύνολο Αστικών Στερεών Αποβλήτων", "ro": "Total Deșeuri Solide Municipale",
            "mk": "Вкупен Цврст Комунален Отпад",
        },
        "data_source_hint": "Municipal waste management annual report",
        "sort_order": 30,
    },
    {
        "slug": "recycling_rate",
        "layer": 1, "domain": "waste", "is_mandatory": True,
        "unit": "%",
        "name": {
            "tr": "Geri Dönüşüm Oranı", "en": "Recycling Rate",
            "el": "Ποσοστό Ανακύκλωσης", "ro": "Rata de Reciclare",
            "mk": "Стапка на Рециклирање",
        },
        "sort_order": 31,
    },
    {
        "slug": "landfill_diversion_rate",
        "layer": 1, "domain": "waste", "is_mandatory": True,
        "unit": "%",
        "name": {
            "tr": "Düzenli Depolama Saptırma Oranı", "en": "Landfill Diversion Rate",
            "el": "Ποσοστό Εκτροπής από Χώρους Υγειονομικής Ταφής",
            "ro": "Rata de Deviere de la Depozitare",
            "mk": "Стапка на Отклонување од Депонија",
        },
        "sort_order": 32,
    },

    # Energy
    {
        "slug": "energy_consumption_total",
        "layer": 1, "domain": "energy", "is_mandatory": True,
        "unit": "MWh/year", "unit_per_capita": "kWh/person/year",
        "unit_per_area": "MWh/km2/year",
        "name": {
            "tr": "Toplam Enerji Tüketimi", "en": "Total Energy Consumption",
            "el": "Συνολική Κατανάλωση Ενέργειας", "ro": "Consum Total de Energie",
            "mk": "Вкупна Потрошувачка на Енергија",
        },
        "data_source_hint": "National energy regulator, utility bills",
        "sort_order": 40,
    },
    {
        "slug": "renewable_energy_share",
        "layer": 1, "domain": "energy", "is_mandatory": True,
        "unit": "%",
        "name": {
            "tr": "Yenilenebilir Enerji Payı", "en": "Renewable Energy Share",
            "el": "Μερίδιο Ανανεώσιμης Ενέργειας", "ro": "Cota de Energie Regenerabilă",
            "mk": "Удел на Обновлива Енергија",
        },
        "sort_order": 41,
    },
    {
        "slug": "ghg_emissions_total",
        "layer": 1, "domain": "energy", "is_mandatory": True,
        "unit": "tCO2e/year", "unit_per_capita": "tCO2e/person/year",
        "name": {
            "tr": "Toplam Sera Gazı Emisyonu", "en": "Total GHG Emissions",
            "el": "Συνολικές Εκπομπές Αερίων Θερμοκηπίου", "ro": "Emisii Totale de GES",
            "mk": "Вкупни Емисии на Стакленички Гасови",
        },
        "data_source_hint": "SEAP/SECAP inventories, national GHG registry",
        "sort_order": 42,
    },

    # Transportation
    {
        "slug": "public_transport_ridership",
        "layer": 1, "domain": "transportation", "is_mandatory": True,
        "unit": "trips/year", "unit_per_capita": "trips/person/year",
        "name": {
            "tr": "Toplu Taşıma Yolcu Sayısı", "en": "Public Transport Ridership",
            "el": "Επιβατική Κίνηση Δημόσιας Συγκοινωνίας",
            "ro": "Număr de Pasageri Transport Public",
            "mk": "Број на Патници во Јавен Превоз",
        },
        "sort_order": 50,
    },
    {
        "slug": "cycling_infrastructure_km",
        "layer": 1, "domain": "transportation", "is_mandatory": True,
        "unit": "km", "unit_per_area": "km/km2",
        "name": {
            "tr": "Bisiklet Altyapısı (km)", "en": "Cycling Infrastructure (km)",
            "el": "Ποδηλατοδρόμοι (km)", "ro": "Infrastructură Ciclism (km)",
            "mk": "Велосипедска Инфраструктура (km)",
        },
        "sort_order": 51,
    },
    {
        "slug": "road_accident_rate",
        "layer": 1, "domain": "transportation", "is_mandatory": True,
        "unit": "accidents/100k_persons",
        "name": {
            "tr": "Trafik Kazası Oranı", "en": "Road Accident Rate",
            "el": "Ποσοστό Τροχαίων Ατυχημάτων", "ro": "Rata Accidentelor Rutiere",
            "mk": "Стапка на Сообраќајни Несреќи",
        },
        "sort_order": 52,
    },

    # Green Spaces
    {
        "slug": "green_space_area_total",
        "layer": 1, "domain": "green_spaces", "is_mandatory": True,
        "unit": "hectare", "unit_per_capita": "m2/person",
        "unit_per_area": "% of total area",
        "name": {
            "tr": "Toplam Yeşil Alan", "en": "Total Green Space Area",
            "el": "Συνολική Έκταση Πρασίνου", "ro": "Suprafață Totală Spații Verzi",
            "mk": "Вкупна Површина Зелени Површини",
        },
        "data_source_hint": "Municipal GIS, Copernicus Urban Atlas",
        "sort_order": 60,
    },
    {
        "slug": "green_space_accessibility_pct",
        "layer": 1, "domain": "green_spaces", "is_mandatory": True,
        "unit": "%",
        "name": {
            "tr": "Yeşil Alana Erişim Oranı (300m)", "en": "Green Space Accessibility (300m)",
            "el": "Προσβασιμότητα Πρασίνου (300m)", "ro": "Accesibilitate Spații Verzi (300m)",
            "mk": "Достапност до Зелени Површини (300m)",
        },
        "description": {
            "tr": "300 metre mesafede yeşil alana erişimi olan nüfusun yüzdesi (WHO standardı)",
            "en": "% of population with access to green space within 300m (WHO standard)",
            "el": "% πληθυσμού με πρόσβαση σε πράσινο εντός 300m (πρότυπο ΠΟΥ)",
            "ro": "% populație cu acces la spații verzi în 300m (standard OMS)",
            "mk": "% на население со пристап до зелени површини во рамки на 300m",
        },
        "sort_order": 61,
    },
    {
        "slug": "tree_canopy_coverage_pct",
        "layer": 1, "domain": "green_spaces", "is_mandatory": True,
        "unit": "%",
        "name": {
            "tr": "Ağaç Örtüsü Oranı", "en": "Tree Canopy Coverage",
            "el": "Κάλυψη Δενδροστεγών", "ro": "Acoperire Coroana Copacilor",
            "mk": "Покриеност со Дрвја",
        },
        "sort_order": 62,
    },

    # Climate (API-sourced)
    {
        "slug": "avg_annual_temperature",
        "layer": 1, "domain": "climate", "is_mandatory": True,
        "unit": "°C",
        "name": {
            "tr": "Yıllık Ortalama Sıcaklık", "en": "Annual Average Temperature",
            "el": "Μέση Ετήσια Θερμοκρασία", "ro": "Temperatura Medie Anuală",
            "mk": "Просечна Годишна Температура",
        },
        "data_source_hint": "Open-Meteo API, Copernicus ERA5",
        "sort_order": 70,
    },
    {
        "slug": "annual_precipitation_mm",
        "layer": 1, "domain": "climate", "is_mandatory": True,
        "unit": "mm/year",
        "name": {
            "tr": "Yıllık Toplam Yağış", "en": "Annual Total Precipitation",
            "el": "Συνολικές Ετήσιες Βροχοπτώσεις", "ro": "Precipitații Anuale Totale",
            "mk": "Вкупни Годишни Врнежи",
        },
        "data_source_hint": "Open-Meteo API, Copernicus ERA5",
        "sort_order": 71,
    },
    {
        "slug": "extreme_weather_days",
        "layer": 1, "domain": "climate", "is_mandatory": True,
        "unit": "days/year",
        "name": {
            "tr": "Aşırı Hava Olayı Günleri", "en": "Extreme Weather Days",
            "el": "Ημέρες Ακραίων Καιρικών Φαινομένων",
            "ro": "Zile cu Evenimente Meteorologice Extreme",
            "mk": "Денови со Екстремни Временски Настани",
        },
        "data_source_hint": "Open-Meteo API — days with temp >35°C or precipitation >50mm",
        "sort_order": 72,
    },

    # ──────────────────────────────────────────────────────────────────────────
    # LAYER 2 — EXTENDED (optional)
    # ──────────────────────────────────────────────────────────────────────────

    # Air Quality
    {
        "slug": "pm25_annual_avg",
        "layer": 2, "domain": "air_quality", "is_mandatory": False,
        "unit": "µg/m3",
        "name": {
            "tr": "PM2.5 Yıllık Ortalama", "en": "PM2.5 Annual Average",
            "el": "Ετήσιος Μέσος PM2.5", "ro": "Medie Anuală PM2.5",
            "mk": "Годишен Просек PM2.5",
        },
        "data_source_hint": "EEA Air Quality e-Reporting, local monitoring stations",
        "sort_order": 80,
    },
    {
        "slug": "pm10_annual_avg",
        "layer": 2, "domain": "air_quality", "is_mandatory": False,
        "unit": "µg/m3",
        "name": {
            "tr": "PM10 Yıllık Ortalama", "en": "PM10 Annual Average",
            "el": "Ετήσιος Μέσος PM10", "ro": "Medie Anuală PM10",
            "mk": "Годишен Просек PM10",
        },
        "sort_order": 81,
    },
    {
        "slug": "no2_annual_avg",
        "layer": 2, "domain": "air_quality", "is_mandatory": False,
        "unit": "µg/m3",
        "name": {
            "tr": "NO2 Yıllık Ortalama", "en": "NO2 Annual Average",
            "el": "Ετήσιος Μέσος NO2", "ro": "Medie Anuală NO2",
            "mk": "Годишен Просек NO2",
        },
        "sort_order": 82,
    },
    {
        "slug": "air_quality_exceedance_days",
        "layer": 2, "domain": "air_quality", "is_mandatory": False,
        "unit": "days/year",
        "name": {
            "tr": "Hava Kalitesi Limit Aşım Günleri", "en": "Air Quality Exceedance Days",
            "el": "Ημέρες Υπέρβασης Ορίων Ποιότητας Αέρα",
            "ro": "Zile de Depășire a Limitelor Calității Aerului",
            "mk": "Денови на Надминување на Граничните Вредности на Квалитет на Воздух",
        },
        "sort_order": 83,
    },

    # Flood Risk
    {
        "slug": "flood_risk_area_pct",
        "layer": 2, "domain": "flood_risk", "is_mandatory": False,
        "unit": "%",
        "name": {
            "tr": "Taşkın Risk Alanı Oranı", "en": "Flood Risk Area Percentage",
            "el": "Ποσοστό Περιοχής Κινδύνου Πλημμύρας",
            "ro": "Procentul Zonei cu Risc de Inundații",
            "mk": "Процент на Површина со Ризик од Поплави",
        },
        "data_source_hint": "EU Floods Directive flood hazard maps, national flood authority",
        "sort_order": 90,
    },
    {
        "slug": "flood_affected_population_pct",
        "layer": 2, "domain": "flood_risk", "is_mandatory": False,
        "unit": "%",
        "name": {
            "tr": "Taşkından Etkilenen Nüfus Oranı", "en": "Flood-Affected Population Rate",
            "el": "Ποσοστό Πληθυσμού που Επηρεάζεται από Πλημμύρες",
            "ro": "Rata Populației Afectate de Inundații",
            "mk": "Стапка на Население Погодено од Поплави",
        },
        "sort_order": 91,
    },

    # Sectoral Energy
    {
        "slug": "residential_energy_consumption",
        "layer": 2, "domain": "sectoral_energy", "is_mandatory": False,
        "unit": "MWh/year", "unit_per_capita": "kWh/person/year",
        "name": {
            "tr": "Konutsal Enerji Tüketimi", "en": "Residential Energy Consumption",
            "el": "Οικιακή Κατανάλωση Ενέργειας", "ro": "Consum Rezidențial de Energie",
            "mk": "Резиденцијална Потрошувачка на Енергија",
        },
        "sort_order": 100,
    },
    {
        "slug": "commercial_energy_consumption",
        "layer": 2, "domain": "sectoral_energy", "is_mandatory": False,
        "unit": "MWh/year",
        "name": {
            "tr": "Ticari Enerji Tüketimi", "en": "Commercial Energy Consumption",
            "el": "Εμπορική Κατανάλωση Ενέργειας", "ro": "Consum Comercial de Energie",
            "mk": "Комерцијална Потрошувачка на Енергија",
        },
        "sort_order": 101,
    },
    {
        "slug": "transport_energy_consumption",
        "layer": 2, "domain": "sectoral_energy", "is_mandatory": False,
        "unit": "MWh/year",
        "name": {
            "tr": "Ulaşım Enerji Tüketimi", "en": "Transport Energy Consumption",
            "el": "Κατανάλωση Ενέργειας Μεταφορών", "ro": "Consum de Energie Transport",
            "mk": "Потрошувачка на Енергија за Транспорт",
        },
        "sort_order": 102,
    },
    {
        "slug": "municipal_buildings_energy_intensity",
        "layer": 2, "domain": "sectoral_energy", "is_mandatory": False,
        "unit": "kWh/m2/year",
        "name": {
            "tr": "Belediye Binaları Enerji Yoğunluğu",
            "en": "Municipal Buildings Energy Intensity",
            "el": "Ενεργειακή Ένταση Δημοτικών Κτιρίων",
            "ro": "Intensitatea Energetică a Clădirilor Municipale",
            "mk": "Енергетски Интензитет на Општински Згради",
        },
        "sort_order": 103,
    },

    # Biodiversity
    {
        "slug": "protected_area_pct",
        "layer": 2, "domain": "biodiversity", "is_mandatory": False,
        "unit": "%",
        "name": {
            "tr": "Koruma Altındaki Alan Oranı", "en": "Protected Area Percentage",
            "el": "Ποσοστό Προστατευόμενης Περιοχής", "ro": "Procentul Ariei Protejate",
            "mk": "Процент на Заштитена Површина",
        },
        "data_source_hint": "Natura 2000, national protected area database",
        "sort_order": 110,
    },
    {
        "slug": "species_richness_index",
        "layer": 2, "domain": "biodiversity", "is_mandatory": False,
        "unit": "index",
        "name": {
            "tr": "Tür Zenginliği İndeksi", "en": "Species Richness Index",
            "el": "Δείκτης Πλούτου Ειδών", "ro": "Indicele de Bogăție a Speciilor",
            "mk": "Индекс на Богатство на Видови",
        },
        "sort_order": 111,
    },
    {
        "slug": "invasive_species_count",
        "layer": 2, "domain": "biodiversity", "is_mandatory": False,
        "unit": "species",
        "name": {
            "tr": "İstilacı Tür Sayısı", "en": "Invasive Species Count",
            "el": "Αριθμός Χωροκατακτητικών Ειδών", "ro": "Numărul Speciilor Invazive",
            "mk": "Број на Инвазивни Видови",
        },
        "sort_order": 112,
    },

    # ──────────────────────────────────────────────────────────────────────────
    # LAYER 3 — PILOT (experimental, IoT & survey derived)
    # ──────────────────────────────────────────────────────────────────────────
    {
        "slug": "iot_air_quality_pm25_realtime",
        "layer": 3, "domain": "iot", "is_mandatory": False,
        "unit": "µg/m3",
        "name": {
            "tr": "IoT PM2.5 Gerçek Zamanlı", "en": "IoT PM2.5 Real-Time",
            "el": "IoT PM2.5 Πραγματικού Χρόνου", "ro": "IoT PM2.5 în Timp Real",
            "mk": "IoT PM2.5 во Реално Време",
        },
        "data_source_hint": "IoT sensor network — aggregated from iot.sensor_readings",
        "sort_order": 120,
    },
    {
        "slug": "iot_noise_level_avg",
        "layer": 3, "domain": "iot", "is_mandatory": False,
        "unit": "dB(A)",
        "name": {
            "tr": "IoT Gürültü Seviyesi Ortalaması", "en": "IoT Average Noise Level",
            "el": "IoT Μέσο Επίπεδο Θορύβου", "ro": "IoT Nivel Mediu de Zgomot",
            "mk": "IoT Просечно Ниво на Бучава",
        },
        "sort_order": 121,
    },
    {
        "slug": "citizen_satisfaction_overall",
        "layer": 3, "domain": "survey", "is_mandatory": False,
        "unit": "score (1-5)",
        "name": {
            "tr": "Vatandaş Genel Memnuniyeti", "en": "Citizen Overall Satisfaction",
            "el": "Γενική Ικανοποίηση Πολιτών", "ro": "Satisfacție Generală Cetățeni",
            "mk": "Општо Задоволство на Граѓаните",
        },
        "data_source_hint": "Derived from data.survey_responses aggregations",
        "sort_order": 130,
    },
    {
        "slug": "citizen_satisfaction_water",
        "layer": 3, "domain": "survey", "is_mandatory": False,
        "unit": "score (1-5)",
        "name": {
            "tr": "Su Hizmetleri Memnuniyeti", "en": "Water Services Satisfaction",
            "el": "Ικανοποίηση Υπηρεσιών Ύδρευσης", "ro": "Satisfacție Servicii Apă",
            "mk": "Задоволство со Водни Услуги",
        },
        "sort_order": 131,
    },
    {
        "slug": "citizen_satisfaction_waste",
        "layer": 3, "domain": "survey", "is_mandatory": False,
        "unit": "score (1-5)",
        "name": {
            "tr": "Atık Yönetimi Memnuniyeti", "en": "Waste Management Satisfaction",
            "el": "Ικανοποίηση Διαχείρισης Αποβλήτων", "ro": "Satisfacție Gestionare Deșeuri",
            "mk": "Задоволство со Управување со Отпад",
        },
        "sort_order": 132,
    },
]


async def seed_indicators(session: AsyncSession) -> int:
    """
    Idempotently insert/skip indicators.
    Returns count of newly inserted rows.
    """
    inserted = 0
    for entry in INDICATOR_CATALOG:
        slug = entry["slug"]
        exists = await session.scalar(
            select(Indicator.id).where(Indicator.slug == slug)
        )
        if exists:
            continue

        indicator = Indicator(
            slug=slug,
            name=entry["name"],
            description=entry.get("description"),
            layer=entry["layer"],
            domain=entry["domain"],
            unit=entry["unit"],
            unit_per_capita=entry.get("unit_per_capita"),
            unit_per_area=entry.get("unit_per_area"),
            data_source_hint=entry.get("data_source_hint"),
            is_mandatory=entry.get("is_mandatory", False),
            sort_order=entry.get("sort_order", 0),
        )
        session.add(indicator)
        inserted += 1

    await session.commit()
    return inserted


async def main() -> None:
    async with AsyncSessionLocal() as session:
        count = await seed_indicators(session)
        print(f"Seeded {count} new indicators ({len(INDICATOR_CATALOG)} total in catalog)")


if __name__ == "__main__":
    asyncio.run(main())
