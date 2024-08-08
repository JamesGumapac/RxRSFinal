/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(["N/record", "N/runtime", "N/search", "N/task"] /**
 * @param{record} record
 * @param{runtime} runtime
 * @param{search} search
 * @param{task} task
 */, (record, runtime, search, task) => {
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
      let { newRecord, oldRecord } = scriptContext;
      let binName = newRecord.getValue("binnumber");
      if (scriptContext.type == "create") {
        if (binName.includes("IB") == true) {
          category = 1;
        } else if (binName.includes("OB") == true) {
          category = 2;
        } else if (binName.includes("CON") == true) {
          category = 3;
        }
        if (category != null) {
          newRecord.setValue({
            fieldId: "custrecord_bincategory",
            value: category,
          });
        }
      }

      if (scriptContext.type == "edit") {
        log.audit("binanem values", {});
        if (
          newRecord.getValue("binnumber") != oldRecord.getValue("binnumber")
        ) {
          const mrTask = task.create({
            taskType: task.TaskType.MAP_REDUCE,
            scriptId: "customscript_rxrs_mr_remove_specific_bin",
            deploymentId: "customdeploy_rxrs_mr_remove_specific_bin",
            params: {
              custscript_bintoremove: newRecord.id,
              custscript_binname: newRecord.getValue("binnumber"),
            },
          });
          const mrTaskId = mrTask.submit();
          const mrTaskStatus = task.checkStatus({
            taskId: mrTaskId,
          });
          log.debug("MR STATUS" + mrTaskStatus);
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
  const afterSubmit = (scriptContext) => {};

  return { beforeLoad, beforeSubmit, afterSubmit };
});
