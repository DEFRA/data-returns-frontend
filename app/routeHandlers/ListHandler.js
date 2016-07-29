var helpLinks = require('../config/dep-help-links');
var handler = require('../api-handlers/controlled-lists.js');

module.exports = {
  /*
   *  HTTP handler for '/controlled-lists' route
   *  @Param request
   *  @Param reply
   */
    
  /*
   * get handler for '/controlled-lists' route
   */
  getHandler: function (request, reply) {
      console.log('==> /controlled-lists Handler getHandler() ');

      handler.getListData().then(function successHandler(result) {
          console.log(result);
          reply.view('data-returns/controlled-lists', {
              controlledLists: result
          });
      }, function failureHandler(error) {
          console.log(error);
      });
  },
    
  /*
   * HTTP POST Handler for the /file/confirm route
   * @Param request
   * @param reply
   * Redirects the current page
   */
  postHandler: function (request, reply) {
    reply.redirect('/failure');
  }
};

