# Next departures

## What

1. A simple app showing the next available transport options from selected stops/lines
2. Personal playground for learning/trying out new things.

This is for my personal use, so some choices might be quirky or less-than-polished.
Taking into account that, a simple CLI app would be quite enough, but for learning purposes I might do some silly overengineering.

See [roadmap](roadmap.md) for progress, plans, and ideas.

## Why

When you have multiple options for getting where you want to go, all leaving from different stops, you have two options

- check each stop/bus individually
- use reittiopas

The first option is tedious and includes superfluous information, the second may well opt to not show you all available options

## How

1. have docker installed
2. clone this repo
3. edit `stops` and `routes` (not required if you want to always override default values)
   - `routes`: add the names of the routes you want to see, one on each line
   - `stops`: add one stop per line, starting with the _code_ of the stops (of the forAm Hxxxx, available from hsl.fi and physical stops), comma, and finally the time it takes you to get to the stop, in _minutes_
   - see the files for examples
   - **nb**. there's no validation for the inputs yet
4. `docker build -t tt .`
5. `docker run tt` for using the default values, i.e. showing departures for the next 15 minutes, starting from now, and limiting entries to max 5 per route
6. add parameters as desired, in the form `key=value`, see below for details, eg. `docker run tt start=15`

### Parameters

**start**: minutes, the first shown departures depart at time now + start, e.g. if invoking script at 13:00, start=15 would show departures from 13:15 onwards

**stop**: minutes, the last departures shown depart at start time + stop, e.g. if first departures are shown from 13:15 onwards and stop=15, the departures would be shown until 13:30

**departures**: maximum number of departures shown per route

**routes**: names of bus/train/tram/metro lines, comma-separated list without spaces, eg. routes=K,P,23,40,M1,M2

**stops**: codes of stops (of the form H1234, available form hsl.fi and physical bus stops) and the time it takes to get to the stop separated by a colon, stop entries separated by semi-colon, no spaces
use 0 if you don't want the walking distance to be taken into account,
e.g. stops=H1234,10;H4321,15

**endpoint**: url to the GraphQL API endpoint, mostly useful if you for some reason run hsldevcom/opentripplanner locally
