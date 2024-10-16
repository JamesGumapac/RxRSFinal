/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
  "N/record",
  "N/search",
  "../rxrs_transaction_lib",
  "../rxrs_lib_bag_label",
] /**
 * @param{record} record
 * @param{search} search
 */, (record, search, tranlib, baglib) => {
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
    let { newRecord, oldRecord, type } = scriptContext;
    if (type == "create" || type == "delete") return;
    try {
      if (
        newRecord.getValue("custrecord_itemscanbin") ==
        oldRecord.getValue("custrecord_itemscanbin")
      )
        return;
      const inventoryNumber = newRecord.getValue("custrecord_cs_lotnum");
      tranlib.createBinTransfer({
        itemId: newRecord.getValue("custrecord_cs_return_req_scan_item"),
        quantity: newRecord.getValue("custrecord_cs_qty"),
        fromBin: newRecord.getValue("custrecord_previous_bin"),
        toBin: newRecord.getValue("custrecord_itemscanbin"),
        binNumberId: baglib.getInventoryNumberId({
          inventoryName: inventoryNumber,
        }),
        location: 1, // clearwater
      });
    } catch (e) {
      log.error("afterSubmit", e.message);
    }
  };

  return { beforeLoad, beforeSubmit, afterSubmit };
});
