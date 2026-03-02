FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

#RUN npx prisma generate || true

EXPOSE 3000

CMD ["npm", "run", "start:dev"]

#https://youtu.be/biGUPJy92Z0?si=vcbLH1ZPyR8J9B35