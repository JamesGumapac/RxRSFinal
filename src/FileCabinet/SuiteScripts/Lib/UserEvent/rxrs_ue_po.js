/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([], () => {
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
    const RETURNABLE = 2;
    const NONRETURNABLE = 1;
    const rec = scriptContext.newRecord;
    // const rec = record.load({
    //   type: record.Type.PURCHASE_ORDER,
    //   id: curRec.id,
    // });
    try {
      for (let i = 0; i < rec.getLineCount("item"); i++) {
        const mfgProcessing = rec.getSublistValue({
          sublistId: "item",
          fieldId: "custcol_kod_mfgprocessing",
          line: i,
        });
        const pharmaProcessing = rec.getSublistValue({
          sublistId: "item",
          fieldId: "custcol_kod_rqstprocesing",
          line: i,
        });
        log.debug("processing", {
          line: i,
          pharma: pharmaProcessing,
          mfg: mfgProcessing,
        });
        if (
          pharmaProcessing == NONRETURNABLE &&
          mfgProcessing == NONRETURNABLE
        ) {
          rec.setSublistValue({
            sublistId: "item",
            fieldId: "amount",
            line: i,
            value: 0,
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
