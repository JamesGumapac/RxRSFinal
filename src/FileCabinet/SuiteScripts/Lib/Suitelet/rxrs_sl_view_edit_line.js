/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
  "N/ui/serverWidget",
  "../rxrs_return_cover_letter_lib",
  "../rxrs_verify_staging_lib",
  "../rxrs_payment_sched_lib",
  "../rxrs_transaction_lib",
  "../rxrs_util",
  "N/cache",
  "N/file",
  "N/record",
  "N/redirect",
  "../rxrs_view_edit_line_lib",
  "../rxrs_verify_staging_lib",
], /**
 * @param{serverWidget} serverWidget
 * @param rxrs_rcl_util
 * @param rxrs_vs_util
 * @param rxrs_ps_util
 * @param cache
 * @param file
 * @param record
 * @param redirect
 */ (
  serverWidget,
  rxrs_rcl_util,
  rxrs_vs_util,
  rxrs_ps_util,
  rxrs_tran_util,
  rxrs_util,
  cache,
  file,
  record,
  redirect,
  veLib,
  vsLib,
) => {
  /**
   * Defines the Suitelet script trigger point.
   * @param {Object} scriptContext
   * @param {ServerRequest} scriptContext.request - Incoming request
   * @param {ServerResponse} scriptContext.response - Suitelet response
   * @since 2015.2
   */
  const onRequest = (context) => {
    let params = context.request.parameters;
    if (context.request.method === "GET") {
      try {
        let form = displayForms(params);
        context.response.writePage(form);
      } catch (e) {
        log.error("GET", e.message);
      }
    }
  };

  /**
   * Creates a form, adds a client script to it, creates header fields, and then creates a sublist of
   * @param params - parameters
   * @returns The form object is being returned.
   */
  function displayForms(params) {
    try {
      log.debug("objClientParams", params);
      let title = "Approval & Completion";
      let csName = "rxrs_cs_mrr_edit_line.js";

      log.audit("displayFrom csname", csName);
      let form = serverWidget.createForm({
        title: title,
        hideNavBar: true,
      });
      try {
        form.clientScriptFileId = rxrs_vs_util.getFileId(csName);
      } catch (e) {
        log.error("setting client script Id", e.message);
      }
      log.audit("form", form);

      form = createHeaderFields({ form, params });
      return form;
    } catch (e) {
      log.error("displayForms", e.message);
    }
  }

  /**
   * Create the header fields of the Suitelet
   * @param {object}options.form Object form
   * @param {object}options.params paramters passed to the suitelet
   * @return {*}
   */
  const createHeaderFields = (options) => {
    let form = options.form;
    log.debug("createHeaderFields params", options.params);
    let { mrrId, tranId, paymentSchedText } = options.params;

    try {
      /**
       * If user clicks a specific payment type
       */
      /**
       * Hide unnecessary column
       */
      let billStatus, billId;
      let htmlFileId = rxrs_util.getFileId("SL_loading_html.html"); // HTML file for loading animation
      if (htmlFileId) {
        const dialogHtmlField = form.addField({
          id: "custpage_jqueryui_loading_dialog",
          type: serverWidget.FieldType.INLINEHTML,
          label: "Dialog HTML Field",
        });
        dialogHtmlField.defaultValue = file
          .load({
            id: htmlFileId,
          })
          .getContents();
      }
      let all = "all";

      let sublistFields = veLib.viewEditLineSUBLIST;

      let itemsReturnScan = veLib.getMRRIRSLine(mrrId);
      rxrs_vs_util.createReturnableSublistEditLine({
        form: form,
        rrTranId: mrrId,
        rrName: tranId,
        sublistFields: sublistFields,
        value: itemsReturnScan,
        isMainInDated: false,
        inDate: true,
        returnList: itemsReturnScan,
        title: paymentSchedText,
      });

      let result = veLib.getMRRSummary(mrrId);
      log.audit("result", result);
      let tableStr = "";

      tableStr += `<p style="font-size: 20px"><b><h>Value Summary:</h></b></p>`;

      tableStr += `<table style="height:10%;border-style: solid; border-collapse: collapse;padding: 5px;  background-color: #fefefa">

                      <tr>
                        <th style="border-style: solid; padding-left: 10px;padding-right: 10px;font-size: 20px;border-color:"#EEEEEE"><h5><b>Returnable</b></h5></th>
                        <th style="border-style: solid;padding-left: 10px;padding-right: 10px;padding-bottom:-2px;font-size: 20px"><h5>Value</h5></th>

                      </tr>`;
      result.forEach(function (data) {
        tableStr += `<tr>
                     <td style="border-bottom: 1px;padding-right: 30px;font-size: 15px;padding: 5px">${data.paymentName}</td>

                     <td style="font-size: 15px;padding: 5px">$${+data.amount.toFixed(4)}</td>
                   </tr>`;
      });

      let res2 = veLib.getPharmaProcessingGroupTotal(mrrId);
      res2.forEach(function (data) {
        tableStr += `<tr>
                     <td style="font-size: 15px;padding: 5px"><b>${data.name}</b></td>

                     <td style="font-size: 15px;padding: 5px">$${+data.value.toFixed(4)}</td>
                   </tr>`;
      });
      tableStr += `</table>`;
      let tableField = form.addField({
        id: "custpage_table",
        label: "Value Summary",
        type: serverWidget.FieldType.INLINEHTML,
      });
      tableField.defaultValue = tableStr;
      let billStatusField = form
        .addField({
          id: "custpage_billstatus",
          label: "Value Summary",
          type: serverWidget.FieldType.INLINEHTML,
        })
        .updateDisplayType({
          displayType: "HIDDEN",
        });

      let billIdField = form.addField({
        id: "custpage_billidlink",
        label: "Bill Link",
        type: serverWidget.FieldType.INLINEHTML,
      });
      let billIdLinkField = form
        .addField({
          id: "custpage_billid",
          label: "Value Summary",
          type: serverWidget.FieldType.INLINEHTML,
        })
        .updateDisplayType({
          displayType: "HIDDEN",
        });

      if (mrrId) {
        billId = rxrs_tran_util.getBillId({ masterReturnId: mrrId });
        billStatus = rxrs_tran_util.getBillStatus(mrrId);
        log.audit("billStatus", billStatus);
        if (billId) {
          billIdLinkField.defaultValue = billId;
          billIdField.defaultValue = `<a href="${vsLib.generateRedirectLink({
            type: record.Type.VENDOR_BILL,
            id: billId,
          })}" style=" text-decoration: underline;color: BLUE;"><b>Bill Id: ${billId} | Status: ${billStatus} </b></a>`;
        }
        billStatusField.defaultValue = billStatus;
      }
      let buttonName;
      if (billStatus == "Paid In Full") {
        buttonName = "Create Vendor Credit";
      } else {
        buttonName = "Update Modified Lines";
        form.addButton({
          id: "custpage_create_update",
          label: "Update From Catalog",
          functionName: `updateFromCatalog()`,
        });
      }

      form.addButton({
        id: "custpage_create_update",
        label: buttonName,
        functionName: `submitAll(${billId})`,
      });

      return form;
    } catch (e) {
      log.error("createHeaderFields", e.message);
    }
  };

  return { onRequest };
});
