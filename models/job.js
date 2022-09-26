const mongoose = require('mongoose')
const Schema = mongoose.Schema



const addressSchema = new Schema({
    line1:{
        type: String,
        required: true
    },
    line2:{
        type: String,
    },
    city:{
        type: String,
        required: true
    },
    state:{
        type: String,
        required: true
    },
    zip:{
        type: Number,
        required: true
    }
})

const jobSchema = new Schema({
  subject: {
    type: String,
    required: true
  },
  jobLocation: {
    type: addressSchema,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    default: 'Requested',
  },
  requestDate: {
    type: Date,
    default: Date.now
  },
  imgUrl: {
    type: String
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
})

module.exports = mongoose.model("Job", jobSchema)