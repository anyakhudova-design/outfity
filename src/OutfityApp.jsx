import React, { useEffect, useMemo, useState } from "react";

// ===== Outfity — improved UI + icons + layered avatar clothing (SVG) =====
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
function windBucketRu(b){ return b==="weak"?"слабый": b==="medium"?"средний":"сильный"; }
function precipitationBucket(p){ // 0=none,1=rain,2=snow,3=mix
  if(!p || p===0) return "none"; if(p===2) return "snow"; if(p===3) return "rain"; return "rain";
}
function precipitationRu(code){
  return code==="snow"?"снег": code==="rain"?"дождь": code==="light_rain"?"небольшой дождь": code==="snowstorm"?"метель":"без осадков";
}

// --- Dataset (базовая одежда) ---
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

function pickOutfit({ tempC, windMs, precType, gender }){
  const wind = windBucket(windMs);
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

// --- Icons (inline SVG) ---
const IconTemp = ()=> (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M10 13.5a4 4 0 104 4V5a2 2 0 10-4 0v8.5z" stroke="#111" strokeWidth="1.5"/><path d="M10 8h4" stroke="#111" strokeWidth="1.5"/></svg>
);
const IconWind = ()=> (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 8h10a3 3 0 100-6" stroke="#111" strokeWidth="1.5"/><path d="M3 14h14a3 3 0 110 6" stroke="#111" strokeWidth="1.5"/><path d="M3 11h8" stroke="#111" strokeWidth="1.5"/></svg>
);
const IconHumidity = ()=> (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 3s6 6 6 10a6 6 0 11-12 0c0-4 6-10 6-10z" stroke="#111" strokeWidth="1.5"/></svg>
);
const IconPrecip = ()=> (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M6 10a5 5 0 019-3 4 4 0 113 7H6a4 4 0 010-4z" stroke="#111" strokeWidth="1.5"/></svg>
);

// --- UI small components ---
function InfoTile({label,value,icon}){
  return (
    <div className="rounded-2xl p-4 bg-white border border-white/60 shadow-sm">
      <div className="flex items-center gap-2 text-[11px] md:text-xs uppercase tracking-wide opacity-60">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-xl md:text-2xl font-semibold mt-1 leading-tight whitespace-nowrap">{value}</div>
    </div>
  );
}

// --- Avatar with layered clothing (SVG) ---
// We parse outfit keywords → layers
function outfitToLayers(outfit){
  const text = (outfit||"").toLowerCase();
  const has = (w)=> text.includes(w);
  return {
    headwear: has("шапк") || has("панам") || has("капюшон"),
    scarf: has("шарф") || has("баф"),
    outer: has("пальто")||has("куртк")||has("ветровк")||has("пуховик")||has("плащ"),
    top: has("свитер")||has("свитшот")||has("худи")||has("рубашк")||has("футболк")||has("водолазк")||has("платье"),
    bottom: has("джинс")||has("брюк")||has("чинос")||has("шорт")||has("платье"),
    shoes: has("ботинк")||has("кеды")||has("сапог")||has("сандал"),
    dress: has("платье"),
  };
}

function MannequinClothed({ gender, outfit, theme }){
  const layers = outfitToLayers(outfit);
  const skin = "#f3e7db";
  const cloth = {
    outer: "#c8d8ff",
    top: gender==="female"?"#ffd6e7":"#d7f7d7",
    bottom: "#bcd2ff",
    shoes: "#9aa7b1",
    headwear: "#ffebb0",
    scarf: "#ffd1a1",
    dress: "#ffd6e7",
  };
  const head = gender === "female" ? "👩" : "👨";
  return (
    <div className={`relative w-full max-w-sm mx-auto rounded-3xl p-5 shadow-lg ${theme.chip}`}>
      {/* BODY */}
      <svg viewBox="0 0 120 220" className="w-full h-auto">
        {/* head */}
        <circle cx="60" cy="30" r="16" fill={skin} />
        {/* neck */}
        <rect x="56" y="46" width="8" height="10" rx="3" fill={skin} />
        {/* torso */}
        <rect x="42" y="56" width="36" height="60" rx="10" fill={skin} />
        {/* legs */}
        <rect x="48" y="116" width="10" height="60" rx="5" fill={skin} />
        <rect x="62" y="116" width="10" height="60" rx="5" fill={skin} />
        {/* arms */}
        <rect x="30" y="60" width="10" height="40" rx="5" fill={skin} />
        <rect x="80" y="60" width="10" height="40" rx="5" fill={skin} />

        {/* CLOTHING LAYERS */}
        {/* dress (covers torso + legs top) */}
        {layers.dress && (
          <path d="M42 65 h36 v40 q0 14 -18 14 q-18 0 -18 -14z" fill={cloth.dress} />
        )}
        {/* top */}
        {layers.top && !layers.dress && (
          <path d="M42 60 h36 v32 a8 8 0 0 1 -8 8 h-20 a8 8 0 0 1 -8 -8z" fill={cloth.top} />
        )}
        {/* bottom */}
        {layers.bottom && !layers.dress && (
          <g fill={cloth.bottom}>
            <rect x="48" y="100" width="10" height="30" rx="4" />
            <rect x="62" y="100" width="10" height="30" rx="4" />
          </g>
        )}
        {/* outerwear */}
        {layers.outer && (
          <path d="M40 58 h40 v34 l-6 26 h-28 l-6 -26z" fill={cloth.outer} opacity="0.95" />
        )}
        {/* scarf */}
        {layers.scarf && (
          <g fill={cloth.scarf}>
            <rect x="48" y="50" width="24" height="8" rx="4" />
            <rect x="62" y="58" width="6" height="18" rx="3" />
          </g>
        )}
        {/* headwear */}
        {layers.headwear && (
          <path d="M44 22 q16 -12 32 0 v6 h-32z" fill={cloth.headwear} />
        )}
        {/* shoes */}
        {layers.shoes && (
          <g fill={cloth.shoes}>
            <rect x="46" y="176" width="14" height="6" rx="3" />
            <rect x="60" y="176" width="14" height="6" rx="3" />
          </g>
        )}
      </svg>
      <div className="absolute top-3 right-3 text-2xl" title={gender}>{head}</div>
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

  return (
    <div className={`min-h-screen w-full bg-gradient-to-br ${theme.bg} text-gray-900`}>
      <header className="max-w-6xl mx-auto px-6 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className={`text-3xl md:text-4xl font-extrabold ${theme.accents}`}>Outfity</h1>
          <div className="text-2xl">{theme.art}</div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={()=>setGender("female")} className={`px-4 py-2 rounded-2xl text-base font-medium ${gender==='female'?'bg-white shadow':'bg-white/70'}`}>👩 Женщина</button>
          <button onClick={()=>setGender("male")} className={`px-4 py-2 rounded-2xl text-base font-medium ${gender==='male'?'bg-white shadow':'bg-white/70'}`}>👨 Мужчина</button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pb-12 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Weather card */}
        <section className="bg-white/85 backdrop-blur rounded-3xl p-6 md:p-8 shadow-lg">
          <h2 className="text-2xl md:text-3xl font-semibold mb-4">Погода</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoTile label="Температура" value={`${tempC}°C`} icon={<IconTemp/>} />
            <InfoTile label="Ветер" value={`${wind.toFixed(1)} м/с (${windBucketRu(windBucket(wind))})`} icon={<IconWind/>} />
            <InfoTile label="Влажность" value={`${humidity}%`} icon={<IconHumidity/>} />
            <InfoTile label="Осадки" value={precipitationRu(precipitationBucket(prec))} icon={<IconPrecip/>} />
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
            <MannequinClothed gender={gender} outfit={`${rec?.outfit}, ${rec?.accessories}`} theme={theme} />
          </div>
        </section>
      </main>

      <footer className="max-w-6xl mx-auto px-6 pb-8 text-xs md:text-sm opacity-70 text-center">
        Источник: Netlify Function, геолокация — браузер. Тема интерфейса по сезону ({theme.ru}).
      </footer>
    </div>
  );
}
