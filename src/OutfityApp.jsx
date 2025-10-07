import React, { useEffect, useState } from "react";

// Proxy mode (Netlify Functions)
const USE_NETLIFY_PROXY = true;
const SEASON_THEME = {
  autumn: { bg: "from-amber-100 to-orange-200", accents: "text-orange-800", art: "🍁" },
  winter: { bg: "from-sky-100 to-blue-200", accents: "text-sky-800", art: "❄️" },
  spring: { bg: "from-rose-100 to-pink-200", accents: "text-pink-800", art: "🌸" },
  summer: { bg: "from-lime-100 to-yellow-200", accents: "text-green-800", art: "🍓" },
};

function getSeasonByMonth(m) {
  if ([11,0,1].includes(m)) return "winter";
  if ([2,3,4].includes(m)) return "spring";
  if ([5,6,7].includes(m)) return "summer";
  return "autumn";
}

function windBucket(s) { if (s < 4) return "weak"; if (s < 8) return "medium"; return "strong"; }
function precipitationBucket(p) { if (!p || p===0) return "none"; if (p===1) return "rain"; if (p===2) return "snow"; return "rain"; }

const DATASET = [
  { temp_min: 20, temp_max: 35, wind: "weak", precipitation: "none", gender: "female", outfit: "платье, сандалии, очки" },
  { temp_min: 20, temp_max: 35, wind: "weak", precipitation: "none", gender: "male", outfit: "футболка, шорты, кеды" },
  { temp_min: 10, temp_max: 20, wind: "medium", precipitation: "rain", gender: "female", outfit: "плащ, джинсы, зонт" },
  { temp_min: 10, temp_max: 20, wind: "medium", precipitation: "rain", gender: "male", outfit: "ветровка, джинсы, зонт" },
  { temp_min: 0, temp_max: 10, wind: "medium", precipitation: "snow", gender: "female", outfit: "пуховик, сапоги, шарф" },
  { temp_min: 0, temp_max: 10, wind: "medium", precipitation: "snow", gender: "male", outfit: "куртка, ботинки, шарф" },
];

function pickOutfit(t, w, p, g) {
  const wind = windBucket(w), prec = precipitationBucket(p);
  return DATASET.find(r => t >= r.temp_min && t <= r.temp_max && r.wind===wind && r.precipitation===prec && r.gender===g) || DATASET[0];
}

export default function OutfityApp() {
  const [gender, setGender] = useState("female");
  const [weather, setWeather] = useState(null);
  const season = getSeasonByMonth(new Date().getMonth());
  const theme = SEASON_THEME[season];

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(async pos => {
      const url = new URL('/api/weather', window.location.origin);
      url.searchParams.set('lat', pos.coords.latitude);
      url.searchParams.set('lon', pos.coords.longitude);
      const res = await fetch(url).catch(()=>null);
      const data = res && res.ok ? await res.json() : { fact:{ temp:12, wind_speed:3, prec_type:1, humidity:70 } };
      setWeather(data);
    });
  }, []);

  const f = weather?.fact;
  const rec = f ? pickOutfit(f.temp, f.wind_speed, f.prec_type, gender) : null;

  return (
    <div className={`min-h-screen bg-gradient-to-br ${theme.bg} text-gray-900`}>
      <header className="flex justify-between p-4 max-w-4xl mx-auto">
        <h1 className={`text-2xl font-bold ${theme.accents}`}>Outfity {theme.art}</h1>
        <div className="flex gap-2">
          <button onClick={()=>setGender('female')} className={`px-3 py-1 rounded ${gender==='female'?'bg-white shadow':'bg-white/70'}`}>👩</button>
          <button onClick={()=>setGender('male')} className={`px-3 py-1 rounded ${gender==='male'?'bg-white shadow':'bg-white/70'}`}>👨</button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto p-4 grid md:grid-cols-2 gap-4">
        <section className="bg-white/80 p-4 rounded-xl shadow text-sm">
          <h2 className="text-lg font-semibold mb-2">Погода</h2>
          {f ? <ul><li>🌡 {f.temp}°C</li><li>💨 {f.wind_speed} м/с</li><li>💧 {f.humidity}%</li></ul> : <p>Загружаем погоду…</p>}
        </section>
        <section className="bg-white/80 p-4 rounded-xl shadow text-sm">
          {rec && <><p><b>Рекомендованный лук:</b> {rec.outfit}</p></>}
          <p className="mt-3">Сезон: {season}</p>
        </section>
      </main>
      <footer className="text-center text-xs py-4 opacity-60">Источник: Netlify proxy → Yandex Weather API</footer>
    </div>
  );
}
