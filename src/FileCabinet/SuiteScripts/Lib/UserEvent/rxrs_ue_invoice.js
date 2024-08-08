/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(["../rxrs_transaction_lib", "N/ui/serverWidget"], (
  rxrs_tran_lib,
  serverWidget,
) => {
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
    const curRec = context.newRecord;
    let src;

    try {
      if (context.type === "view" || context.type === "edit") {
        const status = curRec.getText("custbody_invoice_status");
        log.debug("status", status);
        if (status) {
          var hideFld = context.form.addField({
            id: "custpage_hide_buttons",
            label: "not shown - hidden",
            type: serverWidget.FieldType.INLINEHTML,
          });
          var scr = ""; //ext-element-22
          src += `jQuery("#discounttotal").text('${status}');`;
          scr += `jQuery('div.uir-record-status').html('${status}');`;

          scr += hideFld.defaultValue =
            "<script>jQuery(function($){require([], function(){" +
            scr +
            "})})</script>";
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
  const beforeSubmit = (scriptContext) => {
    try {
      let rec = scriptContext.newRecord;
      if (rec.getValue("custbody_plan_type") == 11) {
        // GOVERNMENT
        rec = rxrs_tran_lib.setERVDiscountPrice(rec);
      }
      rxrs_tran_lib.setPartialAmount(rec);
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
      const rec = scriptContext.newRecord;
      let customStaus = {
        fullyPaid: 5,
        denied: 6,
        partiallyDenied: 7,
      };
      let invStatus;
      log.debug("scriptContext", scriptContext.type);
      if (scriptContext.type != "edit") return;
      const status = rec.getValue("custbody_invoice_status");
      let createCM = false;
      let deniedAmount = 0;
      if (
        status == customStaus.partiallyDenied ||
        status == customStaus.denied ||
        status == customStaus.fullyPaid
      )
        return;
      let itemCount = rec.getLineCount("item");
      let deniedCount = 0;
      for (let i = 0; i < rec.getLineCount("item"); i++) {
        const linestatus = rec.getSublistValue({
          sublistId: "item",
          fieldId: "custcol_line_status",
          line: i,
        });
        log.debug("status", status);
        const amount = rec.getSublistValue({
          sublistId: "item",
          fieldId: "amount",
          line: i,
        });
        if (!isEmpty(linestatus)) {
          log.debug("linestatus", linestatus);
          deniedCount += 1;
          deniedAmount += amount;
          createCM = true;
        }
      }
      log.audit("deniedCount", { deniedCount, itemCount });
      if (deniedCount == itemCount) {
        invStatus = customStaus.denied;
      } else {
        invStatus = customStaus.partiallyDenied;
      }
      const DENIEDCREDITITEMID = 924;
      if (createCM == true) {
        rxrs_tran_lib.createCreditMemoFromInv({
          invId: rec.id,
          amount: deniedAmount,
          itemId: DENIEDCREDITITEMID,
          creditType: 1,
          invStatus: invStatus,
        });
      }
    } catch (e) {
      log.error("afterSubmit", e.message);
    }
  };

  function isEmpty(stValue) {
    return (
      stValue === "" ||
      stValue == null ||
      false ||
      (stValue.constructor === Array && stValue.length == 0) ||
      (stValue.constructor === Object &&
        (function (v) {
          for (var k in v) return false;
          return true;
        })(stValue))
    );
  }

  return { beforeLoad, beforeSubmit, afterSubmit };
});
