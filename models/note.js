const mongoose = require('mongoose')
const Schema = mongoose.Schema
mongoose.set('sanitizeProjection', true)

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