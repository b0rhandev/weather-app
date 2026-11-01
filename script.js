
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");

const cityNameEl = document.getElementById("cityName");
const statusTextEl = document.getElementById("statusText");
const mainTempEl = document.getElementById("mainTemp");
const mainIconEl = document.getElementById("mainIcon");
const weatherDescEl = document.getElementById("weatherDesc");
const maxMinTempEl = document.getElementById("maxMinTemp");

const windSpeedEl = document.getElementById("windSpeed");
const humidityEl = document.getElementById("humidity");
const visibilityEl = document.getElementById("visibility");
const airQualityEl = document.getElementById("airQuality");
const rainChanceEl = document.getElementById("rainChance");
const pressureEl = document.getElementById("pressure");
const forecastContainer = document.getElementById("forecastContainer");


function getWeatherInfo(code) {

  if (code === 0) return { text: "آفتابی و صاف", icon: "fa-sun text-amber-400" };
  if (code === 1 || code === 2) return { text: "نیمه‌ابری", icon: "fa-cloud-sun text-amber-300" };
  if (code === 3) return { text: "ابری", icon: "fa-cloud text-slate-200" };
  if (code === 45 || code === 48) return { text: "مه‌آلود", icon: "fa-smog text-slate-300" };
  if (code >= 51 && code <= 57) return { text: "نم‌نم باران", icon: "fa-cloud-rain text-sky-300" };
  if (code >= 61 && code <= 67) return { text: "بارانی", icon: "fa-cloud-showers-heavy text-sky-300" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { text: "برفی", icon: "fa-snowflake text-sky-100" };
  if (code >= 80 && code <= 82) return { text: "رگبار باران", icon: "fa-cloud-showers-heavy text-sky-200" };
  if (code >= 95) return { text: "رعد و برق", icon: "fa-cloud-bolt text-amber-400" };
  return { text: "ابری", icon: "fa-cloud text-slate-200" };
}

// ۳. تابع کمکی: پیدا کردن نام روز هفته از روی تاریخ
function getDayName(dateString) {
  const date = new Date(dateString);
  // timeZone: "UTC" یعنی تاریخ همان‌طور که API داده خوانده شود (بدون یک روز جابه‌جایی)
  return date.toLocaleDateString("fa-IR", { weekday: "long", timeZone: "UTC" });
}


function getAirQualityLabel(aqi) {
  if (aqi <= 50) return "پاک";
  if (aqi <= 100) return "قابل قبول";
  if (aqi <= 150) return "ناسالم برای گروه‌های حساس";
  if (aqi <= 200) return "ناسالم";
  if (aqi <= 300) return "بسیار ناسالم";
  return "خطرناک";
}

// ۵. گرفتن کیفیت هوا (API جداگانه)
async function fetchAirQuality(lat, lon) {
  airQualityEl.innerText = "--";

  try {
    const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi`;
    const airResponse = await fetch(airUrl);
    if (!airResponse.ok) throw new Error("Air quality request failed");

    const airData = await airResponse.json();
    const aqi = airData.current.us_aqi;

    if (aqi === null || aqi === undefined) return; 

    airQualityEl.innerText = `${getAirQualityLabel(aqi)} (${Math.round(aqi)})`;
  } catch (error) {
    // اگر کیفیت هوا خطا داد، بقیه‌ی صفحه سالم می‌ماند
    console.error(error);
  }
}

// ۶. تابع اصلی: گرفتن اطلاعات شهر از اینترنت (API)
async function fetchWeather(cityQuery) {
  try {
    // نمایش حالت در حال بارگذاری
    statusTextEl.innerText = "در حال دریافت اطلاعات...";

    // مرحله الف: تبدیل اسم شهر به طول و عرض جغرافیایی
    // encodeURIComponent: متن کاربر را برای قرار گرفتن در آدرس امن می‌کند
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityQuery)}&count=1&language=fa`;
    const geoResponse = await fetch(geoUrl);
    if (!geoResponse.ok) throw new Error("Geocoding request failed");
    const geoData = await geoResponse.json();

    // بررسی اینکه آیا شهر پیدا شد یا نه
    if (!geoData.results || geoData.results.length === 0) {
      statusTextEl.innerText = "❌ شهر پیدا نشد! لطفاً دوباره امتحان کنید.";
      return;
    }

    const location = geoData.results[0];
    const lat = location.latitude;
    const lon = location.longitude;
    const city = location.name;
    const country = location.country || "";

    // مرحله ب: گرفتن اطلاعات آب‌وهوا با طول و عرض جغرافیایی
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,pressure_msl,wind_speed_10m,weather_code,visibility&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto`;

    const weatherResponse = await fetch(weatherUrl);
    if (!weatherResponse.ok) throw new Error("Weather request failed");
    const weatherData = await weatherResponse.json();

    // فرستادن اطلاعات به تابع نمایش در صفحه
    updateUI(city, country, weatherData);

    // مرحله ج: کیفیت هوا (جدا از بقیه، تا خطای آن صفحه را خراب نکند)
    await fetchAirQuality(lat, lon);

  } catch (error) {
    statusTextEl.innerText = "⚠️ خطا در دریافت اطلاعات!";
    console.error(error);
  }
}

// ==========================================
// ۷. تابع بروزرسانی ظاهر سایت (DOM)
// ==========================================
function updateUI(city, country, data) {
  const current = data.current;
  const daily = data.daily;

  // ۱. بروزرسانی کارت بزرگ اصلی
  cityNameEl.innerText = country ? `${city}، ${country}` : city;
  statusTextEl.innerText = "زمان فعلی";
  mainTempEl.innerText = `${Math.round(current.temperature_2m)}°C`;

  const currentInfo = getWeatherInfo(current.weather_code);
  weatherDescEl.innerText = currentInfo.text;
  mainIconEl.className = `fa-solid ${currentInfo.icon} text-7xl drop-shadow-lg`;

  const todayMax = Math.round(daily.temperature_2m_max[0]);
  const todayMin = Math.round(daily.temperature_2m_min[0]);
  maxMinTempEl.innerText = `حداکثر: °${todayMax} | حداقل: °${todayMin}`;

  // ۲. بروزرسانی کارت شاخص‌ها
  windSpeedEl.innerText = `${Math.round(current.wind_speed_10m)} کیلومتر بر ساعت`;
  humidityEl.innerText = `%${current.relative_humidity_2m}`;

  // تبدیل متر به کیلومتر برای دید افقی
  // ?? فقط وقتی مقدار null یا undefined باشد جایگزین می‌کند (صفر را دور نمی‌اندازد)
  const visibilityKm = ((current.visibility ?? 10000) / 1000).toFixed(1);
  visibilityEl.innerText = `${visibilityKm} کیلومتر`;

  const todayRainChance = daily.precipitation_probability_max[0] ?? 0;
  rainChanceEl.innerText = `%${todayRainChance}`;
  pressureEl.innerText = `${Math.round(current.pressure_msl)} میلی‌بار`;

  // ۳. ساختن کارت‌های پیش‌بینی روزهای آینده
  // اول یک رشته می‌سازیم و آخر کار فقط یک‌بار در صفحه می‌گذاریم
  let cardsHTML = "";

  for (let i = 0; i < daily.time.length; i++) {
    const dayName = i === 0 ? "امروز" : getDayName(daily.time[i]);
    const maxTemp = Math.round(daily.temperature_2m_max[i]);
    const minTemp = Math.round(daily.temperature_2m_min[i]);
    const dayWeather = getWeatherInfo(daily.weather_code[i]);

    // ساخت HTML هر کارت روزانه
    cardsHTML += `
      <div class="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex flex-col items-center justify-between h-36 hover:-translate-y-1 transition duration-200 shadow-lg">
        <span class="font-bold text-sm">${dayName}</span>
        <div class="my-2">
          <i class="fa-solid ${dayWeather.icon} text-3xl"></i>
        </div>
        <span class="text-xs text-slate-200 font-medium">${maxTemp}°/${minTemp}° ${dayWeather.text}</span>
      </div>
    `;
  }

  forecastContainer.innerHTML = cardsHTML; // جایگزین کارت‌های قبلی می‌شود
}

// ==========================================
// ۸. فعال کردن دکمه جستجو و کلید Enter کیبورد
// ==========================================
function handleSearch() {
  const city = searchInput.value.trim();
  if (city !== "") {
    fetchWeather(city);
  }
}

searchBtn.addEventListener("click", handleSearch);

searchInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    handleSearch();
  }
});

// نمایش آب‌وهوای پیش‌فرض موقع باز شدن سایت (مثلاً داراب)
fetchWeather("داراب");

// ۹. چت راهنمای هواشناسی (پاسخ‌گویی محلی بر اساس اطلاعات همین صفحه)
const weatherChatToggle = document.getElementById("weatherChatToggle");
const weatherChatPanel = document.getElementById("weatherChatPanel");
const weatherChatClose = document.getElementById("weatherChatClose");
const weatherChatForm = document.getElementById("weatherChatForm");
const weatherChatInput = document.getElementById("weatherChatInput");
const weatherChatMessages = document.getElementById("weatherChatMessages");
const weatherChatTyping = document.getElementById("weatherChatTyping");
const weatherChatSend = document.getElementById("weatherChatSend");

function setWeatherChatOpen(isOpen) {
  weatherChatPanel.hidden = !isOpen;
  weatherChatToggle.setAttribute("aria-expanded", String(isOpen));
  weatherChatToggle.setAttribute(
    "aria-label",
    isOpen ? "بستن چت راهنمای هواشناسی" : "باز کردن چت راهنمای هواشناسی"
  );

  if (isOpen) weatherChatInput.focus();
  else weatherChatToggle.focus();
}

function addWeatherChatMessage(message, sender) {
  const messageElement = document.createElement("div");
  messageElement.className = `weather-chat-message weather-chat-message--${sender}`;
  messageElement.textContent = message;
  weatherChatMessages.insertBefore(messageElement, weatherChatTyping);
  weatherChatMessages.scrollTop = weatherChatMessages.scrollHeight;
}

function getWeatherChatReply(question) {
  const text = question.toLocaleLowerCase("fa");
  const city = cityNameEl.textContent.trim();
  const temperature = mainTempEl.textContent.trim();
  const condition = weatherDescEl.textContent.trim();
  const humidity = humidityEl.textContent.trim();
  const wind = windSpeedEl.textContent.trim();
  const rain = rainChanceEl.textContent.trim();
  const airQuality = airQualityEl.textContent.trim();
  const todayRange = maxMinTempEl.textContent.trim();

  if (/سلام|درود|صبح بخیر|عصر بخیر|شب بخیر/.test(text)) {
    return `سلام! خوشحالم که اینجام 🌿 هر سؤالی درباره‌ی هوای ${city} داری بپرس.`;
  }
  if (/راهنما|چه سوال|چی می.?تونی|کمک/.test(text)) {
    return "می‌تونم وضعیت و دمای فعلی، رطوبت، سرعت باد، احتمال بارش، کیفیت هوا و پیش‌بینی امروز رو از اطلاعات همین صفحه برات بگم.";
  }
  if (/کیفیت هوا|آلودگ|شاخص هوا|هوای سالم/.test(text)) {
    return `کیفیت هوای ${city}: ${airQuality}.`;
  }
  if (/باران|بارش|چتر|بارون|احتمال.*بار/.test(text)) {
    return `احتمال بارش امروز در ${city} حدود ${rain} است.`;
  }
  if (/رطوبت|نمناک/.test(text)) {
    return `رطوبت فعلی ${city} ${humidity} است.`;
  }
  if (/باد|سرعت باد|وزش/.test(text)) {
    return `سرعت باد در ${city} ${wind} است.`;
  }
  if (/پیش.?بین|امروز|حداکثر|حداقل|فردا|هفته/.test(text)) {
    return `پیش‌بینی امروز ${city}: ${condition}، ${todayRange} و احتمال بارش ${rain}.\nبرای پیش‌بینی روزهای آینده، کارت‌های پایین صفحه رو ببین.`;
  }
  if (/دما|چند درجه|چند°|گرم|سرد|حرارت/.test(text)) {
    return `دمای فعلی ${city} ${temperature} است؛ ${todayRange}.`;
  }
  if (/هوا|وضعیت|آسمان|ابری|آفتاب|بارانی|برف/.test(text)) {
    return `الان در ${city} هوا ${condition} و دما ${temperature} است. رطوبت ${humidity} و سرعت باد ${wind} است.`;
  }

  return "من راهنمای هواشناسی همین صفحه‌ام 🌤️ درباره‌ی دما، وضعیت هوا، باد، رطوبت، بارش یا کیفیت هوا بپرس.";
}

weatherChatToggle.addEventListener("click", function () {
  setWeatherChatOpen(weatherChatPanel.hidden);
});

weatherChatClose.addEventListener("click", function () {
  setWeatherChatOpen(false);
});

weatherChatForm.addEventListener("submit", function (event) {
  event.preventDefault();
  const question = weatherChatInput.value.trim();
  if (!question || weatherChatSend.disabled) return;

  addWeatherChatMessage(question, "user");
  weatherChatInput.value = "";
  weatherChatTyping.hidden = false;
  weatherChatSend.disabled = true;
  weatherChatMessages.scrollTop = weatherChatMessages.scrollHeight;

  window.setTimeout(function () {
    weatherChatTyping.hidden = true;
    addWeatherChatMessage(getWeatherChatReply(question), "bot");
    weatherChatSend.disabled = false;
    weatherChatInput.focus();
  }, 450);
});

document.querySelectorAll("[data-chat-prompt]").forEach(function (suggestion) {
  suggestion.addEventListener("click", function () {
    weatherChatInput.value = suggestion.dataset.chatPrompt;
    weatherChatForm.requestSubmit();
  });
});

document.addEventListener("keydown", function (event) {
  if (event.key === "Escape" && !weatherChatPanel.hidden) {
    setWeatherChatOpen(false);
  }
});