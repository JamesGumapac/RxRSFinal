/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(["N/record", "N/search", "../rxrs_util"] /**
 * @param{record} record
 * @param{search} search
 */, (record, search, util) => {
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
    const PACKAGERECEIVED = 3;
    const rec = scriptContext.newRecord;
    try {
      const rrId = rec.getValue("custrecord_kod_packrtn_rtnrequest");
      let rrType = util.getReturnRequestType(rrId);
      log.audit("RRTYPE", rrType);
      const rrRec = record.load({
        type: rrType,
        id: rrId,
      });
      const rrStatus = rrRec.getValue("transtatus");
      const mrrId = rrRec.getValue("custbody_kd_master_return_id");
      const isPackageReceived = rec.getValue("custrecord_ispackrecvd");
      log.debug("RR Details", { rrId, rrStatus, isPackageReceived });

      if (
        isPackageReceived == PACKAGERECEIVED &&
        rrStatus == util.rrStatus.PendingPackageReceipt
      ) {
        rrRec.setValue({
          fieldId: "transtatus",
          value: util.rrStatus.ReceivedPendingProcessing,
        });
        rrRec.save({
          ignoreMandatoryFields: true,
        });
        const mrrRec = record.load({
          type: "customrecord_kod_masterreturn",
          id: mrrId,
        });
        const mrrStatus = mrrRec.getValue("custrecord_kod_mr_status");
        log.debug("MRR STATUS", mrrStatus);
        log.debug("MRR STATUS", util.mrrStatus);
        if (mrrStatus == util.mrrStatus.CustomerSubmitted) {
          log.debug("setting value into in progress");
          mrrRec.setValue({
            fieldId: "custrecord_kod_mr_status",
            value: util.mrrStatus.InProgress,
          });
          log.debug(
            "MRR REC",
            mrrRec.save({
              ignoreMandatoryFields: true,
            }),
          );
        }
      }
    } catch (e) {
      log.error("afterSubmit", e.message);
    }
  };

  return { afterSubmit };
});
