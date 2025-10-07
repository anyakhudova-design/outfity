 (cd "$(git rev-parse --show-toplevel)" && git apply --3way <<'EOF' 
diff --git a/src/OutfityApp.jsx b/src/OutfityApp.jsx
index e286f3b7b139a01c34b9097d47b6e43f611f987c..4d0f0e1e91e388253516416c3a3571fef6e50248 100644
--- a/src/OutfityApp.jsx
+++ b/src/OutfityApp.jsx
@@ -1,341 +1,477 @@
 import React, { useEffect, useMemo, useState } from "react";
 
-/**
- * Outfity — чистая версия с манекеном + чипсами одежды
- * - Эмодзи сезонов в шапке
- * - Плитки погоды с иконками
- * - Нормальные переносы текста (break-words) — ничего не «вылезает»
- * - Без PNG-слоёв, без «бумажных кукол»
- */
-
-// ===== 1) Константы и помощники =====
-const FUNCTION_URL = "/.netlify/functions/weather"; // если нет функции — будет мок
-
-function getSeasonByMonth(m) {
-  if ([11, 0, 1].includes(m)) return "winter";
-  if ([2, 3, 4].includes(m)) return "spring";
-  if ([5, 6, 7].includes(m)) return "summer";
-  return "autumn";
-}
+// =============================
+// Общие константы и настройки
+// =============================
+const FUNCTION_URL = "/.netlify/functions/weather";
+const DEFAULT_FACT = {
+  temp: 12,
+  humidity: 70,
+  wind_speed: 3,
+  prec_type: 0,
+  condition: "clear",
+};
+const FALLBACK_COORDS = { lat: 55.75, lon: 37.62 };
 
 const SEASON_THEME = {
-  autumn: { bg: "from-amber-100 to-orange-200", accents: "text-orange-800", chip: "bg-orange-200", art: "🍁", ru: "Осень" },
-  winter: { bg: "from-sky-100 to-blue-200",    accents: "text-sky-800",    chip: "bg-sky-200",    art: "❄️", ru: "Зима"  },
-  spring: { bg: "from-rose-100 to-pink-200",   accents: "text-pink-800",   chip: "bg-pink-200",   art: "🌸", ru: "Весна" },
-  summer: { bg: "from-lime-100 to-yellow-200", accents: "text-green-800",  chip: "bg-yellow-200", art: "🍓", ru: "Лето"  },
+  winter: {
+    ru: "Зима",
+    accent: "text-sky-800",
+    gradient: "from-[#f1f5ff] to-[#dbeafe]",
+    panel: "bg-white/90 shadow-[0_15px_45px_rgba(59,130,246,0.18)]",
+    chip: "bg-sky-100 text-sky-800",
+    emoji: "❄️",
+  },
+  spring: {
+    ru: "Весна",
+    accent: "text-pink-700",
+    gradient: "from-[#fff5f7] to-[#ffe4e6]",
+    panel: "bg-white/90 shadow-[0_15px_45px_rgba(244,114,182,0.18)]",
+    chip: "bg-rose-100 text-rose-700",
+    emoji: "🌸",
+  },
+  summer: {
+    ru: "Лето",
+    accent: "text-green-700",
+    gradient: "from-[#f8ffeb] to-[#fef08a]",
+    panel: "bg-white/90 shadow-[0_15px_45px_rgba(101,163,13,0.15)]",
+    chip: "bg-lime-100 text-lime-700",
+    emoji: "🍓",
+  },
+  autumn: {
+    ru: "Осень",
+    accent: "text-orange-800",
+    gradient: "from-[#fff3e0] to-[#fed7aa]",
+    panel: "bg-white/90 shadow-[0_15px_45px_rgba(234,88,12,0.18)]",
+    chip: "bg-amber-100 text-amber-800",
+    emoji: "🍁",
+  },
 };
 
-function windBucket(s) { if (s == null) return "weak"; if (s < 4) return "weak"; if (s < 8) return "medium"; return "strong"; }
-function windBucketRu(b) { return b === "weak" ? "слабый" : b === "medium" ? "средний" : "сильный"; }
-function precipitationBucket(p, condition = "") {
-  if (!p || p === 0) return "none";
-  if (p === 2) return "snow";
-  if (p === 3) return "rain";
+function getSeasonByMonth(monthIndex) {
+  if ([11, 0, 1].includes(monthIndex)) return "winter";
+  if ([2, 3, 4].includes(monthIndex)) return "spring";
+  if ([5, 6, 7].includes(monthIndex)) return "summer";
+  return "autumn";
+}
+
+// =============================
+// Вспомогательные функции
+// =============================
+function windBucket(speed) {
+  if (speed == null) return "weak";
+  if (speed < 4) return "weak";
+  if (speed < 8) return "medium";
+  return "strong";
+}
+
+function windBucketRu(bucket) {
+  if (bucket === "weak") return "слабый";
+  if (bucket === "medium") return "средний";
+  return "сильный";
+}
+
+function precipitationBucket(code) {
+  if (!code || code === 0) return "none";
+  if (code === 2) return "snow";
+  if (code === 3) return "rain";
   return "rain";
 }
-function precipitationRu(code) {
-  return code === "snow" ? "снег"
-    : code === "rain" ? "дождь"
-    : code === "light_rain" ? "небольшой дождь"
-    : code === "snowstorm" ? "метель"
-    : "без осадков";
+
+function precipitationRu(bucket) {
+  switch (bucket) {
+    case "snow":
+      return "снег";
+    case "rain":
+      return "дождь";
+    case "light_rain":
+      return "небольшой дождь";
+    case "snowstorm":
+      return "метель";
+    default:
+      return "без осадков";
+  }
 }
 
-// ===== 2) Базовый датасет базовой одежды =====
+// =============================
+// База рекомендаций
+// =============================
 const OUTFIT_DATASET = [
   { temp_min: 25, temp_max: 35, wind: "weak",   precipitation: "none",       gender: "female", outfit: "лёгкое платье из хлопка, сандалии", accessories: "панама, очки" },
   { temp_min: 25, temp_max: 35, wind: "weak",   precipitation: "none",       gender: "male",   outfit: "футболка, шорты, кеды", accessories: "кепка, очки" },
-
   { temp_min: 20, temp_max: 25, wind: "medium", precipitation: "light_rain", gender: "female", outfit: "рубашка, джинсы, кардиган, кроссовки", accessories: "зонт" },
   { temp_min: 20, temp_max: 25, wind: "medium", precipitation: "light_rain", gender: "male",   outfit: "футболка, джинсы, ветровка, кроссовки", accessories: "зонт" },
-
   { temp_min: 15, temp_max: 20, wind: "medium", precipitation: "none",       gender: "female", outfit: "футболка, джинсы, жакет, кеды", accessories: "лёгкий шарф" },
   { temp_min: 15, temp_max: 20, wind: "medium", precipitation: "none",       gender: "male",   outfit: "футболка, чиносы, джинсовка, кеды", accessories: "часы" },
-
   { temp_min: 10, temp_max: 15, wind: "weak",   precipitation: "rain",       gender: "female", outfit: "свитшот, джинсы, плащ, ботинки", accessories: "зонт" },
   { temp_min: 10, temp_max: 15, wind: "weak",   precipitation: "rain",       gender: "male",   outfit: "свитер, джинсы, ветровка, кроссовки", accessories: "зонт" },
-
   { temp_min: 5,  temp_max: 10, wind: "strong", precipitation: "none",       gender: "female", outfit: "свитер, джинсы, пальто, ботинки", accessories: "шарф, шапка" },
   { temp_min: 5,  temp_max: 10, wind: "strong", precipitation: "none",       gender: "male",   outfit: "худи, джинсы, куртка, ботинки", accessories: "шапка" },
-
   { temp_min: 0,  temp_max: 5,  wind: "medium", precipitation: "snow",       gender: "female", outfit: "свитер, джинсы, пуховик, сапоги", accessories: "шапка, перчатки, шарф" },
   { temp_min: 0,  temp_max: 5,  wind: "medium", precipitation: "snow",       gender: "male",   outfit: "водолазка, джинсы, утеплённая куртка, ботинки", accessories: "шапка, перчатки, шарф" },
-
   { temp_min: -5, temp_max: 0,  wind: "medium", precipitation: "snow",       gender: "female", outfit: "тёплые брюки, свитер, пуховик, сапоги", accessories: "шапка, шарф, варежки" },
   { temp_min: -5, temp_max: 0,  wind: "medium", precipitation: "snow",       gender: "male",   outfit: "тёплые брюки, свитер, парка, ботинки", accessories: "шапка, шарф, перчатки" },
-
   { temp_min: -10,temp_max: -5, wind: "strong", precipitation: "snow",       gender: "female", outfit: "термокомплект, свитер, длинный пуховик, сапоги", accessories: "шапка, варежки, баф" },
   { temp_min: -10,temp_max: -5, wind: "strong", precipitation: "snow",       gender: "male",   outfit: "термобельё, свитер, парка, зимние ботинки", accessories: "шапка, перчатки, шарф" },
-
   { temp_min: -20,temp_max: -10,wind: "strong", precipitation: "snowstorm",  gender: "female", outfit: "термокомплект, свитер, длинный пуховик, сапоги", accessories: "шапка, варежки, капюшон" },
   { temp_min: -20,temp_max: -10,wind: "strong", precipitation: "snowstorm",  gender: "male",   outfit: "термобельё, свитер, парка, зимние ботинки", accessories: "шапка, перчатки, капюшон" },
 ];
 
 function pickOutfit({ tempC, windMs, precType, gender }) {
   const wind = windBucket(windMs);
   const precipitation = precipitationBucket(precType);
-  const exact = OUTFIT_DATASET.find(r =>
-    tempC >= r.temp_min && tempC <= r.temp_max &&
-    r.wind === wind && r.precipitation === precipitation && r.gender === gender
+  const exact = OUTFIT_DATASET.find(
+    (row) =>
+      tempC >= row.temp_min &&
+      tempC <= row.temp_max &&
+      row.wind === wind &&
+      row.precipitation === precipitation &&
+      row.gender === gender
   );
   if (exact) return exact;
-  const byTemp = OUTFIT_DATASET.find(r => tempC >= r.temp_min && tempC <= r.temp_max && r.gender === gender);
+  const byTemp = OUTFIT_DATASET.find(
+    (row) => tempC >= row.temp_min && tempC <= row.temp_max && row.gender === gender
+  );
   if (byTemp) return byTemp;
-  return OUTFIT_DATASET.find(r => r.gender === gender) || OUTFIT_DATASET[0];
+  return OUTFIT_DATASET.find((row) => row.gender === gender) ?? OUTFIT_DATASET[0];
 }
 
-// ===== 3) Хуки: гео и погода =====
+// =============================
+// Хуки
+// =============================
 function useGeolocation() {
   const [coords, setCoords] = useState(null);
+
   useEffect(() => {
-    if (!navigator.geolocation) { setCoords({ lat: 55.75, lon: 37.62 }); return; }
-    navigator.geolocation.getCurrentPosition(
-      (p) => setCoords({ lat: p.coords.latitude, lon: p.coords.longitude }),
-      () => setCoords({ lat: 55.75, lon: 37.62 }),
+    if (!navigator.geolocation) {
+      setCoords(FALLBACK_COORDS);
+      return;
+    }
+
+    const watcher = navigator.geolocation.getCurrentPosition(
+      (position) => {
+        setCoords({ lat: position.coords.latitude, lon: position.coords.longitude });
+      },
+      () => setCoords(FALLBACK_COORDS),
       { enableHighAccuracy: true, timeout: 10000 }
     );
+
+    return () => {
+      if (typeof watcher === "number" && navigator.geolocation.clearWatch) {
+        navigator.geolocation.clearWatch(watcher);
+      }
+    };
   }, []);
+
   return coords;
 }
 
 function useWeather(coords) {
   const [weather, setWeather] = useState(null);
   const [loading, setLoading] = useState(false);
+
   useEffect(() => {
     if (!coords) return;
+
     const url = new URL(FUNCTION_URL, window.location.origin);
     url.searchParams.set("lat", coords.lat);
     url.searchParams.set("lon", coords.lon);
+
     setLoading(true);
-    fetch(url).then(r => r.ok ? r.json() : null)
-      .then(data => {
-        const fact = data?.fact || { temp: 12, humidity: 70, wind_speed: 3, prec_type: 0, condition: "clear" };
+
+    fetch(url.toString())
+      .then((response) => (response.ok ? response.json() : null))
+      .then((data) => {
+        const fact = data?.fact ?? DEFAULT_FACT;
         setWeather({ fact });
       })
-      .catch(() => setWeather({ fact: { temp: 12, humidity: 70, wind_speed: 3, prec_type: 0, condition: "clear" } }))
+      .catch(() => {
+        setWeather({ fact: DEFAULT_FACT });
+      })
       .finally(() => setLoading(false));
   }, [coords]);
+
   return { weather, loading };
 }
 
-// ===== 4) Иконки и маленькие тайлы =====
+// =============================
+// Маппинг изображений
+// =============================
+const AVATAR_SRC = {
+  female: "/user-assets/avatars/female.png",
+  male: "/user-assets/avatars/male.png",
+};
+
+const ITEM_IMAGES = {
+  "свитшот": "/user-assets/items/top_sweater.png",
+  "свитер": "/user-assets/items/top_sweater.png",
+  "кардиган": "/user-assets/items/top_sweater.png",
+  "рубашк": "/user-assets/items/top_sweater.png",
+  "худи": "/user-assets/items/top_sweater.png",
+  "ветровк": "/user-assets/items/outer_trench.png",
+  "плащ": "/user-assets/items/outer_trench.png",
+  "пальто": "/user-assets/items/outer_trench.png",
+  "тренч": "/user-assets/items/outer_trench.png",
+  "куртк": "/user-assets/items/outer_trench.png",
+  "парка": "/user-assets/items/outer_trench.png",
+  "пуховик": "/user-assets/items/outer_trench.png",
+  "джинс": "/user-assets/items/bottom_jeans.png",
+  "чинос": "/user-assets/items/bottom_jeans.png",
+  "брюки": "/user-assets/items/bottom_jeans.png",
+  "ботинк": "/user-assets/items/shoes_boots.png",
+  "сапог": "/user-assets/items/shoes_boots.png",
+  "кроссовк": "/user-assets/items/shoes_boots.png",
+  "кеды": "/user-assets/items/shoes_boots.png",
+  "шарф": "/user-assets/items/acc_scarf.png",
+  "шапк": "/user-assets/items/acc_scarf.png",
+  "варежк": "/user-assets/items/acc_scarf.png",
+  "перчатк": "/user-assets/items/acc_scarf.png",
+  "зонт": "/user-assets/items/acc_umbrella.png",
+  "панама": "/user-assets/items/acc_umbrella.png",
+  "кепк": "/user-assets/items/acc_umbrella.png",
+};
+
+function outfitTextToItems(text) {
+  return (text ?? "")
+    .split(/,|\+| и | или /gi)
+    .map((chunk) => chunk.trim())
+    .filter(Boolean);
+}
+
+function matchImageForItem(label) {
+  const lower = label.toLowerCase();
+  const entry = Object.entries(ITEM_IMAGES).find(([key]) => lower.includes(key));
+  return entry ? entry[1] : null;
+}
+
+// =============================
+// UI-компоненты
+// =============================
+function InfoTile({ icon, label, value }) {
+  return (
+    <div className="flex flex-col gap-3 rounded-3xl bg-white/85 backdrop-blur border border-white/60 px-4 py-5 shadow-md transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl">
+      <div className="flex items-center gap-3 text-xs md:text-sm uppercase tracking-[0.16em] text-gray-500">
+        {icon}
+        <span>{label}</span>
+      </div>
+      <div className="text-xl md:text-2xl font-semibold text-gray-900">
+        {value}
+      </div>
+    </div>
+  );
+}
+
 const IconTemp = () => (
-  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
-    <path d="M12 3a2 2 0 00-2 2v8.59a4 4 0 102 0V5a2 2 0 00-2-2z" stroke="#111" strokeWidth="1.5"/>
-    <circle cx="12" cy="18" r="2.5" stroke="#111" strokeWidth="1.5"/>
+  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
+    <path d="M12 3a2 2 0 00-2 2v8.59a4 4 0 102 0V5a2 2 0 00-2-2z" stroke="#111827" strokeWidth="1.6" />
+    <circle cx="12" cy="18" r="2.7" stroke="#111827" strokeWidth="1.6" />
   </svg>
 );
+
 const IconWind = () => (
-  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
-    <path d="M3 8h10a3 3 0 100-6" stroke="#111" strokeWidth="1.5"/>
-    <path d="M3 14h14a3 3 0 110 6" stroke="#111" strokeWidth="1.5"/>
+  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
+    <path d="M3 8h10a3 3 0 100-6" stroke="#111827" strokeWidth="1.6" strokeLinecap="round" />
+    <path d="M3 14h14a3 3 0 110 6" stroke="#111827" strokeWidth="1.6" strokeLinecap="round" />
   </svg>
 );
+
 const IconHumidity = () => (
-  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
-    <path d="M12 3s6 6 6 10a6 6 0 11-12 0c0-4 6-10 6-10z" stroke="#111" strokeWidth="1.5"/>
+  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
+    <path d="M12 3s6 6 6 10a6 6 0 11-12 0c0-4 6-10 6-10z" stroke="#111827" strokeWidth="1.6" strokeLinecap="round" />
   </svg>
 );
+
 const IconPrecip = () => (
-  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
-    <path d="M6 10a5 5 0 019-3 4 4 0 113 7H6a4 4 0 010-4z" stroke="#111" strokeWidth="1.5"/>
+  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
+    <path d="M6 10a5 5 0 019-3 4 4 0 113 7H6a4 4 0 010-4z" stroke="#111827" strokeWidth="1.6" strokeLinecap="round" />
   </svg>
 );
 
-function InfoTile({ label, value, icon, className = "", season = "autumn" }) {
-  const seasonStyles = {
-    autumn: "bg-[#fff7ef] shadow-[0_4px_12px_rgba(255,140,0,0.15)]",
-    winter: "bg-[#f2f7ff] shadow-[0_4px_12px_rgba(0,90,255,0.12)]",
-    spring: "bg-[#fff5f8] shadow-[0_4px_12px_rgba(255,0,122,0.12)]",
-    summer: "bg-[#f5fff1] shadow-[0_4px_12px_rgba(0,200,0,0.12)]",
-  };
+function AvatarPanel({ gender, season, outfitItems }) {
+  const theme = SEASON_THEME[season];
 
   return (
-    <div
-      className={`flex flex-col justify-between rounded-2xl p-4 border border-white/50 select-none transition-all duration-300 hover:shadow-lg hover:scale-[1.02] ${seasonStyles[season]} ${className}`}
-    >
-      <div className="flex items-center gap-2 text-[11px] md:text-[12px] uppercase tracking-wide opacity-60">
-        {icon}
-        <span className="whitespace-nowrap">{label}</span>
+    <div className="grid grid-cols-2 gap-5">
+      <div className={`relative flex items-center justify-center rounded-3xl p-6 ${theme.panel}`}>
+        <img
+          src={AVATAR_SRC[gender]}
+          alt="Манекен"
+          className="w-40 md:w-48 h-auto select-none pointer-events-none"
+        />
+        <div className={`absolute left-4 top-4 px-3 py-1 rounded-full text-xs font-medium ${theme.chip}`}>
+          {gender === "female" ? "Женский" : "Мужской"}
+        </div>
       </div>
-      <div className="text-[18px] md:text-[21px] font-semibold mt-1 leading-tight whitespace-nowrap">
-        {value}
+      <div className="grid grid-cols-2 gap-4 content-start">
+        {outfitItems.map((item, index) => {
+          const image = matchImageForItem(item);
+          return (
+            <div
+              key={`${item}-${index}`}
+              className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-white/90 border border-white/70 shadow p-3 text-center"
+            >
+              {image ? (
+                <img src={image} alt={item} className="w-16 h-16 object-contain" />
+              ) : (
+                <span className="text-lg">👕</span>
+              )}
+              <span className="text-xs md:text-sm font-medium leading-tight text-gray-700 break-words">
+                {item}
+              </span>
+            </div>
+          );
+        })}
       </div>
     </div>
   );
 }
 
-// ===== 5) Манекен (силуэт) + «чипсы» одежды =====
-<AvatarPanel
-  gender={gender}
-  season={season}
-  outfitText={`${rec?.outfit}, ${rec?.accessories}`}
-/> {
-  const theme = SEASON_THEME[season];
+function WeatherSection({ loading, tempC, wind, humidity, precType, condition }) {
+  const windLabel = `${wind.toFixed(1)} м/с (${windBucketRu(windBucket(wind))})`;
+  const precipitation = precipitationRu(precipitationBucket(precType, condition));
+
   return (
-    <div className={`relative w-full max-w-sm mx-auto rounded-3xl p-5 shadow-lg ${theme.chip}`}>
-      <svg viewBox="0 0 120 220" className="w-full h-auto">
-        <circle cx="60" cy="30" r="16" fill="#e5e7eb" />
-        <rect x="56" y="46" width="8" height="10" rx="3" fill="#e5e7eb" />
-        <rect x="42" y="56" width="36" height="64" rx="10" fill="#e5e7eb" />
-        <rect x="36" y="62" width="10" height="42" rx="6" fill="#e5e7eb" />
-        <rect x="74" y="62" width="10" height="42" rx="6" fill="#e5e7eb" />
-        <rect x="50" y="120" width="12" height="64" rx="6" fill="#e5e7eb" />
-        <rect x="62" y="120" width="12" height="64" rx="6" fill="#e5e7eb" />
-      </svg>
-      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-2">
-        {items?.slice(0, 4).map((it, idx) => (
-          <span key={idx} className="px-2 py-1 text-xs rounded-full bg-white/85 shadow">{it}</span>
-        ))}
-      </div>
-    </div>
+    <section className="flex flex-col gap-5">
+      <h2 className="text-2xl md:text-3xl font-semibold text-gray-900">Погода</h2>
+      {loading ? (
+        <p className="text-sm text-gray-500">Загружаем погоду…</p>
+      ) : (
+        <div className="grid grid-cols-2 gap-4 md:gap-5">
+          <InfoTile label="Температура" value={`${tempC}°C`} icon={<IconTemp />} />
+          <InfoTile label="Ветер" value={windLabel} icon={<IconWind />} />
+          <InfoTile label="Влажность" value={`${humidity}%`} icon={<IconHumidity />} />
+          <InfoTile label="Осадки" value={precipitation} icon={<IconPrecip />} />
+        </div>
+      )}
+      <p className="text-xs md:text-sm text-gray-500">Источник данных: Netlify Function → Weather API</p>
+    </section>
   );
 }
 
-// ===== 6) Главный компонент =====
-// ===== Inline-изображения (временное решение, чтобы всё заработало прямо сейчас) =====
-const AVATAR_SRC = {
-  female:
-    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="420" viewBox="0 0 160 210"><rect width="160" height="210" rx="18" fill="%23ffe8d5"/><circle cx="80" cy="40" r="18" fill="%23f7d7c3"/><rect x="72" y="58" width="16" height="10" rx="3" fill="%23f7d7c3"/><rect x="52" y="68" width="56" height="64" rx="10" fill="%23ffd1c1"/><rect x="44" y="74" width="12" height="42" rx="6" fill="%23ffd1c1"/><rect x="104" y="74" width="12" height="42" rx="6" fill="%23ffd1c1"/><rect x="66" y="132" width="12" height="60" rx="6" fill="%23f7d7c3"/><rect x="82" y="132" width="12" height="60" rx="6" fill="%23f7d7c3"/></svg>',
-  male:
-    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="420" viewBox="0 0 160 210"><rect width="160" height="210" rx="18" fill="%23e7f2ff"/><circle cx="80" cy="40" r="18" fill="%23d9c7b8"/><rect x="72" y="58" width="16" height="10" rx="3" fill="%23d9c7b8"/><rect x="52" y="68" width="56" height="64" rx="10" fill="%23cfe4ff"/><rect x="44" y="74" width="12" height="42" rx="6" fill="%23cfe4ff"/><rect x="104" y="74" width="12" height="42" rx="6" fill="%23cfe4ff"/><rect x="66" y="132" width="12" height="60" rx="6" fill="%23d9c7b8"/><rect x="82" y="132" width="12" height="60" rx="6" fill="%23d9c7b8"/></svg>',
-};
-
-// ключевые слова из текста → “картинки” (SVG data URI)
-const ITEM_SRC = {
-  // топы
-  "свитшот": 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="18" fill="%23fff"/><rect x="24" y="40" width="80" height="52" rx="12" fill="%23f3a7a7"/><rect x="18" y="44" width="14" height="34" rx="7" fill="%23f3a7a7"/><rect x="96" y="44" width="14" height="34" rx="7" fill="%23f3a7a7"/></svg>',
-  "свитер":  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="18" fill="%23fff"/><rect x="24" y="42" width="80" height="52" rx="12" fill="%23d7a97a"/><rect x="48" y="38" width="32" height="10" rx="5" fill="%23c9955d"/></svg>',
-  "рубашк": 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="18" fill="%23fff"/><rect x="24" y="42" width="80" height="52" rx="6" fill="%23b7d7ff"/><rect x="60" y="40" width="8" height="54" fill="%23fff"/><circle cx="64" cy="56" r="2" fill="%2399bce6"/><circle cx="64" cy="68" r="2" fill="%2399bce6"/><circle cx="64" cy="80" r="2" fill="%2399bce6"/></svg>',
-  "худи":    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="18" fill="%23fff"/><rect x="24" y="44" width="80" height="50" rx="12" fill="%2399c2ff"/><circle cx="64" cy="46" r="10" fill="%2399c2ff"/></svg>',
-
-  // верхняя одежда
-  "плащ":    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="18" fill="%23fff"/><path d="M40 36h48l10 70H30z" fill="%23d9b38c"/></svg>',
-  "тренч":   'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="18" fill="%23fff"/><path d="M40 36h48l10 70H30z" fill="%23d9b38c"/></svg>',
-  "джинсовк":'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="18" fill="%23fff"/><rect x="30" y="40" width="68" height="60" rx="6" fill="%2399b9ff"/></svg>',
-  "парка":   'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="18" fill="%23fff"/><rect x="32" y="38" width="64" height="66" rx="10" fill="%2380a06b"/></svg>',
-
-  // низ
-  "джинс":   'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="18" fill="%23fff"/><rect x="44" y="40" width="16" height="68" rx="6" fill="%234a7bdc"/><rect x="68" y="40" width="16" height="68" rx="6" fill="%234a7bdc"/></svg>',
-  "чинос":   'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="18" fill="%23fff"/><rect x="44" y="42" width="16" height="66" rx="6" fill="%23c6a66a"/><rect x="68" y="42" width="16" height="66" rx="6" fill="%23c6a66a"/></svg>',
-
-  // обувь
-  "ботинк":  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="18" fill="%23fff"/><rect x="34" y="84" width="60" height="18" rx="6" fill="%23545454"/><rect x="28" y="98" width="72" height="8" rx="4" fill="%23333333"/></svg>',
-  "кеды":    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="18" fill="%23fff"/><rect x="36" y="92" width="56" height="10" rx="5" fill="%238c9cff"/></svg>',
-  "сапог":   'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="18" fill="%23fff"/><rect x="34" y="80" width="60" height="20" rx="6" fill="%23545454"/></svg>',
-
-  // аксессуары
-  "шарф":    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="18" fill="%23fff"/><rect x="42" y="40" width="44" height="16" rx="8" fill="%23ffb3b3"/><rect x="56" y="56" width="14" height="36" rx="6" fill="%23ffb3b3"/></svg>',
-  "шапк":    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="18" fill="%23fff"/><path d="M44 68h40a16 16 0 00-40 0z" fill="%23ffcf86"/></svg>',
-  "зонт":    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128"><rect width="128" height="128" rx="18" fill="%23fff"/><path d="M24 64h80a40 40 0 00-80 0z" fill="%2399c2ff"/><rect x="62" y="64" width="4" height="40" rx="2" fill="%23333"/></svg>',
-};
-
-function outfitTextToImages(text) {
-  const t = (text || "").toLowerCase();
-  const added = new Set();
-  const imgs = [];
-  Object.entries(ITEM_SRC).forEach(([key, uri]) => {
-    if (t.includes(key) && !added.has(uri)) { imgs.push(uri); added.add(uri); }
-  });
-  return imgs;
-}
-
-// Панель аватара + иконки вещей
-function AvatarPanel({ gender, season, outfitText }) {
-  const images = outfitTextToImages(outfitText);
+function RecommendationSection({ season, theme, rec, outfitItems, gender }) {
   return (
-    <div className="grid grid-cols-2 gap-6">
-      <div className={`relative rounded-3xl p-5 shadow-lg ${SEASON_THEME[season].chip} flex items-center justify-center`}>
-        <img
-          src={gender === "female" ? AVATAR_SRC.female : AVATAR_SRC.male}
-          alt=""
-          className="w-40 md:w-48 object-contain select-none pointer-events-none"
-        />
+    <section className="flex flex-col gap-6">
+      <div className="flex flex-col gap-2">
+        <h2 className="text-2xl md:text-3xl font-semibold text-gray-900">Рекомендация</h2>
+        <p className="text-sm text-gray-500">Подбираем гардероб по погоде и сезону</p>
       </div>
-      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 content-start">
-        {images.map((src, i) => (
-          <div key={i} className="w-20 h-20 md:w-24 md:h-24 rounded-xl bg-white/95 shadow flex items-center justify-center overflow-hidden">
-            <img src={src} alt="" className="max-w-full max-h-full object-contain" />
+      <div className={`rounded-3xl ${theme.panel} p-6 md:p-8 flex flex-col gap-6`}>
+        <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 md:gap-10 items-start">
+          <div className="flex flex-col gap-4 text-gray-800">
+            <p className="text-base md:text-lg leading-relaxed">
+              <span className="font-semibold">Одежда:</span> {rec?.outfit}
+            </p>
+            <p className="text-base md:text-lg leading-relaxed">
+              <span className="font-semibold">Аксессуары:</span> {rec?.accessories}
+            </p>
+            <div className="flex items-center gap-3 text-sm md:text-base">
+              <span className="font-semibold">Сезон:</span>
+              <span className={`${theme.accent} font-semibold`}>{theme.ru}</span>
+            </div>
+            <div className="flex items-center gap-3 text-sm md:text-base">
+              <span className="font-semibold">Пол:</span>
+              <span>{gender === "female" ? "Женский" : "Мужской"}</span>
+            </div>
           </div>
-        ))}
+          <AvatarPanel gender={gender} season={season} outfitItems={outfitItems} />
+        </div>
       </div>
-    </div>
+    </section>
   );
 }
+
+// =============================
+// Главный компонент приложения
+// =============================
 export default function OutfityApp() {
-  const { weather, loading } = useWeather(useGeolocation());
+  const coords = useGeolocation();
+  const { weather, loading } = useWeather(coords);
   const [gender, setGender] = useState("female");
 
-  const fact = weather?.fact;
-  const tempC = fact?.temp ?? 12;
-  const humidity = fact?.humidity ?? 70;
-  const wind = fact?.wind_speed ?? 3;
-  const precType = fact?.prec_type ?? 0;
-  const condition = fact?.condition ?? "clear";
+  const fact = weather?.fact ?? DEFAULT_FACT;
+  const tempC = fact?.temp ?? DEFAULT_FACT.temp;
+  const humidity = fact?.humidity ?? DEFAULT_FACT.humidity;
+  const wind = fact?.wind_speed ?? DEFAULT_FACT.wind_speed;
+  const precType = fact?.prec_type ?? DEFAULT_FACT.prec_type;
+  const condition = fact?.condition ?? DEFAULT_FACT.condition;
 
   const rec = useMemo(
-    () => pickOutfit({ tempC, windMs: wind, precType: precType, gender }),
+    () => pickOutfit({ tempC, windMs: wind, precType, gender }),
     [tempC, wind, precType, gender]
   );
 
   const season = getSeasonByMonth(new Date().getMonth());
   const theme = SEASON_THEME[season];
 
-  const outfitItems = useMemo(() => (rec?.outfit || "")
-    .split(/,|\+| или /g)
-    .map(s => s.trim())
-    .filter(Boolean), [rec]);
+  const outfitItems = useMemo(() => {
+    const clothing = outfitTextToItems(rec?.outfit);
+    const accessories = outfitTextToItems(rec?.accessories);
+    return [...clothing, ...accessories];
+  }, [rec]);
 
   return (
-    <div className={`min-h-screen w-full bg-gradient-to-br ${theme.bg} text-gray-900`}>
-      <header className="max-w-6xl mx-auto px-6 pt-6 pb-4 flex items-center justify-between">
-        <div className="flex items-center gap-3">
-          <h1 className={`text-3xl md:text-4xl font-extrabold ${theme.accents}`}>Outfity</h1>
-          <div className="text-2xl" title={theme.ru}>{theme.art}</div>
+    <div className={`min-h-screen w-full bg-gradient-to-br ${theme.gradient} text-gray-900`}>
+      <header className="max-w-6xl mx-auto px-6 pt-8 pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
+        <div className="flex items-center gap-4">
+          <div className="flex items-center gap-3">
+            <h1 className={`text-3xl md:text-4xl font-extrabold ${theme.accent}`}>Outfity</h1>
+            <span className="text-2xl" title={theme.ru} aria-label={theme.ru}>
+              {theme.emoji}
+            </span>
+          </div>
+          <p className="text-sm md:text-base text-gray-600 max-w-md">
+            Подсказываем, что надеть по погоде: данные из Netlify Function и адаптивные карточки гардероба.
+          </p>
         </div>
         <div className="flex items-center gap-3">
-          <button onClick={() => setGender("female")} className={`px-4 py-2 rounded-2xl text-base font-medium ${gender === 'female' ? 'bg-white shadow' : 'bg-white/70'}`}>👩 Женщина</button>
-          <button onClick={() => setGender("male")}   className={`px-4 py-2 rounded-2xl text-base font-medium ${gender === 'male'   ? 'bg-white shadow' : 'bg-white/70'}`}>👨 Мужчина</button>
+          <button
+            type="button"
+            onClick={() => setGender("female")}
+            className={`px-4 py-2 rounded-2xl text-sm md:text-base font-medium transition shadow-sm ${
+              gender === "female" ? "bg-white text-gray-900 shadow-lg" : "bg-white/70 text-gray-600 hover:bg-white"
+            }`}
+          >
+            👩 Женщина
+          </button>
+          <button
+            type="button"
+            onClick={() => setGender("male")}
+            className={`px-4 py-2 rounded-2xl text-sm md:text-base font-medium transition shadow-sm ${
+              gender === "male" ? "bg-white text-gray-900 shadow-lg" : "bg-white/70 text-gray-600 hover:bg-white"
+            }`}
+          >
+            👨 Мужчина
+          </button>
         </div>
       </header>
 
-      <main className="max-w-6xl mx-auto px-6 pb-12 grid grid-cols-1 md:grid-cols-2 gap-8">
-        {/* Погода */}
-        <section className="bg-white/85 backdrop-blur rounded-3xl p-6 md:p-8 shadow-lg">
-          <h2 className="text-2xl md:text-3xl font-semibold mb-5">Погода</h2>
-
-          {loading && <p className="text-sm opacity-70">Загружаем погоду…</p>}
-
-          <div className="grid grid-cols-2 gap-4 md:gap-5">
-  {/* первая строка */}
-  <InfoTile label="Температура" value={`${tempC}°C`} icon={<IconTemp/>} />
-  <InfoTile label="Ветер" value={`${wind.toFixed(1)} м/с (${windBucketRu(windBucket(wind))})`} icon={<IconWind/>} />
-
-  {/* вторая строка */}
-  <InfoTile label="Влажность" value={`${humidity}%`} icon={<IconHumidity/>} />
-  <InfoTile label="Осадки" value={precipitationRu(precipitationBucket(precType, condition))} icon={<IconPrecip/>} />
-</div>
-
-          <p className="text-xs md:text-sm opacity-60 mt-4">Источник: Netlify Function → Weather API</p>
-        </section>
-
-        {/* Рекомендация */}
-        <section className="bg-white/85 backdrop-blur rounded-3xl p-6 md:p-8 shadow-lg flex flex-col">
-          <h2 className="text-2xl md:text-3xl font-semibold mb-4">Рекомендованный outfit</h2>
-          <div className="grid md:grid-cols-2 gap-6 items-start">
-            <div>
-              <p className="text-base md:text-lg leading-relaxed break-words"><b>Одежда:</b> {rec?.outfit}</p>
-              <p className="text-base md:text-lg leading-relaxed mt-2 break-words"><b>Аксессуары:</b> {rec?.accessories}</p>
-              <p className="text-sm md:text-base mt-4">Сезон: <span className={`font-semibold ${theme.accents}`}>{theme.ru}</span></p>
-            </div>
-            <Mannequin season={season} items={outfitItems} />
+      <main className="max-w-6xl mx-auto px-6 pb-16 flex flex-col gap-12">
+        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-10">
+          <div className={theme.panel + " rounded-3xl p-6 md:p-8"}>
+            <WeatherSection
+              loading={loading}
+              tempC={tempC}
+              wind={wind}
+              humidity={humidity}
+              precType={precType}
+              condition={condition}
+            />
           </div>
-        </section>
+          <RecommendationSection
+            season={season}
+            theme={theme}
+            rec={rec}
+            outfitItems={outfitItems}
+            gender={gender}
+          />
+        </div>
       </main>
 
-      <footer className="max-w-6xl mx-auto px-6 pb-8 text-xs md:text-sm opacity-70 text-center">
-        Источник: Netlify Function, геолокация — браузер. Тема интерфейса по сезону ({theme.ru}).
+      <footer className="max-w-6xl mx-auto px-6 pb-10 text-xs md:text-sm text-gray-600 text-center">
+        Геолокация берётся из браузера, погодные данные — из Netlify Function. Интерфейс автоматически подстраивается под сезон ({
+          theme.ru
+        }).
       </footer>
     </div>
   );
 }
 
EOF
)
