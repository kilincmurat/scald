-- ============================================================
-- SCALD Seed Data
-- Demo belediye, kullanıcılar ve örnek veriler
-- ============================================================

-- ============================================================
-- BELEDİYELER
-- ============================================================

INSERT INTO municipalities (id, name, name_en, country, region, population, area_km2, latitude, longitude) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Demo Belediyesi', 'Demo Municipality', 'TR', 'Ege', 284000, 892.5, 38.4192, 27.1287),
  ('22222222-2222-2222-2222-222222222222', 'Selanik Belediyesi', 'Thessaloniki Municipality', 'GR', 'Orta Makedonya', 325000, 111.7, 40.6401, 22.9444),
  ('33333333-3333-3333-3333-333333333333', 'Cluj-Napoca Belediyesi', 'Cluj-Napoca Municipality', 'RO', 'Cluj', 312000, 179.5, 46.7712, 23.6236),
  ('44444444-4444-4444-4444-444444444444', 'Skopje Belediyesi', 'Skopje Municipality', 'MK', 'Skopje', 545000, 571.5, 41.9981, 21.4254);

-- ============================================================
-- GÖSTERGELER (15 Ana Gösterge)
-- ============================================================

INSERT INTO indicators (code, name_tr, name_en, layer, unit, weight, description_tr, description_en, sort_order) VALUES
  -- Katman 1 - Temel Veri (zorunlu)
  ('ENERGY',       'Enerji Tüketimi',           'Energy Consumption',       1, 'kWh/kişi/yıl',     1.5, 'Yıllık kişi başı toplam enerji tüketimi',      'Annual per capita total energy consumption',      1),
  ('WATER',        'Su Kullanımı',              'Water Usage',              1, 'L/kişi/gün',        1.3, 'Kişi başı günlük su tüketimi',                 'Daily per capita water consumption',              2),
  ('WASTE',        'Atık Yönetimi',             'Waste Management',         1, 'kg/kişi/yıl',       1.2, 'Yıllık kişi başı katı atık üretimi',           'Annual per capita solid waste generation',        3),
  ('TRANSPORT',    'Ulaşım ve Mobilite',        'Transport & Mobility',     1, 'km/kişi/yıl',       1.4, 'Kişi başı yıllık motorlu taşıt mesafesi',       'Annual motorized vehicle distance per capita',    4),
  ('GREEN_SPACE',  'Yeşil Alan ve Arazi',       'Green Space & Land Use',   1, 'm²/kişi',           1.2, 'Kişi başı yeşil alan miktarı',                 'Green area per capita',                          5),
  ('POPULATION',   'Nüfus ve Demografi',        'Population & Demographics', 1, 'kişi',              1.0, 'Nüfus büyüklüğü ve demografik yapı',           'Population size and demographic structure',       6),
  ('CLIMATE_API',  'İklim Verileri (API)',      'Climate Data (API)',        1, '°C / mm',           1.0, '30 yıllık iklim verisi - API ile otomatik',     '30-year climate data - automatic via API',        7),
  -- Katman 2 - Genişletilmiş Veri (isteğe bağlı)
  ('AIR_QUALITY',  'Hava Kalitesi',             'Air Quality',              2, 'µg/m³ PM2.5',       1.3, 'Partikül madde konsantrasyonu (PM2.5)',         'Particulate matter concentration (PM2.5)',        8),
  ('FLOOD_RISK',   'Taşkın ve İklim Riski',    'Flood & Climate Risk',     2, 'risk indeksi 0-10', 1.1, 'Taşkın ve aşırı hava olayı riski',             'Flood and extreme weather event risk',            9),
  ('BIODIVERSITY', 'Biyolojik Çeşitlilik',     'Biodiversity',             2, 'tür/km²',           1.1, 'Kentsel biyolojik çeşitlilik indeksi',         'Urban biodiversity index',                       10),
  ('ENERGY_SEC',   'Sektörel Enerji Tüketimi', 'Sectoral Energy Use',      2, 'kWh/sektör/yıl',   1.0, 'Sektöre göre enerji tüketim dağılımı',         'Energy consumption distribution by sector',      11),
  ('RECYCLING',    'Geri Dönüşüm Oranı',       'Recycling Rate',           2, '%',                 1.2, 'Toplam atığın geri dönüşüme kazandırılan oranı', 'Percentage of total waste recycled',            12),
  -- Katman 3 - Yerel Pilot Veriler (deneysel)
  ('IOT_SENSORS',  'IoT Sensör Verileri',      'IoT Sensor Data',          3, 'çeşitli',           0.8, 'Akıllı şehir IoT sensör ölçümleri',            'Smart city IoT sensor measurements',             13),
  ('SURVEYS',      'Vatandaş Anket Verileri',  'Citizen Survey Data',      3, 'endeks 0-100',      0.7, 'Vatandaş memnuniyet ve çevre anketi',          'Citizen satisfaction and environmental survey',   14),
  ('CARBON_SINK',  'Karbon Yutakları',         'Carbon Sinks',             3, 'tCO₂/yıl',         0.9, 'Orman ve yeşil alan karbon tutma kapasitesi',  'Forest and green area carbon sequestration',      15);

-- ============================================================
-- ALT GÖSTERGELER (80 Alt Gösterge - ilk 20 demo)
-- ============================================================

-- ENERGY alt göstergeleri
INSERT INTO sub_indicators (indicator_id, code, name_tr, name_en, unit, normalization, sort_order)
SELECT id, code, name_tr, name_en, unit, normalization, sort_order FROM (
  VALUES
    ('ENERGY_ELEC',     'Elektrik Tüketimi',            'Electricity Consumption',          'kWh/kişi/yıl',  'per_capita', 1),
    ('ENERGY_HEAT',     'Isınma Enerjisi',              'Heating Energy',                   'kWh/kişi/yıl',  'per_capita', 2),
    ('ENERGY_RENEW',    'Yenilenebilir Enerji Oranı',   'Renewable Energy Share',           '%',             'absolute',   3),
    ('ENERGY_PUBLIC',   'Kamu Bina Tüketimi',           'Public Building Consumption',      'kWh/m²/yıl',    'per_area',   4),
    ('ENERGY_STREET',   'Sokak Aydınlatması',           'Street Lighting',                  'kWh/km/yıl',    'per_area',   5),
    ('ENERGY_INDUSTRY', 'Sanayi Enerji Tüketimi',       'Industrial Energy Use',            'kWh/kişi/yıl',  'per_capita', 6),
    ('ENERGY_CO2',      'Enerji Kaynaklı CO₂',          'Energy-related CO₂',               'tCO₂/kişi/yıl', 'per_capita', 7),
    ('ENERGY_EFF',      'Enerji Verimliliği İndeksi',   'Energy Efficiency Index',          'endeks 0-100',  'absolute',   8)
) AS v(code, name_tr, name_en, unit, normalization, sort_order)
CROSS JOIN (SELECT id FROM indicators WHERE code = 'ENERGY') AS i;

-- WATER alt göstergeleri
INSERT INTO sub_indicators (indicator_id, code, name_tr, name_en, unit, normalization, sort_order)
SELECT id, code, name_tr, name_en, unit, normalization, sort_order FROM (
  VALUES
    ('WATER_DOMESTIC',  'Evsel Su Tüketimi',    'Domestic Water Use',     'L/kişi/gün',  'per_capita', 1),
    ('WATER_LOSS',      'Şebeke Kayıp Oranı',   'Network Loss Rate',      '%',           'absolute',   2),
    ('WATER_TREAT',     'Atıksu Arıtma Oranı',  'Wastewater Treatment',   '%',           'absolute',   3),
    ('WATER_REUSE',     'Su Yeniden Kullanımı',  'Water Reuse Rate',       '%',           'absolute',   4),
    ('WATER_QUALITY',   'İçme Suyu Kalitesi',   'Drinking Water Quality',  'indeks 0-10', 'absolute',   5),
    ('WATER_RAIN',      'Yağmur Suyu Hasadı',   'Rainwater Harvesting',   'm³/yıl',      'absolute',   6)
) AS v(code, name_tr, name_en, unit, normalization, sort_order)
CROSS JOIN (SELECT id FROM indicators WHERE code = 'WATER') AS i;

-- WASTE alt göstergeleri
INSERT INTO sub_indicators (indicator_id, code, name_tr, name_en, unit, normalization, sort_order)
SELECT id, code, name_tr, name_en, unit, normalization, sort_order FROM (
  VALUES
    ('WASTE_TOTAL',     'Toplam Katı Atık',         'Total Solid Waste',      'kg/kişi/yıl', 'per_capita', 1),
    ('WASTE_ORGANIC',   'Organik Atık Oranı',       'Organic Waste Rate',     '%',           'absolute',   2),
    ('WASTE_RECYCLE',   'Geri Dönüşüm Oranı',       'Recycling Rate',         '%',           'absolute',   3),
    ('WASTE_LANDFILL',  'Düzenli Depolama Oranı',   'Landfill Rate',          '%',           'absolute',   4),
    ('WASTE_HAZARDOUS', 'Tehlikeli Atık Miktarı',   'Hazardous Waste Amount', 'kg/kişi/yıl', 'per_capita', 5),
    ('WASTE_COMPOST',   'Kompost Üretimi',           'Composting Rate',        'ton/yıl',     'absolute',   6),
    ('WASTE_BIOGAS',    'Biyogaz Potansiyeli',      'Biogas Potential',       'MWh/yıl',     'absolute',   7)
) AS v(code, name_tr, name_en, unit, normalization, sort_order)
CROSS JOIN (SELECT id FROM indicators WHERE code = 'WASTE') AS i;

-- ============================================================
-- DEMO VERİ GİRİŞLERİ (Demo Belediyesi için 2019-2024)
-- ============================================================

INSERT INTO ecological_scores (municipality_id, year, total_score, energy_score, water_score, waste_score, transport_score, green_space_score, climate_score, biodiversity_score, air_quality_score, footprint_gha, carbon_tons_per_capita) VALUES
  ('11111111-1111-1111-1111-111111111111', 2019, 52.1, 58.0, 68.0, 42.0, 35.0, 55.0, 60.0, 40.0, 62.0, 4.82, 5.10),
  ('11111111-1111-1111-1111-111111111111', 2020, 54.3, 60.0, 70.0, 44.0, 37.0, 56.0, 61.0, 41.0, 63.0, 4.31, 4.85),
  ('11111111-1111-1111-1111-111111111111', 2021, 53.8, 59.0, 69.5, 43.0, 36.0, 56.5, 61.5, 41.5, 64.0, 4.62, 4.92),
  ('11111111-1111-1111-1111-111111111111', 2022, 56.2, 61.0, 71.0, 45.0, 38.0, 57.0, 62.0, 42.0, 65.0, 4.24, 4.68),
  ('11111111-1111-1111-1111-111111111111', 2023, 58.7, 62.0, 71.5, 45.5, 38.5, 58.0, 63.0, 42.5, 66.0, 3.91, 4.42),
  ('11111111-1111-1111-1111-111111111111', 2024, 61.0, 62.0, 71.0, 45.0, 38.0, 58.0, 66.0, 42.0, 66.0, 3.70, 4.20);

-- ============================================================
-- İKLİM VERİLERİ (Demo Belediyesi için 1994-2024)
-- ============================================================

INSERT INTO climate_data (municipality_id, year, avg_temperature, max_temperature, min_temperature, total_precipitation, extreme_heat_days, extreme_cold_days, flood_events, air_quality_pm25, air_quality_pm10, co2_concentration, source) VALUES
  ('11111111-1111-1111-1111-111111111111', 2020, 15.2, 38.4, -2.1, 680.0, 12, 3, 1, 22.1, 38.4, 412.5, 'OpenMeteo API'),
  ('11111111-1111-1111-1111-111111111111', 2021, 15.6, 39.1, -1.8, 645.0, 14, 2, 2, 21.8, 37.9, 414.7, 'OpenMeteo API'),
  ('11111111-1111-1111-1111-111111111111', 2022, 16.1, 40.2, -1.2, 598.0, 18, 1, 1, 20.4, 36.2, 417.2, 'OpenMeteo API'),
  ('11111111-1111-1111-1111-111111111111', 2023, 16.8, 41.5,  0.2, 542.0, 22, 0, 3, 19.8, 35.1, 419.8, 'OpenMeteo API'),
  ('11111111-1111-1111-1111-111111111111', 2024, 17.2, 42.0,  0.8, 510.0, 26, 0, 2, 18.4, 33.8, 421.5, 'OpenMeteo API');

-- ============================================================
-- DEMO STRATEJİLER (AI DSS - 30 strateji)
-- ============================================================

INSERT INTO strategies (municipality_id, title_tr, title_en, description_tr, description_en, expected_outcome_tr, expected_outcome_en, category, priority, impact_score, feasibility_score, cost_level, timeframe, risk_level, status, related_indicators, ai_generated) VALUES

-- ENERJİ STRATEJİLERİ
('11111111-1111-1111-1111-111111111111',
 'Yenilenebilir Enerji Geçiş Programı', 'Renewable Energy Transition Program',
 'Belediye binalarında güneş paneli kurulumu ve rüzgar enerjisi alım sözleşmeleri ile enerji tüketiminin %60''ını yenilenebilir kaynaklardan karşılama.',
 'Install solar panels on municipal buildings and wind energy purchase agreements to cover 60% of energy consumption from renewable sources.',
 'Enerji kaynaklı CO₂ emisyonlarını 5 yılda %40 azaltmak.',
 'Reduce energy-related CO₂ emissions by 40% in 5 years.',
 'energy', 'high', 88, 72, 'high', 'long', 'medium', 'approved', ARRAY['ENERGY', 'ENERGY_CO2'], true),

('11111111-1111-1111-1111-111111111111',
 'Kamu Binası Enerji Verimliliği', 'Public Building Energy Efficiency',
 'Tüm kamu binalarında ısı yalıtımı, LED aydınlatma ve akıllı bina yönetim sistemleri kurulumu.',
 'Install thermal insulation, LED lighting, and smart building management systems in all public buildings.',
 'Kamu bina enerji tüketimini %30 azaltmak.',
 'Reduce public building energy consumption by 30%.',
 'energy', 'high', 75, 88, 'medium', 'short', 'low', 'in_progress', ARRAY['ENERGY', 'ENERGY_PUBLIC'], true),

('11111111-1111-1111-1111-111111111111',
 'Sokak Aydınlatması LED Dönüşümü', 'Street Lighting LED Conversion',
 'Tüm sokak aydınlatmalarının LED teknolojisine dönüştürülmesi ve akıllı kontrol sistemi entegrasyonu.',
 'Convert all street lighting to LED technology and integrate smart control systems.',
 'Sokak aydınlatma enerji tüketimini %60 azaltmak.',
 'Reduce street lighting energy consumption by 60%.',
 'energy', 'medium', 70, 92, 'low', 'short', 'low', 'completed', ARRAY['ENERGY', 'ENERGY_STREET'], true),

('11111111-1111-1111-1111-111111111111',
 'Enerji Topluluğu Kurulumu', 'Energy Community Establishment',
 'Mahalle bazlı yenilenebilir enerji toplulukları oluşturarak vatandaşların enerji üretimine katılımını sağlamak.',
 'Establish neighborhood-based renewable energy communities to enable citizen participation in energy production.',
 'Yerel yenilenebilir enerji kapasitesini 50 MW artırmak.',
 'Increase local renewable energy capacity by 50 MW.',
 'energy', 'medium', 65, 60, 'high', 'long', 'medium', 'proposed', ARRAY['ENERGY', 'ENERGY_RENEW'], true),

-- SU STRATEJİLERİ
('11111111-1111-1111-1111-111111111111',
 'Akıllı Su Yönetim Sistemi', 'Smart Water Management System',
 'IoT sensörler ve akıllı sayaçlarla su kayıplarını %30 azaltma, yağmur suyu hasadı sistemleri kurma.',
 'Reduce water losses by 30% with IoT sensors and smart meters, install rainwater harvesting systems.',
 'Su kayıplarını %35''ten %8''e düşürmek.',
 'Reduce water losses from 35% to 8%.',
 'water', 'high', 75, 85, 'medium', 'medium', 'low', 'in_progress', ARRAY['WATER', 'WATER_LOSS'], true),

('11111111-1111-1111-1111-111111111111',
 'Atıksu Geri Dönüşüm Tesisi', 'Wastewater Recycling Facility',
 'Arıtılmış atıksuyun tarımsal sulama ve kentsel yeşil alan sulamasında yeniden kullanılması.',
 'Reuse treated wastewater for agricultural irrigation and urban green area irrigation.',
 'Su yeniden kullanım oranını %25''e çıkarmak.',
 'Increase water reuse rate to 25%.',
 'water', 'medium', 68, 72, 'high', 'long', 'medium', 'approved', ARRAY['WATER', 'WATER_REUSE'], true),

('11111111-1111-1111-1111-111111111111',
 'Su Farkındalık Kampanyası', 'Water Awareness Campaign',
 'Vatandaşlara yönelik su tasarrufu kampanyaları ve akıllı sayaç kurulumu ile kişi başı su tüketimini azaltma.',
 'Water saving campaigns for citizens and smart meter installation to reduce per capita water consumption.',
 'Kişi başı su tüketimini 145L''den 120L''ye düşürmek.',
 'Reduce per capita water consumption from 145L to 120L.',
 'water', 'medium', 55, 90, 'low', 'short', 'low', 'approved', ARRAY['WATER', 'WATER_DOMESTIC'], true),

-- ATIK STRATEJİLERİ
('11111111-1111-1111-1111-111111111111',
 'Döngüsel Ekonomi Atık Programı', 'Circular Economy Waste Program',
 'Kapıdan kapıya organik atık toplama, biyogaz tesisi kurulumu ile geri dönüşüm oranını %34''ten %65''e çıkarma.',
 'Door-to-door organic waste collection, biogas plant installation to increase recycling rate from 34% to 65%.',
 'Düzenli depolamayı %40 azaltmak ve biyogaz üretimini başlatmak.',
 'Reduce landfill by 40% and initiate biogas production.',
 'waste', 'high', 80, 78, 'medium', 'medium', 'low', 'approved', ARRAY['WASTE', 'WASTE_RECYCLE', 'RECYCLING'], true),

('11111111-1111-1111-1111-111111111111',
 'Sıfır Atık Belediye Programı', 'Zero Waste Municipality Program',
 'Kamu binalarında sıfır atık uygulamaları, plastik yasağı ve yeniden kullanılabilir ambalaj teşvikleri.',
 'Zero waste practices in public buildings, plastic ban and reusable packaging incentives.',
 'Belediye katı atığını 5 yılda %50 azaltmak.',
 'Reduce municipal solid waste by 50% in 5 years.',
 'waste', 'medium', 72, 68, 'low', 'medium', 'low', 'proposed', ARRAY['WASTE', 'WASTE_TOTAL'], true),

('11111111-1111-1111-1111-111111111111',
 'Elektronik Atık Yönetimi', 'E-Waste Management',
 'Elektronik atık toplama noktaları ve üretici geri alım programları ile e-atık yönetiminin iyileştirilmesi.',
 'Improve e-waste management with collection points and producer take-back programs.',
 'Elektronik atık geri dönüşüm oranını %80''e çıkarmak.',
 'Increase e-waste recycling rate to 80%.',
 'waste', 'low', 45, 80, 'low', 'short', 'low', 'in_progress', ARRAY['WASTE', 'WASTE_HAZARDOUS'], true),

-- ULAŞIM STRATEJİLERİ
('11111111-1111-1111-1111-111111111111',
 'Sıfır Emisyonlu Toplu Taşıma Filosu', 'Zero-Emission Public Transit Fleet',
 'Mevcut dizel otobüs filosunun 2030''a kadar tamamen elektrikli araçlarla değiştirilmesi.',
 'Complete replacement of the existing diesel bus fleet with electric vehicles by 2030.',
 'Ulaşım emisyonlarını %70 azaltmak.',
 'Reduce transport emissions by 70%.',
 'transport', 'high', 82, 55, 'very_high', 'long', 'high', 'approved', ARRAY['TRANSPORT', 'ENERGY_CO2'], true),

('11111111-1111-1111-1111-111111111111',
 'Bisiklet Altyapısı Genişletme', 'Bicycle Infrastructure Expansion',
 'Kent genelinde 150 km korunaklı bisiklet yolu, akıllı bisiklet kiralama istasyonları ve bisiklet park yerleri.',
 'City-wide 150 km protected bicycle lanes, smart bicycle rental stations and parking.',
 'Bisiklet kullanımını %5''ten %15''e çıkarmak.',
 'Increase cycling modal share from 5% to 15%.',
 'transport', 'high', 70, 82, 'medium', 'medium', 'low', 'in_progress', ARRAY['TRANSPORT', 'AIR_QUALITY'], true),

('11111111-1111-1111-1111-111111111111',
 'Akıllı Trafik Yönetimi', 'Smart Traffic Management',
 'Yapay zeka destekli trafik sinyalizasyonu optimizasyonu ile yakıt tüketimi ve emisyonları azaltma.',
 'AI-powered traffic signal optimization to reduce fuel consumption and emissions.',
 'Ortalama seyahat süresini %20 azaltmak.',
 'Reduce average travel time by 20%.',
 'transport', 'medium', 65, 78, 'medium', 'medium', 'low', 'approved', ARRAY['TRANSPORT', 'AIR_QUALITY'], true),

('11111111-1111-1111-1111-111111111111',
 'Araç Paylaşım Platformu', 'Car Sharing Platform',
 'Belediye destekli elektrikli araç paylaşım platformu ile özel araç kullanımını azaltma.',
 'Municipality-supported electric car sharing platform to reduce private vehicle use.',
 'Özel araç kullanımını %10 azaltmak.',
 'Reduce private car use by 10%.',
 'transport', 'medium', 58, 70, 'medium', 'medium', 'medium', 'proposed', ARRAY['TRANSPORT'], true),

-- YEŞİL ALAN STRATEJİLERİ
('11111111-1111-1111-1111-111111111111',
 'Kent Ormanlaştırma Programı', 'Urban Forestation Program',
 '5 yıl içinde 50.000 ağaç dikimi, yeşil çatı ve dikey bahçe uygulamaları.',
 'Plant 50,000 trees in 5 years, green roof and vertical garden applications.',
 'Kişi başı yeşil alanı 12''den 18 m²''ye çıkarmak.',
 'Increase green space per capita from 12 to 18 m².',
 'green_space', 'high', 65, 90, 'low', 'medium', 'low', 'in_progress', ARRAY['GREEN_SPACE', 'BIODIVERSITY'], true),

('11111111-1111-1111-1111-111111111111',
 'Yeşil Çatı Teşvik Programı', 'Green Roof Incentive Program',
 'Bina sahiplerine yeşil çatı kurulumu için finansal teşvik ve teknik destek sağlanması.',
 'Provide financial incentives and technical support for green roof installation to building owners.',
 '100.000 m² yeni yeşil çatı alanı oluşturmak.',
 'Create 100,000 m² of new green roof area.',
 'green_space', 'medium', 55, 72, 'medium', 'medium', 'low', 'proposed', ARRAY['GREEN_SPACE'], true),

('11111111-1111-1111-1111-111111111111',
 'Kentsel Tarım Alanları', 'Urban Agriculture Spaces',
 'Boş kentsel alanlarda topluluk bahçeleri ve kentsel tarım alanları oluşturma.',
 'Create community gardens and urban agriculture areas in vacant urban spaces.',
 '20 mahallede topluluk bahçesi oluşturmak.',
 'Establish community gardens in 20 neighborhoods.',
 'green_space', 'low', 40, 88, 'low', 'short', 'low', 'in_progress', ARRAY['GREEN_SPACE', 'BIODIVERSITY'], true),

-- HAVA KALİTESİ STRATEJİLERİ
('11111111-1111-1111-1111-111111111111',
 'Hava Kalitesi İzleme Ağı', 'Air Quality Monitoring Network',
 'Kent genelinde gerçek zamanlı hava kalitesi sensör ağı kurulumu ve halkla paylaşım.',
 'Install city-wide real-time air quality sensor network and share with public.',
 'PM2.5 ortalamasını 18 µg/m³''den 12 µg/m³''e düşürmek.',
 'Reduce PM2.5 average from 18 µg/m³ to 12 µg/m³.',
 'air', 'high', 70, 80, 'medium', 'medium', 'low', 'in_progress', ARRAY['AIR_QUALITY'], true),

('11111111-1111-1111-1111-111111111111',
 'Düşük Emisyon Bölgeleri', 'Low Emission Zones',
 'Kent merkezinde belirli bölgelerde yüksek emisyonlu araçların girişini kısıtlayan bölgeler oluşturma.',
 'Create zones in the city center restricting high-emission vehicles.',
 'İç kent PM2.5 değerlerini %30 azaltmak.',
 'Reduce inner city PM2.5 levels by 30%.',
 'air', 'high', 75, 65, 'low', 'medium', 'medium', 'proposed', ARRAY['AIR_QUALITY', 'TRANSPORT'], true),

('11111111-1111-1111-1111-111111111111',
 'Isınma Kaynaklı Emisyon Azaltımı', 'Heating Emission Reduction',
 'Doğal gaz ve biyokütle ısıtma sistemlerine geçiş teşvikleri ve katı yakıt yasağı.',
 'Incentives for switching to natural gas and biomass heating systems and solid fuel ban.',
 'Kışın PM10 değerlerini %40 azaltmak.',
 'Reduce PM10 values by 40% in winter.',
 'air', 'medium', 68, 70, 'medium', 'medium', 'medium', 'approved', ARRAY['AIR_QUALITY', 'ENERGY'], true),

-- BİYOÇEŞİTLİLİK STRATEJİLERİ
('11111111-1111-1111-1111-111111111111',
 'Kentsel Biyolojik Çeşitlilik Koridorları', 'Urban Biodiversity Corridors',
 'Kent genelinde yeşil koridorlar ve bağlantılı habitat alanları oluşturarak biyolojik çeşitliliği destekleme.',
 'Support biodiversity by creating green corridors and connected habitat areas across the city.',
 'Kentsel tür çeşitliliğini %20 artırmak.',
 'Increase urban species diversity by 20%.',
 'biodiversity', 'medium', 58, 75, 'medium', 'long', 'low', 'proposed', ARRAY['BIODIVERSITY', 'GREEN_SPACE'], true),

('11111111-1111-1111-1111-111111111111',
 'Arı ve Polinatör Dostu Şehir', 'Bee and Pollinator Friendly City',
 'Kentsel arı kovanları, polinatör dostu bitki dikimi ve tarım ilaçlarının kısıtlanması.',
 'Urban beehives, pollinator-friendly plant planting and restriction of pesticides.',
 'Polinatör popülasyonunu %30 artırmak.',
 'Increase pollinator population by 30%.',
 'biodiversity', 'low', 45, 85, 'low', 'short', 'low', 'in_progress', ARRAY['BIODIVERSITY'], true),

-- GENEL/YATAY STRATEJİLER
('11111111-1111-1111-1111-111111111111',
 'İklim Değişikliği Adaptasyon Planı', 'Climate Change Adaptation Plan',
 '2030 ve 2050 için kapsamlı iklim uyum stratejilerini kapsayan belediye iklim eylem planı.',
 'Municipal climate action plan covering comprehensive climate adaptation strategies for 2030 and 2050.',
 'İklim adaptasyon skorunu 64''ten 85''e çıkarmak.',
 'Increase climate adaptation score from 64 to 85.',
 'energy', 'high', 90, 70, 'medium', 'long', 'low', 'approved', ARRAY['CLIMATE_API', 'ENERGY', 'WATER'], true),

('11111111-1111-1111-1111-111111111111',
 'Çevresel Eğitim Programları', 'Environmental Education Programs',
 'Okullarda ve topluluk merkezlerinde çevre bilinci ve sürdürülebilirlik eğitimleri.',
 'Environmental awareness and sustainability training in schools and community centers.',
 'Vatandaş çevre farkındalık endeksini %40 artırmak.',
 'Increase citizen environmental awareness index by 40%.',
 'green_space', 'medium', 50, 92, 'low', 'short', 'low', 'in_progress', ARRAY['SURVEYS'], true),

('11111111-1111-1111-1111-111111111111',
 'Sürdürülebilir Kamu Alımları', 'Sustainable Public Procurement',
 'Belediye alımlarında çevresel kriterlerin zorunlu hale getirilmesi ve yeşil tedarik zinciri.',
 'Making environmental criteria mandatory in municipal procurement and green supply chain.',
 'Kamu alımlarının %70''ini yeşil kriterlerle gerçekleştirmek.',
 'Complete 70% of public procurement with green criteria.',
 'waste', 'medium', 55, 82, 'low', 'medium', 'low', 'proposed', ARRAY['WASTE', 'ENERGY'], true),

('11111111-1111-1111-1111-111111111111',
 'Akıllı Şehir Altyapısı', 'Smart City Infrastructure',
 'IoT sensörler, veri analizi ve yapay zeka ile kentsel hizmetlerin optimize edilmesi.',
 'Optimize urban services with IoT sensors, data analysis and artificial intelligence.',
 'Enerji ve su tüketimini %15, ulaşım verimliliğini %20 artırmak.',
 'Improve energy and water consumption by 15%, transport efficiency by 20%.',
 'energy', 'high', 80, 62, 'very_high', 'long', 'medium', 'proposed', ARRAY['IOT_SENSORS', 'ENERGY', 'WATER'], true),

('11111111-1111-1111-1111-111111111111',
 'Karbon Nötr Belediye 2035', 'Carbon Neutral Municipality 2035',
 'Enerji, ulaşım ve atık sektörlerinde kapsamlı dekarbonizasyon ile 2035''te karbon nötr olmak.',
 'Achieve carbon neutrality by 2035 through comprehensive decarbonization in energy, transport and waste sectors.',
 'Net sıfır karbon emisyonu hedefine ulaşmak.',
 'Achieve net zero carbon emissions target.',
 'energy', 'high', 95, 45, 'very_high', 'long', 'high', 'proposed', ARRAY['ENERGY_CO2', 'TRANSPORT', 'WASTE'], true),

('11111111-1111-1111-1111-111111111111',
 'Yeşil Bono İhracı', 'Green Bond Issuance',
 'Çevre dostu altyapı yatırımları için uluslararası yeşil bono piyasasından finansman sağlama.',
 'Secure financing from international green bond market for environmentally friendly infrastructure investments.',
 '50 milyon Euro yeşil finansman temin etmek.',
 'Secure 50 million Euro in green financing.',
 'energy', 'medium', 70, 58, 'low', 'medium', 'medium', 'proposed', ARRAY['ENERGY', 'TRANSPORT'], true),

('11111111-1111-1111-1111-111111111111',
 'Kentsel Isı Adası Azaltımı', 'Urban Heat Island Reduction',
 'Yansıtıcı yüzeyler, serin koridorlar ve yeşillendirme ile kentsel ısı adası etkisini azaltma.',
 'Reduce urban heat island effect with reflective surfaces, cool corridors and greening.',
 'Kentsel ortalama sıcaklığı 2°C düşürmek.',
 'Lower urban average temperature by 2°C.',
 'green_space', 'high', 72, 70, 'medium', 'medium', 'low', 'approved', ARRAY['GREEN_SPACE', 'CLIMATE_API', 'AIR_QUALITY'], true),

('11111111-1111-1111-1111-111111111111',
 'Sürdürülebilir İnşaat Standartları', 'Sustainable Construction Standards',
 'Yeni yapılarda enerji verimliliği, yeşil çatı ve gri su geri dönüşümü zorunluluğu.',
 'Mandatory energy efficiency, green roof and greywater recycling for new buildings.',
 'Yeni binaların %80''ini yeşil bina standartlarına taşımak.',
 'Bring 80% of new buildings to green building standards.',
 'energy', 'medium', 75, 60, 'low', 'long', 'medium', 'proposed', ARRAY['ENERGY', 'WATER', 'GREEN_SPACE'], true),

('11111111-1111-1111-1111-111111111111',
 'Mahalle Bazlı Enerji Planlaması', 'Neighborhood-Based Energy Planning',
 'Her mahalle için özelleştirilmiş enerji verimliliği ve yenilenebilir enerji planları hazırlanması.',
 'Prepare customized energy efficiency and renewable energy plans for each neighborhood.',
 'Mahalle bazlı enerji tüketimini %25 azaltmak.',
 'Reduce neighborhood energy consumption by 25%.',
 'energy', 'medium', 65, 75, 'medium', 'medium', 'low', 'in_progress', ARRAY['ENERGY', 'ENERGY_RENEW'], true);

-- ============================================================
-- DEMO RAPORLAR
-- ============================================================

INSERT INTO reports (municipality_id, title, report_type, year, language, status, include_charts, include_recommendations) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Yıllık Ekolojik Performans Raporu 2024', 'annual',     2024, 'tr', 'ready',  true, true),
  ('11111111-1111-1111-1111-111111111111', '2024 Annual Ecological Performance Report', 'annual',  2024, 'en', 'ready',  true, true),
  ('11111111-1111-1111-1111-111111111111', 'Q4 2024 İlerleme Raporu',                  'quarterly', 2024, 'tr', 'ready',  true, true),
  ('11111111-1111-1111-1111-111111111111', 'Stratejik İklim Uyum Planı 2025-2030',     'strategic', 2025, 'tr', 'ready',  true, true),
  ('11111111-1111-1111-1111-111111111111', 'Q1 2025 İlerleme Raporu',                  'quarterly', 2025, 'tr', 'draft',  true, true);
