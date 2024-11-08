/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(["../rxrs_transaction_lib"], (rxrs_tran_lib) => {
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
    log.audit("removing line");
    try {
      const rec = scriptContext.newRecord;
      const finalPaymentSchedule = rec.getValue("custbody_kodpaymentsched");
      log.debug("finalPaymentSchedule", finalPaymentSchedule);
      if (!finalPaymentSchedule) return;
      log.debug("finalPaymentSchedule", finalPaymentSchedule);
      if (!finalPaymentSchedule) return;
      rxrs_tran_lib.removeVBLine({
        vbRec: rec,
        finalPaymentSchedule: finalPaymentSchedule,
        updateLine: false,
      });
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

  return { beforeSubmit };
});
