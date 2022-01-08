FROM node:17-alpine

RUN mkdir /opt/app
COPY app/ /opt/app/
WORKDIR /opt/app

USER node

ENTRYPOINT [ "node", "/opt/app/dest/request.js"]