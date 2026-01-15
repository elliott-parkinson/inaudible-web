FROM denoland/deno:latest

WORKDIR /app

RUN apt-get update && apt-get install -y git

COPY . .

COPY start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]
