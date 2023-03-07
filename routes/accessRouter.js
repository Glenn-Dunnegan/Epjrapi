const express = require("express")
const accessRouter = express.Router()
require('dotenv').config()
const User = require('../models/user.js')
const Job = require('../models/job.js')
const Note = require('../models/note.js')
const jwt = require('jsonwebtoken')
const multer = require('multer')
const path = require('path')
const crypto = require('crypto')
const {GridFsStorage} = require('multer-gridfs-storage')
const mongoose = require("mongoose")
const nodemailer = require('nodemailer')

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

const mailTransporter = nodemailer.createTransport({
    host: 'smtp.zoho.com',
    port: '465',
    secure: true,
    auth: {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASS
    }
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
            (request.auth._id === request.params.userID)) || user.access === accessLevel || accessLevel
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

accessRouter.get("/userslist/searchByName/:firstName/:lastName", (req, res, next) => {

    User.findById(req.auth._id, (err, user) => {
        if(authCheck(req, user, 'admin', 'strict')){
            User.find({
                firstName: {$regex:  req.params.firstName, '$options': 'i'},
                //$text: {$search: req.params.pocFirstName},
                //$text: {$search: req.params.pocLastName}
                lastName: {$regex:  req.params.lastName, '$options': 'i'}
            },(err, users) => {
                if(err){
                res.status(500)
                return next(err)
                }
                const userList = users.map((user)=>
                user = user.withoutPassword()
                )
                console.log(req.params)
                return res.status(200).send(userList)
            })
        }else if(err){
            console.log(err)
        }else{
            return next(new Error("Not Authorized"))
        }
    })
})

accessRouter.get('/userslist/searchByLastName/:lastName', (req, res, next) => {
    User.findById(req.auth._id, (err, user) => {   
        if(authCheck(req, user, 'admin', 'strict')){
            User.find({
                //'poc.contactFirstName': {$regex:  req.params.pocFirstName, '$options': 'i'},
                //$text: {$search: req.params.pocFirstName},
                //$text: {$search: req.params.pocLastName}
                lastName: {$regex:  req.params.lastName, '$options': 'i'}
            },(err, users) => {
                if(err){
                    res.status(500)
                    return next(err)
                }
                const userList = users.map((user)=>
                user = user.withoutPassword()
                )
                console.log(req.params)
                return res.status(200).send(userList)
            }).limit(10)
        }else{
            return next(new Error("Not Authorized"))
        }
    })
})

accessRouter.put('/changepassword/:userID', (req, res, next) => {
   
        User.findById(req.auth._id, (err, user) => {
            
            if(authCheck(req, user, 'admin', 'update') || authCheck(req, user, 'member', 'update')){
                
                user.password = req.body.password
                user.tempRequested = false
                user.tempPassword = ''
                user.save(function(err,result){
                    if (err){
                        console.log(err);
                    }
                    else{
                        console.log(result)
                    }
                })

                console.log(user)
                
                const token = jwt.sign(user.withoutPassword(), process.env.SECRET)
                return res.status(200).send({ token, user: user.withoutPassword()})


            }else if(err){
                console.log(err)
            }else{
                return next(new Error("Not Authorized"))
            }
        })
})

// accessRouter.get('/requestpassword/:userEmail', (req, res, next) => {
//     User.findOneAndUpdate(
//         {email: req.params.userEmail},
//         user.tempPassword = 'testing126',
//         {new: true},
//         (err, updatedUser) => {
//             if(err){
//                 res.status(500)
//                 return next(err)
//             }
//             return res.status(201).send(updatedUser)
//         }
//     )
// })

// accessRouter.put('/jobstatus/:jobID', (req, res, next) => {
//     User.findById(req.auth._id, (err, user) => {
//         if(authCheck(req, user, 'admin', 'strict')){
//             Job.findOneAndUpdate(
//                 { _id: req.params.jobID },
//                 req.body,
//                 { new: true },
//                 (err, updatedJob) => {
//                   if(err){
//                     res.status(500)
//                     return next(err)
//                   }
//                   return res.status(201).send(updatedJob)
//                 })
//         }else if(err){
//             console.log(err)
//         }else{
//             return next(new Error("Not Authorized"))
//         }
//     })
// })

accessRouter.put('/generateotp/:userID', (req, res, next) => {
   
    User.findById(req.auth._id, (err, user) => {
        
        if(authCheck(req, user, 'admin'||'member', 'update')){
            user.otp = `${Math.floor(1000 + Math.random() * 9000)}`

            const details = {
                from: `DirtandSeptic <no_reply@dirtandseptic.com>`,
                to: `${user.email}`,
                subject: 'Email Verification',
                text: `
                Please use this code to verify your account.
                ${user.otp}`
            }

            mailTransporter.sendMail(details, (err) => {
                
                if(err){
                    console.log(err)
                }else{
                    console.log("Email has been sent!")
                }
            })
            
            user.save(function(err,result){
                if (err){
                    console.log(err);
                }
                else{
                    console.log('result')
                }
            })

            resMsg = 'Email has been sent'
            return res.status(200).send(resMsg)
            
        }else if(err){
            console.log(err)
        }else{
            return next(new Error("Not Authorized"))
        }
    })
})


accessRouter.put('/checkotp/:userID', (req, res, next) => {
   
    User.findById(req.auth._id, (err, user) => {
        
        if(authCheck(req, user, 'admin' || 'member', 'update')){
            console.log(req.body)
            if(Number(req.body.otp) === user.otp && req.body.otp.length > 3){
                user.isVerified = true
                console.log(req.params)
            }else{
                resMsg = 'Incorrect Code'
                return res.status(403).send(resMsg)
            }
            user.save(function(err,result){
                if (err){
                    console.log(err);
                }
                else{
                    console.log(result)
                }
            })

            resMsg = 'Update Successful'
            const token = jwt.sign(user.withoutPassword(), process.env.SECRET)
            return res.status(200).send({ token, user: user.withoutPassword(), resMsg})
            
        }else if(err){
            console.log(err)
        }else{
            return next(new Error("Not Authorized"))
        }
    })
})

accessRouter.post('/notes/jobnote', (req,res,next)=>{
    User.findById(req.auth._id, (err, user) => {
        if(authCheck(req, user, 'admin', 'strict')){
            const newNote = new Note({
                madeBy: req.auth._id,
                fieldChanged: req.body.fieldChanged,
                changedFrom: req.body.changedFrom,
                changedTo: req.body.changedTo,
                addedNote: req.body.addedNote,
                jobChanged: req.body.jobChanged
            })
            newNote.save((err, savedNote) => {
                if(err){
                res.status(500)
                return next(err)
                }
                console.log(savedNote)
                return res.status(201).send(savedNote)
            })
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
            if(!req.file){
                req.body.user = req.auth._id
                // req.body.imgUrl =  'test'  //req.file.originalname
                const newJob = new Job({
                    jobType: req.body.jobType,
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
                    submittedByFirstName: req.auth.firstName,
                    submittedByLastName: req.auth.lastName
                })
                console.log('///////////////////////////////////')
                //console.log(req)
                newJob.save((err, savedJob) => {
                    if(err){
                    res.status(500)
                    return next(err)
                    }
                    console.log(savedJob)
                    return res.status(201).send(savedJob)
                })
            }else{
                req.body.user = req.auth._id
                // req.body.imgUrl =  'test'  //req.file.originalname
                const newJob = new Job({
                    jobType: req.body.jobType,
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
            
                newJob.save((err, savedJob) => {
                    if(err){
                    res.status(500)
                    return next(err)
                    }
                    console.log(savedJob)
                    return res.status(201).send(savedJob)
                })
            }
        }else if(err){
            console.log(err)
        }else{
            return next(new Error("Not Authorized"))
        }
    })
})

accessRouter.post('/workbyadmin/:forUser', upload.single('imgUrl'), (req, res, next) => {

    User.findById(req.auth._id, (err, user) => {
        
        if(authCheck(req, user, 'admin', 'strict')){
            if(!req.file){
                // req.body.imgUrl =  'test'  //req.file.originalname
                const newJob = new Job({
                    jobType: req.body.jobType,
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
                    user: req.params.forUser,
                    submittedByFirstName: req.auth.firstName,
                    submittedByLastName: req.auth.lastName
                })
                console.log(req.body)
                console.log('///////////////////////////////////')
                //console.log(req)
                newJob.save((err, savedJob) => {
                    if(err){
                    res.status(500)
                    return next(err)
                    }
                    console.log(savedJob)
                    return res.status(201).send(savedJob)
                })
            }else{
                
                // req.body.imgUrl =  'test'  //req.file.originalname
                const newJob = new Job({
                    jobType: req.body.jobType,
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
                    user: req.params.forUser,
                    img: {
                        fileName: req.file.originalname,
                        fileType: req.file.mimetype,
                        fileSize: req.file.size,
                        bucketName: req.file.bucketName,
                        fileID: req.file._id,
                        savedFileName: req.file.filename

                    }
                    
                })
            
                newJob.save((err, savedJob) => {
                    if(err){
                    res.status(500)
                    return next(err)
                    }
                    console.log(savedJob)
                    return res.status(201).send(savedJob)
                })
            }
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
                
                // const myArr = []
                // jobs.map((job) => (
                    
                //     User.findById(job.user,(err, foundUser) => {
                        
                //         if(err){
                //             console.log(err)
                //         }else{
                            
                //             job = {...job._doc, userFirstName: foundUser.firstName} 
                //            // job = {...job, userFirstName: foundUser.firstName}
                //             // console.log(foundUser.firstName)
                //             // console.log('/////////////////////////////')
                //              //console.log(job)
                            
                //             //myArr.push(job)
                //             //console.log(myArr)
                //         }
                        
                //         // job = {...job, userFirstName: foundUser.firstName}
                //         // jobsWithUserName.push(job)
                //     })
                    
                // ))

                // Promise.all(jobsWithUserName).then((updatedJob) => {
                //     console.log(updatedJob)
                // })
                
                //console.log(jobs)
                //console.log(myArr)
                //console.log(jobs)
                return res.status(200).send(jobs)
            })
        }else if(err){
            console.log(err)
        }else{
            return next(new Error("Not Authorized"))
        }
    })
})

accessRouter.get('/work/byDate/:from/:to', (req, res, next) => {
    User.findById(req.auth._id, (err, user) => {
        if(authCheck(req, user, 'admin', 'strict')){
            Job.find({ requestDate: {
                $gte: new Date( req.params.from ),
                $lt: new Date( req.params.to )
            }},
                (err, jobs) => {
                if(err){
                  res.status(500)
                  return next(err)
                }
                
                console.log(req.params.to)
                console.log(jobs)
                return res.status(200).send(jobs)
            })
        }else if(err){
            console.log(err)
        }else{
            return next(new Error("Not Authorized"))
        }
    })
})

accessRouter.get('/work/search/:searchType/:searchParam', (req, res, next) => {
    User.findById(req.auth._id, (err, user) => {
        
        if(authCheck(req, user, 'admin', 'strict')){
            const type = req.params.searchType
            if(type === 'nested'){
                Job.find({'poc.contactEmail': req.params.searchParam},(err, jobs) => {
                    if(err){
                      res.status(500)
                      return next(err)
                    }
                    console.log(req.params)
                    return res.status(200).send(jobs)
                })
            }else{
                Job.find({[type]: req.params.searchParam},(err, jobs) => {
                    if(err){
                      res.status(500)
                      return next(err)
                    }
                    console.log(req.params)
                    return res.status(200).send(jobs)
                })
            }
        }else{
            return next(new Error("Not Authorized"))
        }
    })
})

accessRouter.get('/work/searchByName/:pocFirstName/:pocLastName', (req, res, next) => {
    User.findById(req.auth._id, (err, user) => {   
        if(authCheck(req, user, 'admin', 'strict')){
            Job.find({
                'poc.contactFirstName': {$regex:  req.params.pocFirstName, '$options': 'i'},
                //$text: {$search: req.params.pocFirstName},
                //$text: {$search: req.params.pocLastName}
                'poc.contactLastName': {$regex:  req.params.pocLastName, '$options': 'i'}
            },(err, jobs) => {
                if(err){
                    res.status(500)
                    return next(err)
                }
                console.log(req.params)
                return res.status(200).send(jobs)
            }).limit(10)
        }else{
            return next(new Error("Not Authorized"))
        }
    })
})

accessRouter.get('/work/searchByLastName/:pocLastName', (req, res, next) => {
    User.findById(req.auth._id, (err, user) => {   
        if(authCheck(req, user, 'admin', 'strict')){
            Job.find({
                //'poc.contactFirstName': {$regex:  req.params.pocFirstName, '$options': 'i'},
                //$text: {$search: req.params.pocFirstName},
                //$text: {$search: req.params.pocLastName}
                'poc.contactLastName': {$regex:  req.params.pocLastName, '$options': 'i'}
            },(err, jobs) => {
                if(err){
                    res.status(500)
                    return next(err)
                }
                console.log(req.params)
                return res.status(200).send(jobs)
            }).limit(10)
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

        // accessRouter.get('/userworkImages/:jobID', (req, res, next) => {
        //     Job.findById({_id: req.params.jobID}, (err, job) => {
        //         if(err){
        //             res.status(500)
        //             return next(err)
        //         }
                
            
        //             gfs.openDownloadStreamByName(job.img.savedFileName).pipe(res)
                
                
        //         // storage.findById(job.img.fileID, (err, img) => {
        //         //     if(err){
        //         //         console.log(err)
        //         //     }
        //         // })
        //         //return res.status(200).send(job.img.fileID)
        //     })
        // })

//update Job Status

accessRouter.get('/notes/:refID/:skipAmount', (req,res,next) => {
    User.findById(req.auth._id, (err, user) => {
        if(authCheck(req, user, 'admin', 'strict') ){
            Note.find({ jobChanged: req.params.refID }, (err, notes) => {
                if(err){
                    res.status(500)
                    return next(err)
                }
                console.log(notes)
                return res.status(200).send(notes)
            }).sort({ dateChanged: -1 }).skip(req.params.skipAmount).limit(5)
        }else if(err){
            console.log(err)
        }else{
            return next(new Error("Not Authorized"))
        }
    })
})

function retrieveJob(jobID, callback){
    Job.findById(jobID, (err, job) => {
        //was = job[Object.keys(req.body)[0]]
        if(err){
            callback(err,null)
        }else{
            callback(null, job)
        }
    })
}

accessRouter.put('/jobstatus/:jobID', (req, res, next) => {
    User.findById(req.auth._id, (err, user) => {
        let was
        if(authCheck(req, user, 'admin', 'strict')){
            retrieveJob(req.params.jobID, (err, job) => {
                if(err){
                    console.log(err)
                }
                was = job[Object.keys(req.body)[0]]
                console.log(was)
                Job.findOneAndUpdate(
                    { _id: req.params.jobID },
                    req.body,
                    { new: true },
                    (err, updatedJob) => {
                        if(err){
                        console.log(err)
                        res.status(500)
                        return next(err)
                        }
                        const newNote = new Note({
                            madeBy: req.auth._id,
                            fieldChanged: Object.keys(req.body)[0],
                            changedFrom: was,
                            changedTo: req.body[Object.keys(req.body)[0]],
                            jobChanged: req.params.jobID
                        })
                        //console.log(was)
                        console.log(newNote)
                        newNote.save((err, savedNote) => {
                            if(err){
                            res.status(500)
                            return next(err)
                            }
                            //console.log(savedNote)
                        })
                        return res.status(201).send(updatedJob)
                })
            })
        }else if(err){
            console.log(err)
        }else{
            return next(new Error("Not Authorized"))
        }
    })
})

accessRouter.put('/jobinspection/:jobID', (req, res, next) => {
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

accessRouter.put('/jobtimeframe/:jobID', (req, res, next) => {
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

accessRouter.post('/createuser', (req, res, next)=>{
    User.findById(req.auth._id, (err, user) => {
        if(authCheck(req, user, 'admin', 'strict')){
            console.log('this fired')
            User.findOne({ email: req.body.email.toLowerCase()}, (err, user) => {
                if(err){
                    res.status(500)
                    return next(err)
                }
                if(user){
                    res.status(403)
                    return next(new Error("That email is already taken"))
                }
                req.body.password = crypto.randomInt(100000, 10000000)
                const newUser = new User(req.body)
                newUser.access = "member"
                newUser.isVerified = false,
                newUser.otp = ''
                //newUser.verifiedIps.push(IP.address())
                newUser.save((err, savedUser) => {
                    if(err){
                        res.status(500)
                        return next(err)
                    }
        
                    //console.log(IP.address())
                    return res.status(201).send('User Created')
                })
            })
        }else{
            res.status(500)
            console.log(err)
            return next(err)
        }
    })
})

module.exports = accessRouter