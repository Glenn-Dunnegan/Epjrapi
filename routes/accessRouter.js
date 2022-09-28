const express = require("express")
const accessRouter = express.Router()
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

function authCheck(request, user, accessLevel, checkType){
    const {authorization} = request.headers

    const token = authorization.replace('Bearer ','')

    const verifiedToken = jwt.verify(token, process.env.SECRET)

    const tokenStripped = function (verifiedToken){
        delete verifiedToken.iat
        delete verifiedToken._id
        delete verifiedToken.address
        delete verifiedToken.memberSince
        return verifiedToken
    }
    if(checkType === 'strict'){
        if(JSON.stringify(
            tokenStripped(verifiedToken)) === JSON.stringify(tokenStripped(user.withoutPassword())) && user.access === accessLevel
            ){
            return true
        }else{
            return false
        }
    }else if(checkType === 'update'){
        if(
            (JSON.stringify(tokenStripped(verifiedToken)) === JSON.stringify(tokenStripped(user.withoutPassword())) && 
            (request.auth._id === request.params.userID)) || user.access === accessLevel
        ){
            return true
        }else{
            return false
        }
    }else{
        console.log('Check Function')
    }
}

// get users list
accessRouter.get("/userslist", (req, res, next) => {

    User.findById(req.auth._id, (err, user) => {
        if(authCheck(req, user, 'admin', 'strict')){
            console.log(user._id)
            User.find((err, users) => {
                
                if(err){
                res.status(500)
                return next(err)
                }
        
                const userList = users.map((user)=>
                user = user.withoutPassword()
                )
        
                return res.status(200).send(userList)
            })
        }else if(err){
            console.log(err)
        }else{
            return next(new Error("Not Authorized"))
        }
    })
})

accessRouter.put('/changepassword/:userID', (req, res, next) => {
   
        User.findById(req.auth._id, (err, user) => {
            
            if(authCheck(req, user, 'admin', 'update')){
                
                user.password = req.body.password
                user.save(function(err,result){
                    if (err){
                        console.log(err);
                    }
                    else{
                        console.log(result)
                    }
                })

                console.log(user)
                return res.status(200).send("Update Successful")
                
            }else if(err){
                console.log(err)
            }else{
                return next(new Error("Not Authorized"))
            }
        })
})



accessRouter.post('/work', upload.single('imgUrl'), (req, res, next) => {

    User.findById(req.auth._id, (err, user) => {
        
        if(authCheck(req, user, 'member', 'strict')){
            req.body.user = req.auth._id
            // req.body.imgUrl =  'test'  //req.file.originalname
            if(req.file !== null){
                const newJob = new Job({
                    subject: req.body.subject,
                    description: req.body.description,
                    poc: {
                        contactFirstName: req.body.contactFirstName,
                        contactLastName: req.body.contactLastName,
                        contactPhone: req.body.contactPhone,
                        contactEmail: req.body.contactEmail
                    },
                    jobLocation: {
                        line1: req.body.line1,
                        line2: req.body.line2,
                        city: req.body.city,
                        state: req.body.state,
                        zip: req.body.zip
                    },
                    user: req.body.user,
                    img: {
                        fileName: req.file.originalname,
                        fileType: req.file.mimetype,
                        fileSize: req.file.size,
                        bucketName: req.file.bucketName,
                        fileID: req.file._id,
                        savedFileName: req.file.filename
                    }
                })
            }else{
                const newJob = new Job({
                    subject: req.body.subject,
                    description: req.body.description,
                    poc: {
                        contactFirstName: req.body.contactFirstName,
                        contactLastName: req.body.contactLastName,
                        contactPhone: req.body.contactPhone,
                        contactEmail: req.body.contactEmail
                    },
                    jobLocation: {
                        line1: req.body.line1,
                        line2: req.body.line2,
                        city: req.body.city,
                        state: req.body.state,
                        zip: req.body.zip
                    },
                    user: req.body.user
                })
            }
            newJob.save((err, savedJob) => {
                if(err){
                res.status(500)
                return next(err)
                }
                console.log(savedJob)
                return res.status(201).send(savedJob)
            })
        }else if(err){
            console.log(err)
        }else{
            return next(new Error("Not Authorized"))
        }
    })
})
// get all jobs
accessRouter.get('/work', (req, res, next) => {
    User.findById(req.auth._id, (err, user) => {
        if(authCheck(req, user, 'admin', 'strict')){
            Job.find((err, jobs) => {
                if(err){
                  res.status(500)
                  return next(err)
                }
                return res.status(200).send(jobs)
            })
        }else if(err){
            console.log(err)
        }else{
            return next(new Error("Not Authorized"))
        }
    })
})

//route for users to get own job requests
accessRouter.get('/userwork', (req,res,next) => {
    User.findById(req.auth._id, (err, user) => {
        if(authCheck(req, user, 'member', 'strict') || authCheck(req, user, 'admin', 'strict') ){
            Job.find({ user: req.auth._id }, (err, jobs) => {
            if(err){
                res.status(500)
                return next(err)
            }
            return res.status(200).send(jobs)
            })
        }else if(err){
            console.log(err)
        }else{
            return next(new Error("Not Authorized"))
        }
    })
})

accessRouter.get('/userworkImages/:jobID', (req, res, next) => {
    Job.findById({_id: req.params.jobID}, (err, job) => {
        if(err){
            res.status(500)
            return next(err)
        }
        
      
            gfs.openDownloadStreamByName(job.img.savedFileName).pipe(res)
        
        
        // storage.findById(job.img.fileID, (err, img) => {
        //     if(err){
        //         console.log(err)
        //     }
        // })
        //return res.status(200).send(job.img.fileID)
    })
})

//update Job Status
accessRouter.put('/jobstatus/:jobID', (req, res, next) => {
    User.findById(req.auth._id, (err, user) => {
        if(authCheck(req, user, 'admin', 'strict')){
            Job.findOneAndUpdate(
                { _id: req.params.jobID },
                req.body,
                { new: true },
                (err, updatedJob) => {
                  if(err){
                    res.status(500)
                    return next(err)
                  }
                  return res.status(201).send(updatedJob)
                })
        }else if(err){
            console.log(err)
        }else{
            return next(new Error("Not Authorized"))
        }
    })
})


module.exports = accessRouter