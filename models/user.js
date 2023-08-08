const mongoose = require('mongoose')
const Schema = mongoose.Schema
const bcrypt = require('bcrypt')
mongoose.set('sanitizeProjection', true)


const addressSchema = new Schema({
    line1:{
        type: String,
        required: true
    },
    line2:{
        type: String
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

// const knownIpsSchema = new Schema({
//     knownIps:{
//         type: Array
//     }
// })

const userSchema = new Schema({
    email: {
        type: String,
        required: true,
        lowercase: true,
        unique: true,
        index: true
    },
    password: {
        type: String,
        required: true
    },
    memberSince: {
        type: Date,
        default: Date.now
    },
    access: {
        type: String,
        default: 'member',
        required: true
    },
    firstName:{
        type: String,
        index: true
    },
    lastName:{
        type: String,
        index: true
    },
    address: {
        type: addressSchema
    },
    // verifiedIps:{
    //     type: Array
    // },
    isVerified:{
        type: Boolean,
        default: false,
        required: true
    },
    otp:{
        type: Number
    },
    tempPassword:{
        type: String
    },
    tempRequested:{
        type: Boolean,
        default: false
    }
})

// pre-save hook to encrypt user passwords on signup

userSchema.pre("save", function(next){
    const user = this
    if(!user.isModified("password")) return next()
    bcrypt.hash(user.password, 10, (err, hash) => {
       // look into Salt rounds ^ (10) in bcrypt documentation // currently suspected to be row rotation after matrix multiplication
        if(err) return next(err)
        user.password = hash
        next()
    })
})

// method to check encrypted password on login

userSchema.methods.checkPassword = function(passwordAttempt, callback){
    bcrypt.compare(passwordAttempt, this.password, (err, isMatch) => {
        console.log(this.password)
        if(err) return callback(err)
        return callback(null, isMatch)
    })
}

// medthod to remove user's password for token/sending the response

userSchema.methods.withoutPassword = function(){
    const user = this.toObject()
    delete user.password
    delete user.otp
    delete user.tempPassword
    return user
}

module.exports = mongoose.model("User", userSchema)