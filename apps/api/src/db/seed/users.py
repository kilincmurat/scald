"""
Seed: Organizations + Users.

Her ülke için 1 bölgesel kurum, her belediye için 1 yerel kurum.
Roller: 1 admin (platform), 1 analyst per country, 1 viewer per municipality.
Şifreler: tüm test kullanıcıları için "Scald2024!" (bcrypt hash).
"""
import asyncio

from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.municipality import Municipality
from src.db.models.user import Organization, User
from src.db.models.enums import UserRole
from src.db.session import AsyncSessionLocal

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
_HASHED_PW = pwd_ctx.hash("Scald2024!")

# ── Organizations ─────────────────────────────────────────────────────────────
NATIONAL_ORGS = [
    {
        "municipality_code": None,
        "org_type": "national_agency",
        "contact_email": "platform@scald.eu",
        "name": {"tr": "SCALD Platform Yönetimi", "en": "SCALD Platform Administration",
                 "el": "Διαχείριση Πλατφόρμας SCALD", "ro": "Administrația Platformei SCALD",
                 "mk": "Администрација на SCALD Платформа"},
    },
    {
        "municipality_code": None,
        "org_type": "national_agency",
        "contact_email": "analytics@tr.scald.eu",
        "name": {"tr": "Türkiye Belediyeler Birliği", "en": "Union of Turkish Municipalities",
                 "el": "Ένωση Τουρκικών Δήμων", "ro": "Uniunea Municipalităților Turce",
                 "mk": "Сојуз на Турски Општини"},
    },
    {
        "municipality_code": None,
        "org_type": "national_agency",
        "contact_email": "analytics@gr.scald.eu",
        "name": {"tr": "Yunanistan Merkezi Birliği", "en": "Central Union of Municipalities of Greece",
                 "el": "Κεντρική Ένωση Δήμων Ελλάδος", "ro": "Uniunea Centrală a Municipalităților Grecești",
                 "mk": "Централна Унија на Општини на Грција"},
    },
    {
        "municipality_code": None,
        "org_type": "national_agency",
        "contact_email": "analytics@ro.scald.eu",
        "name": {"tr": "Romanya Belediyeler Derneği", "en": "Association of Romanian Municipalities",
                 "el": "Σύνδεσμος Ρουμανικών Δήμων", "ro": "Asociația Municipalităților din România",
                 "mk": "Здружение на Романски Општини"},
    },
    {
        "municipality_code": None,
        "org_type": "national_agency",
        "contact_email": "analytics@mk.scald.eu",
        "name": {"tr": "Kuzey Makedonya Belediyeler Birliği", "en": "Association of Municipalities of North Macedonia",
                 "el": "Σύνδεσμος Δήμων Βόρειας Μακεδονίας", "ro": "Asociația Municipalităților din Macedonia de Nord",
                 "mk": "Здружение на Општини на Северна Македонија"},
    },
]

# (municipality_code, org_name_en, contact_email)
LOCAL_ORGS = [
    ("TR-ANK", "Ankara Metropolitan Municipality", "data@ankara.bel.tr"),
    ("TR-IZM", "İzmir Metropolitan Municipality", "data@izmir.bel.tr"),
    ("TR-BUR", "Bursa Metropolitan Municipality", "data@bursa.bel.tr"),
    ("TR-GAZ", "Gaziantep Metropolitan Municipality", "data@gaziantep.bel.tr"),
    ("GR-ATH", "City of Athens", "data@cityofathens.gr"),
    ("GR-THE", "Municipality of Thessaloniki", "data@thessaloniki.gr"),
    ("GR-PAT", "Municipality of Patras", "data@patras.gr"),
    ("GR-HER", "Municipality of Heraklion", "data@heraklion.gr"),
    ("RO-BUC", "General Council of Bucharest", "data@pmb.ro"),
    ("RO-CLJ", "Cluj-Napoca City Hall", "data@cluj.ro"),
    ("RO-TIM", "Timișoara City Hall", "data@primariatm.ro"),
    ("RO-IAS", "Iași City Hall", "data@primaria-iasi.ro"),
    ("MK-SKO", "City of Skopje", "data@skopje.gov.mk"),
    ("MK-BIT", "Municipality of Bitola", "data@bitola.gov.mk"),
    ("MK-OHR", "Municipality of Ohrid", "data@ohrid.gov.mk"),
    ("MK-STI", "Municipality of Štip", "data@stip.gov.mk"),
    ("AL-TIR", "Municipality of Tirana", "data@bashkiatirana.gov.al"),
    ("AL-DUR", "Municipality of Durrës", "data@bashkiadurres.gov.al"),
    ("BG-SOF", "Sofia Municipality", "data@sofia.bg"),
    ("BG-PLO", "Municipality of Plovdiv", "data@plovdiv.bg"),
]

# (email, full_name, role, org_index_hint)
USERS = [
    # Platform admin
    ("admin@scald.eu", "Platform Admin", UserRole.ADMIN, "platform"),
    # Country analysts (one per national org)
    ("analyst.tr@scald.eu", "Ayşe Kaya", UserRole.ANALYST, "TR"),
    ("analyst.gr@scald.eu", "Νίκος Παπαδόπουλος", UserRole.ANALYST, "GR"),
    ("analyst.ro@scald.eu", "Ion Popescu", UserRole.ANALYST, "RO"),
    ("analyst.mk@scald.eu", "Марија Петровска", UserRole.ANALYST, "MK"),
    # Municipal data officers (viewer role, one per municipality)
    ("data@ankara.bel.tr", "Mehmet Yılmaz", UserRole.VIEWER, "TR-ANK"),
    ("data@izmir.bel.tr", "Fatma Demir", UserRole.VIEWER, "TR-IZM"),
    ("data@bursa.bel.tr", "Ali Çelik", UserRole.VIEWER, "TR-BUR"),
    ("data@gaziantep.bel.tr", "Zeynep Arslan", UserRole.VIEWER, "TR-GAZ"),
    ("data@cityofathens.gr", "Ελένη Γεωργίου", UserRole.VIEWER, "GR-ATH"),
    ("data@thessaloniki.gr", "Δημήτρης Αλεξίου", UserRole.VIEWER, "GR-THE"),
    ("data@patras.gr", "Σοφία Νικολάου", UserRole.VIEWER, "GR-PAT"),
    ("data@heraklion.gr", "Γιάννης Σταυρακάκης", UserRole.VIEWER, "GR-HER"),
    ("data@pmb.ro", "Maria Constantin", UserRole.VIEWER, "RO-BUC"),
    ("data@cluj.ro", "Alexandru Ionescu", UserRole.VIEWER, "RO-CLJ"),
    ("data@primariatm.ro", "Elena Popa", UserRole.VIEWER, "RO-TIM"),
    ("data@primaria-iasi.ro", "Gheorghe Dumitrescu", UserRole.VIEWER, "RO-IAS"),
    ("data@skopje.gov.mk", "Александар Ристовски", UserRole.VIEWER, "MK-SKO"),
    ("data@bitola.gov.mk", "Сузана Трајковска", UserRole.VIEWER, "MK-BIT"),
    ("data@ohrid.gov.mk", "Борче Димески", UserRole.VIEWER, "MK-OHR"),
    ("data@stip.gov.mk", "Весна Николовска", UserRole.VIEWER, "MK-STI"),
]

_LOCALE_BY_COUNTRY = {"TR": "tr", "GR": "el", "RO": "ro", "MK": "mk", "AL": "en", "BG": "en"}


async def seed_users(session: AsyncSession) -> tuple[int, int]:
    """Returns (orgs_inserted, users_inserted)."""
    # ── 1. Resolve municipality code → id map ─────────────────────────────
    rows = (await session.execute(select(Municipality.code, Municipality.id))).all()
    code_to_id = {r.code: r.id for r in rows}

    # ── 2. National orgs ──────────────────────────────────────────────────
    org_key_to_id: dict[str, object] = {}
    orgs_inserted = 0

    for org_data in NATIONAL_ORGS:
        email = org_data["contact_email"]
        exists = await session.scalar(
            select(Organization.id).where(Organization.contact_email == email)
        )
        if exists:
            # Resolve key from name
            key = "platform" if "Platform" in str(org_data["name"]["en"]) else email.split("@")[1].split(".")[0].upper()
            org_key_to_id[key] = exists
            continue

        org = Organization(
            name=org_data["name"],
            org_type=org_data["org_type"],
            contact_email=email,
        )
        session.add(org)
        await session.flush()
        key = "platform" if "Platform" in str(org_data["name"]["en"]) else email.split("@")[1].split(".")[0].upper()
        org_key_to_id[key] = org.id
        orgs_inserted += 1

    # ── 3. Local orgs (one per municipality) ─────────────────────────────
    for mun_code, org_name_en, contact_email in LOCAL_ORGS:
        exists = await session.scalar(
            select(Organization.id).where(Organization.contact_email == contact_email)
        )
        if exists:
            org_key_to_id[mun_code] = exists
            continue

        mun_id = code_to_id.get(mun_code)
        country = mun_code[:2]
        org = Organization(
            municipality_id=mun_id,
            name={"tr": org_name_en, "en": org_name_en, "el": org_name_en,
                  "ro": org_name_en, "mk": org_name_en},
            org_type="municipality",
            contact_email=contact_email,
        )
        session.add(org)
        await session.flush()
        org_key_to_id[mun_code] = org.id
        orgs_inserted += 1

    # ── 4. Users ──────────────────────────────────────────────────────────
    users_inserted = 0
    for email, full_name, role, org_hint in USERS:
        exists = await session.scalar(
            select(User.id).where(User.email == email)
        )
        if exists:
            continue

        # Determine org_id
        if org_hint == "platform":
            org_id = org_key_to_id.get("platform")
        elif len(org_hint) == 2:
            # Country analyst → national org
            org_id = org_key_to_id.get(org_hint)
        else:
            # Municipal viewer → local org
            org_id = org_key_to_id.get(org_hint)

        country = org_hint[:2] if len(org_hint) >= 2 else "TR"
        locale = _LOCALE_BY_COUNTRY.get(country, "en")

        user = User(
            organization_id=org_id,
            email=email,
            hashed_password=_HASHED_PW,
            full_name=full_name,
            role=role,
            preferred_locale=locale,
            is_active=True,
        )
        session.add(user)
        users_inserted += 1

    await session.commit()
    return orgs_inserted, users_inserted


async def main() -> None:
    async with AsyncSessionLocal() as session:
        orgs, users = await seed_users(session)
        print(f"Seeded {orgs} organizations, {users} users")


if __name__ == "__main__":
    asyncio.run(main())
