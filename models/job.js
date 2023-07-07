const mongoose = require('mongoose')
const Schema = mongoose.Schema
mongoose.set('sanitizeProjection', true)

const pocSchema = new Schema({
  contactFirstName:{
    type: String,
    index: true,
    required: true
  },
  contactLastName:{
    type: String,
    index: true,
    required: true
  },
  contactPhone:{
    type: String,
    required: true
  },
  contactEmail:{
    type: String,
    index: true,
    required: true
  }
})

const assignedFieldTechSchema = new Schema({
  fieldTechID: {
      type: String,
      required: true
  }
})

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
        type: String,
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
  accountEmail:{
    type: String
  },
  jobType: {
    type: String,
    required: true,
    index: true
  },
  jobTitle: {
    type: String
  },
  jobLocation: {
    type: addressSchema,
    required: true,
    index: true
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    default: 'Requested',
    required: true
  },
  requestDate: {
    type: Date,
    default: () => Date.now() //- 1.8e+7
  },
  img: {
    type: imgSchema,
  },
  poc: {
    type: pocSchema,
    required: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  inspectionDate:{
    type: Date
  },
  estimatedStart:{
    type: Date
  },
  estimatedFinish:{
    type: Date
  },
  startActual:{
    type: Date
  },
  completedActual:{
    type: Date
  },
  submittedByFirstName:{
    type:String
  },
  submittedByLastName:{
    type: String
  },
  estimatedCost: {
    type: Number
  },
  actualCost: {
    type: Number
  },
  assignmentList: {
    type: [assignedFieldTechSchema]
  }
})

module.exports = mongoose.model("Job", jobSchema)