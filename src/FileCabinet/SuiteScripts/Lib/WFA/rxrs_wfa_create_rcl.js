/**
 * @NApiVersion 2.1
 * @NScriptType WorkflowActionScript
 */
define(["N/record", "../rxrs_lib_return_cover_letter"] /**
 * @param{record} record
 */, (record, rcl) => {
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
      rcl.createReturnCoverLetter({ mrrId: newRecord.id });
    } catch (e) {
      log.error("onAction", e.message);
    }
  };

  return { onAction };
});
