/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
  "N/file",
  "N/record",
  "N/search",
  "N/runtime",
  "N/email",
  "N/https",
  "N/task",
  "./Lib/rxrs_util",
  "./Lib/rxrs_custom_rec_lib",
], /**
 * @param{file} file
 * @param{record} record
 * @param search
 * @param{record} runtime
 * @param{record} email
 * @param https
 * @param rxrsUtil
 */ (
  file,
  record,
  search,
  runtime,
  email,
  https,
  task,
  rxrsUtil,
  customRec,
) => {
  /**
   * Defines the function definition that is executed after record is submitted.
   * @param {Object} scriptContext
   * @param {Record} scriptContext.newRecord - New record
   * @param {Record} scriptContext.oldRecord - Old record
   * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
   * @since 2015.2
   */

  const afterSubmit = (context) => {
    const masterRec = context.newRecord;
    const masterRecId = masterRec.id;
    let mrrStatus = masterRec.getValue("custrecord_kod_mr_status");
    try {
      // if (mrrStatus == rxrsUtil.mrrStatus.CustomerSubmitted) {
      //   const customer = masterRec.getValue({
      //     fieldId: "custrecord_mrrentity",
      //   });
      //   const planSelectionType = masterRec.getValue(
      //     "custrecord_mrrplanselectiontype",
      //   );
      //   const requestedDate = masterRec.getValue("custrecord_kod_mr_requestdt");
      //   const isLicenseExpired = masterRec.getValue(
      //     "custrecord_kd_license_expired",
      //   );
      //   const isStateLicenseExpired = masterRec.getValue(
      //     "custrecord_kd_state_license_expired",
      //   );
      //   const category = customRec.getItemRequested(masterRec.id);
      //   log.audit("Category", category);
      //   let rrCategory = [];
      //   category.forEach((cat) => {
      //     rrCategory.push({
      //       category: cat.value,
      //       item: rxrsUtil.rxrsItem[cat.text],
      //       requestedDate: requestedDate,
      //       masterRecId: masterRecId,
      //       customer: customer,
      //       isLicenseExpired: isLicenseExpired,
      //       isStateLicenseExpired: isStateLicenseExpired,
      //       planSelectionType: planSelectionType,
      //     });
      //   });
      //   log.audit("rrCategory", rrCategory);
      //   rrCategory.forEach((rrCategory) => {
      //     let rrId = rxrsUtil.createReturnRequest(rrCategory);
      //     log.audit("Created RR", rrId);
      //   });
      // }
      // const deploymentId = runtime
      //   .getCurrentScript()
      //   .getParameter("custscript_rxrs_mr_script_deployment");
      // const scriptId = runtime
      //   .getCurrentScript()
      //   .getParameter("custscript_rxrs_mr_script_id");
      //
      // try {
      //   const mrTask = task.create({
      //     taskType: task.TaskType.MAP_REDUCE,
      //     scriptId: scriptId,
      //     deploymentId: deploymentId,
      //     params: {
      //       custscript_rxrs_category: returnPackage,
      //     },
      //   });
      //   const mrTaskId = mrTask.submit();
      //   log.debug("mr TaskID", { mrTaskId, deploymentId });
      // } catch (e) {
      //   log.error("error", e.message);
      //   //Use the second deployment if the first deployment is still in progress
      //   const secondDeploymentId =
      //     "customdeploy_rxrs_mr_create_rr_and_pack2";
      //   const mrTask = task.create({
      //     taskType: task.TaskType.MAP_REDUCE,
      //     scriptId: scriptId,
      //     deploymentId: secondDeploymentId,
      //     params: {
      //       custscript_rxrs_category: returnPackage,
      //     },
      //   });
      //   const mrTaskId = mrTask.submit();
      //   log.debug("mr TaskID", { mrTaskId, secondDeploymentId });
      // }
      //
    } catch (e) {
      log.error("afterSubmit", e.message);
    }
  };

  return { afterSubmit };
});
