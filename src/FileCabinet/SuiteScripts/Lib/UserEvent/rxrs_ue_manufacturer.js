/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(["N/record", "N/search", "../rxrs_lib_bag_label", "../rxrs_util"] /**
 * @param{record} record
 * @param{search} search
 */, (record, search, baglabel, util) => {
  const CONTROLBIN = "custrecord_control_bin";
  const INBOUNDBIN = "custrecord_inbound_bin";
  const OUTBOUNDBIN = "custrecord_outbound_bin";
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
    let { newRecord, oldRecord } = scriptContext;
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
    let { newRecord, oldRecord } = scriptContext;
    // if (scriptContext.type == "edit") {
    //   const manufRec = record.load({
    //     type: scriptContext.newRecord.type,
    //     id: scriptContext.newRecord.id,
    //   });
    //   let controlCurrentBins = manufRec.getValue("custrecord_control_bin");
    //   let inBoundCurrentBins = manufRec.getValue("custrecord_inbound_bin");
    //   let outBoundCurrentBins = manufRec.getValue("custrecord_outbound_bin");
    //
    //   let generalBins = baglabel.getGeneralBin({ returnGroup: true });
    //   controlCurrentBins.push(generalBins.CONTROL);
    //   inBoundCurrentBins.push(generalBins.INBOUND);
    //   outBoundCurrentBins.push(generalBins.OUTBOUND);
    //   log.audit("General BIns", {
    //     controlCurrentBins,
    //     inBoundCurrentBins,
    //     outBoundCurrentBins,
    //   });
    //   log.audit("control", util.removeDuplicates(controlCurrentBins.flat(1)));
    //   manufRec.setValue({
    //     fieldId: "custrecord_outbound_bin",
    //     value: "", //util.removeDuplicates(outBoundCurrentBins.flat(1)),
    //   });
    //   manufRec.setValue({
    //     fieldId: "custrecord_inbound_bin",
    //     value: "", //util.removeDuplicates(inBoundCurrentBins.flat(1)),
    //   });
    //   manufRec.setValue({
    //     fieldId: "custrecord_control_bin",
    //     value: "", //util.removeDuplicates(controlCurrentBins.flat(1)),
    //   });
    //   manufRec.save({ ignoreMandatoryFields: true });
    // }
    try {
      let oldControlBin = oldRecord.getValue(CONTROLBIN);
      let newControlBin = newRecord.getValue(CONTROLBIN);
      let oldInboundBin = oldRecord.getValue(INBOUNDBIN);
      let newInboundBin = newRecord.getValue(INBOUNDBIN);
      let oldOutBoundBin = oldRecord.getValue(OUTBOUNDBIN);
      let newOutBoundBIn = newRecord.getValue(OUTBOUNDBIN);
      const useSpecificBin = newRecord.getValue("custrecord_use_specific_bin");
      log.debug("values", {
        useSpecificBin,
        oldControlBin,
        newControlBin,
        oldInboundBin,
        newInboundBin,
        oldOutBoundBin,
        newOutBoundBIn,
      });
      if (useSpecificBin == false) return;
      if (oldControlBin !== newControlBin) {
        const missingValues = oldControlBin.filter(
          (value) => !newControlBin.includes(value),
        );
        const newValues = newControlBin.filter(
          (value) => !oldControlBin.includes(value),
        );
        log.audit("values", { missingValues, newValues });
        if (newValues.length > 0) {
          newValues.forEach((binId) => {
            baglabel.assignManufToBin({
              binId: binId,
              manufId: newRecord.id,
            });
          });
          /**
           * Set automatically the bin to specific bin if there's manuf
           */
          newRecord.setValue({
            fieldId: "custrecord_specific_bin",
            value: true,
          });
        }
        if (missingValues.length > 0) {
          missingValues.forEach((binId) => {
            baglabel.unAssignManufToBin({
              binId: binId,
              manufId: newRecord.id,
            });
          });
        }
      }
      if (oldOutBoundBin !== newOutBoundBIn) {
        const missingValues = oldOutBoundBin.filter(
          (value) => !newOutBoundBIn.includes(value),
        );
        const newValues = newOutBoundBIn.filter(
          (value) => !oldOutBoundBin.includes(value),
        );
        log.audit("values", { missingValues, newValues });
        if (newValues.length > 0) {
          newValues.forEach((binId) => {
            baglabel.assignManufToBin({
              binId: binId,
              manufId: newRecord.id,
            });
          });
          /**
           * Set automatically the bin to specific bin if there's manuf
           */
          newRecord.setValue({
            fieldId: "custrecord_specific_bin",
            value: true,
          });
        }
        if (missingValues.length > 0) {
          missingValues.forEach((binId) => {
            baglabel.unAssignManufToBin({
              binId: binId,
              manufId: newRecord.id,
            });
          });
        }
      }
      if (oldInboundBin !== newInboundBin) {
        const missingValues = oldInboundBin.filter(
          (value) => !newInboundBin.includes(value),
        );
        const newValues = newInboundBin.filter(
          (value) => !oldInboundBin.includes(value),
        );
        log.audit("values", { missingValues, newValues });
        if (newValues.length > 0) {
          newValues.forEach((binId) => {
            baglabel.assignManufToBin({
              binId: binId,
              manufId: newRecord.id,
            });
          });
          /**
           * Set automatically the bin to specific bin if there's manuf
           */
          newRecord.setValue({
            fieldId: "custrecord_specific_bin",
            value: true,
          });
        }
        if (missingValues.length > 0) {
          missingValues.forEach((binId) => {
            baglabel.unAssignManufToBin({
              binId: binId,
              manufId: newRecord.id,
            });
          });
        }
      }
    } catch (e) {
      log.error("assigningBIn", e.message);
    }
  };

  return { beforeLoad, beforeSubmit, afterSubmit };
});
