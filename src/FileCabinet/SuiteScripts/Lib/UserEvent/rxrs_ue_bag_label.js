/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
  "N/record",
  "N/search",
  "../rxrs_verify_staging_lib",
  "../rxrs_lib_bag_label",
] /**
 * @param{record} record
 * @param{search} search
 */, (record, search, vs_lib, bag_lib) => {
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
      const rec = scriptContext.newRecord;
      const manufId = rec.getValue("custrecord_kd_mfgname");
      log.debug("manufId", manufId);
      const currentAmount = rec.getValue("custrecord_bag_amount");
      log.audit("currentAmount", currentAmount);
      if (manufId) {
        let params = {};
        const maxValue = vs_lib.getManufMaxSoAmount(manufId);
        const currentAmount = rec.getValue("custrecord_bag_amount");
        let remainingAmount = +maxValue - +currentAmount;
        log.audit("currentAmount", {
          currentAmount,
          maxValue,
          remainingAmount,
        });

        if (Number(maxValue) > 1) {
          params.custrecord_remaining_amount = remainingAmount;
        }
        params.custrecord_manuf_max_so_amount = maxValue;
        log.audit("params", params);
        record.submitFields({
          type: rec.type,
          id: rec.id,
          values: params,
        });
      }
    } catch (e) {
      log.error("afterSubmit", e.message);
    }
  };

  return { beforeLoad, beforeSubmit, afterSubmit };
});
