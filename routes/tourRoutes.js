const express = require("express");
const tourController = require("./../controllers/tourController");
// const { getAllTours, createTour, getTour, patchTour, deleteTour } = require("./../controllers/tourController");

//tour route protection and more but used here before get all tours
const authController = require("./../controllers/authController");

const router = express.Router(); //create new router for our tours

//TESTING WITH JSON FILES
//only when we have an id in the route else it gets skipped to the next middleware in the stack
// router.param("id", tourController.checkID);

//checks body for name tour and price property if not send 400 / bad request

router
  .route("/top-5-cheap") //Alias Route for req string prefilling the top 5 tours / middleware is dope
  .get(tourController.aliasTopTours, tourController.getAllTours);

router.route("/tour-stats").get(tourController.getTourStats);
router.route("/monthly-plan/:year").get(tourController.getMonthlyPlan);

router
  //root
  .route("/")
  .get(tourController.getAllTours)
  //chained MW: pass the validator MW before the actual HTTP Verb MW to validate this req, res cycle
  .post(tourController.createTour);

//created a dynamic variable/parameter called id that lives in our url that is associated with individual objects
//formatting our response for our incoming json tour objects
// console.log(req.params); //is the object that automatically asssigns the value to our variable
//optional parameters i.e /api/v1/tours/:id/:?profile
//id: i.e /api/v1/tours/5 === { id: 5 } in out req.params get it????
router
  .route("/:id")
  .get(tourController.getTour)
  .patch(
    authController.protect,
    // authController.restrictTo("admin", "lead-guide"),
    tourController.patchTour
  )
  //chained MW: pass the validator MW before the actual HTTP Verb MW to validate this req, res cycle
  .delete(
    authController.protect,
    authController.restrictTo("admin", "lead-guide"),
    tourController.deleteTour
  );

module.exports = router;
