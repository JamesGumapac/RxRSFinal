/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
define(["N/record", "N/search", "../rxrs_util"] /**
 * @param{record} record
 * @param{search} search
 */, (record, search, util) => {
  /**
   * Defines the WorkflowAction script trigger point.
   * @param {Object} scriptContext
   * @param {Record} scriptContext.newRecord - New record
   * @param {Record} scriptContext.oldRecord - Old record
   * @param {string} scriptContext.workflowId - Internal ID of workflow which triggered this action
   * @param {string} scriptContext.type - Event type
   * @param {Form} scriptContext.form - Current form that the script uses to interact with the record
   * @since 2016.1
   */
  const onAction = (scriptContext) => {
    try {
      let { newRecord, type } = scriptContext;

      let tasksId = util.getTask({
        transactionId: newRecord.id,
        isCompleted: false,
      });
      log.audit("task Id", tasksId);
      if (tasksId) {
        record.submitFields({
          type: record.Type.TASK,
          id: tasksId,
          values: {
            status: "COMPLETE",
          },
        });
      }
    } catch (e) {
      log.error("onAction", e.message);
    }
  };

  return { onAction };
});
