const express = require("express");
const userController = require("./../controllers/userController");
const authController = require("./../controllers/authController");

const router = express.Router(); //create new router for our Users

//special case we make a new endpoint that doesn't really go along with our rest API
//philosophy where the name of the url has nothing to do with the function/task performed
//and isnt a real route but we want to send the post data from this signup endpoint to create a user GET ITTTTT?
router.post("/signup", authController.signup);
router.post("/login", authController.login);

router.post("/forgotPassword", authController.forgotPassword);
router.patch("/resetPassword/:token", authController.resetPassword);

router.patch(
  "/updateMyPassword",
  authController.protect,
  authController.updatePassword
);

router.patch("/updateMe", authController.protect, userController.updateMe);

router.delete("/deleteMe", authController.protect, userController.deleteMe);

router
  .route("/") //root
  .get(userController.getAllUsers)
  .post(userController.createUser);

router
  .route("/:id") //root plus id and any other params before
  .get(userController.getUser)
  .patch(userController.updateUser)
  .delete(userController.deleteUser);

module.exports = router;
