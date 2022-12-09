const mongoose = require('mongoose')
const Schema = mongoose.Schema
const bcrypt = require('bcrypt')

const userVerificationSchema = new Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        unique: true
    },
    password : {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    expiresAt:{
        type:Date,
        default: Date.now + 3600000
    },
    access: {
        type: String,
        default: 'member',
        required: true
    }
})

module.exports = mongoose.model("UserVerification", userVerificationSchema)