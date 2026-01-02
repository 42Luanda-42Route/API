//import { io } from "socket.io-client";
const io = require('socket.io-client')

//const socket = io("http://localhost:3000");

const socket = io("https://four2routeapi.onrender.com",{
   transport: ["websocket"],
});

socket.on("connect", () => {
  console.log("Cadete conectado");

   socket.emit("cadete:joinRoute", {
     cadeteId: 2
   });
});

setInterval(() => {
  socket.emit("cadete:updateLocation", {
    cadeteId: 2,
    lat: -8.83833 + Math.random() * 0.001,
    long: 13.23444 + Math.random() * 0.001
  });
}, 5000);

socket.on("transport:location", (data)=>{
      console.log("Localização de Cadete recebida:", data);
});

socket.on("driver:location", (data) => {
      console.log("Localização de Motorista recebida:", data);
});

