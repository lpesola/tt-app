FROM node:17-alpine

RUN mkdir /opt/app
COPY build/ /opt/app/
RUN chown node /opt/app
WORKDIR /opt/app/
USER node
RUN npm install serve

CMD [ "./node_modules/serve/bin/serve.js", "-s"]