/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(["N/record"], /**
 * @param{record} record
 */ (record) => {
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
    let { newRecord, oldRecord } = scriptContext;
    const SHIPSTATUS = {
      SHIPPED: "C",
      PACKED: "B",
    };
    try {
      const soId = newRecord.getValue("createdfrom");
      const soRec = record.load({
        type: record.Type.SALES_ORDER,
        id: soId,
        isDynamic: true,
      });
      if (newRecord.getValue("shipstatus") == SHIPSTATUS.PACKED) {
        let fulfillmentType = soRec.getValue("custbody_fulfillmenttype");
        if (fulfillmentType != 1) return;
        soRec.setValue({
          fieldId: "custbody_shipmentready",
          value: true,
        });
        soRec.setValue({
          fieldId: "custbody_orderstatus",
          value: 5,
        });
      } else if (newRecord.getValue("shipstatus") == SHIPSTATUS.SHIPPED) {
        let fulfillmentType = soRec.getValue("custbody_fulfillmenttype");
        if (fulfillmentType == 1) {
          soRec.setValue({
            fieldId: "custbody_orderstatus",
            value: 6,
          });
        } else {
          soRec.setValue({
            fieldId: "custbody_shipmentready",
            value: true,
          });
        }

        const invoiceRec = record.transform({
          fromType: record.Type.SALES_ORDER,
          toType: record.Type.INVOICE,
          fromId: soId,
          isDynamic: false,
        });
        const invoiceId = invoiceRec.save({
          ignoreMandatoryFields: true,
        });
        log.audit("Successfully created invoice", invoiceId);
      }
      soRec.save({ ignoreMandatoryFields: true });
    } catch (e) {
      log.error("afterSubmit", e.message);
    }
  };

  return { afterSubmit };
});
