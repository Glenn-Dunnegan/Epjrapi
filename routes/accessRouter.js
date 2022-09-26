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

const storage = new GridFsStorage({url: process.env.CRED})
const upload = multer({storage: storage})


// const { connect } = require("http2")
// const { default: mongoose } = require("mongoose")
// const { resolve } = require("path")
// const { Router } = require("express")

// const mongoURI = process.env.CRED
// const conn = mongoose.createConnection(mongoURI)

// let gfs;
// conn.once('open', () => {
//     gfs = new mongoose.mongo.GridFSBucket(conn.db), {
//         bucketName: 'images'
//     }
// })

// const storage = new GridFsStorage({
//     url: mongoURI,
//     options:{useUnifiedTopology:true},
//     file: (req, file) => {
//         return new Promise((resolve, reject) => {
//             crypto.randomBytes(16, (err, buf) => {
//                 if(err){
//                     return reject(err)
//                 }
//                 const filename = but.toString('hex') + path.extname(file.originalname)
//                 const fileInfo = {
//                     filename: filename, bucketName: 'images'
//                 }
//                 resolve(fileInfo)
//             })
//         })
//     }
// })

// const store = multer({
//     storage,
//     limits: {fileSize: 20000000},
//     fileFilter: function(req, file, cb){
//         checkFileType(file, cb)
//     }
// })

// function checkFileType(file, cb){
//     const filetypes = /jpeg|jpg|png/
//     const extname = filetypes.test(path.extname(file.originalname).toLowerCase())
//     const mimetype = filetypes.test(file.mimetype)
//     if(mimetype && extname) return cb(null, true)
//     cb('filetype')
// }

// const uploadMiddleware = (req,res, next) => {
//     const upload = store.single('image')
//     upload(req, res, function(err){
//         if(err instanceof multer.MulterError){
//             return res.status(400).send('File too large')
//         }else if(err){
//             if(err=== 'fileType') return res.status(400).send('Image files only')
//             return res.sendStatus(500)
//         }
//         next()
//     })
// }

// accessRouter.post('/upload/', uploadMiddleware, async ( req, res) => {
//     const {file} = req
//     const {id} = file
//     if(file.size > 5000000){
//         deleteImage(id)
//         return res.status(400).send('file may not exceed 5mb')
//     }
//     console.log('uploaded file: ', file)
//     return res.send(file.id)
// })

// const deleteImage = id =>{
//     if(!id || id==='undefined') return res.status(400).send('no image id')
//     const _id = new mongoose.Types.ObjectId(id)
//     gfs.delete(_id, err => {
//         if(err) return res.status(500).send('image deletion error')
//     })
// }

// const upload = multer({storage: storage})

/////////////////////////////////^^^youtube mumbojumbo^^^//////////////////////////// 




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
        console.log(req.body)
        console.log(req.file)
        if(authCheck(req, user, 'member', 'strict')){
            req.body.user = req.auth._id
            // req.body.imgUrl =  'test'  //req.file.originalname
            const newJob = new Job({
                subject: req.body.subject,
                description: req.body.description,
                jobLocation: {
                    line1: req.body.line1,
                    line2: req.body.line2,
                    city: req.body.city,
                    state: req.body.state,
                    zip: req.body.zip
                },
                user: req.body.user,
                imgUrl: req.file.originalname
                
            })
            newJob.save((err, savedJob) => {
                if(err){
                res.status(500)
                return next(err)
                }
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