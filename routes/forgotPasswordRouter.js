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

const mailTransporter = nodemailer.createTransport({
    host: 'smtp.zoho.com',
    port: '465',
    secure: true,
    auth: {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASS
    }
})

forgotPasswordRouter.put('/requestpassword/:userEmail', (req, res, next) => {
    
    

    User.findOne({ email: req.params.userEmail }, (err,user) => {
        if(err){
            res.status(500)
            return next(err)
        }
        if(!user){
            resMsg = 'User Does not exist'
            console.log(resMsg)
            return res.status(201).send(resMsg)
            //return next( new Error("Email or Password are incorrect") )
        }


        User.findOneAndUpdate(
            {email: req.params.userEmail},
            
            {
                tempPassword: `${Math.floor(100000 + Math.random() * 900000)}`,
                tempRequested: true
            },
            {new: true},
            (err, updatedUser) => {
                const details = {
                    from: `DirtandSeptic <no_reply@dirtandseptic.com>`,
                    to: `${req.params.userEmail}`,
                    subject: 'Forgot Password',
                    text: `
                    This is your one time password.
                    After logging in you, will be prompted to create a new one.
                    Upon Which this password will expire.

                    ${updatedUser.tempPassword}`
                }

                mailTransporter.sendMail(details, (err) => {
                    
                    if(err){
                        console.log(err)
                    }else{
                        console.log("Email has been sent!")
                    }
                })
                console.log(User)
                resMsg = 'Email has been sent'
                if(err){
                    res.status(500)
                    return next(err)
                }
                return res.status(201).send(resMsg)
            }
        )
    })
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