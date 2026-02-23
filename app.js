const statusEl=document.getElementById('status');
const kpiTemp=document.getElementById('kpiTemp');
const kpiFeel=document.getElementById('kpiFeel');
const kpiRain=document.getElementById('kpiRain');
const kpiWind=document.getElementById('kpiWind');
const badgeEl=document.getElementById('umbrellaBadge');
const adviceEl=document.getElementById('advice');
const signalGrid=document.getElementById('signalGrid');
const hourlyChart=document.getElementById('hourlyChart');
const dailyCards=document.getElementById('dailyCards');
const productCards=document.getElementById('productCards');
const citySelect=document.getElementById('citySelect');
const cityPreset=document.getElementById('cityPreset');

const presetCities=[
  {label:'서울',query:'Seoul'},
  {label:'부산',query:'Busan'},
  {label:'도쿄',query:'Tokyo'},
  {label:'뉴욕',query:'New York'},
  {label:'런던',query:'London'},
];

function buildCityUI(){
  citySelect.innerHTML='';
  presetCities.forEach(c=>{
    const opt=document.createElement('option');
    opt.value=c.query; opt.textContent=`${c.label} (${c.query})`; citySelect.appendChild(opt);

    const chip=document.createElement('button');
    chip.className='chip'; chip.textContent=c.label;
    chip.addEventListener('click',()=>{citySelect.value=c.query;selectChip(c.query);searchCity();});
    chip.dataset.query=c.query;
    cityPreset.appendChild(chip);
  });
  selectChip('Seoul');
}

function selectChip(query){
  [...cityPreset.querySelectorAll('.chip')].forEach(el=>el.classList.toggle('on',el.dataset.query===query));
}

async function geocode(city){
  const url=`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const res=await fetch(url); const data=await res.json();
  if(!data.results?.length) throw new Error('도시를 찾지 못했습니다.');
  return data.results[0];
}

function riskLevel(v){ if(v>=70) return '높음'; if(v>=40) return '중간'; return '낮음'; }

function buildAdvice({temp,apparent,rainProb,wind}){
  if(rainProb>=60) return '비와 바람이 겹쳐 이동 피로가 큽니다. 접이식 우산 + 방수 겉옷 조합이 가장 효율적입니다.';
  if(apparent<=0) return '체감이 영하권입니다. 외투보다 장갑·목 보온을 먼저 챙기면 체감 피로가 줄어듭니다.';
  if(temp>=30) return '폭염 구간입니다. 외출 전 수분/쿨링/자외선 차단 3가지를 먼저 챙기세요.';
  if(wind>=24) return '강풍 구간입니다. 가벼운 바람막이 하나로 이동 불편을 크게 줄일 수 있습니다.';
  return '큰 변수는 없지만 시간대별 변화를 확인하고 가볍게 대비하면 충분합니다.';
}

function renderSignals({temp,apparent,rainProb,wind}){
  const signals=[
    {k:'비 리스크',v:`${riskLevel(rainProb)} (${rainProb}%)`,d:'우산/방수 대비'},
    {k:'체감 리스크',v:`${riskLevel(Math.max(0, 15-apparent)*6)} (${apparent}°C)`,d:'보온/외투 판단'},
    {k:'바람 리스크',v:`${riskLevel(wind*3)} (${wind}km/h)`,d:'이동 피로 관리'},
    {k:'활동 적합도',v:`${riskLevel(100-Math.min(95,rainProb+Math.max(0,wind-15)*2))}`,d:'야외 활동 판단'}
  ];
  signalGrid.innerHTML='';
  signals.forEach(s=>{
    const el=document.createElement('article'); el.className='signal';
    el.innerHTML=`<b>${s.k}: ${s.v}</b><em>${s.d}</em>`;
    signalGrid.appendChild(el);
  });
}

function renderHourlyChart(hourly){
  hourlyChart.innerHTML='';
  const temps=hourly.temperature_2m.slice(0,24);
  const rains=hourly.precipitation_probability.slice(0,24);
  const tMin=Math.min(...temps), tMax=Math.max(...temps);
  for(let i=0;i<24;i+=2){
    const t=temps[i], r=rains[i], time=hourly.time[i].slice(11,13);
    const tH=((t-tMin)/(tMax-tMin||1))*90+8;
    const rH=(r/100)*90+6;
    const bar=document.createElement('div'); bar.className='bar';
    bar.innerHTML=`<div class='temp' style='height:${tH}px'></div><div class='rain' style='height:${rH}px'></div><small>${time}시</small>`;
    hourlyChart.appendChild(bar);
  }
}

function renderDailyCards(daily){
  dailyCards.innerHTML='';
  for(let i=0;i<7;i++){
    const el=document.createElement('article'); el.className='dcard';
    el.innerHTML=`<b>${daily.time[i]}</b><span>${daily.temperature_2m_min[i]}° ~ ${daily.temperature_2m_max[i]}°</span><span>강수 최대 ${daily.precipitation_probability_max[i]}%</span>`;
    dailyCards.appendChild(el);
  }
}

function renderProducts({rainProb,temp,apparent}){
  const picks=[];
  if(rainProb>=40) picks.push(['방수 우산', '퇴근 시간 비 대비용으로 가장 체감효율이 좋습니다.']);
  if(apparent<=2) picks.push(['보온 장갑', '체감온도 하락 구간에서 손 시림을 가장 먼저 줄여줍니다.']);
  if(temp>=28) picks.push(['쿨링/선케어', '체온 관리 + 자외선 차단으로 외출 피로를 줄입니다.']);
  if(!picks.length) picks.push(['데일리 기본템', '큰 변수 없는 날엔 가벼운 대비가 가장 효율적입니다.']);
  productCards.innerHTML='';
  picks.forEach(([t,d])=>{
    const el=document.createElement('article'); el.className='pcard';
    el.innerHTML=`<b>${t}</b><p>${d}</p>`; productCards.appendChild(el);
  });
}

async function loadWeather(lat,lon,label){
  statusEl.textContent=`${label} 날씨 불러오는 중...`;
  const url=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,precipitation,wind_speed_10m&hourly=temperature_2m,precipitation_probability&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=7&timezone=auto`;
  const res=await fetch(url); const d=await res.json();
  const c=d.current; const rainProb=d.hourly.precipitation_probability?.[0] ?? 0;

  kpiTemp.textContent=`${c.temperature_2m}°C`;
  kpiFeel.textContent=`${c.apparent_temperature}°C`;
  kpiRain.textContent=`${rainProb}%`;
  kpiWind.textContent=`${c.wind_speed_10m}km/h`;

  badgeEl.className='badge ' + (rainProb>=65?'danger':rainProb>=40?'warn':'ok');
  badgeEl.textContent = rainProb>=65 ? `우산 필수 (${rainProb}%)` : rainProb>=40 ? `우산 권장 (${rainProb}%)` : `우산 낮음 (${rainProb}%)`;

  adviceEl.textContent=buildAdvice({temp:c.temperature_2m,apparent:c.apparent_temperature,rainProb,wind:c.wind_speed_10m});
  renderSignals({temp:c.temperature_2m,apparent:c.apparent_temperature,rainProb,wind:c.wind_speed_10m});
  renderHourlyChart(d.hourly);
  renderDailyCards(d.daily);
  renderProducts({rainProb,temp:c.temperature_2m,apparent:c.apparent_temperature});

  statusEl.textContent=`${label} 기준 업데이트 완료`;
}

async function searchCity(){
  const city=citySelect.value || 'Seoul';
  selectChip(city);
  try{
    const g=await geocode(city);
    await loadWeather(g.latitude,g.longitude,`${g.name}, ${g.country_code}`);
  }catch(e){ statusEl.textContent=e.message; }
}

document.getElementById('searchBtn').addEventListener('click',searchCity);
buildCityUI();
searchCity();
