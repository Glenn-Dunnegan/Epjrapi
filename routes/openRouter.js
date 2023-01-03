const express = require("express")
const openRouter = express.Router()
require('dotenv').config()
const User = require('../models/user.js')
const Job = require('../models/job.js')
const jwt = require('jsonwebtoken')
const multer = require('multer')
const path = require('path')
const crypto = require('crypto')
const {GridFsStorage} = require('multer-gridfs-storage')
const mongoose = require("mongoose")

const storage = new GridFsStorage({url: process.env.CRED})
const upload = multer({storage: storage})

const mongoURI = process.env.CRED

const conn = mongoose.createConnection( mongoURI )

let gfs

conn.once('open', () => {
    gfs = new mongoose.mongo.GridFSBucket(conn.db, {
        bucketName: 'fs'
    })
})

openRouter.get('/Images/:jobID', (req, res, next) => {
    Job.findById({_id: req.params.jobID}, (err, job) => {
        if(err){
            res.status(500)
            return next(err)
        }
        
            try{
                gfs.openDownloadStreamByName(job.img.savedFileName).pipe(res)
            }catch{
                return next(err)
            }
            
        
    })
})

openRouter.get('/test', (req, res, next) => {
    
        res.send('connection successful')
    
    

})

module.exports = openRouter