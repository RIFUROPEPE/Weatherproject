const statusEl = document.getElementById('status');
const nowEl = document.getElementById('nowWeather');
const hourlyEl = document.getElementById('hourlyList');
const dailyEl = document.getElementById('dailyList');
const badgeEl = document.getElementById('umbrellaBadge');

async function geocode(city){
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const res = await fetch(url); const data = await res.json();
  if(!data.results?.length) throw new Error('도시를 찾지 못했습니다.');
  return data.results[0];
}

async function loadWeather(lat, lon, label){
  statusEl.textContent = `${label} 날씨 불러오는 중...`;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,precipitation,wind_speed_10m&hourly=temperature_2m,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=7&timezone=auto`;
  const res = await fetch(url); const d = await res.json();

  const c = d.current;
  nowEl.textContent = `기온 ${c.temperature_2m}°C · 체감 ${c.apparent_temperature}°C · 강수 ${c.precipitation}mm · 바람 ${c.wind_speed_10m}km/h`;

  const rainProbNow = d.hourly.precipitation_probability?.[0] ?? 0;
  if(rainProbNow >= 45){
    badgeEl.textContent = `우산 필요도 높음 (${rainProbNow}%)`;
    badgeEl.className = 'badge warn';
  } else {
    badgeEl.textContent = `우산 필요도 낮음 (${rainProbNow}%)`;
    badgeEl.className = 'badge ok';
  }

  hourlyEl.innerHTML = '';
  for(let i=0;i<24;i+=3){
    const t = d.hourly.time[i].slice(11,16);
    const temp = d.hourly.temperature_2m[i];
    const pr = d.hourly.precipitation_probability[i];
    hourlyEl.innerHTML += `<li>${t} · ${temp}°C · 강수확률 ${pr}%</li>`;
  }

  dailyEl.innerHTML = '';
  for(let i=0;i<7;i++){
    const date = d.daily.time[i];
    const max = d.daily.temperature_2m_max[i];
    const min = d.daily.temperature_2m_min[i];
    const pr = d.daily.precipitation_probability_max[i];
    dailyEl.innerHTML += `<li>${date} · ${min}~${max}°C · 최대 강수확률 ${pr}%</li>`;
  }

  statusEl.textContent = `${label} 기준 업데이트 완료`;
}

async function searchCity(){
  const city = document.getElementById('cityInput').value.trim() || 'Seoul';
  try{
    const g = await geocode(city);
    await loadWeather(g.latitude, g.longitude, `${g.name}, ${g.country_code}`);
  }catch(e){
    statusEl.textContent = e.message;
  }
}

document.getElementById('searchBtn').addEventListener('click', searchCity);
loadWeather(37.5665, 126.9780, 'Seoul, KR');
