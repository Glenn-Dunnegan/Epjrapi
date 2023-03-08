const mongoose = require('mongoose')
const Schema = mongoose.Schema
mongoose.set('sanitizeProjection', true)

const pocSchema = new Schema({
    contactFirstName:{
      type: String,
      index: true
    },
    contactLastName:{
      type: String,
      index: true
    },
    contactPhone:{
      type: String
    },
    contactEmail:{
      type: String
    }
  })

const noteSchema = new Schema({
    madeBy:{
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    fieldChanged:{
        type: String
    },
    changedFrom:{
        type: String
    },
    changedTo:{
        type: String
    },
    pocChangedFrom:{
        type: pocSchema
    },
    pocChangedTo:{
        type: pocSchema
    },
    addedNote:{
        type: String
    },
    dateChanged:{
        type: Date,
        default: Date.now
    },
    jobChanged:{
        type: Schema.Types.ObjectId,
        ref: "Job",
        required: true
    }
})

module.exports = mongoose.model("Note", noteSchema)