const mongoose = require("mongoose");
//read and save our variable as node env vars
const dotenv = require("dotenv");
dotenv.config({ path: "./config.env" });


/*Doesn't happen asynchronously so we need this in the top level of our code before we
define our app variable so we can catch uncaughtExceptions from the get go */
process.on("uncaughtException", (err) => {
  console.log("💣 UNCAUGHT EXCEPTION 💣 SHUTTING DOWN...");
  console.log(err.name, err.message);
  process.exit(1); //we really need to crash our app here or there will be a unclean state for our application (susceptible to attacks)
});

const app = require("./app");

const DB = process.env.DATABASE.replace(
  "<PASSWORD>",
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    //mongodb connection constructor
    //deprecation warning config object
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => console.log("DB Connected Successfully!"));

//4) START SERVER
const port = process.env.port || 3000; //prod server or 3000 dev server
//2nd arg is the logic that will start when we reach this port
const server = app.listen(port, () => {
  console.log(`app running on port ${port}...`);
});

//NODE SAFETY NET
//seperate sole node logic for unhandledRejections
process.on("unhandledRejection", (err) => {
  console.log(err.name, err.message); //default obj field's we get in node.js DUUUUHHHHHHHHHH
  console.log("💣 UNHANDLED REJECTION 💣 SHUTTING DOWN...");
  //gracefull way of killing this process/app because it will use (kinda like recursion) to try and work again when one of our files change
  server.close(() => {
    process.exit(1); //optional: app crashed - waiting for file changes before starting...
  });
  // process.exit(1) implicit and abrupt (kills all processes) //we pass a code to exit() 1===Uncaught Exception && 0===success
});