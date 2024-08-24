import express from "express";
import {readFile} from "node:fs/promises";
import path from "node:path";
import url from "node:url";
import {DateTime, Duration} from "luxon";
import { WebSocketServer } from "ws";

const __filename = url.fileURLToPath(import.meta.url); // путь к текущему модулю (index.js)
const __dirname = path.dirname(__filename); // путь к каталогу, в котором находится текущий модуль
const port = 3000;
const timeZone = "UTC";

const app = express();

app.use(express.static(path.join(__dirname, "public")));

// получаем данные
const loadBuses = async () => {
  const data = await readFile(path.join(__dirname, "buses.json"), {encoding: "utf-8"});
  // console.log('data: ', data);
  return JSON.parse(data);
};
// loadBuses();

const getNextDeparture = (firstDepartureTime, frequencyMinutes) => {
  const now = DateTime.now().setZone(timeZone);
  const [hours, minutes] = firstDepartureTime.split(':').map(n => Number(n));

  let departure = DateTime.now().set({
    hour: hours,
    minute: minutes,
    second: 0,
    millisecond: 0,
  }).setZone(timeZone);
  // console.log('departure: ', departure);

  if (now > departure) {
    departure = departure.plus({minutes: frequencyMinutes});
  }
  const endOfDay = DateTime.now().set({
    hour: 23,
    minute: 59,
    second: 59,
    millisecond: 0,
  }).setZone(timeZone);

  if (departure > endOfDay) {
    departure = departure.startOf('day').plus({days: 1}).set({
      hour: hours,
      minute: minutes,
      second: 0,
      millisecond: 0,
    }).setZone(timeZone);;
  }

  while (now > departure) {
    departure = departure.plus({minutes: frequencyMinutes});

    if (departure > endOfDay) {
      departure = departure.startOf('day').plus({days: 1}).set({
        hour: hours,
        minute: minutes,
        second: 0,
        millisecond: 0,
      }).setZone(timeZone);;
    }
  }

  return departure;
};

const sendUpdatedData = async () => {
  const buses = await loadBuses();
  const now = DateTime.now().setZone(timeZone);

  const updatedBuses = buses.map(bus => {
    const nextDeparture = getNextDeparture(bus.firstDepartureTime, bus.frequencyMinutes);
    // console.log('nextDeparture: ', nextDeparture);

    const timeRemain = Duration.fromMillis(nextDeparture.diff(now).toMillis());

    return {
      nextDeparture: {
        date: nextDeparture.toFormat('yyyy-MM-dd'),
        time: nextDeparture.toFormat('HH:mm'),
      },
      ...bus,
      // remain: nextDeparture.diffNow('seconds').seconds.toFixed(0),
      remain: timeRemain.toFormat('hh:mm:ss'),
    };
  });
  // console.log('updatedBuses: ', updatedBuses);
  return updatedBuses;
};

// const updatedBuses = sendUpdatedData();
// console.log('updatedBuses: ', updatedBuses);

app.get("/hello", (req, res) => {
  res.send("app-< Hello, World!");
});

app.get("/next-departure", async (req, res) => {
  console.log("app-< next-departure");
  try {
    let updatedBuses = await sendUpdatedData();

    const sortedBuses = sortBuses(updatedBuses);
    res.json(sortedBuses);
    // console.log('sortedBuses: ', sortedBuses);

    // updatedBuses = updatedBuses.sort((a, b) => {
    //   const adt = a.nextDeparture.date + ' ' + a.nextDeparture.time;
    //   const bdt = b.nextDeparture.date + ' ' + b.nextDeparture.time;
    //   if (adt < bdt) return -1;
    //   if (adt > bdt) return 1;
    //   return 0;
    // });
    // res.json(updatedBuses);
    // // console.log('updatedBuses: ', updatedBuses);

  } catch (e) {
    console.error(e);
    res.status(500);
    res.send("Error: " + e);
  }
});

function sortBuses(buses) {

  // return [...buses].sort((a, b) =>
  //   DateTime.fromISO(a.nextDeparture.date + 'T' + a.nextDeparture.time + 'Z')
  //   - DateTime.fromISO(b.nextDeparture.date + 'T' + b.nextDeparture.time + 'Z'));

  return [...buses].sort((a, b) =>
    new Date(a.nextDeparture.date + 'T' + a.nextDeparture.time + 'Z')
    - new Date(b.nextDeparture.date + 'T' + b.nextDeparture.time + 'Z'));
};

const wss = new WebSocketServer({ noServer: true });
const clients = new Set();
wss.on("connection", function connection(ws) {
  console.log('WebSocket connection');
  clients.add(ws);

  const sendUpdates = async () => {
    try{
      const updatedBuses = await sendUpdatedData();
      const sortedBuses = sortBuses(updatedBuses);

      ws.send(JSON.stringify(sortedBuses));
    } catch (e) {
      console.error('sendUpdates Error:', e);
    }
  };

  const interval = setInterval(() => {
    sendUpdates();
  }, 5000);

  ws.on("close", function close() {
    clearInterval(interval);
    clients.delete(ws);
    console.log('ws closed');
  });

  // ws.on("message", function incoming(message) {
  //   console.log("received: %s", message);
  // });

});

const server =app.listen(port, () => {
  console.log(`Server started on port ${port} http://localhost:${port}`);
});
server.on("upgrade", (req, socket, head) => {
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  })
})