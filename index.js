import express from "express";
import {readFile} from "node:fs/promises";
import path from "node:path";
import url from "node:url";
import { DateTime } from "luxon";

const __filename = url.fileURLToPath(import.meta.url); // путь к текущему модулю (index.js)
const __dirname = path.dirname(__filename); // путь к каталогу, в котором находится текущий модуль
const port = 3000;
const timeZone = "UTC";

const app = express();

// получаем данные
const loadBuses = async () => {
  const data = await readFile(path.join(__dirname, "buses.json"), {encoding: "utf-8"});
  // console.log('data: ', data);
  return JSON.parse(data);
}
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

  if(now > departure) {
    departure = departure.plus({ minutes: frequencyMinutes });
  }
  const endOfDay = DateTime.now().set({
    hour: 23,
    minute: 59,
    second: 59,
    millisecond: 0,
  }).setZone(timeZone);

  if(departure > endOfDay) {
    departure = departure.startOf('day').plus({ days: 1 }).set({
      hour: hours,
      minute: minutes,
      second: 0,
      millisecond: 0,
    }).setZone(timeZone);;
  }

  while(now > departure){
    departure = departure.plus({ minutes: frequencyMinutes });

    if(departure > endOfDay) {
      departure = departure.startOf('day').plus({ days: 1 }).set({
        hour: hours,
        minute: minutes,
        second: 0,
        millisecond: 0,
      }).setZone(timeZone);;
    }
  }

  return departure;
}

const sendUpdatedData = async () => {
  const buses = await loadBuses();

  const updatedBuses = buses.map(bus => {
    const nextDeparture = getNextDeparture(bus.firstDepartureTime, bus.frequencyMinutes);
    // console.log('nextDeparture: ', nextDeparture);

    return {
      nextDeparture: {
        data: nextDeparture.toFormat('yyyy-MM-dd'),
        time: nextDeparture.toFormat('HH:mm'),
      },
      ...bus,
    };
  });
  // console.log('updatedBuses: ', updatedBuses);
  return updatedBuses;
}

// const updatedBuses = sendUpdatedData();
// console.log('updatedBuses: ', updatedBuses);

app.get("/hello", (req, res) => {
  res.send("app-< Hello, World!");
});

app.get("/next-departure", async (req, res) => {
  console.log("app-< next-departure");
  try{
    let updatedBuses = await sendUpdatedData();
    updatedBuses = updatedBuses.sort((a, b) => {
      const adt = a.nextDeparture.data + ' ' + a.nextDeparture.time;
      const bdt = b.nextDeparture.data + ' ' + b.nextDeparture.time;
      if (adt < bdt) return -1;
      if (adt > bdt) return 1;
      return 0;
    })
    // console.log('updatedBuses: ', updatedBuses);
    res.json(updatedBuses);
  } catch (e) {
    console.error(e);
    res.send("Error: " + e);
  }
});

app.listen(port, () => {
  console.log(`Server started on port ${port} http://localhost:${port}`);
});

console.log("Hello, World!");
