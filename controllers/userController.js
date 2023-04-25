const AppError = require("../utils/appError");
const User = require("./../models/userModel");
const catchAsync = require("./../utils/catchAsync");

/* loop through all the fields in the object and then for each field
 we check if it's one of the allowed fields and if it is we create a new
 field in the object with some new value for the key value pair then 
 we of course return the newObj to be passed on*/
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};
exports.getAllUsers = catchAsync(async (req, res) => {
  const users = await User.find();

  res.status(200).json({
    status: "Success!",
    results: users.length,
    data: {
      users: users,
    },
  });
});

exports.updateMe = catchAsync(async (req, res, next) => {
  //1) create an error if the user POSTs password data

  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        "This route is not for password updates. Please use / updateMyPassword",
        400
      )
    );
  }

  //2) Filtered out unwanted fields in our req body obj that are not allowed to be updated
  const filteredBody = filterObj(req.body, "name", "email"); //only want to mutate these two fields and filter out the rest
  //3) update the user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,
  }); //new: true returns new object and not thenew one

  res.status(200).json({
    status: "Success!",
    user: updatedUser,
  });
});

exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: "Sucess!",
    data: null,
  });
});

exports.getUser = (req, res) => {
  res.status(500).json({
    status: "error",
    message: "This route is no yet defined",
  });
};

exports.createUser = (req, res) => {
  res.status(500).json({
    status: "error",
    message: "This route is no yet defined",
  });
};

exports.updateUser = (req, res) => {
  res.status(500).json({
    status: "error",
    message: "This route is no yet defined",
  });
};

exports.deleteUser = (req, res) => {
  res.status(500).json({
    status: "error",
    message: "This route is no yet defined",
  });
};
