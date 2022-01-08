import { gql, request } from "./node_modules/graphql-request/dist/index.js";
import { DateTime } from "./node_modules/luxon/build/node/luxon.js";

type DepartureInfo = {
  departureTime: number;
  stop: string;
  routeName: string;
  distance: number;
};

const stops: Map<string, number> = new Map([
  ["H1622", 300],
  ["H0082", 600],
  ["H1568", 900],
]);

const stopGtfsIds: Array<string> = [];
const routeNames = new Set(["41", "40", "37", "I", "322", "321"]);
const apiEndpoint =
  process.env.API_ENDPOINT ||
  "https://api.digitransit.fi/routing/v1/routers/hsl/index/graphql";
console.log(apiEndpoint);
const now: DateTime = DateTime.now();
const nextN: Number = 5; // todo test with 0, 1
const interval: Number = 1800; // todo now in seconds, switch to minutes

async function getStopGtfsId(stopName: string): Promise<string> {
  // If the stop name is of the format Hxxxx and an existing stop,
  // we only get one result
  // In real life we'd obviously want to validate the input and the result
  // but I'm skpping it here
  const query = gql`
    query StopID($name: String!) {
      stops(name: $name) {
        gtfsId
      }
    }
  `;

  const variables = {
    name: stopName,
  };

  const data = await request(apiEndpoint, query, variables);
  // forcing type like this is probably not pretty and I should write types for resutlts
  // but this will work for now just as long as the query itself is correct
  return data.stops[0].gtfsId as string;
}

async function getStopGtfsIds() {
  for (const key of stops.keys()) {
    let gtfsId = await getStopGtfsId(key);
    stopGtfsIds.push(gtfsId);
  }
}

async function getNextDeparturesForStop(stopId: string) {
  const variables = { stopId: stopId, timeInterval: interval, nextN: nextN };
  const stopQuery = gql`
    query Stop($stopId: String!, $timeInterval: Int!, $nextN: Int!) {
      stop(id: $stopId) {
        name
        code
        stoptimesForPatterns(
          timeRange: $timeInterval
          numberOfDepartures: $nextN
        ) {
          pattern {
            route {
              shortName
            }
          }
          stoptimes {
            realtimeDeparture
            serviceDay
          }
        }
      }
    }
  `;
  const data = await request(apiEndpoint, stopQuery, variables);
  return data;
}

const printDepartures = (departure: DepartureInfo): void => {
  const departureTime = DateTime.fromSeconds(departure.departureTime);
  const walkAdjustedTime = departureTime.plus({ seconds: departure.distance });
  console.log("-----------");
  console.log(
    departure.routeName +
      " departing at " +
      departureTime.toLocaleString(DateTime.TIME_24_SIMPLE) +
      " from " +
      departure.stop
  );
  console.log(
    "Leave at " + walkAdjustedTime.toLocaleString(DateTime.TIME_24_SIMPLE)
  );
  console.log(departure.distance / 60 + " mins of walking to stop");
};

async function showNext(): Promise<void> {
  await getStopGtfsIds();
  const nextDepartures: Array<any> = [];
  for (let stop of stopGtfsIds) {
    nextDepartures.push(await getNextDeparturesForStop(stop));
  }

  const departures: Array<DepartureInfo> = new Array();
  for (let departureData of nextDepartures) {
    const stopLongName =
      departureData.stop.name + "/" + departureData.stop.code;
    // again maybe it is not pretty to force types but I trust it's correct here now
    const delay = stops.get(departureData.stop.code as string);
    const stoptimes: Array<any> = departureData.stop.stoptimesForPatterns;

    for (let stoptime of stoptimes) {
      const routeShortName = stoptime.pattern.route.shortName;
      if (routeNames.has(routeShortName)) {
        for (let departureTime of stoptime.stoptimes) {
          const dptTime: number =
            departureTime.realtimeDeparture + departureTime.serviceDay;
          const departure: DepartureInfo = {
            departureTime: dptTime,
            stop: stopLongName,
            distance: delay,
            routeName: routeShortName,
          };

          departures.push(departure);
        }
      }
    }
  }
  // I'm sure there's a more js-y way to do this but here we are
  departures.sort(function (a, b) {
    const walkTimeA = a.departureTime + a.distance;
    const walkTimeB = b.departureTime + b.distance;
    return walkTimeA - walkTimeB;
  });

  for (const dpt of departures) {
    printDepartures(dpt);
  }
}

console.log(
  "Next " +
    nextN +
    " departures in " +
    interval / 60 +
    " minutes, starting from " +
    now.toLocaleString({
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      weekday: "short",
      month: "short",
      day: "2-digit",
    })
);

showNext();
