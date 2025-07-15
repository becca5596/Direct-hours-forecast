
let rawData = [], regions = [];
const monthOrder = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug'];

async function loadData() {
  const res = await fetch('forecast_final.csv');
  const text = await res.text();
  const rows = text.trim().split('\n').slice(1).map(r => r.split(','));
  rawData = rows.map(r => ({
    region: r[0], month: r[1], actual: +r[2], forecast: +r[3],
    error: +r[4], isForecast: r[6] === 'True',
    lower: +r[7], upper: +r[8]
  }));
  regions = [...new Set(rawData.map(r => r.region))];
  initUI();
  drawChart(regions[0]);
}

function initUI() {
  const select = document.getElementById('regionSelect');
  select.innerHTML = regions.map(r => `<option>${r}</option>`).join('');
  select.onchange = () => drawChart(select.value);

  const slider = document.getElementById('monthSlider');
  slider.oninput = () => {
    const label = `Jan–${monthOrder[+slider.value]}`;
    document.getElementById('monthLabel').textContent = label;
    drawChart(select.value);
  };

  document.getElementById('downloadBtn').onclick = () => {
    const blob = new Blob([rawData.map(r => Object.values(r).join(',')).join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'forecast_filtered.csv';
    a.click();
  };
}

function drawChart(region) {
  const maxMonth = +document.getElementById('monthSlider').value;
  const ctx = document.getElementById('forecastChart').getContext('2d');
  const filtered = rawData.filter(d => d.region === region && monthOrder.indexOf(d.month) <= maxMonth);

  const labels = filtered.map(d => d.month);
  const actual = filtered.map(d => d.actual);
  const forecast = filtered.map(d => d.forecast);
  const lower = filtered.map(d => d.lower);
  const upper = filtered.map(d => d.upper);
  const errors = filtered.map(d => d.error);

  const bgColor = errors.map(e => e > 0.05 ? 'rgba(255,99,132,0.5)' : 'rgba(0,0,0,0)');
  const ciArea = {
    label: 'Confidence ±10%',
    data: forecast,
    type: 'line',
    fill: '+1',
    backgroundColor: 'rgba(135,206,250,0.2)',
    borderWidth: 0,
    pointRadius: 0
  };

  if (window.myChart) window.myChart.destroy();
  window.myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Actual', data: actual, borderColor: 'blue', tension: 0.3 },
        { label: 'Forecast', data: forecast, borderColor: 'orange', borderDash: [5,5], tension: 0.3 },
        { label: 'Forecast +10%', data: upper, borderColor: 'rgba(0,0,0,0)', fill: false },
        ciArea,
        { label: 'Forecast -10%', data: lower, borderColor: 'rgba(0,0,0,0)', fill: false }
      ]
    },
    options: {
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            afterBody: (ctx) => {
              const i = ctx[0].dataIndex;
              const e = errors[i];
              return `Error: ${(e*100).toFixed(1)}%`;
            }
          }
        }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

loadData();
