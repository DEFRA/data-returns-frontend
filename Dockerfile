FROM node:boron

# Would like to use the alpine image but a problem with node-sass means we have to compile the bindings from scratch.
# FROM node:boron-alpine
# RUN apk add --no-cache g++ gcc make python python-dev py-pip build-base && pip install virtualenv
# RUN rm -rf /var/cache/apk/*

# Create app directory
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

# Install app dependencies
COPY package.json /usr/src/app/
RUN npm install

# Bundle app source
COPY . /usr/src/app

# Create public dir
RUN mkdir -p /usr/src/app/public/images
RUN chmod ugo+rwx /usr/src/app/public/images
RUN mkdir -p /usr/src/app/public/stylesheets
RUN chmod ugo+rwx /usr/src/app/public/stylesheets
RUN mkdir -p /usr/src/app/public/javascripts
RUN chmod ugo+rwx /usr/src/app/public/javascripts

# Create tmp dir
RUN mkdir -p /usr/src/app/tmp
VOLUME /usr/src/app/tmp

# Create logs dir
RUN mkdir -p /usr/src/app/logs
VOLUME /usr/src/app/logs

EXPOSE 3000
CMD [ "node", "server.js" ]

USER node
