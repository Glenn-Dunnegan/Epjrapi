const express = require("express")
const accessRouter = express.Router()
require('dotenv').config()
const User = require('../models/user.js')
const Job = require('../models/job.js')
const Note = require('../models/note.js')
const Lom = require('../models/lom.js')
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
        delete verifiedToken.address
        delete verifiedToken.tempRequested
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
            let resLength
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
                resLength = users.length
                if(resLength === 0){
                    User.find({
                        firstName: {$regex:  req.params.lastName, '$options': 'i'}
                    },(err, users) => {
                        if(err){
                            res.status(500)
                            return next(err)
                        }
                        const userList = users.map((user)=>
                            user = user.withoutPassword()
                        )
                        return res.status(200).send(userList)
                    })

                }else{
                    const userList = users.map((user)=>
                        user = user.withoutPassword()
                    )
                    return res.status(200).send(userList)
                }
                
            })
        }else{
            return next(new Error("Not Authorized"))
        }
    })
})

accessRouter.get('/userslist/search/:searchType/:searchParam', (req, res, next) => {
    User.findById(req.auth._id, (err, user) => {   
        if(authCheck(req, user, 'admin', 'strict')){
            const type = req.params.searchType
            console.log(type)
            User.find({
                //'poc.contactFirstName': {$regex:  req.params.pocFirstName, '$options': 'i'},
                //$text: {$search: req.params.pocFirstName},
                //$text: {$search: req.params.pocLastName}
                [type]: {$regex:  req.params.searchParam, '$options': 'i'}
            },(err, users) => {
                if(err){
                    res.status(500)
                    return next(err)
                }
                const userList = users.map((user)=>
                user = user.withoutPassword()
                )
                return res.status(200).send(userList)
            })
        }else{
            return next(new Error("Not Authorized"))
        }
    })
})

accessRouter.get('/userslist/search/:searchType/:searchParam/:addressLine', (req, res, next) => {
    User.findById(req.auth._id, (err, user) => {   
        if(authCheck(req, user, 'admin', 'strict')){
            if(req.params.addressLine === 'line1'){
                User.find({'address.line1': {$regex:  req.params.searchParam.trim().replace(/  +/g, ' '), '$options': 'i'}},(err, jobs) => {
                    if(err){
                    res.status(500)
                    return next(err)
                    }
                    return res.status(200).send(jobs)
                })
            }else if(req.params.addressLine === 'city'){
                User.find({'address.city': {$regex:  req.params.searchParam.trim().replace(/  +/g, ' '), '$options': 'i'}},(err, jobs) => {
                    if(err){
                    res.status(500)
                    return next(err)
                    }
                    return res.status(200).send(jobs)
                })
            }else if(req.params.addressLine === 'state'){
                User.find({'address.state': {$regex:  req.params.searchParam.trim().replace(/  +/g, ' '), '$options': 'i'}},(err, jobs) => {
                    if(err){
                    res.status(500)
                    return next(err)
                    }
                    return res.status(200).send(jobs)
                })
            }else if(req.params.addressLine === 'zip'){
                User.find({'address.zip': {$regex:  req.params.searchParam.trim().replace(/  +/g, ' '), '$options': 'i'}},(err, jobs) => {
                    if(err){
                    res.status(500)
                    return next(err)
                    }
                    return res.status(200).send(jobs)
                })
            }else{
                return next(new Error("Improper Parameter"))
            }
        }else{
            return next(new Error("Not Authorized"))
        }
    })
})

accessRouter.put('/changepassword/:userID', (req, res, next) => {
   
        User.findById(req.auth._id, (err, user) => {
            
            if(authCheck(req, user, 'admin', 'update') || authCheck(req, user, 'member', 'update')){
                if(req.body.password.length >= 8){
                    user.password = req.body.password
                    user.tempRequested = false
                    user.tempPassword = ''
                    user.save(function(err,result){
                        if (err){
                            console.log(err);
                        }
                    })   
                    const token = jwt.sign(user.withoutPassword(), process.env.SECRET)
                    return res.status(200).send({ token, user: user.withoutPassword()})   
                }else{
                    res.status(403)
                    return next(new Error("Password must be at least 8 chars"))
                }
                           
                
            }else if(err){
                console.log(err)
            }else{
                return next(new Error("Not Authorized"))
            }
        })
})

accessRouter.put('/updateaddress', (req, res, next) => {
   
    User.findById(req.auth._id, (err, user) => {
        let was
        let userName
        if(authCheck(req, user, 'admin', 'update') || authCheck(req, user, 'member', 'update')){
            was = {...user.address}
            user.address.line1 = req.body.address.line1.trim().replace(/  +/g, ' ')
            user.address.line2 = (req.body.address.line2 ? req.body.address.line2.trim().replace(/  +/g, ' ') : '')
            user.address.city = req.body.address.city.trim().replace(/  +/g, ' ')
            user.address.state = req.body.address.state.trim().replace(/  +/g, ' ')
            user.address.zip = req.body.address.zip.trim().replace(/  +/g, ' ')
            if (err){
                res.status(500)
                return next(err);
            }
            // user.password = req.body.password
            // user.tempRequested = false
            // user.tempPassword = ''
            user.save(function(err, result){
                if (err){
                    res.status(500)
                    return next(err);
                }else{
                    userName = user.firstName+' '+user.lastName
                    const newNote = new Note({
                        madeBy: userName,
                        fieldChanged: Object.keys(req.body)[0],
                        changedFrom: was,
                        changedTo: {...req.body.address},
                        jobChanged: req.auth._id
                    })
                    newNote.save((err, savedNote) => {
                        if(err){
                        console.log(err)
                        }
                    })
                    const token = jwt.sign(user.withoutPassword(), process.env.SECRET)
                    return res.status(200).send({ token, user: result.withoutPassword()})
                }
            })             
        }else if(err){
            console.log(err)
        }else{
            return next(new Error("Not Authorized"))
        }
    })
})

accessRouter.put('/updateaddressbyadmin/:userID', (req, res, next) => {
   
    User.findById(req.auth._id, (err, user) => {
        
        if(authCheck(req, user, 'admin', 'update')){
            let was
            let userName
            retrieveUser(req.params.userID, (err, thisUser)=>{
                was = {...thisUser.address}
                thisUser.address.line1 = req.body.address.line1.trim().replace(/  +/g, ' ')
                thisUser.address.line2 = (req.body.address.line2 ? req.body.address.line2.trim().replace(/  +/g, ' ') : '')
                thisUser.address.city = req.body.address.city.trim().replace(/  +/g, ' ')
                thisUser.address.state = req.body.address.state.trim().replace(/  +/g, ' ')
                thisUser.address.zip = req.body.address.zip.trim().replace(/  +/g, ' ')
            if (err){
                res.status(500)
                return next(err);
            }
            thisUser.save(function(err, result){
                if (err){
                    res.status(500)
                    return next(err);
                }else{
                    userName = user.firstName+' '+user.lastName
                    const newNote = new Note({
                        madeBy: userName,
                        fieldChanged: Object.keys(req.body)[0],
                        changedFrom: was,
                        changedTo: {...req.body.address},
                        jobChanged: req.params.userID
                    })
                    newNote.save((err, savedNote) => {
                        if(err){
                        console.log(err)
                        }
                    })
                    resMsg = 'Update Successful'
                    return res.status(200).send(resMsg)
                }
            })          
            })   
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
            user.otp = `${Math.floor(1000000 + Math.random() * 9000000)}`

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
            if(Number(req.body.otp) === user.otp && req.body.otp.length > 3){
                user.isVerified = true
            }else{
                resMsg = 'Incorrect Code'
                return res.status(403).send(resMsg)
            }
            user.save(function(err,result){
                if (err){
                    console.log(err);
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

accessRouter.post('/work', upload.single('imgUrl'), (req, res, next) => {

    User.findById(req.auth._id, (err, user) => {
        
        if(authCheck(req, user, 'member', 'strict')){
            if(user.address.line1){
                if(!req.file){
                    req.body.user = req.auth._id
                    // req.body.imgUrl =  'test'  //req.file.originalname
                    const newJob = new Job({
                        jobType: req.body.jobType==='Other' ? req.body.altJobType : req.body.jobType,
                        description: req.body.description.trim().replace(/  +/g, ' '),
                        poc: {
                            contactFirstName: req.body.contactFirstName.trim().replace(/  +/g, ' '),
                            contactLastName: req.body.contactLastName.trim().replace(/  +/g, ' '),
                            contactPhone: req.body.contactPhone.trim().replace(/  +/g, ' '),
                            contactEmail: req.body.contactEmail.trim().replace(/  +/g, ' ')
                        },
                        jobLocation: {
                            line1: req.body.line1.trim().replace(/  +/g, ' '),
                            line2: req.body.line2.trim().replace(/  +/g, ' '),
                            city: req.body.city.trim().replace(/  +/g, ' '),
                            state: req.body.state.trim().replace(/  +/g, ' '),
                            zip: req.body.zip.trim().replace(/  +/g, ' ')
                        },
                        user: req.body.user,
                        accountEmail: user.email,
                        submittedByFirstName: req.auth.firstName,
                        submittedByLastName: req.auth.lastName
                    })

                    const details = {
                        from: `DirtandSeptic <no_reply@dirtandseptic.com>`,
                        to: `${user.email}`,
                        bcc: `glenn.dunnegan@gmail.com`,
                        subject: 'Confirmation',
                        text: `
                        Request successfully submitted for ${user.email}.
                        at location: 
                        ${req.body.line1.trim().replace(/  +/g, ' ')}
                        ${req.body.line2 ? req.body.line2.trim().replace(/  +/g, ' ') : ''}
                        ${req.body.city.trim().replace(/  +/g, ' ')}, ${req.body.state.trim().replace(/  +/g, ' ')} ${req.body.zip.trim().replace(/  +/g, ' ')}

                        With Contact To: 
                        ${req.body.contactFirstName.trim().replace(/  +/g, ' ')} ${req.body.contactLastName.trim().replace(/  +/g, ' ')}
                        contact email: ${req.body.contactEmail.trim().replace(/  +/g, ' ')}
                        contact phone: ${req.body.contactPhone.trim().replace(/  +/g, ' ')}
                        `
                    }

                    newJob.save((err, savedJob) => {
                        if(err){
                        res.status(500)
                        return next(err)
                        }
                        mailTransporter.sendMail(details, (err) => {
                
                            if(err){
                                console.log(err)
                            }else{
                                console.log("Email has been sent!")
                            }
                        })
                        resMsg = 'Request Submitted'
                        return res.status(201).send(resMsg)
                    })
                }else if(checkFileType(req.file)){
                    req.body.user = req.auth._id
                    // req.body.imgUrl =  'test'  //req.file.originalname
                    const newJob = new Job({
                        jobType: req.body.jobType==='Other' ? req.body.altJobType : req.body.jobType,
                        description: req.body.description,
                        poc: {
                            contactFirstName: req.body.contactFirstName.trim().replace(/  +/g, ' '),
                            contactLastName: req.body.contactLastName.trim().replace(/  +/g, ' '),
                            contactPhone: req.body.contactPhone.trim().replace(/  +/g, ' '),
                            contactEmail: req.body.contactEmail.trim().replace(/  +/g, ' ')
                        },
                        jobLocation: {
                            line1: req.body.line1.trim().replace(/  +/g, ' '),
                            line2: req.body.line2.trim().replace(/  +/g, ' '),
                            city: req.body.city.trim().replace(/  +/g, ' '),
                            state: req.body.state.trim().replace(/  +/g, ' '),
                            zip: req.body.zip.trim().replace(/  +/g, ' ')
                        },
                        user: req.body.user,
                        accountEmail: user.email,
                        submittedByFirstName: req.auth.firstName,
                        submittedByLastName: req.auth.lastName,
                        img: {
                            fileName: req.file.originalname,
                            fileType: req.file.mimetype,
                            fileSize: req.file.size,
                            bucketName: req.file.bucketName,
                            fileID: req.file._id,
                            savedFileName: req.file.filename
                        }
                    })

                    const details = {
                        from: `DirtandSeptic <no_reply@dirtandseptic.com>`,
                        to: `${user.email}`,
                        cc: `glenn.dunnegan@gmail.com`,
                        subject: 'Confirmation',
                        text: `
                        Request successfully submitted for ${user.email}.
                        at location: 
                        ${req.body.line1}
                        ${req.body.line2 ? req.body.line2 : ''}
                        ${req.body.city}, ${req.body.state} ${req.body.zip}

                        With Contact To: 
                        ${req.body.contactFirstName} ${req.body.contactLastName}
                        contact email: ${req.body.contactEmail}
                        contact phone: ${req.body.contactPhone}
                        `
                    }

                    newJob.save((err, savedJob) => {
                        if(err){
                        res.status(500)
                        return next(err)
                        }
                        mailTransporter.sendMail(details, (err) => {
                
                            if(err){
                                console.log(err)
                            }else{
                                console.log("Email has been sent!")
                            }
                        })
                        resMsg = 'Request Submitted'
                        return res.status(201).send(resMsg)
                    })
                }else{
                    res.status(500)
                    return next(new Error("Jpeg, png, or pdf only"))
                }
            }else if(err){
                console.log(err)
            }else{
                res.status(500)
                return next(new Error("Account Address Required"))
            }
        }else if(err){
            console.log(err)
        }else{
            res.status(500)
            return next(new Error("Not Authorized"))
        }
    })
})

function checkFileType(file){
    if(
        file.mimetype === 'image/jpeg'
        ||
        file.mimetype === 'image/png'
        ||
        file.mimetype === 'application/pdf'
    ){
        return true
    }else{
        return false
    }
}

accessRouter.post('/workbyadmin/:forUser', upload.single('imgUrl'), (req, res, next) => {

    User.findById(req.auth._id, (err, user) => {
        
        if(authCheck(req, user, 'admin', 'strict')){
            retrieveUser(req.params.forUser, (err, thisUser)=>{
                const accountEmail = thisUser.email
                if(!req.file){
                    // req.body.imgUrl =  'test'  //req.file.originalname
                    const newJob = new Job({
                        jobType: req.body.jobType==='Other' ? req.body.altJobType : req.body.jobType,
                        description: req.body.description,
                        poc: {
                            contactFirstName: req.body.contactFirstName.trim().replace(/  +/g, ' '),
                            contactLastName: req.body.contactLastName.trim().replace(/  +/g, ' '),
                            contactPhone: req.body.contactPhone.trim().replace(/  +/g, ' '),
                            contactEmail: req.body.contactEmail.trim().replace(/  +/g, ' ')
                        },
                        jobLocation: {
                            line1: req.body.line1.trim().replace(/  +/g, ' '),
                            line2: req.body.line2.trim().replace(/  +/g, ' '),
                            city: req.body.city.trim().replace(/  +/g, ' '),
                            state: req.body.state.trim().replace(/  +/g, ' '),
                            zip: req.body.zip.trim().replace(/  +/g, ' ')
                        },
                        user: req.params.forUser,
                        accountEmail: accountEmail,
                        submittedByFirstName: req.auth.firstName,
                        submittedByLastName: req.auth.lastName
                    })
                    newJob.save((err, savedJob) => {
                        if(err){
                        res.status(500)
                        return next(err)
                        }
                        resMsg = 'Request Submitted'
                        return res.status(201).send(resMsg)
                    })
                }else if(checkFileType(req.file)){
                    // req.body.imgUrl =  'test'  //req.file.originalname
                    const newJob = new Job({
                        jobType: req.body.jobType==='Other' ? req.body.altJobType : req.body.jobType,
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
                        accountEmail: accountEmail,
                        submittedByFirstName: req.auth.firstName,
                        submittedByLastName: req.auth.lastName,
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
                        console.log(newJob.img.fileType)
                        console.log(newJob.img.fileSize)
                        if(err){
                        res.status(500)
                        return next(err)
                        }
                        resMsg = 'Request Submitted'
                        return res.status(201).send(resMsg)
                    })
                }else{
                    res.status(500)
                    return next(new Error("Jpeg, png, or pdf only"))
                }
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

accessRouter.get('/schedulerwork', (req, res, next) => {
    User.findById(req.auth._id, (err, user) => {
        if(authCheck(req, user, 'admin', 'strict')){
            Job.find((err, jobs) => {
                if(err){
                  res.status(500)
                  return next(err)
                }
                
                const filteredJobs = jobs.filter((job)=>
                    job.status !== 'Rejected'
                    &&
                    !job.completedActual
                    &&
                    (job.inspectionDate||(job.estimatedStart && job.estimatedFinish))
                )
                return res.status(200).send(filteredJobs)
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
        
        if(authCheck(req, user, 'admin', 'strict') || authCheck(req, user, 'field tech', 'strict')){
            const type = req.params.searchType
            console.log(req.params)
            if(type === 'nested'){
                Job.find({'poc.contactEmail': {$regex:  req.params.searchParam.trim().replace(/  +/g, ' '), '$options': 'i'}},(err, jobs) => {
                    if(err){
                      res.status(500)
                      return next(err)
                    }
                    return res.status(200).send(jobs)
                })
            }else if(type === '_id'){
                Job.find({[type]: req.params.searchParam},(err, jobs) => {
                    if(err){
                      res.status(500)
                      return next(err)
                    }
                    return res.status(200).send(jobs)
                })
            }else{
                Job.find({[type]: {$regex:  req.params.searchParam.trim().replace(/  +/g, ' '), '$options': 'i'}},(err, jobs) => {
                    if(err){
                      res.status(500)
                      return next(err)
                    }
                    return res.status(200).send(jobs)
                })
            }
        }else{
            return next(new Error("Not Authorized"))
        }
    })
})

accessRouter.get('/work/search/:searchType/:searchParam/:addressLine', (req, res, next) => {
    User.findById(req.auth._id, (err, user) => {
        
        if(authCheck(req, user, 'admin', 'strict') || authCheck(req, user, 'field tech', 'strict')){
            
            //let dynamicRegEx = new RegExp(`jobLocation.${req.params.addressLine}`)
            if(req.params.addressLine === 'line1'){
                Job.find({'jobLocation.line1': {$regex:  req.params.searchParam.trim().replace(/  +/g, ' '), '$options': 'i'}},(err, jobs) => {
                    if(err){
                    res.status(500)
                    return next(err)
                    }
                    return res.status(200).send(jobs)
                })
            }else if(req.params.addressLine === 'city'){
                Job.find({'jobLocation.city': {$regex:  req.params.searchParam.trim().replace(/  +/g, ' '), '$options': 'i'}},(err, jobs) => {
                    if(err){
                    res.status(500)
                    return next(err)
                    }
                    return res.status(200).send(jobs)
                })
            }else if(req.params.addressLine === 'state'){
                Job.find({'jobLocation.state': {$regex:  req.params.searchParam.trim().replace(/  +/g, ' '), '$options': 'i'}},(err, jobs) => {
                    if(err){
                    res.status(500)
                    return next(err)
                    }
                    return res.status(200).send(jobs)
                })
            }else if(req.params.addressLine === 'zip'){
                Job.find({'jobLocation.zip': {$regex:  req.params.searchParam.trim().replace(/  +/g, ' '), '$options': 'i'}},(err, jobs) => {
                    if(err){
                    res.status(500)
                    return next(err)
                    }
                    return res.status(200).send(jobs)
                })
            }else{
                return next(new Error("Improper Parameter"))
            }
            
        }else{
            return next(new Error("Not Authorized"))
        }
    })
})

accessRouter.get('/work/searchByName/:pocFirstName/:pocLastName', (req, res, next) => {
    User.findById(req.auth._id, (err, user) => {   
        if(authCheck(req, user, 'admin', 'strict') || authCheck(req, user, 'field tech', 'strict')){
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
                return res.status(200).send(jobs)
            })
        }else{
            return next(new Error("Not Authorized"))
        }
    })
})

accessRouter.get('/work/searchByLastName/:pocLastName', (req, res, next) => {
    User.findById(req.auth._id, (err, user) => {   
        if(authCheck(req, user, 'admin', 'strict') || authCheck(req, user, 'field tech', 'strict')){
            let resLength
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
                resLength = jobs.length
                if(resLength === 0){
                    Job.find({
                        //'poc.contactFirstName': {$regex:  req.params.pocFirstName, '$options': 'i'},
                        //$text: {$search: req.params.pocFirstName},
                        //$text: {$search: req.params.pocLastName}
                        'poc.contactFirstName': {$regex:  req.params.pocLastName, '$options': 'i'}
                    },(err, jobs) => {
                        if(err){
                            res.status(500)
                            return next(err)
                        }
                        return res.status(200).send(jobs)
                    })
                }else{
                    return res.status(200).send(jobs)
                }
            })
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
accessRouter.get('/userworkbyadmin/:userID', (req,res,next) => {
    User.findById(req.auth._id, (err, user) => {
        if(authCheck(req, user, 'admin', 'strict') || authCheck(req, user, 'admin', 'strict') ){
            Job.find({ user: req.params.userID }, (err, jobs) => {
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
        if(authCheck(req, user, 'admin', 'strict')){
            console.log('yes')
            Note.find({ jobChanged: req.params.refID }, (err, notes) => {
                if(err){
                    res.status(500)
                    return next(err)
                }
                return res.status(200).send(notes)
            }).sort({ dateChanged: -1 }).skip(req.params.skipAmount).limit(5)
        }else if(err){
            console.log(err)
        }else{
            return next(new Error("Not Authorized"))
        }
    })
})

accessRouter.get('/lomnotes/:refID/:skipAmount', (req,res,next) => {
    User.findById(req.auth._id, (err, user) => {
        if(authCheck(req, user, 'admin', 'strict') || authCheck(req, user, 'field tech', 'strict')){
            console.log('yes')
            Note.find({ jobChanged: req.params.refID }, (err, notes) => {
                if(err){
                    res.status(500)
                    return next(err)
                }
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

function retrieveUser(userID, callback){
    User.findById(userID, (err, thisUser) => {
        if(err){
            callback(err,null)
        }else{
            callback(null, thisUser)
        }
    })
}

accessRouter.post('/notes/addnote/:refID', (req,res,next)=>{
    User.findById(req.auth._id, (err, user) => {
        if(authCheck(req, user, 'admin', 'strict')){
            retrieveUser(req.auth._id, (err, thisUser)=>{
                userName = thisUser.firstName+' '+thisUser.lastName
                const newNote = new Note({
                    madeBy: userName,
                    addedNote: req.body.addedNote,
                    jobChanged: req.params.refID
                })
                newNote.save((err, savedNote) => {
                    if(err){
                    res.status(500)
                    return next(err)
                    }
                    res.status(201).send(savedNote)
                })
                if(err){
                    res.status(500)
                    return next(err)
                }
            })
        }else if(err){
            console.log(err)
        }else{
            return next(new Error("Not Authorized"))
        }
    })
})

accessRouter.post('/lomnotes/addnote/:refID', (req,res,next)=>{
    User.findById(req.auth._id, (err, user) => {
        if(authCheck(req, user, 'admin', 'strict') || authCheck(req, user, 'field tech', 'strict')){
            retrieveUser(req.auth._id, (err, thisUser)=>{
                userName = thisUser.firstName+' '+thisUser.lastName
                const newNote = new Note({
                    madeBy: userName,
                    addedNote: req.body.addedNote,
                    jobChanged: req.params.refID
                })
                newNote.save((err, savedNote) => {
                    if(err){
                    res.status(500)
                    return next(err)
                    }
                    res.status(201).send(savedNote)
                })
                if(err){
                    res.status(500)
                    return next(err)
                }
            })
        }else if(err){
            console.log(err)
        }else{
            return next(new Error("Not Authorized"))
        }
    })
})

accessRouter.put('/jobstatus/:jobID', (req, res, next) => {
    User.findById(req.auth._id, (err, user) => {
        let was
        let userName
        if(authCheck(req, user, 'admin', 'strict')){
            retrieveJob(req.params.jobID, (err, job) => {
                if(err){
                    console.log(err)
                }
                was = job[Object.keys(req.body)[0]]
                Job.findOneAndUpdate(
                    { _id: req.params.jobID },
                    req.body,
                    { new: true },
                    (err, updatedJob) => {
                        if(err){
                        res.status(500)
                        return next(err)
                        }
                        if(Object.keys(req.body)[0] === 'poc'){
                            retrieveUser(req.auth._id, (err, thisUser)=>{
                                userName = thisUser.firstName+' '+thisUser.lastName
                                const newNote = new Note({
                                    madeBy: userName,
                                    fieldChanged: Object.keys(req.body)[0],
                                    pocChangedFrom: was,
                                    pocChangedTo: req.body[Object.keys(req.body)[0]],
                                    jobChanged: req.params.jobID
                                })
                                newNote.save((err, savedNote) => {
                                    if(err){
                                    res.status(500)
                                    return next(err)
                                    }
                                })
                            })
                        }else{
                            retrieveUser(req.auth._id, (err, thisUser)=>{
                                userName = thisUser.firstName+' '+thisUser.lastName
                                const newNote = new Note({
                                    madeBy: userName,
                                    fieldChanged: Object.keys(req.body)[0],
                                    changedFrom: was,
                                    changedTo: req.body[Object.keys(req.body)[0]],
                                    jobChanged: req.params.jobID
                                })
                                newNote.save((err, savedNote) => {
                                    if(err){
                                    res.status(500)
                                    return next(err)
                                    }
                                })
                            })
                        }
                    
                        return res.status(200).send(updatedJob)
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

accessRouter.get('/getlom/:jobID', (req, res, next) => {
    User.findById(req.auth._id, (err, user) => {
        if(authCheck(req, user, 'admin', 'strict') || authCheck(req, user, 'field tech', 'strict')){
            Lom.find({ forJob: req.params.jobID }, (err, lom) => {
                if(err){
                    res.status(500)
                    return next(err)
                }
                return res.status(200).send(lom)
            })
        }else if(err){
            console.log(err)
        }else{
            return next(new Error("Not Authorized"))
        }
    })
})

accessRouter.post('/addtolom/:jobID', (req, res, next)=>{
    User.findById(req.auth._id, (err, user) => {
        if(authCheck(req, user, 'admin', 'strict') || authCheck(req, user, 'field tech', 'strict')){
            Lom.findOne({forJob: req.params.jobID}, (err, lom) => {
                if(err){
                    res.status(500)
                    return next(err)
                }
                if(lom){
                    lom.list.push(req.body)
                    lom.save((err, savedLom) => {
                        if(err){
                            res.status(500)
                            return next(err)
                        }
                        retrieveUser(req.auth._id, (err, thisUser)=>{
                            userName = thisUser.firstName+' '+thisUser.lastName
                            const newNote = new Note({
                                madeBy: userName,
                                addedNote: `Added ${req.body.material} ${req.body.matCount} ${req.body.matUnit}`,
                                jobChanged: savedLom._id
                            })
                            newNote.save((err, savedNote) => {
                                if(err){
                                res.status(500)
                                return next(err)
                                }
                                console.log(savedNote)
                            })
                        })
                        return res.status(201).send(savedLom.list[savedLom.list.length - 1])
                    })
                }
                if(!lom){
                    console.log(req.body)
                const newLom = new Lom(
                    {
                        forJob: req.params.jobID
                    }
                )
                newLom.list.push(req.body)
                newLom.save((err, savedLom) => {
                    if(err){
                        res.status(500)
                        return next(err)
                    }
                    retrieveUser(req.auth._id, (err, thisUser)=>{
                        userName = thisUser.firstName+' '+thisUser.lastName
                        const newNote = new Note({
                            madeBy: userName,
                            addedNote: `Added ${req.body.material} ${req.body.matCount} ${req.body.matUnit}`,
                            jobChanged: savedLom._id
                        })
                        newNote.save((err, savedNote) => {
                            if(err){
                            res.status(500)
                            return next(err)
                            }
                        })
                    })
                    return res.status(201).send(savedLom.list[savedLom.list.length - 1])
                })
                }
            })
            
            
            console.log(req.params.jobID)
        }else{
            res.status(500)
            console.log(err)
            return next(err)
        }
    })
})

accessRouter.delete('/deletefromlom/:jobID/:index', (req, res, next)=>{
    User.findById(req.auth._id, (err, user) => {
        if(authCheck(req, user, 'admin', 'strict') || authCheck(req, user, 'field tech', 'strict')){
            Lom.findOne({forJob: req.params.jobID}, (err, lom) => {
                if(err){
                    res.status(500)
                    return next(err)
                }
                if(lom){
                    str = `${lom.list[req.params.index].material} ${lom.list[req.params.index].matCount} ${lom.list[req.params.index].matUnit}`
                    retrieveUser(req.auth._id, (err, thisUser)=>{
                        console.log(lom.list)
                        userName = thisUser.firstName+' '+thisUser.lastName
                        const newNote = new Note({
                            madeBy: userName,
                            addedNote: `Deleted ${str}`,
                            jobChanged: lom._id
                        })
                        newNote.save((err, savedNote) => {
                            if(err){
                            res.status(500)
                            return next(err)
                            }
                            console.log(savedNote)
                        })
                    })
                    lom.list.splice(req.params.index, 1)
                    lom.save((err, savedLom) => {
                        if(err){
                            res.status(500)
                            return next(err)
                        }
                        return res.status(201).send('Successfully Deleted')
                    })
                }
            })
            
            
            console.log(req.params.jobID)
        }else{
            res.status(500)
            console.log(err)
            return next(err)
        }
    })
})

module.exports = accessRouter