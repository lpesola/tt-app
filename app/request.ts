import { gql, request } from "./node_modules/graphql-request/dist/index.js";
import { DateTime } from "./node_modules/luxon/build/node/luxon.js";

type DepartureInfo = {
  departureTime: number;
  stop: string;
  routeName: string;
  distance: number;
};

const stops: Map<string, number> = new Map([
  ["H1622", 7],
  ["H0082", 10],
]);

const stopGtfsIds: Array<string> = [];
const routeNames = new Set(["41", "40", "37", "I"]);
const apiEndpoint =
  "https://api.digitransit.fi/routing/v1/routers/hsl/index/graphql";
// todo use env or something for setting url
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
  console.log(departure.routeName);
  console.log(departureTime.toLocaleString(DateTime.TIME_24_SIMPLE));
  console.log(departure.distance + " mins of walking to stop");
  console.log(departure.stop);
  console.log("-----------");

  console.log();
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
    console.log("--------");
  }
  // I'm sure there's a more js-y way to do this but here we are
  departures.sort(function (a, b) {
    return a.departureTime - b.departureTime;
  });

  for (const dpt of departures) {
    printDepartures(dpt);
  }
}

console.log(
  "Next " +
    nextN +
    " departures in " +
    interval +
    " seconds, starting from " +
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
