/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define([
  "N/record",
  "N/search",
  "../Lib/rxrs_transaction_lib",
  "../Lib/rxrs_custom_rec_lib",
] /**
 * @param{record} record
 * @param{search} search
 */, (record, search, tranlib, customreclib) => {
  /**
   * Defines the function that is executed when a GET request is sent to a RESTlet.
   * @param {Object} requestParams - Parameters from HTTP request URL; parameters passed as an Object (for all supported
   *     content types)
   * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
   *     Object when request Content-Type is 'application/json' or 'application/xml'
   * @since 2015.2
   */
  const get = (requestParams) => {};

  /**
   * Defines the function that is executed when a PUT request is sent to a RESTlet.
   * @param {string | Object} requestBody - The HTTP request body; request body are passed as a string when request
   *     Content-Type is 'text/plain' or parsed into an Object when request Content-Type is 'application/json' (in which case
   *     the body must be a valid JSON)
   * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
   *     Object when request Content-Type is 'application/json' or 'application/xml'
   * @since 2015.2
   */
  const put = (requestBody) => {};

  /**
   * Defines the function that is executed when a POST request is sent to a RESTlet.
   * @param {string | Object} requestBody - The HTTP request body; request body is passed as a string when request
   *     Content-Type is 'text/plain' or parsed into an Object when request Content-Type is 'application/json' (in which case
   *     the body must be a valid JSON)
   * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
   *     Object when request Content-Type is 'application/json' or 'application/xml'
   * @since 2015.2
   */
  const post = (requestBody) => {
    log.debug("requestparams", requestBody);
    let packingSlipAmount = 0;
    try {
      if (requestBody.length > 0) {
        requestBody.forEach((obj) => {
          log.audit("obj", obj);
          let {
            Amount,
            CreditMemoNumber,
            DateReceived,
            DebitMemoNumbers,
            LineItems,
          } = obj;
          let invId = tranlib.getTransactionByExternalId({
            externalId: DebitMemoNumbers,
            type: "CustInvc",
          });
          log.debug("invId", invId);
          if (invId) {
            let cmId =
              customreclib.lookForExistingCreditMemoRec(CreditMemoNumber);
            let cmLines = [];
            if (!cmId) {
              LineItems.forEach((line) => {
                let { NDC, UnitPrice, Quantity, ExtendedPrice, IsValid } = line;
                let resultObj = tranlib.getNDCTransactionLineDetails({
                  NDC: NDC,
                  invId: invId,
                });
                let lineDetails = {
                  unitPirce: UnitPrice,
                  amountApplied: ExtendedPrice,
                };
                packingSlipAmount += +resultObj.amount;
                cmLines.push(Object.assign(lineDetails, resultObj));
              });
              log.debug("CM Lines", { cmLines, packingSlipAmount });
              // let cmParams = {
              //   creditMemoNumber: CreditMemoNumber,
              //   amount,
              //   serviceFee,
              //   saveWithoutReconcilingItems,
              //   invoiceId,
              //   dateIssued,
              //   fileId,
              //   cmId,
              //   packingSlipAmount,
              //   isGovernment,
              // };
              //const cmId = customreclib.createCreditMemoRec(forCreation);
            } else {
            }
            // let { forUpdate, forCreation } = obj;
            // if (forUpdate.length > 0) {
            //   createCreditMemoLines({ cmLines: forUpdate });
            // }
            // if (forCreation.cmLines.length > 0) {
            //   const cmId = createCreditMemoRec(forCreation);
            //
            //   if (cmId) {
            //     createCreditMemoLines({
            //       cmLines: forCreation.cmLines,
            //       cmParentId: cmId,
            //       isGovernment: forCreation.isGovernment,
            //       invId: forCreation.invoiceId,
            //     });
            //   }
            //   response.sucessMessage =
            //     "Successfully Created Credit Memo ID: " + cmId;
            // }
          }
        });
      }
    } catch (e) {
      log.error("post", e.message);
    }
  };

  /**
   * Defines the function that is executed when a DELETE request is sent to a RESTlet.
   * @param {Object} requestParams - Parameters from HTTP request URL; parameters are passed as an Object (for all supported
   *     content types)
   * @returns {string | Object} HTTP response body; returns a string when request Content-Type is 'text/plain'; returns an
   *     Object when request Content-Type is 'application/json' or 'application/xml'
   * @since 2015.2
   */
  const doDelete = (requestParams) => {};

  return { get, put, post, delete: doDelete };
});
