const mongoose = require('mongoose')
const Schema = mongoose.Schema
mongoose.set('sanitizeProjection', true)

const matSchema = new Schema({
    material: {
        type: String,
        required: true
    },
    matCount: {
        type: Number
    },
    matUnit: {
        type: String
    }
  })

const lomSchema = new Schema({
    
    list:{
        type: [matSchema]
    },
    dateCreated:{
        type: Date,
        default: Date.now
    },
    forJob:{
        type: Schema.Types.ObjectId,
        ref: "Job",
        required: true
    }
})

module.exports = mongoose.model("Lom", lomSchema)