/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define([
  "N/https",
  "N/record",
  "N/runtime",
  "N/search",
  "../Lib/rxrs_transaction_lib",
  "../Lib/rxrs_custom_rec_lib",
], /**
 * @param{https} https
 * @param{record} record
 * @param{runtime} runtime
 * @param{search} search
 * @param item_fulfillment_util
 * @param serviceLog
 */ (https, record, runtime, search, tranlib, customRecLib) => {
  /**
   * Defines the function that is executed when a GET request is sent to a RESTlet.
   * @param {Object} requestParams - Parameters from HTTP request URL; parameters passed as an Object (for all supported
   *     content types)
   * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
   *     Object when request Content-Type is 'application/json' or 'application/xml'
   * @since 2015.2
   */
  const post = (requestParams) => {
    let response;
    let soId;
    log.debug("requestParams", requestParams);
    const { action, body } = requestParams;
    try {
      switch (action) {
        case "getMRRHistory":
          return tranlib.getMrrByCustomerId(customerId);
          break;
        case "getPackageInfo":
          /**
           * Return the list of package under the Master Return Request
           * Includes info "name", "netsuiteInternalId,"pdfLink": "trackingStatus","estimatedDelivery" ,"packageStatus"
           */
          return customRecLib.getPackageInfo({
            returnRequest: body.returnRequest,
          });
          break;
        case "createMasterReturn":
          let response = tranlib.createMasterReturnRequest(body);
          return response;
          break;
      }
    } catch (ex) {
      log.error("ERROR", ex.message);
    }
  };

  /**
   * Defines the function that is executed when a GET request is sent to a RESTlet.
   * @param {Object} requestParams - Parameters from HTTP request URL; parameters passed as an Object (for all supported
   *     content types)
   * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
   *     Object when request Content-Type is 'application/json' or 'application/xml'
   * @since 2015.2
   */
  const get = (requestParams) => {
    log.audit("requestParams", requestParams);
    let { action, customerId, returnRequest } = requestParams;
    switch (action) {
      case "getMRRHistory":
        return tranlib.getMrrByCustomerId(customerId);
        break;
    }
  };

  return { post, get };
});
