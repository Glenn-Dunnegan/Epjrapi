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

const imgSchema = new Schema({
  fileName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  fileSize: {
    type: String,
    required: true
  },
  bucketName: {
    type: String,
    required: true
  },
  uploadDate: {
    type: Date,
    default: Date.now
  },
  fileID: {
    type: String,
  },
  savedFileName: {
    type: String,
    required: true
  }
})
// Be sure to check if required from client
//_id: "633394e96b62827eaba77fe9"

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
  img: {
    type: imgSchema,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  }
})

module.exports = mongoose.model("Job", jobSchema)