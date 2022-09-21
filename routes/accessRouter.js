const express = require("express")
const accessRouter = express.Router()
const User = require('../models/user.js')
const Job = require('../models/job.js')
const jwt = require('jsonwebtoken')


require('dotenv').config()

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

accessRouter.post('/work', (req, res, next) => {

    User.findById(req.auth._id, (err, user) => {
        if(authCheck(req, user, 'member', 'strict')){
            req.body.user = req.auth._id
            const newJob = new Job(req.body)
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

//get jobs by user ID
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