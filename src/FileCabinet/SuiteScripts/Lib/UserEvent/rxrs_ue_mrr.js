/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
  "N/url",
  "N/ui/serverWidget",
  "N/file",
  "N/record",
  "N/search",
  "../rxrs_util",
] /**
 * @param{file} file
 * @param{record} record
 * @param{search} search
 */, (url, serverWidget, file, record, search, util) => {
  /**
   * Defines the function definition that is executed before record is loaded.
   * @param {Object} scriptContext
   * @param {Record} scriptContext.newRecord - New record
   * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
   * @param {Form} scriptContext.form - Current form
   * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
   * @since 2015.2
   */
  const beforeLoad = (scriptContext) => {
    let { newRecord, type } = scriptContext;
    try {
      if (type == "view" || type == "edit") {
        scriptContext.form.addTab({
          id: "custpage_return_cover_letter",
          label: "Return Cover Letter",
        });
        const objSublist = scriptContext.form.addSublist({
          id: "custpage_sublist_items_requested",
          type: serverWidget.SublistType.LIST,
          label: "Return Cover Letter",
          tab: "custom136",
        });
        objSublist.addField({
          id: "custpage_view",
          type: serverWidget.FieldType.TEXT,
          label: "View",
        });
        objSublist
          .addField({
            id: "custpage_return_number",
            label: "Return Cover Id",
            type: serverWidget.FieldType.TEXT,
          })
          .updateDisplayType({
            displayType: serverWidget.FieldDisplayType.INLINE,
          });
        let rclList = getReturnCoverLetter({ mrrId: newRecord.id });
        log.debug("rclList", rclList);
        for (let i = 0; i < rclList.length; i++) {
          const viewUrl = url.resolveRecord({
            recordType: "customrecord_return_cover_letter",
            recordId: rclList[i].id,
            isEditMode: false,
          });
          const domain = url.resolveDomain({
            hostType: url.HostType.APPLICATION,
          });
          const lineUrl = "https://" + domain + viewUrl;
          objSublist.setSublistValue({
            id: "custpage_view",
            line: i,
            value: '<a href="' + lineUrl + '">VIEW</a>',
          });
          objSublist.setSublistValue({
            id: "custpage_return_number",
            line: i,
            value: rclList[i].id,
          });
        }
      }
    } catch (e) {
      log.error("beforeLoad", e.message);
    }
  };

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
    let { newRecord, type } = scriptContext;
    try {
      const PARENTFOLDERNAME = "222Form";
      const parentFolderId = util.getFolderId(PARENTFOLDERNAME);
      const mrrText = newRecord.getText("name");
      log.audit("values", { PARENTFOLDERNAME, parentFolderId, mrrText });
      log.audit(
        "Creating Folder",
        util.createFolder({
          name: mrrText,
          parent: parentFolderId,
        }),
      );
    } catch (e) {
      log.error("afterSubmit", e.message);
    }
  };

  /**
   * Get the related return cover letter of the master return request
   * @param options.mrrId - Master Return Id
   * @returns {*[]}
   */
  function getReturnCoverLetter(options) {
    log.audit("getReturnCoverLetter", options);
    let res = [];
    let { mrrId } = options;
    try {
      const customrecord_return_cover_letterSearchObj = search.create({
        type: "customrecord_return_cover_letter",
        filters: [["custrecord_rcl_master_return", "anyof", mrrId]],
        columns: [
          search.createColumn({
            name: "custrecord_rcl_address",
            label: "Address",
          }),
          search.createColumn({
            name: "custrecord_rcl_dea_222_form",
            label: "DEA 222 Form",
          }),
          search.createColumn({
            name: "custrecord_rcl_dea_number",
            label: "DEA Number",
          }),
          search.createColumn({ name: "created", label: "Date Created" }),
          search.createColumn({
            name: "custrecord_rcl_master_return",
            label: "Return Number",
          }),
        ],
      });
      const searchResultCount =
        customrecord_return_cover_letterSearchObj.runPaged().count;
      log.debug(
        "customrecord_return_cover_letterSearchObj result count",
        searchResultCount,
      );
      customrecord_return_cover_letterSearchObj.run().each(function (result) {
        res.push({
          id: result.id,
          ReturnNumber: result.getValue("custrecord_rcl_master_return"),
        });
        return true;
      });
      return res;
    } catch (e) {
      log.error("getReturnCoverLetter", e.message);
    }
  }

  return { beforeLoad, afterSubmit };
});
