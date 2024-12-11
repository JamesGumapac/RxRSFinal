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

    try {
      if (requestBody.length > 0) {
        requestBody.forEach((obj) => {
          log.audit("obj", obj);
          let packingSlipAmount = 0;
          let {
            Amount,
            CreditMemoNumber,
            DateReceived,
            DebitMemoNumbers,
            LineItems,
            ServiceFee,
          } = obj;
          let res = tranlib.getTransactionByExternalId({
            externalId: DebitMemoNumbers,
            type: "CustInvc",
          });
          log.audit("RES", res);
          let { invId, isGovernment } = res;
          log.debug("invId", invId);
          if (isGovernment == true) {
            Amount = Number(Amount) * 0.15;
            log.audit("Amount", Amount);
          }
          if (invId) {
            let cmId =
              customreclib.lookForExistingCreditMemoRec(CreditMemoNumber);
            let cmObj = {
              amount: Amount,
              creditMemoNumber: CreditMemoNumber,
              dateIssued: DateReceived,
              invoiceId: invId,
              serviceFee: ServiceFee,
              isGovernment: isGovernment,
            };
            log.audit("CMOBJ", cmObj);
            let cmLines = [];
            if (!cmId) {
              LineItems.forEach((line) => {
                let { NDC, UnitPrice, Quantity, ExtendedPrice, IsValid } = line;
                let resultObj = tranlib.getNDCTransactionLineDetails({
                  NDC: NDC,
                  invId: invId,
                });
                if (isGovernment == true) {
                  UnitPrice *= 0.15;
                  ExtendedPrice *= 0.15;
                }
                let lineDetails = {
                  unitPrice: UnitPrice,
                  amountApplied: ExtendedPrice,
                  cmLineId: " ",
                  invId: invId,
                };
                packingSlipAmount += +resultObj.amount;
                cmLines.push(Object.assign(lineDetails, resultObj));
              });
              cmObj.packingSlipAmount = packingSlipAmount;

              log.debug("CM Lines", { cmObj });
              let cmId = customreclib.createCreditMemoRec(cmObj);
              log.audit("cmId", cmId);
              if (cmId) {
                customreclib.createCreditMemoLines({
                  cmLines: cmLines,
                  cmParentId: cmId,
                  isGovernment: isGovernment,
                  invId: invId,
                });
              }
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
