
const express = require('express')
const app = express()
//const https = require('https')
const http = require('http')
const fs = require('node:fs');
require('dotenv').config()
const morgan = require('morgan')
const mongoose = require('mongoose')
const multer = require('multer')
const {expressjwt: jwt} = require('express-jwt')
const cors = require('cors')
const upload = multer({ dest : 'uploads/'})
const { Server } = require("socket.io");

// const options = {
//   key: fs.readFileSync('/etc/letsencrypt/live/dirtandseptic.com/privkey.pem'),
//   cert: fs.readFileSync('/etc/letsencrypt/live/dirtandseptic.com/fullchain.pem'),
// };

//const server = https.createServer(options, app);
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ["https://dirtandseptic.com", "https://www.dirtandseptic.com", "http://localhost:3000"],
    methods: ["GET", "POST"]
  }
});
// ad back "http://localhost:3000"


// reference .env file variables like this
// process.env.SECRET

app.use(express.json())
app.use(morgan('dev'))

mongoose.connect(
  `${process.env.CRED}`,
  () => console.log('Connected to the DB')
)

app.use(cors())
app.use('/auth', require('./routes/authRouter.js'))
app.use('/api', jwt({ secret: process.env.SECRET, algorithms: ["HS256"] }),) // req.user
app.use('/api/job', require('./routes/jobRouter.js'))
app.use('/api/access', require('./routes/accessRouter.js'))
app.use('/jobImage', require('./routes/openRouter.js'))
app.use('/forgotPassword', require('./routes/forgotPasswordRouter.js'))

//let connCount = 0

//let socketsArray = await io.fetchSockets();

// const getSockets = async function(){
//   const socketsArray = await io.fetchSockets();
//   console.log(socketsArray.length)
// }

io.on('connection', (socket) => {
  
  //console.log(`Socket ${socket.id}`);
  //connCount++
  
  socket.on('disconnect', () => {
    //console.log('user disconnected');
    socket.disconnect()
  });
  socket.on('eventTime_update', () => {
    socket.broadcast.emit('updateSchedule')
    console.log('pinged')
  })
  //getSockets()
});

app.use((err, req, res, next) => {
  console.log(err)
  if(err.name === "UnauthorizedError"){
    res.status(err.status)
  }
  return res.send({errMsg: err.message})
})

server.listen(process.env.MYPORT, () => {
  console.log(`Server is running on port ${process.env.MYPORT}`)
})
