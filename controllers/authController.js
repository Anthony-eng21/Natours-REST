const crytpo = require("crypto");
const { promisify } = require("util");
const jwt = require("jsonwebtoken");
const User = require("./../models/userModel");
const catchAsync = require("./../utils/catchAsync");
const AppError = require("./../utils/appError");
const sendEmail = require("./../utils/email");

/*to sign() => 1ST ARG: payload 
2ND ARG: secret for our jwtsecret string for security,
3RD ARG: when the jwt expires */
const signToken = (id) => {
  return jwt.sign({ id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

/* 
helper token login function that makes send responses to our user better
we set up a config object for our expiration argument for our cookie obj that we 
put on to this function that is used every time we send a response to our user and
we attach this token(payload user._id) and some additional options for the cookie
*/
const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRESIN * 24 * 60 * 60 * 1000
    ), //converts this to milliseconds / 90 days
    secure: process.env.NODE_ENV === "production",
    httpOnly: true, //cookie cant be accessed or modified in the browser (cross-site attacks)
  };

  res.cookie("jwt", token, cookieOptions);

  //Remove password from the output of any response we give to the user
  user.password = undefined;

  res.status(statusCode).json({
    status: "Success",
    token: token, //signs in user with our token
    data: {
      user: user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  /*create new instance of model like this with the 
  data we need from the req.body as a whole
  allows data we need to make the new user so that
  the user can specify a role i.e admin */
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    role: req.body.role,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
  });

  //asign signed and generated user token basically to our jwt in our res and store it here in this var
  //this user._id is the payload for our authorization to sign our user in
  //we check against this in our
  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //1)check if email and password exist
  if (!email || !password) {
    return next(new AppError("Please provide an email and password!", 404));
  }
  /*2) check if the user exists and the password is correct
  output of this doesnt contain the password but, we need it to check validity for salting and hashing
  checks negatives
  no user then return. if the pw is correct skip to our res 
  to correctpw this is on our model as an instance method first arg is the
  input/field pw and the second is the compared hash string in our model living in our db */

  //need to grab the password field like this because select is set to false in our schema
  const user = await User.findOne({ email: email }).select("+password");

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("incorrect login or password!", 401)); //statCo. unauthorized
  }

  //3)if everything ok, send token to client : send err message
  createSendToken(user, 200, res);
});

exports.protect = catchAsync(async (req, res, next) => {
  /*1) Getting token from the authorization header
  we set with post man and check if it exists
  then send the token as an http header when we
  send the request. set headers in express
  in the responsethen view request with 
  headers(post man rocks) */
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1]; //value after Bearer i.e our token/payload(user._id)
    // console.log(token);
  }

  if (!token) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }
  /*2) Verification SigningKeyCallback: jwt algo checks if the token was verified or not 
  from the signature / signToken() verify if the user/hacker may have manipulated
  our data(payload) or check if the token has expired or the password has changed
  later on in with freshuser*/
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // console.log(decoded); //{ id: '643f5e614e3bf730c45cb7c0', iat: 1681874580, exp: 1689650580 } decoded obj from this promise

  /*3 check if user still exists 
  if we make it to this point of our code then we know 
  that the verification process we have previously (decoded 
  promisified fn with it's cb that verifies our token with our security secret)
  was returned successful*/
  const currentUser = await User.findById(decoded.id); //decoded.id is our created token's payload
  if (!currentUser) {
    return next(
      new AppError("The user belonging to this token no longer exists", 401)
    );
  }

  /*4) check if user changed their password if so
  throw an error on purpose only if the user has 
  changed their password before warns malicious
  third party injected code against user data
  we set this as true here and set the error because
  thats how we set it up in our instance method where 
  we returned false out of the parent function*/
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password! Please log in again.", 401)
    );
  }

  /*Grant access to the protected route if the program 
  doesn't throw err in this file and nothing goes awry
  req obj allows access to this value in other mws but we
   have to pass it before anyother mw becasue we get the 
   user object from this lol */
  req.user = currentUser;

  next();
});

/* Restricts the role of the req.user (=> User) based on the user above MW super nice Code 
checks the user id in our db */
exports.restrictTo = (...roles) => {
  /*roles is an array that we have access from this 
  parent function in this close where we specify
  and configure our rules for ["admin", "lead-guide"] 
  */
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You don't have access to perform this action", 403) //FORBIDDEN statusCo
      );
    }

    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  /* 1) get user based on Posted email */
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError("There is no user with these credentials", 404));
  }

  /* 2) Generate the random token */
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false }); //deactivates all validators in our schema

  /* 3) send it to the user's email */
  const resetURL = `${req.protocol}://${req.get(
    "host"
  )}/api/vi/users/resetPassword/${resetToken}`;

  const message = `Forgot your password? Submit a PATCH request with your 
  new password and passwordConfirm to: ${resetURL}.\n
  If you didn't forget your password, please ignore this email!`;

  //RESOLVE SENDEMAIL PROMISE: forced object config from our transporter helper function
  try {
    await sendEmail({
      email: user.email,
      subject: "Your password reset Token (valid for 10 minutes)",
      message: message,
    });

    res.status(200).json({
      status: "Success",
      message: "Token sent to email",
    });
  } catch (err) {
    //setback password reset token and expiration
    //data modification
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    //saves our data nice and this other property on save is to bypass other validators in our schema
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        "There was an error sending the email. Try again later!",
        500
      )
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  /* 1) get user based on the token 
  encrypt this users token then compare it to the one in our db
  find the user for the token and check if the token has expired */

  const hashedToken = crytpo
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  /* 2) If the token hasn't expired, and there is a user, set the new password */
  if (!user) {
    return next(new AppError("Token is invalid or has expired", 400));
  }
  //data modification
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined; //after save() mw executes we set these properties to undefined
  user.passwordResetExpires = undefined;
  await user.save(); //we want to validate so no extra config obj

  /* 3) Update changedPasswordAt property for the user and we do this on our model*/
  /* 4) login user */
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  /* 1) get user from collection */

  const user = await User.findById(req.user.id).select("+password");

  /* 2) check if the posted password is correct */

  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError("Your current password is wrong.", 401));
  }

  /* 3) if so, update the password */

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save(); // want validators

  //4) log user in, send JWT
  createSendToken(user, 200, res);
});
