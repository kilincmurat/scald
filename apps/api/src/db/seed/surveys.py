"""
Seed: Layer 3 — Anketler + Vatandaş Yanıtları.

Senaryo:
  - 5 pilot belediye × 2 yıl (2023, 2024) × 2 anket türü
  - Her anket için 150–400 gerçekçi yanıt
  - respondent_token: anonim SHA-256 hash (PII yok)
  - Sorular: 5'li Likert ölçeği + açık uçlu + çoktan seçmeli
  - Locale dağılımı: her belediye için yerel dil ağırlıklı
"""
import asyncio
import hashlib
import random
from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models.municipality import Municipality
from src.db.models.survey import Survey, SurveyResponse
from src.db.models.enums import QualityTag
from src.db.session import AsyncSessionLocal

random.seed(77)

PILOT_MUNICIPALITIES = ["TR-ANK", "TR-IZM", "GR-ATH", "RO-BUC", "MK-SKO"]

SURVEY_YEARS = [2023, 2024]

_LOCALE_BY_CODE = {
    "TR-ANK": "tr", "TR-IZM": "tr", "TR-BUR": "tr", "TR-GAZ": "tr",
    "GR-ATH": "el", "GR-THE": "el", "GR-PAT": "el", "GR-HER": "el",
    "RO-BUC": "ro", "RO-CLJ": "ro", "RO-TIM": "ro", "RO-IAS": "ro",
    "MK-SKO": "mk", "MK-BIT": "mk", "MK-OHR": "mk", "MK-STI": "mk",
    "AL-TIR": "en", "AL-DUR": "en", "BG-SOF": "en", "BG-PLO": "en",
}

# ─────────────────────────────────────────────────────────────────────────────
# Anket soruları — her soru için soru_key, locale'e göre etiket, yanıt tipi
# ─────────────────────────────────────────────────────────────────────────────

SATISFACTION_QUESTIONS = [
    {
        "key": "overall_satisfaction",
        "type": "numeric",  # 1-5 Likert
        "label": {
            "tr": "Belediye hizmetlerinden genel memnuniyetiniz nedir? (1=Çok düşük, 5=Çok yüksek)",
            "en": "Overall satisfaction with municipal services? (1=Very low, 5=Very high)",
            "el": "Συνολική ικανοποίηση από τις δημοτικές υπηρεσίες; (1=Πολύ χαμηλή, 5=Πολύ υψηλή)",
            "ro": "Satisfacția generală față de serviciile municipale? (1=Foarte scăzut, 5=Foarte ridicat)",
            "mk": "Општо задоволство со општинските услуги? (1=Многу ниско, 5=Многу високо)",
        },
        "mean": 3.4, "std": 0.9,
    },
    {
        "key": "water_service_satisfaction",
        "type": "numeric",
        "label": {
            "tr": "Su hizmetlerinden memnuniyetiniz? (1-5)",
            "en": "Satisfaction with water services? (1-5)",
            "el": "Ικανοποίηση από υπηρεσίες ύδρευσης; (1-5)",
            "ro": "Satisfacția față de serviciile de apă? (1-5)",
            "mk": "Задоволство со водните услуги? (1-5)",
        },
        "mean": 3.6, "std": 0.85,
    },
    {
        "key": "waste_collection_satisfaction",
        "type": "numeric",
        "label": {
            "tr": "Çöp toplama hizmetinden memnuniyetiniz? (1-5)",
            "en": "Satisfaction with waste collection? (1-5)",
            "el": "Ικανοποίηση από αποκομιδή απορριμμάτων; (1-5)",
            "ro": "Satisfacția față de colectarea deșeurilor? (1-5)",
            "mk": "Задоволство со собирањето отпад? (1-5)",
        },
        "mean": 3.2, "std": 1.0,
    },
    {
        "key": "green_spaces_satisfaction",
        "type": "numeric",
        "label": {
            "tr": "Yeşil alanlar ve parklar hakkında görüşünüz? (1-5)",
            "en": "Opinion on green spaces and parks? (1-5)",
            "el": "Γνώμη για χώρους πρασίνου και πάρκα; (1-5)",
            "ro": "Opinia despre spațiile verzi și parcuri? (1-5)",
            "mk": "Мислење за зелени површини и паркови? (1-5)",
        },
        "mean": 3.0, "std": 1.1,
    },
    {
        "key": "public_transport_satisfaction",
        "type": "numeric",
        "label": {
            "tr": "Toplu taşımadan memnuniyetiniz? (1-5)",
            "en": "Satisfaction with public transport? (1-5)",
            "el": "Ικανοποίηση από δημόσιες συγκοινωνίες; (1-5)",
            "ro": "Satisfacția față de transportul public? (1-5)",
            "mk": "Задоволство со јавниот превоз? (1-5)",
        },
        "mean": 3.3, "std": 1.0,
    },
    {
        "key": "top_priority",
        "type": "choice",
        "label": {
            "tr": "Belediyenin öncelik vermesi gereken alan?",
            "en": "Area where the municipality should prioritize?",
            "el": "Τομέας που πρέπει να προτεραιοποιηθεί;",
            "ro": "Domeniu în care municipalitatea ar trebui să prioritizeze?",
            "mk": "Област во која општината треба да даде приоритет?",
        },
        "choices": ["environment", "transport", "waste", "green_spaces",
                    "water", "energy", "digital_services"],
    },
    {
        "key": "open_comment",
        "type": "text",
        "label": {
            "tr": "Belediye hizmetleri hakkında öneri veya yorumlarınız?",
            "en": "Any suggestions or comments about municipal services?",
            "el": "Προτάσεις ή σχόλια για τις δημοτικές υπηρεσίες;",
            "ro": "Sugestii sau comentarii despre serviciile municipale?",
            "mk": "Предлози или коментари за општинските услуги?",
        },
        "templates": {
            "tr": [
                "Bisiklet yolları daha fazla genişletilmeli.",
                "Geri dönüşüm noktaları yetersiz.",
                "Toplu taşıma saatleri düzenlenmeli.",
                "Parklar daha bakımlı olmalı.",
                "Su basıncı sorunları devam ediyor.",
                "Dijital hizmetler geliştirilmeli.",
                None,
            ],
            "el": [
                "Χρειαζόμαστε περισσότερους ποδηλατοδρόμους.",
                "Η ανακύκλωση δεν λειτουργεί σωστά.",
                "Τα λεωφορεία καθυστερούν συχνά.",
                "Τα πάρκα χρειάζονται συντήρηση.",
                None,
            ],
            "ro": [
                "Infrastructura pentru biciclete trebuie extinsă.",
                "Colectarea selectivă funcționează bine.",
                "Autobuzele întârzie prea des.",
                "Parcurile sunt îngrijite.",
                None,
            ],
            "mk": [
                "Потребна е подобра јавна чистота.",
                "Сообраќајот е голем проблем.",
                "Велосипедски патеки се потребни.",
                None,
            ],
            "en": [
                "Cycling infrastructure needs improvement.",
                "Recycling facilities are insufficient.",
                "Public transport is generally reliable.",
                None,
            ],
        },
    },
]

INFRA_QUESTIONS = [
    {
        "key": "road_condition",
        "type": "numeric",
        "label": {
            "tr": "Yol ve kaldırım durumu hakkında görüşünüz? (1-5)",
            "en": "Opinion on road and pavement condition? (1-5)",
            "el": "Γνώμη για κατάσταση δρόμων και πεζοδρομίων; (1-5)",
            "ro": "Opinia despre starea drumurilor și trotuarelor? (1-5)",
            "mk": "Мислење за состојбата на патиштата и тротоарите? (1-5)",
        },
        "mean": 2.8, "std": 1.0,
    },
    {
        "key": "street_lighting",
        "type": "numeric",
        "label": {
            "tr": "Sokak aydınlatması yeterliliği? (1-5)",
            "en": "Adequacy of street lighting? (1-5)",
            "el": "Επάρκεια δημοτικού φωτισμού; (1-5)",
            "ro": "Adecvarea iluminatului stradal? (1-5)",
            "mk": "Адекватност на уличното осветлување? (1-5)",
        },
        "mean": 3.4, "std": 0.9,
    },
    {
        "key": "flood_experience",
        "type": "choice",
        "label": {
            "tr": "Son 5 yılda su baskını yaşadınız mı?",
            "en": "Have you experienced flooding in the last 5 years?",
            "el": "Βιώσατε πλημμύρα τα τελευταία 5 χρόνια;",
            "ro": "Ați experimentat inundații în ultimii 5 ani?",
            "mk": "Доживеавте поплава во последните 5 години?",
        },
        "choices": ["yes_major", "yes_minor", "no"],
    },
    {
        "key": "energy_efficiency_programs",
        "type": "choice",
        "label": {
            "tr": "Belediyenin enerji verimliliği programlarından haberdar mısınız?",
            "en": "Are you aware of the municipality's energy efficiency programs?",
            "el": "Γνωρίζετε τα προγράμματα ενεργειακής αποδοτικότητας του Δήμου;",
            "ro": "Cunoașteți programele de eficiență energetică ale municipalității?",
            "mk": "Дали сте запознаени со програмите за енергетска ефикасност?",
        },
        "choices": ["yes_participating", "yes_not_participating", "no"],
    },
    {
        "key": "climate_concern",
        "type": "numeric",
        "label": {
            "tr": "İklim değişikliğinin şehrinizi etkileyeceği konusundaki endişeniz? (1-5)",
            "en": "Concern about climate change affecting your city? (1-5)",
            "el": "Ανησυχία για την κλιματική αλλαγή στην πόλη σας; (1-5)",
            "ro": "Îngrijorare față de schimbările climatice? (1-5)",
            "mk": "Загриженост за климатските промени? (1-5)",
        },
        "mean": 3.9, "std": 0.95,
    },
]


def _token(survey_id: str, n: int) -> str:
    return hashlib.sha256(f"{survey_id}:respondent:{n}".encode()).hexdigest()[:32]


def _likert(mean: float, std: float) -> float:
    val = random.gauss(mean, std)
    return round(max(1.0, min(5.0, val)), 1)


async def seed_surveys(session: AsyncSession) -> tuple[int, int]:
    code_map = {
        r.code: r.id
        for r in (await session.execute(select(Municipality.code, Municipality.id))).all()
    }

    surveys_inserted = responses_inserted = 0

    for mun_code in PILOT_MUNICIPALITIES:
        mun_id = code_map.get(mun_code)
        if not mun_id:
            continue
        locale = _LOCALE_BY_CODE.get(mun_code, "en")

        for year in SURVEY_YEARS:
            for survey_type, questions, title_key in [
                ("citizen_satisfaction", SATISFACTION_QUESTIONS,
                 {"tr": f"Vatandaş Memnuniyet Anketi {year}",
                  "en": f"Citizen Satisfaction Survey {year}",
                  "el": f"Έρευνα Ικανοποίησης Πολιτών {year}",
                  "ro": f"Sondaj de Satisfacție a Cetățenilor {year}",
                  "mk": f"Анкета за Задоволство на Граѓаните {year}"}),
                ("infrastructure_assessment", INFRA_QUESTIONS,
                 {"tr": f"Altyapı Değerlendirme Anketi {year}",
                  "en": f"Infrastructure Assessment Survey {year}",
                  "el": f"Έρευνα Αξιολόγησης Υποδομών {year}",
                  "ro": f"Sondaj de Evaluare a Infrastructurii {year}",
                  "mk": f"Анкета за Оцена на Инфраструктурата {year}"}),
            ]:
                # Check existing
                existing = await session.scalar(
                    select(Survey.id).where(
                        Survey.municipality_id == mun_id,
                        Survey.survey_type == survey_type,
                        Survey.period_year == year,
                    )
                )
                if existing:
                    continue

                n_responses = random.randint(150, 400)
                survey = Survey(
                    municipality_id=mun_id,
                    title=title_key,
                    survey_type=survey_type,
                    period_year=year,
                    started_at=date(year, 3, 1),
                    ended_at=date(year, 3, 31),
                    total_responses=n_responses,
                    quality_tag=QualityTag.PILOT,
                )
                session.add(survey)
                await session.flush()
                surveys_inserted += 1

                # Generate responses
                for i in range(n_responses):
                    token = _token(str(survey.id), i)
                    # Locale dağılımı: %75 yerel dil, %25 İngilizce
                    resp_locale = locale if random.random() < 0.75 else "en"
                    submitted = datetime(
                        year, 3, random.randint(1, 31),
                        random.randint(8, 22), random.randint(0, 59),
                        tzinfo=timezone.utc,
                    )

                    for q in questions:
                        if q["type"] == "numeric":
                            session.add(SurveyResponse(
                                survey_id=survey.id,
                                respondent_token=token,
                                question_key=q["key"],
                                question_label={
                                    resp_locale: q["label"].get(resp_locale,
                                                                q["label"]["en"])
                                },
                                response_numeric=_likert(q["mean"], q["std"]),
                                locale=resp_locale,
                                submitted_at=submitted,
                            ))
                        elif q["type"] == "choice":
                            session.add(SurveyResponse(
                                survey_id=survey.id,
                                respondent_token=token,
                                question_key=q["key"],
                                question_label={
                                    resp_locale: q["label"].get(resp_locale,
                                                                q["label"]["en"])
                                },
                                response_choice=random.choice(q["choices"]),
                                locale=resp_locale,
                                submitted_at=submitted,
                            ))
                        elif q["type"] == "text":
                            # %45 yanıt verir, %55 boş bırakır
                            if random.random() < 0.45:
                                templates = q["templates"].get(
                                    resp_locale, q["templates"]["en"]
                                )
                                text_val = random.choice(templates)
                                if text_val:
                                    session.add(SurveyResponse(
                                        survey_id=survey.id,
                                        respondent_token=token,
                                        question_key=q["key"],
                                        question_label={
                                            resp_locale: q["label"].get(
                                                resp_locale, q["label"]["en"])
                                        },
                                        response_text=text_val,
                                        locale=resp_locale,
                                        submitted_at=submitted,
                                    ))

                    responses_inserted += len(questions)

                    # Batch flush every 1000 responses
                    if responses_inserted % 1000 == 0:
                        await session.flush()

    await session.commit()
    return surveys_inserted, responses_inserted


async def main() -> None:
    async with AsyncSessionLocal() as session:
        surveys, responses = await seed_surveys(session)
        print(f"Seeded {surveys} surveys, {responses} responses")


if __name__ == "__main__":
    asyncio.run(main())
