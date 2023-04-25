//this wrapper function gets called for error checking when a controller() EXECUTES
//pretty much a wrapper function for our async()s.
// need to return this function here so createtour i.e any mw is it's own function instead of the product of just calling one
//impure and causes breaking code if we do not return this other inner/child function
module.exports = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next); //where all the magic happens WOW
  };
};
