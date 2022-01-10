import { DateTime } from 'luxon'
import { gql, request } from 'graphql-request'
import { readFile } from 'fs/promises'

type DepartureInfo = {
    vehicleDepartureTime: number
    stop: string
    routeName: string
    distanceToStop: number
}

let stops: Map<string, number> = new Map()
let routeNames: Set<string>
// todo: was there a way to set this for all instances of Datetime
let startingFrom: DateTime = DateTime.now().setZone('Europe/Helsinki')
let departuresPerRoute: number = 5
let timeRange: number = 900 // offset from now, seconds
let apiEndpoint: string =
    'https://api.digitransit.fi/routing/v1/routers/hsl/index/graphql'

const stopGtfsIds: Array<string> = []

const getStopGtfsId = async (stopName: string): Promise<string> => {
    // stations include stops that all share the same h code
    // so this query may return more than one result
    // setting maxResults to one is a non-functional workaround
    const query = gql`
        query StopID($name: String!) {
            stops(name: $name, maxResults: 1) {
                gtfsId
            }
        }
    `
    const variables = {
        name: stopName,
    }
    const data = await request(apiEndpoint, query, variables)
    // forcing type like this is probably not pretty and I should write types for resutlts
    // but this will work for now just as long as the query itself is correct
    return data.stops[0].gtfsId as string
}

const getStopGtfsIds = async () => {
    for (const key of stops.keys()) {
        let gtfsId = await getStopGtfsId(key)
        stopGtfsIds.push(gtfsId)
    }
}

const getNextDeparturesForStop = async (stopId: string) => {
    const variables = {
        stopId: stopId,
        timeRange: timeRange,
        departures: departuresPerRoute,
        startTime: startingFrom.toFormat('X'),
    }
    const stopQuery = gql`
        query Stop(
            $stopId: String!
            $timeRange: Int!
            $departures: Int!
            $startTime: Long!
        ) {
            stop(id: $stopId) {
                name
                code
                stoptimesForPatterns(
                    startTime: $startTime
                    timeRange: $timeRange
                    numberOfDepartures: $departures
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
    `
    const data = await request(apiEndpoint, stopQuery, variables)
    return data
}

const printDepartures = (departure: DepartureInfo): void => {
    const departureTime = DateTime.fromSeconds(
        departure.vehicleDepartureTime
    ).setZone('Europe/Helsinki')
    const walkAdjustedTime = departureTime.minus({
        seconds: departure.distanceToStop,
    })
    console.log('-----------')
    console.log(
        departure.routeName +
            ' departing at ' +
            departureTime.toLocaleString(DateTime.TIME_24_SIMPLE) +
            ' from ' +
            departure.stop
    )
    console.log(
        'Leave at ' + walkAdjustedTime.toLocaleString(DateTime.TIME_24_SIMPLE)
    )
    console.log(departure.distanceToStop / 60 + ' min walk to stop')
}

const showNext = async (): Promise<void> => {
    const nextDepartures: Array<any> = []
    for (let stop of stopGtfsIds) {
        nextDepartures.push(await getNextDeparturesForStop(stop))
    }

    const departures: Array<DepartureInfo> = new Array()
    for (let departureData of nextDepartures) {
        const stopLongName =
            departureData.stop.name + '/' + departureData.stop.code
        // again maybe it is not pretty to force types but I trust it's correct here now
        const walkingDistance = stops.get(departureData.stop.code as string)
        const stoptimes: Array<any> = departureData.stop.stoptimesForPatterns

        for (let stoptime of stoptimes) {
            const routeShortName = stoptime.pattern.route.shortName
            if (routeNames.has(routeShortName)) {
                for (let departureTime of stoptime.stoptimes) {
                    const dptTime: number =
                        departureTime.realtimeDeparture +
                        departureTime.serviceDay
                    const departure: DepartureInfo = {
                        vehicleDepartureTime: dptTime,
                        stop: stopLongName,
                        distanceToStop: walkingDistance,
                        routeName: routeShortName,
                    }

                    departures.push(departure)
                }
            }
        }
    }
    // I'm sure there's a more js-y way to do this but here we are
    departures.sort(function (a, b) {
        const dptTimeA = a.vehicleDepartureTime - a.distanceToStop
        const dptTimeB = b.vehicleDepartureTime - b.distanceToStop
        return dptTimeA - dptTimeB
    })

    for (const dpt of departures) {
        printDepartures(dpt)
    }
}

const setParameters = async () => {
    let params: Map<string, string> = new Map()

    for (const arg of process.argv.slice(2)) {
        const nameValue = arg.split('=')
        params.set(nameValue[0], nameValue[1])
    }

    if (params.has('end')) {
        timeRange = parseInt(params.get('end')) * 60
    }
    if (params.has('start')) {
        startingFrom = startingFrom.plus({
            minutes: parseInt(params.get('start')),
        })
    }
    if (params.has('endpoint')) {
        apiEndpoint = params.get('endpoint')
        console.log('Using ' + apiEndpoint + ' as API endpoint')
    }
    if (params.has('departures')) {
        departuresPerRoute = parseInt(params.get('departures'))
    }
    if (params.has('routes')) {
        const a = params.get('routes').split(',')
        routeNames = new Set(a)
    } else {
        const result = await readFile('routes', 'utf-8')
        routeNames = new Set(result.split('\n'))
    }
    if (params.has('stops')) {
        const a = params.get('stops').split(';')
        for (const value of a) {
            const b = value.split(',')
            // input from user in minutes for ergonomic reasons
            stops.set(b[0], parseInt(b[1]) * 60)
        }
    } else {
        const stopsFile = await readFile('stops', 'utf-8')
        stops = new Map(
            stopsFile.split('\n').map((value) => {
                const splitted = value.split(',')
                return [splitted[0], parseInt(splitted[1]) * 60]
            })
        )
    }
}

await setParameters()

console.log(
    'Departures in next ' +
        timeRange / 60 +
        ' minutes, ' +
        departuresPerRoute +
        ' per route, starting from ' +
        startingFrom.toLocaleString({
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
            weekday: 'short',
            month: 'short',
            day: '2-digit',
        })
)

await getStopGtfsIds()
await showNext()
