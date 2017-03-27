FROM node:6.10.0

MAINTAINER Reekoh

WORKDIR /home

# Install dependencies
ADD . /home
RUN npm install pm2 -g
RUN npm install

EXPOSE 8080
CMD ["pm2-docker", "--json", "app.yml"]