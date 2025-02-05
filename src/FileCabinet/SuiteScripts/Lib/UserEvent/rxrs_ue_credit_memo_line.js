/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
  "N/record",
  "N/search",
  "../rxrs_custom_rec_lib",
  "../rxrs_item_lib",
], /**
 * @param{record} record
 * @param{search} search
 */ (record, search, customRec, itemlib) => {
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
  const beforeSubmit = (scriptContext) => {
    try {
      let { newRecord, type } = scriptContext;
      let res;
      let keyWord = "";
      const isRejected = newRecord.getValue("custrecord_rejected");
      if (isRejected == true) return;
      const isGovernment = newRecord.getValue("custrecord_government");
      const isTopCo = newRecord.getValue("custrecord_cmline_istopco");
      if (isGovernment == true || isTopCo == true) {
        keyWord = isGovernment == true ? "Government" : "Top Co";
        res = itemlib.getCurrentDiscountPercentage({
          displayName: keyWord,
        });
        newRecord.setValue({
          fieldId: "custrecord_cmline_gross_unit_price",
          value:
            newRecord.getValue("custrecord_cm_unit_price") / res.totalPercent ||
            1,
        });
        newRecord.setValue({
          fieldId: "custrecord_cmline_gross_amount",
          value:
            newRecord.getValue("custrecord_cm_amount_applied") /
              res.totalPercent || 1,
        });
      } else {
        newRecord.setValue({
          fieldId: "custrecord_cmline_gross_unit_price",
          value: newRecord.getValue("custrecord_cm_unit_price"),
        });
        newRecord.setValue({
          fieldId: "custrecord_cmline_gross_amount",
          value: newRecord.getValue("custrecord_cm_amount_applied"),
        });
      }
      let parentCmId = newRecord.getValue("custrecord_credit_memo_id");
      if (type == "edit") {
        if (isGovernment == true || isTopCo == true) {
          newRecord.setValue({
            fieldId: "custrecord_cm_amount_applied",
            value:
              newRecord.getValue("custrecord_cmline_gross_amount") *
                res.totalPercent || 1,
          });
          newRecord.setValue({
            fieldId: "custrecord_cm_unit_price",
            value:
              newRecord.getValue("custrecord_cmline_gross_unit_price") *
                res.totalPercent || 1,
          });
        } else {
          newRecord.setValue({
            fieldId: "custrecord_cm_amount_applied",
            value: newRecord.getValue("custrecord_cmline_gross_amount"),
          });
          newRecord.setValue({
            fieldId: "custrecord_cm_unit_price",
            value: newRecord.getValue("custrecord_cmline_gross_unit_price"),
          });
        }
      }
    } catch (e) {
      log.error("beforeSubmit", e.message);
    }
  };

  /**
   * Defines the function definition that is executed after record is submitted.
   * @param {Object} scriptContext
   * @param {Record} scriptContext.newRecord - New record
   * @param {Record} scriptContext.oldRecord - Old record
   * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
   * @since 2015.2
   */
  const afterSubmit = (scriptContext) => {
    let { newRecord, type } = scriptContext;
    const isRejected = newRecord.getValue("custrecord_rejected");
    if (isRejected == true) return;
    let parentCmId = newRecord.getValue("custrecord_credit_memo_id");
    try {
      if (type == "edit") {
        let res = customRec.getAllCMLineTotal({ parentCmId: parentCmId });
        log.audit("amount", res);
        if (res) {
          record.submitFields({
            type: "customrecord_creditmemo",
            id: parentCmId,
            values: {
              custrecord_amount: res.sumAmount,
              custrecord_gross_credit_received: res.grossAmount,
            },
          });
        }
      }
    } catch (e) {
      log.error("afterSubmit", e.message);
    }
  };

  return { beforeSubmit, afterSubmit };
});
