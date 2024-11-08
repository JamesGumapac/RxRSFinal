/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
  "N/record",
  "N/runtime",
  "N/search",
  "N/task",
  "../rxrs_lib_bag_label",
  "../rxrs_util",
] /**
 * @param{record} record
 * @param{runtime} runtime
 * @param{search} search
 * @param{task} task
 */, (record, runtime, search, task, bag) => {
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
      log.audit("binNumber", binName);
      if (scriptContext.type == "create") {
        if (binName.includes("IB") == true) {
          category = 1;
        } else if (binName.includes("OB") == true) {
          category = 2;
        }
        if (binName.includes("CON") == true) {
          newRecord.setValue({
            fieldId: "custrecord_bin_control_item",
            value: true,
          });
        }
        if (category != null) {
          newRecord.setValue({
            fieldId: "custrecord_bincategory",
            value: category,
          });
        }
      }
      if (scriptContext.type == "edit") {
        /**
         * Remove or Assign bin to manuf
         */
        const oldManuf = oldRecord.getValue("custrecord_kd_bin_manufacturer");
        const newManuf = newRecord.getValue("custrecord_kd_bin_manufacturer");
        let fieldId = bag.getFieldToUpdate(binName);
        log.audit("manuf", { oldManuf, newManuf });
        /**
         * If no manuf assigned to manufacturer field removes a specific bin category
         */

        if (oldManuf !== newManuf) {
          const missingValues = oldManuf.filter(
            (value) => !newManuf.includes(value),
          );
          const newValues = newManuf.filter(
            (value) => !oldManuf.includes(value),
          );
          log.audit("values", { missingValues, newValues });
          if (newValues.length > 0) {
            newValues.forEach((manufId) => {
              bag.assignBinToManuf({
                binId: newRecord.id,
                manufId: manufId,
                fieldId: fieldId,
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
            missingValues.forEach((manufId) => {
              bag.removeBinToManuf({
                binId: newRecord.id,
                manufId: manufId,
                fieldId: fieldId,
              });
            });
          }
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
      if (newRecord.getValue("custrecord_bin_split") == true) {
        newRecord.setValue({
          fieldId: "isinactive",
          value: true,
        });
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
      log.debug("MR STATUS" + mrTaskStatus);
      //}
      // }
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
      if (scriptContext.type == "create") {
        let { newRecord, oldRecord } = scriptContext;
        let binName = newRecord.getValue("binnumber");
        log.audit("binNumber", binName);
        if (newRecord.getValue("custrecord_general_bins") == true) return;
        const newManuf = newRecord.getValue("custrecord_kd_bin_manufacturer");
        let fieldId = bag.getFieldToUpdate(binName);
        if (newManuf.length > 0) {
          newManuf.forEach((manufId) => {
            bag.assignBinToManuf({
              binId: newRecord.id,
              manufId: manufId,
              fieldId: fieldId,
            });
          });
          record.submitFields({
            type: newRecord.type,
            id: newRecord.id,
            values: {
              custrecord_specific_bin: true,
            },
          });
        } else {
          const mrTask = task.create({
            taskType: task.TaskType.MAP_REDUCE,
            scriptId: "customscript_rxrs_mr_update_manuf_bin",
            deploymentId: "customdeploy_rxrs_mr_update_manuf_bin",
            params: {
              custscript_bin: newRecord.id,
            },
          });
        }
      }
    } catch (e) {
      log.error("afterSubmit", e.message);
    }
  };

  return { beforeLoad, beforeSubmit, afterSubmit };
});
