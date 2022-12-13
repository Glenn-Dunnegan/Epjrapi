const express = require("express")
const forgotPasswordRouter = express.Router()
require('dotenv').config()
const User = require('../models/user.js')
const Job = require('../models/job.js')
const jwt = require('jsonwebtoken')
const multer = require('multer')
const path = require('path')
const crypto = require('crypto')
const {GridFsStorage} = require('multer-gridfs-storage')
const mongoose = require("mongoose")
const nodemailer = require('nodemailer')

forgotPasswordRouter.put('/requestpassword/:userEmail', (req, res, next) => {
    User.findOneAndUpdate(
        {email: req.params.userEmail},

        {
            tempPassword: `${Math.floor(1000 + Math.random() * 900000)}`,
            tempRequested: true
        },
        {new: true},
        (err, updatedUser) => {
            console.log(User)
            if(err){
                res.status(500)
                return next(err)
            }
            return res.status(201).send(updatedUser)
        }
    )
})

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

module.exports = forgotPasswordRouter