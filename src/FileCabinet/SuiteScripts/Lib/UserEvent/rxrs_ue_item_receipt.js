/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(["N/record", "N/search", "../rxrs_transaction_lib"] /**
 * @param{record} record
 * @param{search} search
 */, (record, search, tranlib) => {
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
      let { newRecord } = scriptContext;
      for (let i = 0; i < newRecord.getLineCount("item"); i++) {
        const binNumber = newRecord.getSublistValue({
          sublistId: "item",
          fieldId: "custcol_bin_number",
          line: i,
        });
        log.audit("binNumber", binNumber);
        if (binNumber) {
          const inventoryDetailsRecord = newRecord.getSublistSubrecord({
            sublistId: "item",
            fieldId: "inventorydetail",
            line: i,
          });
          inventoryDetailsRecord.setSublistValue({
            sublistId: "inventoryassignment",
            fieldId: "binnumber",
            line: 0,
            value: binNumber,
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
  const afterSubmit = (scriptContext) => {};

  return { beforeLoad, beforeSubmit, afterSubmit };
});
