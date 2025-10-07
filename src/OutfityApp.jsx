import React, { useEffect, useMemo, useState } from "react";

/**
 * Outfity — чистая версия с манекеном + чипсами одежды
 * - Эмодзи сезонов в шапке
 * - Плитки погоды с иконками
 * - Нормальные переносы текста (break-words) — ничего не «вылезает»
 * - Без PNG-слоёв, без «бумажных кукол»
 */

// ===== 1) Константы и помощники =====
const FUNCTION_URL = "/.netlify/functions/weather"; // если нет функции — будет мок

function getSeasonByMonth(m) {
  if ([11, 0, 1].includes(m)) return "winter";
  if ([2, 3, 4].includes(m)) return "spring";
  if ([5, 6, 7].includes(m)) return "summer";
  return "autumn";
}

const SEASON_THEME = {
  autumn: { bg: "from-amber-100 to-orange-200", accents: "text-orange-800", chip: "bg-orange-200", art: "🍁", ru: "Осень" },
  winter: { bg: "from-sky-100 to-blue-200",    accents: "text-sky-800",    chip: "bg-sky-200",    art: "❄️", ru: "Зима"  },
  spring: { bg: "from-rose-100 to-pink-200",   accents: "text-pink-800",   chip: "bg-pink-200",   art: "🌸", ru: "Весна" },
  summer: { bg: "from-lime-100 to-yellow-200", accents: "text-green-800",  chip: "bg-yellow-200", art: "🍓", ru: "Лето"  },
};

function windBucket(s) { if (s == null) return "weak"; if (s < 4) return "weak"; if (s < 8) return "medium"; return "strong"; }
function windBucketRu(b) { return b === "weak" ? "слабый" : b === "medium" ? "средний" : "сильный"; }
function precipitationBucket(p, condition = "") {
  if (!p || p === 0) return "none";
  if (p === 2) return "snow";
  if (p === 3) return "rain";
  return "rain";
}
function precipitationRu(code) {
  return code === "snow" ? "снег"
    : code === "rain" ? "дождь"
    : code === "light_rain" ? "небольшой дождь"
    : code === "snowstorm" ? "метель"
    : "без осадков";
}

// ===== 2) Базовый датасет базовой одежды =====
const OUTFIT_DATASET = [
  { temp_min: 25, temp_max: 35, wind: "weak",   precipitation: "none",       gender: "female", outfit: "лёгкое платье из хлопка, сандалии", accessories: "панама, очки" },
  { temp_min: 25, temp_max: 35, wind: "weak",   precipitation: "none",       gender: "male",   outfit: "футболка, шорты, кеды", accessories: "кепка, очки" },

  { temp_min: 20, temp_max: 25, wind: "medium", precipitation: "light_rain", gender: "female", outfit: "рубашка, джинсы, кардиган, кроссовки", accessories: "зонт" },
  { temp_min: 20, temp_max: 25, wind: "medium", precipitation: "light_rain", gender: "male",   outfit: "футболка, джинсы, ветровка, кроссовки", accessories: "зонт" },

  { temp_min: 15, temp_max: 20, wind: "medium", precipitation: "none",       gender: "female", outfit: "футболка, джинсы, жакет, кеды", accessories: "лёгкий шарф" },
  { temp_min: 15, temp_max: 20, wind: "medium", precipitation: "none",       gender: "male",   outfit: "футболка, чиносы, джинсовка, кеды", accessories: "часы" },

  { temp_min: 10, temp_max: 15, wind: "weak",   precipitation: "rain",       gender: "female", outfit: "свитшот, джинсы, плащ, ботинки", accessories: "зонт" },
  { temp_min: 10, temp_max: 15, wind: "weak",   precipitation: "rain",       gender: "male",   outfit: "свитер, джинсы, ветровка, кроссовки", accessories: "зонт" },

  { temp_min: 5,  temp_max: 10, wind: "strong", precipitation: "none",       gender: "female", outfit: "свитер, джинсы, пальто, ботинки", accessories: "шарф, шапка" },
  { temp_min: 5,  temp_max: 10, wind: "strong", precipitation: "none",       gender: "male",   outfit: "худи, джинсы, куртка, ботинки", accessories: "шапка" },

  { temp_min: 0,  temp_max: 5,  wind: "medium", precipitation: "snow",       gender: "female", outfit: "свитер, джинсы, пуховик, сапоги", accessories: "шапка, перчатки, шарф" },
  { temp_min: 0,  temp_max: 5,  wind: "medium", precipitation: "snow",       gender: "male",   outfit: "водолазка, джинсы, утеплённая куртка, ботинки", accessories: "шапка, перчатки, шарф" },

  { temp_min: -5, temp_max: 0,  wind: "medium", precipitation: "snow",       gender: "female", outfit: "тёплые брюки, свитер, пуховик, сапоги", accessories: "шапка, шарф, варежки" },
  { temp_min: -5, temp_max: 0,  wind: "medium", precipitation: "snow",       gender: "male",   outfit: "тёплые брюки, свитер, парка, ботинки", accessories: "шапка, шарф, перчатки" },

  { temp_min: -10,temp_max: -5, wind: "strong", precipitation: "snow",       gender: "female", outfit: "термокомплект, свитер, длинный пуховик, сапоги", accessories: "шапка, варежки, баф" },
  { temp_min: -10,temp_max: -5, wind: "strong", precipitation: "snow",       gender: "male",   outfit: "термобельё, свитер, парка, зимние ботинки", accessories: "шапка, перчатки, шарф" },

  { temp_min: -20,temp_max: -10,wind: "strong", precipitation: "snowstorm",  gender: "female", outfit: "термокомплект, свитер, длинный пуховик, сапоги", accessories: "шапка, варежки, капюшон" },
  { temp_min: -20,temp_max: -10,wind: "strong", precipitation: "snowstorm",  gender: "male",   outfit: "термобельё, свитер, парка, зимние ботинки", accessories: "шапка, перчатки, капюшон" },
];

function pickOutfit({ tempC, windMs, precType, gender }) {
  const wind = windBucket(windMs);
  const precipitation = precipitationBucket(precType);
  const exact = OUTFIT_DATASET.find(r =>
    tempC >= r.temp_min && tempC <= r.temp_max &&
    r.wind === wind && r.precipitation === precipitation && r.gender === gender
  );
  if (exact) return exact;
  const byTemp = OUTFIT_DATASET.find(r => tempC >= r.temp_min && tempC <= r.temp_max && r.gender === gender);
  if (byTemp) return byTemp;
  return OUTFIT_DATASET.find(r => r.gender === gender) || OUTFIT_DATASET[0];
}

// ===== 3) Хуки: гео и погода =====
function useGeolocation() {
  const [coords, setCoords] = useState(null);
  useEffect(() => {
    if (!navigator.geolocation) { setCoords({ lat: 55.75, lon: 37.62 }); return; }
    navigator.geolocation.getCurrentPosition(
      (p) => setCoords({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => setCoords({ lat: 55.75, lon: 37.62 }),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);
  return coords;
}

function useWeather(coords) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!coords) return;
    const url = new URL(FUNCTION_URL, window.location.origin);
    url.searchParams.set("lat", coords.lat);
    url.searchParams.set("lon", coords.lon);
    setLoading(true);
    fetch(url).then(r => r.ok ? r.json() : null)
      .then(data => {
        const fact = data?.fact || { temp: 12, humidity: 70, wind_speed: 3, prec_type: 0, condition: "clear" };
        setWeather({ fact });
      })
      .catch(() => setWeather({ fact: { temp: 12, humidity: 70, wind_speed: 3, prec_type: 0, condition: "clear" } }))
      .finally(() => setLoading(false));
  }, [coords]);
  return { weather, loading };
}

// ===== 4) Иконки и маленькие тайлы =====
const IconTemp = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M12 3a2 2 0 00-2 2v8.59a4 4 0 102 0V5a2 2 0 00-2-2z" stroke="#111" strokeWidth="1.5"/>
    <circle cx="12" cy="18" r="2.5" stroke="#111" strokeWidth="1.5"/>
  </svg>
);
const IconWind = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M3 8h10a3 3 0 100-6" stroke="#111" strokeWidth="1.5"/>
    <path d="M3 14h14a3 3 0 110 6" stroke="#111" strokeWidth="1.5"/>
  </svg>
);
const IconHumidity = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M12 3s6 6 6 10a6 6 0 11-12 0c0-4 6-10 6-10z" stroke="#111" strokeWidth="1.5"/>
  </svg>
);
const IconPrecip = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
    <path d="M6 10a5 5 0 019-3 4 4 0 113 7H6a4 4 0 010-4z" stroke="#111" strokeWidth="1.5"/>
  </svg>
);

function InfoTile({ label, value, icon }) {
  return (
    <div className="rounded-2xl p-4 bg-white border border-white/60 shadow-sm select-none">
      <div className="flex items-center gap-2 text-[11px] md:text-xs uppercase tracking-wide opacity-60">
        {icon}
        <span className="whitespace-nowrap">{label}</span>
      </div>
      <div className="text-[20px] md:text-[24px] font-semibold mt-1 leading-snug whitespace-normal break-words max-w-[18rem]">
        {value}
      </div>
    </div>
  );
}

// ===== 5) Манекен (силуэт) + «чипсы» одежды =====
function Mannequin({ season, items }) {
  const theme = SEASON_THEME[season];
  return (
    <div className={`relative w-full max-w-sm mx-auto rounded-3xl p-5 shadow-lg ${theme.chip}`}>
      <svg viewBox="0 0 120 220" className="w-full h-auto">
        <circle cx="60" cy="30" r="16" fill="#e5e7eb" />
        <rect x="56" y="46" width="8" height="10" rx="3" fill="#e5e7eb" />
        <rect x="42" y="56" width="36" height="64" rx="10" fill="#e5e7eb" />
        <rect x="36" y="62" width="10" height="42" rx="6" fill="#e5e7eb" />
        <rect x="74" y="62" width="10" height="42" rx="6" fill="#e5e7eb" />
        <rect x="50" y="120" width="12" height="64" rx="6" fill="#e5e7eb" />
        <rect x="62" y="120" width="12" height="64" rx="6" fill="#e5e7eb" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-2">
        {items?.slice(0, 4).map((it, idx) => (
          <span key={idx} className="px-2 py-1 text-xs rounded-full bg-white/85 shadow">{it}</span>
        ))}
      </div>
    </div>
  );
}

// ===== 6) Главный компонент =====
export default function OutfityApp() {
  const { weather, loading } = useWeather(useGeolocation());
  const [gender, setGender] = useState("female");

  const fact = weather?.fact;
  const tempC = fact?.temp ?? 12;
  const humidity = fact?.humidity ?? 70;
  const wind = fact?.wind_speed ?? 3;
  const precType = fact?.prec_type ?? 0;
  const condition = fact?.condition ?? "clear";

  const rec = useMemo(
    () => pickOutfit({ tempC, windMs: wind, precType: precType, gender }),
    [tempC, wind, precType, gender]
  );

  const season = getSeasonByMonth(new Date().getMonth());
  const theme = SEASON_THEME[season];

  const outfitItems = useMemo(() => (rec?.outfit || "")
    .split(/,|\+| или /g)
    .map(s => s.trim())
    .filter(Boolean), [rec]);

  return (
    <div className={`min-h-screen w-full bg-gradient-to-br ${theme.bg} text-gray-900`}>
      <header className="max-w-6xl mx-auto px-6 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className={`text-3xl md:text-4xl font-extrabold ${theme.accents}`}>Outfity</h1>
          <div className="text-2xl" title={theme.ru}>{theme.art}</div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setGender("female")} className={`px-4 py-2 rounded-2xl text-base font-medium ${gender === 'female' ? 'bg-white shadow' : 'bg-white/70'}`}>👩 Женщина</button>
          <button onClick={() => setGender("male")}   className={`px-4 py-2 rounded-2xl text-base font-medium ${gender === 'male'   ? 'bg-white shadow' : 'bg-white/70'}`}>👨 Мужчина</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pb-12 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Погода */}
        <section className="bg-white/85 backdrop-blur rounded-3xl p-6 md:p-8 shadow-lg">
          <h2 className="text-2xl md:text-3xl font-semibold mb-5">Погода</h2>

          {loading && <p className="text-sm opacity-70">Загружаем погоду…</p>}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
            <InfoTile label="Температура" value={`${tempC}°C`} icon={<IconTemp/>} />
            <InfoTile label="Ветер"        value={`${wind.toFixed(1)} м/с (${windBucketRu(windBucket(wind))})`} icon={<IconWind/>} />
            <InfoTile label="Влажность"    value={`${humidity}%`} icon={<IconHumidity/>} />
            <InfoTile label="Осадки"       value={precipitationRu(precipitationBucket(precType, condition))} icon={<IconPrecip/>} />
          </div>

          <p className="text-xs md:text-sm opacity-60 mt-4">Источник: Netlify Function → Weather API</p>
        </section>

        {/* Рекомендация */}
        <section className="bg-white/85 backdrop-blur rounded-3xl p-6 md:p-8 shadow-lg flex flex-col">
          <h2 className="text-2xl md:text-3xl font-semibold mb-4">Рекомендованный лук</h2>
          <div className="grid md:grid-cols-2 gap-6 items-start">
            <div>
              <p className="text-base md:text-lg leading-relaxed break-words"><b>Описание:</b> {rec?.outfit}</p>
              <p className="text-base md:text-lg leading-relaxed mt-2 break-words"><b>Аксессуары:</b> {rec?.accessories}</p>
              <p className="text-sm md:text-base mt-4">Сезон: <span className={`font-semibold ${theme.accents}`}>{theme.ru}</span></p>
            </div>
            <Mannequin season={season} items={outfitItems} />
          </div>
        </section>
      </main>

      <footer className="max-w-6xl mx-auto px-6 pb-8 text-xs md:text-sm opacity-70 text-center">
        Источник: Netlify Function, геолокация — браузер. Тема интерфейса по сезону ({theme.ru}).
      </footer>
    </div>
  );
}
