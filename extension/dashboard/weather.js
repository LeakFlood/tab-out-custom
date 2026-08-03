'use strict';

/* ----------------------------------------------------------------
   WEATHER WIDGET — local weather, city hidden by default
   ---------------------------------------------------------------- */

   const WEATHER_CACHE_KEY = "tabOutWeatherCache";
   const WEATHER_ENABLED_KEY = "tabOutWeatherEnabled";
   const WEATHER_CACHE_MAX_AGE = 45 * 60 * 1000; // 45 min
   const WEATHER_AUTO_REFRESH_INTERVAL = 5 * 60 * 1000; // vérifie toutes les 5 min
   let weatherAutoRefreshTimer = null;
   let weatherCityVisible = false;

   function mapWeatherCode(code) {
     if ([0].includes(code)) {
       return { kind: "sun", label: t("weatherSun") };
     }

     if ([1, 2].includes(code)) {
       return { kind: "partly", label: t("weatherPartly") };
     }

     if ([3].includes(code)) {
       return { kind: "cloud", label: t("weatherCloud") };
     }

     if ([45, 48].includes(code)) {
       return { kind: "fog", label: t("weatherFog") };
     }

     if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
       return { kind: "rain", label: t("weatherRain") };
     }

     if ([71, 73, 75, 77, 85, 86].includes(code)) {
       return { kind: "snow", label: t("weatherSnow") };
     }

     if ([95, 96, 99].includes(code)) {
       return { kind: "storm", label: t("weatherStorm") };
     }

     return { kind: "cloud", label: t("weatherGeneric") };
   }

   function roundTemp(value) {
     if (typeof value !== "number") {
       return "--";
     }

     return Math.round(value);
   }


   function startWeatherAutoRefresh() {
    stopWeatherAutoRefresh();

    if (
      globalThis.TabOutDashboardRuntime &&
      !globalThis.TabOutDashboardRuntime.isModuleVisible("weather")
    ) {
      return;
    }

    weatherAutoRefreshTimer = setInterval(() => {
      loadWeather({ force: false });
    }, WEATHER_AUTO_REFRESH_INTERVAL);
  }

   function stopWeatherAutoRefresh() {
    if (weatherAutoRefreshTimer) {
      clearInterval(weatherAutoRefreshTimer);
      weatherAutoRefreshTimer = null;
    }
   }

   async function getStoredWeatherCache() {
     const { [WEATHER_CACHE_KEY]: cache } = await chrome.storage.local.get(WEATHER_CACHE_KEY);

     if (!cache || !cache.timestamp) {
       return null;
     }

     const isFresh = Date.now() - cache.timestamp < WEATHER_CACHE_MAX_AGE;

     return isFresh ? cache : null;
   }

   async function isWeatherEnabled() {
     const stored = await chrome.storage.local.get([
       WEATHER_ENABLED_KEY,
       WEATHER_CACHE_KEY
     ]);

     return Boolean(
       stored[WEATHER_ENABLED_KEY] ||
       stored[WEATHER_CACHE_KEY]?.timestamp
     );
   }

   async function saveWeatherCache(data) {
     await chrome.storage.local.set({
       [WEATHER_CACHE_KEY]: {
         ...data,
         timestamp: Date.now()
       }
     });
   }

   function getCurrentPositionPromise() {
     return new Promise((resolve, reject) => {
       if (!navigator.geolocation) {
         const error = new Error("Geolocation unavailable");
         error.code = "GEOLOCATION_UNAVAILABLE";
         reject(error);
         return;
       }

       navigator.geolocation.getCurrentPosition(resolve, reject, {
         enableHighAccuracy: false,
         timeout: 8000,
         maximumAge: 60 * 60 * 1000
       });
     });
   }

   async function reverseGeocodeCity(latitude, longitude) {
    try {
      const url =
        `https://nominatim.openstreetmap.org/reverse` +
        `?format=jsonv2` +
        `&lat=${latitude}` +
        `&lon=${longitude}` +
        `&zoom=10` +
        `&addressdetails=1`;

      const response = await fetch(url, {
        headers: {
          "Accept": "application/json"
        }
      });

      if (!response.ok) {
        return "";
      }

      const data = await response.json();
      const address = data.address || {};

      return (
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        address.county ||
        address.state ||
        ""
      );
    } catch {
      return "";
    }
  }

   async function fetchWeatherForPosition(latitude, longitude) {
     const url =
       `https://api.open-meteo.com/v1/forecast` +
       `?latitude=${latitude}` +
       `&longitude=${longitude}` +
       `&current=temperature_2m,apparent_temperature,weather_code` +
       `&timezone=auto`;

     const response = await fetch(url);

     if (!response.ok) {
       const error = new Error("Weather request failed");
       error.code = "WEATHER_REQUEST_FAILED";
       throw error;
     }

     const data = await response.json();
     const current = data.current || {};
     const mapped = mapWeatherCode(current.weather_code);

     const city = await reverseGeocodeCity(latitude, longitude);

     return {
       temperature: roundTemp(current.temperature_2m),
       feelsLike: roundTemp(current.apparent_temperature),
       condition: mapped.label,
       kind: mapped.kind,
       city,
       latitude,
       longitude
     };
   }


function translateWeatherKind(kind, fallback = "") {
  const keyMap = {
    sun: "weatherSun",
    partly: "weatherPartly",
    cloud: "weatherCloud",
    fog: "weatherFog",
    rain: "weatherRain",
    snow: "weatherSnow",
    storm: "weatherStorm"
  };

  return t(keyMap[kind] || "weatherGeneric") || fallback;
}

function renderWeatherWidget(weather, cityVisible = false) {
     const widget = document.getElementById("weatherWidget");
     const enableBtn = document.getElementById("weatherEnableBtn");
     const content = document.getElementById("weatherContent");
     const visual = document.getElementById("weatherVisual");
     const temp = document.getElementById("weatherTemp");
     const condition = document.getElementById("weatherCondition");
     const feelsLike = document.getElementById("weatherFeelsLike");
     const cityText = document.getElementById("weatherCityText");
     const cityToggle = document.getElementById("weatherCityToggle");

     if (!widget || !enableBtn || !content || !visual || !temp || !condition || !feelsLike || !cityText || !cityToggle) {
       return;
     }

     widget.hidden = false;
     enableBtn.hidden = true;
     content.hidden = false;

     visual.dataset.weather = weather.kind || "cloud";
     temp.textContent = `${weather.temperature}°C`;
     condition.textContent = translateWeatherKind(weather.kind, weather.condition);
     feelsLike.textContent = t("weatherFeelsLike", { temp: weather.feelsLike });

     cityText.textContent = cityVisible && weather.city ? weather.city : "";
     cityToggle.classList.toggle("is-visible", cityVisible && Boolean(weather.city));
     cityToggle.setAttribute("aria-label", cityVisible ? t("hideCity") : t("showCity"));
   }

   function renderWeatherEnableState() {
     const widget = document.getElementById("weatherWidget");
     const enableBtn = document.getElementById("weatherEnableBtn");
     const content = document.getElementById("weatherContent");

     if (!widget || !enableBtn || !content) {
       return;
     }

     widget.hidden = false;
     enableBtn.hidden = false;
     content.hidden = true;
   }

   function getWeatherErrorMessageKey(error) {
     if (Number(error?.code) === 1) {
       return "weatherPermissionDenied";
     }

     if (
       Number(error?.code) === 2 ||
       error?.code === "GEOLOCATION_UNAVAILABLE"
     ) {
       return "weatherLocationUnavailable";
     }

     if (Number(error?.code) === 3) {
       return "weatherLocationTimeout";
     }

     if (
       error?.code === "WEATHER_REQUEST_FAILED" ||
       error instanceof TypeError
     ) {
       return "weatherNetworkError";
     }

     return "weatherLoadFailed";
   }

   async function loadWeather({
     force = false,
     notifyOnError = false
   } = {}) {
     if (
       globalThis.TabOutDashboardRuntime &&
       !globalThis.TabOutDashboardRuntime.isModuleVisible("weather")
     ) {
       stopWeatherAutoRefresh();
       return;
     }

     try {
       const cached = !force ? await getStoredWeatherCache() : null;
       const cityVisible = false;
       weatherCityVisible = false;

       if (cached) {
         renderWeatherWidget(cached, cityVisible);
         return true;
       }

       if (!force && !await isWeatherEnabled()) {
         renderWeatherEnableState();
         return false;
       }

       const position = await getCurrentPositionPromise();
       const { latitude, longitude } = position.coords;

       const weather = await fetchWeatherForPosition(latitude, longitude);

       await saveWeatherCache(weather);
       await chrome.storage.local.set({
         [WEATHER_ENABLED_KEY]: true
       });
       renderWeatherWidget(weather, cityVisible);
       return true;
     } catch (error) {
       console.warn("[tab-out] Could not load weather:", error);
       renderWeatherEnableState();

       if (notifyOnError) {
         showToast(t(getWeatherErrorMessageKey(error)));
       }

       return false;
     }
   }

   async function setupWeatherWidget() {
     const enableBtn = document.getElementById("weatherEnableBtn");
     const cityToggle = document.getElementById("weatherCityToggle");
     const widget = document.getElementById("weatherWidget");

     if (!widget) {
       return;
     }

     if (enableBtn) {
       enableBtn.addEventListener("click", async () => {
         enableBtn.disabled = true;
         enableBtn.setAttribute("aria-busy", "true");
         enableBtn.textContent = t("weatherLoading");

         try {
           const enabled = await loadWeather({
             force: true,
             notifyOnError: true
           });

           if (enabled) {
             startWeatherAutoRefresh();
           }
         } finally {
           enableBtn.disabled = false;
           enableBtn.removeAttribute("aria-busy");
           enableBtn.textContent = t("weatherEnable");
         }
       });
     }

     if (cityToggle) {
      cityToggle.addEventListener("click", async () => {
        weatherCityVisible = !weatherCityVisible;

        const cache = await getStoredWeatherCache();

        if (cache) {
          renderWeatherWidget(cache, weatherCityVisible);
         }
       });
     }

     if (globalThis.TabOutDashboardRuntime?.ready) {
       await globalThis.TabOutDashboardRuntime.ready;
     }

     if (
       globalThis.TabOutDashboardRuntime &&
       !globalThis.TabOutDashboardRuntime.isModuleVisible("weather")
     ) {
       stopWeatherAutoRefresh();
       return;
     }

     const enabled = await loadWeather({ force: false });

     if (enabled) {
       startWeatherAutoRefresh();
     } else {
       stopWeatherAutoRefresh();
     }
  }

  document.addEventListener("DOMContentLoaded", setupWeatherWidget);
