//import { io } from "socket.io-client";
const io = require('socket.io-client')

//const socket = io("http://localhost:3000");
const socket = io("https://four2routeapi.onrender.com",{
    transport:["websocket"],
});

socket.on("connect", () => {
  console.log("Motorista conectado");

  socket.emit("driver:joinRoute", {
    driverId: 1
  });

  setInterval(() => {
    socket.emit("driver:updateLocation", {
      id_driver: 1,
      lat: -8.83833 + Math.random() * 0.001,
      long: 13.23444 + Math.random() * 0.001
    });
  }, 3000);
});
