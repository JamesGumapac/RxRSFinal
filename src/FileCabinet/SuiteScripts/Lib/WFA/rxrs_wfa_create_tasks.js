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
  const onAction = (context) => {
    const currentRecord = context.newRecord;

    try {
      const entityId = currentRecord.getValue("entity");
      const tranId = currentRecord.getValue("tranid");
      util.createTaskRecord({
        entityId: entityId,
        title: `Request RMA # ${currentRecord.getValue("custbody_kd_rma_number")} for| ${tranId}`,
        entityName: currentRecord.getText("entity"),
        form: 157, //RXRS | RAM# Task Form
        transaction: currentRecord.id,
        link: `<a href ="${util.generateRedirectLink({
          type: "salesorder",
          id: currentRecord.id,
        })}">${currentRecord.getValue("tranid")}</a>`,
        replaceMessage: true,
      });
    } catch (e) {
      log.error("afterSubmit", e.message);
    }
  };

  return { onAction };
});
