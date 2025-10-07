import React, { useEffect, useMemo, useState } from "react";

// ===== Outfity — improved UI + correct dataset + avatar/mannequin =====
// Proxy-only mode: call Netlify function directly (no netlify.toml required)
const FUNCTION_URL = "/.netlify/functions/weather";

// --- Seasons ---
function getSeasonByMonth(m){
  if([11,0,1].includes(m)) return "winter";
  if([2,3,4].includes(m)) return "spring";
  if([5,6,7].includes(m)) return "summer";
  return "autumn";
}
const SEASON_THEME = {
  autumn: { bg:"from-amber-100 to-orange-200", accents:"text-orange-800", chip:"bg-orange-200", art:"🍁", ru:"Осень" },
  winter: { bg:"from-sky-100 to-blue-200",    accents:"text-sky-800",    chip:"bg-sky-200",    art:"❄️", ru:"Зима" },
  spring: { bg:"from-rose-100 to-pink-200",   accents:"text-pink-800",   chip:"bg-pink-200",   art:"🌸", ru:"Весна" },
  summer: { bg:"from-lime-100 to-yellow-200", accents:"text-green-800",  chip:"bg-yellow-200", art:"🍓", ru:"Лето"  },
};

// --- Helpers ---
function windBucket(s){ if(s==null) return "weak"; if(s<4) return "weak"; if(s<8) return "medium"; return "strong"; }
function precipitationBucket(p){ // 0=none,1=rain,2=snow,3=mix
  if(!p || p===0) return "none"; if(p===2) return "snow"; if(p===3) return "rain"; return "rain";
}
function precipitationRu(code){
  return code==="snow"?"снег": code==="rain"?"дождь": code==="light_rain"?"небольшой дождь": code==="snowstorm"?"метель":"без осадков";
}

// --- Dataset (расширенный, базовая одежда) ---
const OUTFIT_DATASET = [
  { temp_min: 25, temp_max: 35, wind: "weak",   precipitation: "none",       gender: "female", outfit: "лёгкое платье из хлопка, топ + шорты", accessories: "панама, очки, сандалии" },
  { temp_min: 25, temp_max: 35, wind: "weak",   precipitation: "none",       gender: "male",   outfit: "футболка, шорты, поло + лёгкие брюки", accessories: "кепка, очки, кеды/мокасины" },
  { temp_min: 20, temp_max: 25, wind: "medium", precipitation: "light_rain", gender: "female", outfit: "рубашка + джинсы, платье-рубашка + кардиган", accessories: "зонт, кроссовки/лоферы" },
  { temp_min: 20, temp_max: 25, wind: "medium", precipitation: "light_rain", gender: "male",   outfit: "футболка + джинсы, лёгкая ветровка", accessories: "зонт, кроссовки" },
  { temp_min: 15, temp_max: 20, wind: "medium", precipitation: "none",       gender: "female", outfit: "джинсы + футболка + жакет/бомбер", accessories: "лёгкий шарф, кеды" },
  { temp_min: 15, temp_max: 20, wind: "medium", precipitation: "none",       gender: "male",   outfit: "чиносы + футболка + джинсовка", accessories: "лёгкий рюкзак, часы" },
  { temp_min: 10, temp_max: 15, wind: "weak",   precipitation: "rain",       gender: "female", outfit: "джинсы, свитшот, плащ", accessories: "зонт, непромокаемая обувь" },
  { temp_min: 10, temp_max: 15, wind: "weak",   precipitation: "rain",       gender: "male",   outfit: "джинсы, свитер, ветровка", accessories: "зонт, непромокаемые кроссовки" },
  { temp_min: 5,  temp_max: 10, wind: "strong", precipitation: "none",       gender: "female", outfit: "джинсы, свитер, пальто/плотная куртка", accessories: "шарф, при ветре — шапка" },
  { temp_min: 5,  temp_max: 10, wind: "strong", precipitation: "none",       gender: "male",   outfit: "джинсы, худи, куртка, ботинки", accessories: "шарф, при ветре — шапка" },
  { temp_min: 0,  temp_max: 5,  wind: "medium", precipitation: "snow",       gender: "female", outfit: "джинсы, свитер, пуховик, сапоги", accessories: "шапка, перчатки, шарф" },
  { temp_min: 0,  temp_max: 5,  wind: "medium", precipitation: "snow",       gender: "male",   outfit: "джинсы, водолазка, утеплённая куртка, ботинки", accessories: "шапка, перчатки, шарф" },
  { temp_min: -5, temp_max: 0,  wind: "medium", precipitation: "snow",       gender: "female", outfit: "тёплые брюки, свитер, пуховик", accessories: "шапка, шарф, варежки" },
  { temp_min: -5, temp_max: 0,  wind: "medium", precipitation: "snow",       gender: "male",   outfit: "тёплые брюки, свитер, парка", accessories: "шапка, шарф, перчатки" },
  { temp_min: -10,temp_max: -5, wind: "strong", precipitation: "snow",       gender: "female", outfit: "термокомплект, шерстяной свитер, длинный пуховик", accessories: "шапка, варежки, баф" },
  { temp_min: -10,temp_max: -5, wind: "strong", precipitation: "snow",       gender: "male",   outfit: "термобельё, свитер, парка", accessories: "шапка, перчатки, шарф" },
  { temp_min: -20,temp_max: -10,wind: "strong", precipitation: "snowstorm",  gender: "female", outfit: "термокомплект, свитер, длинный пуховик", accessories: "шапка, варежки, капюшон" },
  { temp_min: -20,temp_max: -10,wind: "strong", precipitation: "snowstorm",  gender: "male",   outfit: "термобельё, свитер, парка", accessories: "шапка, перчатки, капюшон" },
];

function pickOutfit({ tempC, windMs, precType, gender }){
  const wind = windBucket(windMs);
  // если от функции пришёл только 0/1/2 — маппим
  const precipitation = precipitationBucket(precType);
  const exact = OUTFIT_DATASET.find(r => tempC>=r.temp_min && tempC<=r.temp_max && r.wind===wind && r.precipitation===precipitation && r.gender===gender);
  if (exact) return exact;
  const byTemp = OUTFIT_DATASET.find(r => tempC>=r.temp_min && tempC<=r.temp_max && r.gender===gender);
  if (byTemp) return byTemp;
  return OUTFIT_DATASET.find(r=>r.gender===gender) || OUTFIT_DATASET[0];
}

// --- Data hooks ---
function useGeolocation(){
  const [coords,setCoords] = useState(null);
  useEffect(()=>{
    if(!navigator.geolocation){ setCoords({lat:55.75,lon:37.62}); return; }
    navigator.geolocation.getCurrentPosition(
      pos=> setCoords({lat: pos.coords.latitude, lon: pos.coords.longitude}),
      ()=> setCoords({lat:55.75,lon:37.62}),
      { enableHighAccuracy:true, timeout:10000 }
    );
  },[]);
  return coords;
}
function useWeather(coords){
  const [fact,setFact] = useState(null);
  const [source,setSource] = useState("proxy");
  useEffect(()=>{
    if(!coords) return;
    const url = new URL(FUNCTION_URL, window.location.origin);
    url.searchParams.set("lat", coords.lat);
    url.searchParams.set("lon", coords.lon);
    url.searchParams.set("lang", "ru_RU");
    fetch(url).then(r=> r.ok? r.json(): null).then(data=>{
      const f = data?.fact || null;
      setFact(f || { temp:12, humidity:70, wind_speed:3, prec_type:0 });
    }).catch(()=>{
      setSource("mock");
      setFact({ temp:12, humidity:70, wind_speed:3, prec_type:0 });
    });
  },[coords]);
  return { fact, source };
}

// --- UI small components ---
function InfoTile({label,value}){
  return (
    <div className="rounded-2xl p-4 bg-white border border-white/60 shadow-sm text-base md:text-lg">
      <div className="text-xs md:text-sm uppercase tracking-wide opacity-60">{label}</div>
      <div className="text-lg md:text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function Mannequin({ gender, items, theme }){
  const head = gender === "female" ? "👩" : "👨";
  return (
    <div className={`relative w-full max-w-sm mx-auto rounded-3xl p-5 shadow-lg ${theme.chip}`}>
      <div className="text-5xl text-center mb-2">{head}</div>
      <svg viewBox="0 0 120 200" className="w-full h-auto">
        <rect x="45" y="40" width="30" height="60" rx="8" fill="#e5e7eb" />
        <rect x="45" y="100" width="12" height="60" rx="6" fill="#e5e7eb" />
        <rect x="63" y="100" width="12" height="60" rx="6" fill="#e5e7eb" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-2 pointer-events-none">
        {items.slice(0,5).map((it,i)=> (
          <span key={i} className="px-3 py-1 text-xs md:text-sm rounded-full bg-white/90 shadow">{it}</span>
        ))}
      </div>
    </div>
  );
}

export default function OutfityApp(){
  const coords = useGeolocation();
  const { fact, source } = useWeather(coords);
  const [gender,setGender] = useState("female");

  const tempC = fact?.temp ?? 12;
  const humidity = fact?.humidity ?? 70;
  const wind = fact?.wind_speed ?? 3;
  const prec = fact?.prec_type ?? 0;

  const rec = useMemo(()=> pickOutfit({ tempC, windMs: wind, precType: prec, gender }), [tempC, wind, prec, gender]);
  const season = getSeasonByMonth(new Date().getMonth());
  const theme = SEASON_THEME[season];
  const outfitItems = useMemo(()=> (rec?.outfit||"").split(/,|\+| или /g).map(s=>s.trim()).filter(Boolean), [rec]);

  return (
    <div className={`min-h-screen w-full bg-gradient-to-br ${theme.bg} text-gray-900`}>
      <header className="max-w-6xl mx-auto px-6 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className={`text-3xl md:text-4xl font-extrabold ${theme.accents}`}>Outfity</h1>
          <div className="text-2xl">{theme.art}</div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={()=>setGender("female")} className={`px-4 py-2 rounded-2xl text-base md:text-lg font-medium ${gender==='female'?'bg-white shadow':'bg-white/70'}`}>👩 Женщина</button>
          <button onClick={()=>setGender("male")} className={`px-4 py-2 rounded-2xl text-base md:text-lg font-medium ${gender==='male'?'bg-white shadow':'bg-white/70'}`}>👨 Мужчина</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pb-12 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Weather card */}
        <section className="bg-white/85 backdrop-blur rounded-3xl p-6 md:p-8 shadow-lg">
          <h2 className="text-2xl md:text-3xl font-semibold mb-4">Погода</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoTile label="Температура" value={`${tempC}°C`} />
            <InfoTile label="Ветер" value={`${wind.toFixed(1)} м/с (${windBucket(wind)})`} />
            <InfoTile label="Влажность" value={`${humidity}%`} />
            <InfoTile label="Осадки" value={precipitationRu(precipitationBucket(prec))} />
          </div>
          <p className="text-xs md:text-sm opacity-60 mt-4">Источник: {source==='mock'? 'Mock' : 'Netlify proxy → Weather API'}</p>
        </section>

        {/* Outfit card with avatar/mannequin */}
        <section className="bg-white/85 backdrop-blur rounded-3xl p-6 md:p-8 shadow-lg flex flex-col">
          <h2 className="text-2xl md:text-3xl font-semibold mb-4">Рекомендованный лук</h2>
          <div className="grid md:grid-cols-2 gap-6 items-start">
            <div>
              <p className="text-base md:text-lg leading-relaxed"><b>Описание:</b> {rec?.outfit}</p>
              <p className="text-base md:text-lg leading-relaxed mt-2"><b>Аксессуары:</b> {rec?.accessories}</p>
              <p className="text-sm md:text-base mt-4">Сезон: <span className={`font-semibold ${theme.accents}`}>{theme.ru}</span></p>
            </div>
            <Mannequin gender={gender} items={outfitItems} theme={theme} />
          </div>
        </section>
      </main>

      <footer className="max-w-6xl mx-auto px-6 pb-8 text-xs md:text-sm opacity-70 text-center">
        Источник: Netlify Function, геолокация — браузер. Тема интерфейса по сезону ({theme.ru}).
      </footer>
    </div>
  );
}
