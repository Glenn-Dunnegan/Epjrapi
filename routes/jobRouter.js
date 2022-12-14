const express = require("express")
const { rawListeners } = require("../models/job.js")
const jobRouter = express.Router()
const Job = require('../models/job.js')

// added to access router
// Get All Jobs
// jobRouter.get("/", (req, res, next) => {
  // Job.find((err, jobs) => {
  //   if(err){
  //     res.status(500)
  //     return next(err)
  //   }
  //   return res.status(200).send(jobs)
  // })
// })

// added to access router
// Get jobs by user ID
// jobRouter.get('/user', (req,res,next) => {
//   Job.find({ user: req.auth._id }, (err, jobs) => {
//     if(err){
//       res.status(500)
//       return next(err)
//     }
//     return res.status(200).send(jobs)
//   })
// })
// added to access router
// Add new Job
// jobRouter.post("/", (req, res, next) => {
//   req.body.user = req.auth._id
//   const newJob = new Job(req.body)
//   newJob.save((err, savedJob) => {
//     if(err){
//       res.status(500)
//       return next(err)
//     }
//     return res.status(201).send(savedJob)
//   })
// })

// Delete Todo
            // jobRouter.delete("/:jobId", (req, res, next) => {
            //   Job.findOneAndDelete(
            //     { _id: req.params.jobId, user: req.auth._id },
            //     (err, deletedJob) => {
            //       if(err){
            //         res.status(500)
            //         return next(err)
            //       }
            //       return res.status(200).send(`Successfully delete todo: ${deletedJob.subject}`)
            //     }
            //   )
            // })
// added to access router
// Update Todo
// jobRouter.put("/:jobID", (req, res, next) => {
//   Job.findOneAndUpdate(
//     { _id: req.params.jobID, user: req.auth._id },
//     req.body,
//     { new: true },
//     (err, updatedJob) => {
//       if(err){
//         res.status(500)
//         return next(err)
//       }
//       return res.status(201).send(updatedJob)
//     })
// })

module.exports = jobRouter