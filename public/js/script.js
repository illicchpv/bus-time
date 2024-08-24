// script.js

const fetchBusData = async () => {
  try {
    const resp = await fetch('/next-departure');
    if (!resp.ok)
      throw new Error(`fetchBusData error status: ${resp.status}`);
    const buses = await resp.json();
    return buses;
  } catch (e) {
    console.error('fetchBusData error:', e);
  }
};

const renderBusData = async (buses) => {
  // console.log('renderBusData');

  const tableBody = document.querySelector('#bus-table tbody');
  tableBody.innerHTML = '';
  const now = new Date();

  const templ = "\
  <tr class='${trClass}'>\
    <td>${busNumber}</td>\
    <td>${startPoint} - ${endPoint}</td>\
    <td>${nextDepartureDateLocal}</td>\
    <td>${nextDepartureTimeLocal}</td>\
    <td>${remain < '00:05:00' ? '<i>отправляется</i>' : remain}</td>\
  </tr>\
  ".trim();
  buses.forEach(el => {
    const nextDepartureDateTimeUTC = new Date(`${el.nextDeparture.date}T${el.nextDeparture.time}Z`);
    // console.log('nextDepartureDateTimeUTC: ', nextDepartureDateTimeUTC);
    // console.log('now: ', now);
    const nextDepartureDateTimeLocal = nextDepartureDateTimeUTC.toLocaleString();
    let trClass = '';
    // debugger
    if (now < nextDepartureDateTimeUTC) {
      trClass = 'active';
    } else {
      trClass = 'disabled';
    }
    // console.log(el.nextDeparture.date, 'nextDepartureDateTimeLocal: ', nextDepartureDateTimeLocal, " --- ", nextDepartureDateTimeUTC);
    const [nextDepartureDateLocal, nextDepartureTimeLocal] = nextDepartureDateTimeLocal.split(', ');
    el.nextDepartureDateLocal = nextDepartureDateLocal;
    el.nextDepartureTimeLocal = nextDepartureTimeLocal.substring(0, 5);
    el.trClass = trClass;
    const tr = templFill(templ, el);
    const rezTr = stringToDomElement(tr, tableBody);
    tableBody.append(rezTr);
  });

};

const initWebSocket = () => {
  const ws = new WebSocket(`ws://${window.location.host}`);
  ws.addEventListener('open', () => {
    console.log('ws connection open');
  });

  ws.addEventListener('message', (event) => {
    const buses = JSON.parse(event.data);
    console.log('ws connection message:', buses);
    renderBusData(buses);
  });

  ws.addEventListener('error', (err) => {
    console.log('ws connection error:', err);
  });

  ws.addEventListener('close', () => {
    console.log('ws connection close');
  });

};

const init = async () => {
  const buses = await fetchBusData();
  console.log('init buses: ', buses);

  renderBusData(buses);
  setInterval(() => {
    const timeStr = new Date().toLocaleTimeString();
    document.querySelector('.time').innerHTML = timeStr;
    // renderBusData(buses);
  }, 1000);

  initWebSocket();
};

init();