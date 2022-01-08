import { gql, request } from "./node_modules/graphql-request/dist/index.js";
import { DateTime } from "./node_modules/luxon/build/node/luxon.js";

const stops: Map<string, number> = new Map([
  ["H1622", 7],
  ["H0082", 10],
]);

const stopGtfsIds: Array<string> = [];
const routeNames = new Set(["41", "40", "37", "I"]);
const apiEndpoint =
  "https://api.digitransit.fi/routing/v1/routers/hsl/index/graphql";
const now: DateTime = DateTime.now().setLocale("fi");
// todo use this also in the request
console.log("Time now " + now.toLocaleString(DateTime.DATETIME_FULL));
const nextN: Number = 5; // todo test with 0, 1, 5
const interval: Number = 1800; // in seconds

async function getStopGtfsId(stopName: string): Promise<string> {
  // If the stop name is not of the format Hxxxx,
  // we might get more than one result
  // In real life we'd obviously want to validate the data
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
  // forcing type like this also not pretty but will work for now
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

async function showNext(): Promise<void> {
  await getStopGtfsIds();
  const nextDepartures: Array<any> = [];
  for (let stop of stopGtfsIds) {
    nextDepartures.push(await getNextDeparturesForStop(stop));
  }

  for (let departureData of nextDepartures) {
    console.log(
      "Next from stop " +
        departureData.stop.name +
        "/" +
        departureData.stop.code
    );
    console.log(
      "Walking delay " + stops.get(departureData.stop.code as string)
    );
    const stoptimes: Array<any> = departureData.stop.stoptimesForPatterns;

    for (let stoptime of stoptimes) {
        const routeShortName = stoptime.pattern.route.shortName
      if (routeNames.has(routeShortName)) {
        console.log("Line " + routeShortName);
        for (let departureTime of stoptime.stoptimes) {
          const today: DateTime = DateTime.fromSeconds(
            departureTime.serviceDay
          );
          const tmp: DateTime = today.plus({
            seconds: departureTime.realtimeDeparture,
          });
          console.log(tmp.toLocaleString(DateTime.TIME_24_SIMPLE));
        }
      }
    }
    console.log("--------");
  }
}

showNext();
