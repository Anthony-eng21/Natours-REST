const crypto = require("crypto");
const mongoose = require("mongoose");
const validator = require("validator");
const bcrypt = require("bcryptjs");

//name, email, photo, password, passwordConfirm
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please tell us your name!"],
  },
  email: {
    type: String,
    required: [true, "Please provide your email!"],
    unique: true,
    lowercase: true, //converts all chars to lower
    validate: [validator.isEmail, "Please provide a valid email address"],
  },
  photo: String,
  role: {
    type: String,
    enum: ["user", "guide", "lead-guide", "admin"], //user roles another enum like TS and others lol
    default: "user",
  },
  password: {
    type: String,
    required: [true, "Please provide a password"],
    minLength: 8,
    select: false, // unselects this field for any get on our users / don't leak pw even in db
  },
  passwordConfirm: {
    //required input not held in db memory
    type: String,
    required: [true, "Please confirm your validator"],
    validate: {
      //this only works on CREATE and SAVE!!!
      validator: function (el) {
        //checks that password and this field are the same value abc === abc : returns validation err message
        return el === this.password;
      },
      message: "Passwords are not the same!",
    },
  },
  passwordChangedAt: Date, //changes when someone changes their password/ issues some new token onto this field mutated by some instance methods or hooks
  passwordResetToken: String,
  passwordResetExpires: Date,
  active: {
    type: Boolean,
    default: true,
    select: false, //dont leak this to our client lol
  },
});

/* update changedPasswordAt property here lol */
userSchema.pre("save", function (next) {
  //if this prop isnt modified || on new document creation (this.isNew), return from this function then run the NEXT mw
  if (!this.isModified("password" || this.isNew)) return next();

  /*-1 second for performance and because we want the timestamp to be more accurate 
  because this process of saving things to the db can be nonperformantit also ensures 
  that the users password will mutate appropriately */
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

/*global expression to apply to any query with find || findById, ...etc and a callback.
For any document that has this property becomes "deleted" not accesible to the client or 
on any kind of find query/operation */
userSchema.pre(/^find/, function (next) {
  //this points to the current query i.e any find query for our user documents
  this.find({ active: { $ne: false } }); //this active field shouldn't be false 
  next();
});

//PRE HOOK GENERATES HASHED/ENCRYPTED PW'S
//runs where we receive the data and the moment we want to persist this data into the db
userSchema.pre("save", async function (next) {
  //only run this function/next logic if the pw is modified (create/save)
  if (!this.isModified("password")) return next();

  /*salting and hashing our pw's with bcryptjs algo for js
  2nd param to hash is our cost arg and it's to tell how much we should ride our cpu / mem performance default is 10
  await this to get our returned promise*/
  this.password = await bcrypt.hash(this.password, 12);

  //delete this field so it isnt persisted in the db(passwordConfirm field is just for user validation not db memory)
  this.passwordConfirm = undefined;
  next();
});

//FAT MODEL THIN CONTROLLER: PHILOSOPHY
//instance method: method available on all docs of a collection
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  //compares given pw against the hash in the db
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimeStamp = parseInt(
      this.passwordChangedAt.getTime() / 1000, //second notation of this now Date
      10 //2nd arg parseInt; base of tens
    ); // converts this time stamp to normal seconds from milliseconds
    // console.log(changedTimeStamp, JWTTimestamp); // 1556582400 milli/ 1681944703 secs since changed pw

    /*False means not changed (token issue is > changedPw) but changed is true. here the token isssued at: 100 < user changedpassword at: 200 
    obviously the token issued will be greater in time so we get the difference from that */
    return JWTTimestamp < changedTimeStamp;
  }

  return false;
};

/* token that we send to the user that kind of works like a reset passowrd
that user that can use to create a new password pretty much a password
we do not store this token on the db so we encrypt it here lol with crypto module */
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; //10 Minute expiration

  /*send the email the unencrypted token here then we have the encrypted
   one from the clients response and store it into the database */
  return resetToken;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
