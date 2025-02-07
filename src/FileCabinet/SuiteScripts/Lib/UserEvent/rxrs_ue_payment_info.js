/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */

define(["N/record", "N/search", "../rxrs_transaction_lib"], /**
 * @param{record} record
 * @param{search} search
 */ (record, search, tran_lib) => {
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
      const customStaus = {
        fullyPaid: 5,
        denied: 6,
        partiallyDenied: 7,
        partiallyPaid: 4,
        openCredit: 2,
      };
      const { newRecord, type } = scriptContext;
      if (type == "delete") {
        const invId = newRecord.getValue("custbody_payment_invoice_link");
        let returnObj = tran_lib.checkExistingPayment({ invId: invId });
        log.audit("returnObj", returnObj);
        if (isEmpty(returnObj)) {
          record.submitFields({
            type: record.Type.INVOICE,
            id: invId,
            values: {
              custbody_invoice_status: customStaus.openCredit, // Open Credit
            },
          });
        } else {
          record.submitFields({
            type: record.Type.INVOICE,
            id: invId,
            values: {
              custbody_invoice_status: customStaus.partiallyPaid, // Open Credit
            },
          });
        }
      }
    } catch (e) {
      log.error("afterSubmit", { error: e.message, params: scriptContext });
    }
  };

  function isEmpty(stValue) {
    return (
      stValue === "" ||
      stValue == null ||
      false ||
      (stValue.constructor === Array && stValue.length == 0) ||
      (stValue.constructor === Object &&
        (function (v) {
          for (var k in v) return false;
          return true;
        })(stValue))
    );
  }

  return { afterSubmit };
});
