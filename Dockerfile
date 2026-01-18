FROM node:20-bookworm

WORKDIR /app

RUN apt-get update && apt-get install -y git

COPY . .

RUN npm ci

COPY start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]
