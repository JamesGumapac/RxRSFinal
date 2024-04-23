/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
  "N/record",
  "N/search",
  "../rxrs_util",
  "../rxrs_transaction_lib",
  "../rxrs_sl_custom_module",
  "N/url",
] /**
 * @param{record} record
 * @param{search} search
 */, (record, search, util, tranlib, slmodule, url) => {
  /**
   * Defines the function definition that is executed before record is loaded.
   * @param {Object} scriptContext
   * @param {Record} scriptContext.newRecord - New record
   * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
   * @param {Form} scriptContext.form - Current form
   * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
   * @since 2015.2
   */
  const beforeLoad = (context) => {
    try {
      const rec = context.newRecord;
      slmodule.addC2ItemsReqSublist(context);
    } catch (e) {
      log.error("beforeLoad", e.message);
    }
  };

  /**
   * Defines the function definition that is executed before record is submitted.
   * @param {Object} scriptContext
   * @param {Record} scriptContext.newRecord - New record
   * @param {Record} scriptContext.oldRecord - Old record
   * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
   * @since 2015.2
   */
  const beforeSubmit = (scriptContext) => {
    log.debug("beforeSubmit");
    try {
      const rec = scriptContext.newRecord;
      log.debug("rec", rec);
      const status = rec.getValue("transtatus");

      log.audit("status", status);
      switch (status) {
        case util.rrStatus.PendingVerification:
          for (let i = 0; i < rec.getLineCount("item"); i++) {
            const item = rec.getSublistValue({
              sublistId: "item",
              fieldId: "item",
              line: i,
            });
            log.debug("item", item);
            log.debug("includes", {
              isInclude: Object.values(util.rxrsItem).includes(+item),
              item: item,
            });
            if (Object.values(util.rxrsItem).includes(+item)) {
              rec.removeLine({
                sublistId: "item",
                line: i,
              });
              break;
            }
          }
          rec.setValue({
            fieldId: "custbody_kd_actual_item_scan_input",
            value: true,
          });
          break;
        case util.rrStatus.Approved:
          break;
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
    try {
      const rec = scriptContext.newRecord;
      const mrrId = rec.getValue("custbody_kd_master_return_id");
      const status = rec.getValue("transtatus");
      log.debug("afterSubmit", { mrrId, status });
      switch (status) {
        case util.rrStatus.Approved:
          tranlib.checkIfReturnRequuestIsApproved(mrrId);
      }
    } catch (e) {
      log.error("afterSubmit", e.message);
    }
  };

  return { beforeLoad, beforeSubmit, afterSubmit };
});
