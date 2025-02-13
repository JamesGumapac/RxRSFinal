/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
  "../rxrs_transaction_lib",
  "N/ui/serverWidget",
  "N/search",
  "../rxrs_item_lib",
  "../rxrs_sl_custom_module",
], (rxrs_tran_lib, serverWidget, search, itemlib, sllib) => {
  /**
   * Defines the function definition that is executed before record is loaded.
   * @param {Object} scriptContext
   * @param {Record} scriptContext.newRecord - New record
   * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
   * @param {Form} scriptContext.form - Current form
   * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
   * @since 2015.2
   */
  const PLANSELECTIONTYPE = {
    GOVERNMENT: 11,
    TOPCO: 10,
    QUICKCASH: 4,
  };
  const columnToHide = ["taxcode", "taxcode_display"];

  const beforeLoad = (context) => {
    const { type, newRecord, form } = context;
    log.audit("context.type", type);
    let src;

    try {
      columnToHide.forEach((fieldId) => {
        sllib.hideColumnField({
          formObj: form,
          sublistId: "item",
          fieldId: fieldId,
        });
      });

      if (type === "view" || type === "edit") {
        const planSelectionType = newRecord.getValue("custbody_plan_type");
        const status = newRecord.getText("custbody_invoice_status");
        log.debug("status", status);
        if (status) {
          var hideFld = form.addField({
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
        if (
          planSelectionType == PLANSELECTIONTYPE.GOVERNMENT ||
          planSelectionType == PLANSELECTIONTYPE.TOPCO
        ) {
          sllib.hideColumnField({
            formObj: form,
            sublistId: "item",
            fieldId: "custcol_item_scan_entity",
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
  const beforeSubmit = (scriptContext) => {
    let { newRecord, type } = scriptContext;

    let planSelectionType;

    if (type == "create") {
      const irsId = newRecord.getSublistValue({
        sublistId: "item",
        fieldId: "custcol_item_scan",
        line: 0,
      });
      if (irsId) {
        let irsSearch = search.lookupFields({
          type: "customrecord_cs_item_ret_scan",
          id: irsId,
          columns: ["custrecord_irs_plan_selection_type"],
        });
        planSelectionType =
          irsSearch.custrecord_irs_plan_selection_type[0].value;
        log.audit("res", planSelectionType);
        if (planSelectionType) {
          newRecord.setValue({
            fieldId: "custbody_plan_type",
            value: planSelectionType,
          });
        }
      }
    }
    if (type == "edit") {
      for (let i = 0; i < newRecord.getLineCount("item"); i++) {
        const linestatus = newRecord.getSublistValue({
          sublistId: "item",
          fieldId: "custcol_line_status",
          line: i,
        });
        const cmReference = newRecord.getSublistValue({
          sublistId: "item",
          fieldId: "custcol_credit_memo_reference",
          line: i,
        });
        log.debug("status", { linestatus, cmReference });
        const cmUnnitPrice = newRecord.getSublistValue({
          sublistId: "item",
          fieldId: "custcol_cm_unit_price",
          line: i,
        });
        log.audit("condition", linestatus == 1 && isEmpty(cmReference) == true);
        if (
          linestatus == 1 &&
          (isEmpty(cmReference) == true || Number(cmUnnitPrice)) > 0
        ) {
          newRecord.setSublistValue({
            sublistId: "item",
            fieldId: "custcol_line_status",
            line: i,
            value: "",
          });
        }
      }
    }
    log.audit("Plan selection type", planSelectionType);
    let res;
    switch (+planSelectionType) {
      case PLANSELECTIONTYPE.GOVERNMENT: // Government
        res = itemlib.getCurrentDiscountPercentage({
          displayName: "Government",
        });
        newRecord.setValue({
          fieldId: "discountitem",
          value: res.internalId, //	Invoice Adjustment - Government Accounts
        });
        newRecord.setValue({
          fieldId: "192", //RXRS | MFG Invoice [Government]
        });
        rxrs_tran_lib.setERVDiscountPrice(newRecord);
        break;
      case PLANSELECTIONTYPE.QUICKCASH: // Quick Cash
        newRecord.setValue({
          fieldId: "143", //RXRS | MFG Invoice [Government]
        });
        break;
      case PLANSELECTIONTYPE.TOPCO: // Top Co
        res = itemlib.getCurrentDiscountPercentage({
          displayName: "Top Co",
        });
        newRecord.setValue({
          fieldId: "discountitem",
          value: res.internalId, //	Invoice Adjustment - Government Accounts
        });
        newRecord.setValue({
          fieldId: "197", //RXRS | MFG Invoice [Top Co.]
        });
        rxrs_tran_lib.setERVDiscountPrice(newRecord);
        break;
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
        partiallyPaid: 4,
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
