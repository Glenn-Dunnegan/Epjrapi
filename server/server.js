const serverless = require('serverless-http');
const express = require('express')
const app = express()
require('dotenv').config()
const morgan = require('morgan')
const mongoose = require('mongoose')
const {expressjwt: jwt} = require('express-jwt')

// reference .env file variables like this
// precess.env.SECRET

app.use(express.json())
app.use(morgan('dev'))

mongoose.connect(
  'mongodb+srv://admin:admin@epjr.enp5r30.mongodb.net/epjr?appName=mongosh+1.4.1/epjr',
  () => console.log('Connected to the DB')
)

app.use('/auth', require('./routes/authRouter.js'))
app.use('/api', jwt({ secret: process.env.SECRET, algorithms: ["HS256"] }),) // req.user
app.use('/api/job', require('./routes/jobRouter.js'))
app.use('/api/access', require('./routes/accessRouter.js'))

app.use((err, req, res, next) => {
  console.log(err)
  if(err.name === "UnauthorizedError"){
    res.status(err.status)
  }
  return res.send({errMsg: err.message})
})

app.listen(process.env.PORT || 9000, () => {
  console.log(`Server is running on local port 9000`)
})
module.exports.handler = serverless(app);