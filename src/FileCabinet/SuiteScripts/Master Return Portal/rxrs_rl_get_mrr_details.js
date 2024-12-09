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
], /**
 * @param{https} https
 * @param{record} record
 * @param{runtime} runtime
 * @param{search} search
 * @param item_fulfillment_util
 * @param serviceLog
 */ (https, record, runtime, search, tranlib) => {
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
    try {
      if (requestParams) {
        let response = tranlib.createMasterReturnRequest(requestParams);
        return response;
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
    if (requestParams.action == "getMRRHistory") {
      return getMrrByCustomerId(requestParams.customerId);
    }
  };

  function getMrrByCustomerId(custmerId) {
    try {
      let mrrResult = [];
      const customrecord_kod_masterreturnSearchObj = search.create({
        type: "customrecord_kod_masterreturn",
        filters: [
          ["formulatext: {custrecord_mrrentity.entityid}", "is", custmerId],
        ],
        columns: [
          search.createColumn({ name: "name", label: "Name" }),
          search.createColumn({ name: "created", label: "Date Created" }),
          search.createColumn({
            name: "custrecord_mrrentity",
            label: "Customer Name",
          }),
          search.createColumn({
            name: "custrecord_kod_mr_status",
            label: "Status",
          }),
        ],
      });

      customrecord_kod_masterreturnSearchObj.run().each(function (result) {
        mrrResult.push({
          MRR: result.getValue("name"),
          dateCreated: result.getValue("created"),
          customer: result.getText("custrecord_mrrentity"),
          status: result.getText("custrecord_kod_mr_status"),
        });
        return true;
      });
      log.audit("mrrResults", mrrResult);
      return mrrResult;
    } catch (e) {
      log.error("getMrrByCustomerId", e.message);
    }
  }

  return { post, get };
});
