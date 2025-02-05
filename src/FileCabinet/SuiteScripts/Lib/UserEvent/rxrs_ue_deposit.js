/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
  "N/record",
  "N/search",
  "../rxrs_transaction_lib",
  "../rxrs_item_lib",
] /**
 * @param{record} record
 * @param{search} search
 */, (record, search, tranlib, itemlib) => {
  /**
   * Defines the function definition that is executed before record is loaded.
   * @param {Object} scriptContext
   * @param {Record} scriptContext.newRecord - New record
   * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
   * @param {Form} scriptContext.form - Current form
   * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
   * @since 2015.2
   */
  const beforeLoad = (scriptContext) => {};

  /**
   * Defines the function definition that is executed before record is submitted.
   * @param {Object} scriptContext
   * @param {Record} scriptContext.newRecord - New record
   * @param {Record} scriptContext.oldRecord - Old record
   * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
   * @since 2015.2
   */
  const beforeSubmit = (scriptContext) => {};

  /**
   * Defines the function definition that is executed after record is submitted.
   * @param {Object} scriptContext
   * @param {Record} scriptContext.newRecord - New record
   * @param {Record} scriptContext.oldRecord - Old record
   * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
   * @since 2015.2
   */
  const afterSubmit = (scriptContext) => {
    try {
      const GOVERNMENT = 11;
      const TOPCO = 10;
      let res;
      let keyWord = "";
      let cashBackAmount = 0;
      let { type } = scriptContext;
      let rec = scriptContext.newRecord;
      const newRecord = record.load({
        type: record.Type.DEPOSIT,
        id: rec.id,
      });
      if (type == "create") {
        let discountObj;
        for (let i = 0; i < newRecord.getLineCount("payment"); i++) {
          let isDeposit = newRecord.getSublistValue({
            sublistId: "payment",
            fieldId: "deposit",
            line: i,
          });
          log.debug("isDeposit", isDeposit);
          if (isDeposit !== true) continue;
          const lineId = newRecord.getSublistValue({
            sublistId: "payment",
            fieldId: "id",
            line: i,
          });

          const lineAmount = newRecord.getSublistValue({
            sublistId: "payment",
            fieldId: "paymentamount",
            line: i,
          });
          log.debug("Line Info", { lineId, lineAmount });
          if (tranlib.getTransactionType({ id: lineId }) == "Payment Info") {
            const rsLookup = search.lookupFields({
              type: "customtransaction_payment_info",
              id: lineId,
              columns: ["custbody_pi_plan_type"],
            });
            res = itemlib.getCurrentDiscountPercentage({
              displayName: "Government",
            });
            if (
              rsLookup.custbody_pi_plan_type[0].value == GOVERNMENT ||
              rsLookup.custbody_pi_plan_type[0].value == TOPCO
            ) {
              keyWord =
                rsLookup.custbody_pi_plan_type[0].value == GOVERNMENT
                  ? "Government"
                  : "Top Co";
              res = itemlib.getCurrentDiscountPercentage({
                displayName: keyWord,
              });
              cashBackAmount += Number(lineAmount);
            }
          }
        }
        log.debug("CashBack Amount", cashBackAmount);
        if (cashBackAmount > 0) {
          newRecord.setSublistValue({
            sublistId: "cashback",
            fieldId: "account",
            value: tranlib.ACCOUNT.Undeposited_Funds,
            line: 0,
          });
          newRecord.setSublistValue({
            sublistId: "cashback",
            fieldId: "amount",
            value: cashBackAmount * res.discountPercentage || 1,
            line: 0,
          });
        }
        newRecord.save({
          ignoreMandatoryFields: true,
        });
      }
    } catch (e) {
      log.error("beforeSubmit", e.message);
    }
  };

  return { beforeLoad, beforeSubmit, afterSubmit };
});
