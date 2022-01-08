FROM node:17-alpine

COPY app /opt/

CMD [ "node /opt/app/request.js" ]