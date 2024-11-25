/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(["N/record", "N/search", "../rxrs_transaction_lib", "../rxrs_util"] /**
 * @param{record} record
 * @param{search} search
 */, (record, search, tranlib, util) => {
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
      let newRec = scriptContext.newRecord;

      let DEAExpired = newRec.getValue("custentity_kd_license_expired");
      let stateLincesedExpired = newRec.getValue(
        "custentity_kd_license_expired",
      );
      log.debug("License", { DEAExpired, stateLincesedExpired });
      if (DEAExpired == false || stateLincesedExpired == false) {
        let returnRequestList = tranlib.getReturnRequestPendingReview({
          entityId: newRec.id,
        });
        log.debug("returnRequestList", returnRequestList);
        if (returnRequestList.length > 0) {
          returnRequestList.forEach((ret) => {
            log.debug("ret", ret);
            let { id, category, type } = ret;
            if (category == util.RRCATEGORY.C2) {
              record.submitFields({
                type: util.getReturnRequestType(id),
                id: id,
                values: {
                  transtatus: util.rrStatus.C2Kittobemailed,
                },
              });
            } else {
              record.submitFields({
                type: util.getReturnRequestType(id),
                id: id,
                values: {
                  transtatus: util.rrStatus.PendingPackageReceipt,
                },
              });
            }
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
  const afterSubmit = (scriptContext) => {
    let { newRecord, oldRecord } = scriptContext;

    try {
      const newDeaLicenseExpired = newRecord.getValue(
        "custentity_kd_license_expired",
      );
      const oldDeaLicenseExpired = oldRecord.getValue(
        "custentity_kd_license_expired",
      );
      const oldStateLicenseExpired = oldRecord.getValue(
        "custentity_kd_stae_license_expired",
      );
      const newStateLicenseExpired = newRecord.getValue(
        "custentity_kd_stae_license_expired",
      );
      log.audit("License Values", {
        newDeaLicenseExpired,
        oldDeaLicenseExpired,
        newStateLicenseExpired,
        oldStateLicenseExpired,
      });
      if (newDeaLicenseExpired == false) {
        if (newDeaLicenseExpired !== oldDeaLicenseExpired) {
          let taskId = util.getLicenseTask({
            licenseType: "DEA",
            entityId: newRecord.id,
            isCompleted: false,
          });
          if (taskId) {
            log.audit("completing task", taskId);
            record.submitFields({
              type: record.Type.TASK,
              id: taskId,
              values: {
                status: "COMPLETE",
              },
            });
          }
        }
      }
      if (newStateLicenseExpired == false) {
        if (newStateLicenseExpired !== oldStateLicenseExpired) {
          let taskId = util.getLicenseTask({
            licenseType: "STATE",
            entityId: newRecord.id,
            isCompleted: false,
          });
          if (taskId) {
            log.audit("completing task", taskId);
            record.submitFields({
              type: record.Type.TASK,
              id: taskId,
              values: {
                status: "COMPLETE",
              },
            });
          }
        }
      }
    } catch (e) {
      log.error("afterSubmit", e.message);
    }
  };

  return { beforeLoad, beforeSubmit, afterSubmit };
});
