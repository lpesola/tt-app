# Planning & ideas

1. not even a mvp, just stuff to get started
2. the mvp part; this should already make some sense but not be particularly impressive
3. if I feel like it, I'll work on this, now or at a later point

## App

1. ~~small shell script, query rest api to get next _n_ buses/trains/whatever for stops in _list_, filter by list of bus numbers~~
2. ~~simple TS app; read a file, show next _n_, CLI for personal use~~
3. simple React UI, ~~take into account walking distance to stop~~, allow changing it, add icons for train/bus, allow sorting by arrival time or walking time, android app/widget, filter by, ~~show only predifined list of buses~~, querying the stop id & adding automatically to list the chosen ones

## Infra

1. ~~put stuff in a container~~, docker compose for running locally with hsl data container
2. oidc with github, run app in whatever form it is, in an EC2 instance, limit access somehow, no need to allow connections outside; ecr; do this with terra
3. run front/back in ecs or eks

## Pipeline

1. ci: basic checks; lints (tslint, shellcheck, prettier), sonarqube, token/pw scan
2. cd: build docker, plan from pr, merge deploys (oidc)

## Other

- Docs: good readme, maybe even pages/wiki
- Dev tools: local deployment, testing, https://github.com/nektos/act / compose
