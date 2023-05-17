const express = require("express")
const authRouter = express.Router()
const User = require('../models/user.js')
const jwt = require('jsonwebtoken')
//const IP = require('ip')


// Signup
authRouter.post("/signup", (req,res,next) => {
    User.findOne({ email: req.body.email.toLowerCase()}, (err, user) => {
        if(err){
            res.status(500)
            return next(err)
        }
        if(user){
            res.status(403)
            return next(new Error("That email is already taken"))
        }
        if(req.body.password.length >= 8){
             console.log(req.body)
            // const trimmedReq = Object.keys(req.body).map(k => req.body[k] = typeof req.body[k] == 'string' ? req.body[k].trim().replace(/  +/g, ' ') : req.body[k])
            // console.log(trimmedReq)
            //.trim().replace(/  +/g, ' ')
            const newUser = new User({
                email: req.body.email.trim().replace(/  +/g, ' '),
                password: req.body.password.trim().replace(/  +/g, ' '),
                firstName: req.body.firstName.trim().replace(/  +/g, ' '),
                lastName: req.body.lastName.trim().replace(/  +/g, ' '),
                address: {
                    line1: req.body.address.line1.trim().replace(/  +/g, ' '),
                    line2: req.body.address.line2.trim().replace(/  +/g, ' '),
                    city: req.body.address.city.trim().replace(/  +/g, ' '),
                    state: req.body.address.state.trim().replace(/  +/g, ' ').toUpperCase(),
                    zip: req.body.address.zip.trim().replace(/  +/g, ' ')
                }
            })
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
            const token = jwt.sign(savedUser.withoutPassword(), process.env.SECRET)
            return res.status(201).send({token, user: savedUser.withoutPassword()})
        })
        }else{
            res.status(403)
            return next(new Error("Password must be at least 8 chars"))
        }
        
    })
})

//Login

authRouter.post("/login", (req,res,next) => {

    User.findOne({ email: req.body.email.toLowerCase() }, (err,user) => {
        if(err){
            res.status(500)
            return next(err)
        }
        if(!user){
            res.status(403)
            return next( new Error("Email or Password are incorrect") )
        }

        user.checkPassword(req.body.password, (err, isMatch) => {
            if(err){
                console.log(err)
                res.status(403)
                return next(new Error("Email or Password are incorrect"))
            }
            if(!isMatch){
                if(user.tempPassword === req.body.password && req.body.password.length > 5){
                    const token = jwt.sign(user.withoutPassword(), process.env.SECRET)
                    return res.status(200).send({ token, user: user.withoutPassword() })
                }
                res.status(403)
                return next(new Error("Email or Password are incorrect"))
            }
            const token = jwt.sign(user.withoutPassword(), process.env.SECRET)
            return res.status(200).send({ token, user: user.withoutPassword() })
        })
    })
})



module.exports = authRouter