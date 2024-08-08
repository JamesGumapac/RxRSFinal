/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(["N/record", "N/search", "../rxrs_lib_bag_label", "../rxrs_util"] /**
 * @param{record} record
 * @param{search} search
 */, (record, search, baglabel, util) => {
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
      if (scriptContext.type == "create") {
        const manufRec = record.load({
          type: scriptContext.newRecord.type,
          id: scriptContext.newRecord.id,
        });
        let controlCurrentBins = manufRec.getValue("custrecord_control_bin");
        let inBoundCurrentBins = manufRec.getValue("custrecord_inbound_bin");
        let outBoundCurrentBins = manufRec.getValue("custrecord_outbound_bin");

        let generalBins = baglabel.getGeneralBin({ returnGroup: true });
        controlCurrentBins.push(generalBins.CONTROL);
        inBoundCurrentBins.push(generalBins.INBOUND);
        outBoundCurrentBins.push(generalBins.OUTBOUND);
        log.audit("General BIns", {
          controlCurrentBins,
          inBoundCurrentBins,
          outBoundCurrentBins,
        });
        log.audit("control", util.removeDuplicates(controlCurrentBins.flat(1)));
        manufRec.setValue({
          fieldId: "custrecord_outbound_bin",
          value: util.removeDuplicates(outBoundCurrentBins.flat(1)),
        });
        manufRec.setValue({
          fieldId: "custrecord_inbound_bin",
          value: util.removeDuplicates(inBoundCurrentBins.flat(1)),
        });
        manufRec.setValue({
          fieldId: "custrecord_control_bin",
          value: util.removeDuplicates(controlCurrentBins.flat(1)),
        });
        manufRec.save({ ignoreMandatoryFields: true });
      }
    } catch (e) {
      log.error("beforeSubmit", e.message);
    }
  };

  return { beforeLoad, beforeSubmit, afterSubmit };
});
