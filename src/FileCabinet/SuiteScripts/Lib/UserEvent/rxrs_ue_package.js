/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(["N/record", "N/search", "../rxrs_util"] /**
 * @param{record} record
 * @param{search} search
 */ /**
 * Defines the function definition that is executed before record is loaded.
 * @param {Object} scriptContext
 * @param {Record} scriptContext.newRecord - New record
 * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
 * @param {Form} scriptContext.form - Current form
 * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
 * @since 2015.2
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
      const isPackageReceived = rec.getValue("custrecord_packstatus");
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
      const tasksIdUpdated = checkAllTrackingNumberIsGenerated({ rrId: rrId });
      log.audit("tasksIdUpdated", tasksIdUpdated);
    } catch (e) {
      log.error("afterSubmit", e.message);
    }
  };

  /**
   * Checks if all tracking numbers are generated for a given record ID.
   *
   * @param {Object} options - An object containing options for the tracking number check.
   * @param {string} options.rrId - The record ID to check for tracking numbers.
   *
   * @return {string}  - task Id
   */
  function checkAllTrackingNumberIsGenerated(options) {
    log.audit("checkAllTrackingNumberIsGenerated", options);
    let { rrId } = options;
    let passInbound = false;
    try {
      const customrecord_kod_mr_packagesSearchObjInBound = search.create({
        type: "customrecord_kod_mr_packages",
        filters: [
          ["custrecord_kd_is_222_kit", "is", "F"],
          "AND",
          ["custrecord_kod_packrtn_rtnrequest", "anyof", rrId],
        ],
        columns: [
          search.createColumn({
            name: "name",
            summary: "COUNT",
            sort: search.Sort.ASC,
            label: "ID",
          }),
          search.createColumn({
            name: "custrecord_kod_packrtn_trackingnum",
            summary: "COUNT",
            label: "Tracking Number",
          }),
        ],
      });
      let inBoundRPsearchResultCount, inBoundTrackingNumberCount;
      log.debug(
        "customrecord_kod_mr_packagesSearchObj result count",
        inBoundRPsearchResultCount,
      );
      customrecord_kod_mr_packagesSearchObjInBound
        .run()
        .each(function (result) {
          // .run().each has a limit of 4,000 results
          inBoundTrackingNumberCount = result.getValue({
            name: "custrecord_kod_packrtn_trackingnum",
            summary: "COUNT",
          });
          inBoundRPsearchResultCount = result.getValue({
            name: "name",
            summary: "COUNT",
          });
          return true;
        });

      log.debug("inBoundTrackingNumberCount", inBoundTrackingNumberCount);
      log.debug("inBoundRPsearchResultCount", inBoundRPsearchResultCount);
      if (inBoundTrackingNumberCount == inBoundRPsearchResultCount) {
        passInbound = true;
      }
      if (passInbound == true) {
        let taskId = getTasks({ rrId: rrId });
        if (taskId) {
          const taskRec = record.load({
            type: record.Type.TASK,
            id: taskId,
          });
          taskRec.setValue({
            fieldId: "custevent_kd_tracking_num",
            value: true,
          });
          const all222FormGenerated = taskRec.getValue(
            "custevent_kd_222_form_generated",
          );
          if (all222FormGenerated == true) {
            taskRec.setValue({
              fieldId: "status",
              value: "COMPLETE",
            });
          } else {
            taskRec.setValue({
              fieldId: "status",
              value: "PROGRESS",
            });
          }
          return taskRec.save({
            ignoreMandatoryFields: true,
          });
        }
      }
    } catch (e) {
      log.error("checkAllTrackingNumberIsGenerated", e.message);
    }
  }

  /**
   * Retrieves the task ID associated with the given request ID.
   *
   * @param {Object} options - The options object containing the request ID.
   * @param {string} options.rrId - The request ID to search for tasks.
   *
   * @return {string} The task ID corresponding to the request ID provided in the options.
   */
  function getTasks(options) {
    try {
      let { rrId } = options;
      let taskId;
      const taskSearchObj = search.create({
        type: "task",
        filters: [["custevent_kd_ret_req", "anyof", rrId]],
        columns: [
          search.createColumn({ name: "internalid", label: "internalid" }),
        ],
      });

      taskSearchObj.run().each(function (result) {
        taskId = result.getValue({ name: "internalid" });
        return true;
      });
      return taskId;
    } catch (e) {
      log.error("getTasks", e.message);
    }
  }

  return { afterSubmit };
});
