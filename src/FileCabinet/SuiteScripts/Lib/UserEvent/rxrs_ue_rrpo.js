/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(["N/record", "N/search", "N/ui/serverWidget", "../rxrs_util"], /**
 * @param{record} record
 * @param{search} search
 */ (record, search, serverWidget, util) => {
  /**
   * Defines the function definition that is executed before record is loaded.
   * @param {Object} scriptContext
   * @param {Record} scriptContext.newRecord - New record
   * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
   * @param {Form} scriptContext.form - Current form
   * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
   * @since 2015.2
   */

  const beforeLoad = (context) => {
    try {
      const rec = context.newRecord;
      if (context.type === "view" || context.type === "edit") {
        var scr = "";
        let elementToHide = [
          "#linkstxt",
          "#reimbursementstxt",
          "#transformationstxt",
          "#recmachcustbody_vendor_credittxt",
          "#customsublist40txt",
        ];

        let hideFld = context.form.addField({
          id: "custpage_hide_element",
          label: "not shown - hidden",
          type: serverWidget.FieldType.INLINEHTML,
        });

        let category = rec.getValue("custbody_kd_rr_category");
        if (category != util.RRCATEGORY.C2) {
          log.audit("Not C2");
          elementToHide.push("#recmachcustrecord_kd_returnrequesttxt");
          // scr += `jQuery("#recmachcustrecord_kd_returnrequesttxt").hide()`;
        }
        scr += `jQuery("${elementToHide}").hide()`;
        log.audit("scr", scr);
        scr += hideFld.defaultValue =
          "<script>jQuery(function($){require([], function(){" +
          scr +
          "})})</script>";
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
  const beforeSubmit = (scriptContext) => {
    try {
      const RETURNABLE = 2;
      const NONRETURNABLE = 1;
      const rec = scriptContext.newRecord;
      for (let i = 0; i < rec.getLineCount("item"); i++) {
        const mfgProcessing = rec.getSublistValue({
          sublistId: "item",
          fieldId: "custcol_kod_mfgprocessing",
          line: i,
        });
        const pharmaProcessing = rec.getSublistValue({
          sublistId: "item",
          fieldId: "custcol_kod_rqstprocesing",
          line: i,
        });

        if (pharmaProcessing == NONRETURNABLE && mfgProcessing == RETURNABLE) {
          log.debug("processing", {
            line: i,
            pharma: pharmaProcessing,
            mfg: mfgProcessing,
          });
          rec.selectLine({
            sublistId: "item",
          });
          rec.setSublistValue({
            sublistId: "item",
            fieldId: "rate",
            value: 0,
            line: i,
          });
          rec.setSublistValue({
            sublistId: "item",
            fieldId: "amount",
            value: 0,
            line: i,
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
  const afterSubmit = (scriptContext) => {};

  return { beforeLoad, beforeSubmit, afterSubmit };
});
