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
  </tr>\
  ".trim();
  buses.forEach(el => {
    const nextDepartureDateTimeUTC = new Date(`${el.nextDeparture.date}T${el.nextDeparture.time}Z`);
    // console.log('nextDepartureDateTimeUTC: ', nextDepartureDateTimeUTC);
    // console.log('now: ', now);
    const nextDepartureDateTimeLocal = nextDepartureDateTimeUTC.toLocaleString();
    let trClass = '';
    // debugger
    if (now < nextDepartureDateTimeUTC) 
    {
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

const init = async () => {
  const buses = await fetchBusData();
  console.log('init buses: ', buses);

  renderBusData(buses);
  setInterval(() => {
    const timeStr = new Date().toLocaleTimeString();
    document.querySelector('.time').innerHTML = timeStr;
    renderBusData(buses);
  }, 1000);
};

init();