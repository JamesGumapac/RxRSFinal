/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
  "N/ui/serverWidget",
  "../rxrs_sl_custom_module",
  "../rxrs_transaction_lib",
  "../rxrs_verify_staging_lib",
  "../rxrs_util",
  "../rxrs_custom_rec_lib",
  "N/ui/message",
  "N/cache",
  "N/file",
  "N/record",
  "N/redirect",
  "N/runtime",
], /**
 * @param{serverWidget} serverWidget
 * @param rxrs_sl_module
 * @param rxrs_tran_lib
 * @param rxrs_vb_lib
 * @param rxrs_util
 * @param rxrs_custom_rec
 * @param cache
 * @param file
 * @param record
 * @param redirect
 */ (
  serverWidget,
  rxrs_sl_module,
  rxrs_tran_lib,
  rxrs_vb_lib,
  rxrs_util,
  rxrs_custom_rec,
  message,
  cache,
  file,
  record,
  redirect,
  runtime,
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

    log.debug("params", params);
    if (context.request.method === "GET") {
      try {
        let form = displayForms(params);
        context.response.writePage(form);
      } catch (e) {
        log.error("GET", e.message);
      }
    } else {
      try {
        const ids = JSON.parse(params.cmIds);
        ids.forEach((id) => {
          record.submitFields({
            type: "customrecord_creditmemo",
            id: id,
            values: {
              custrecord_not_reconciled: true,
            },
          });
        });
        context.response.writeLine("Updating...");
      } catch (e) {
        log.error("POST", e.message);
      }
    }
  };

  /**
   * Creates a form, creates header fields, and then creates a sublist of
   * @param {object}params - parameters
   * @returns {object} form object is being returned.
   */
  function displayForms(params) {
    try {
      log.debug("objClientParams", params);
      let form = serverWidget.createForm({
        title: "Credit Memo",
        hideNavBar: true,
      });
      form.clientScriptFileId = rxrs_util.getFileId(
        "rxrs_cs_credit_memo_sl.js",
      );
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

    let { invId } = options.params;
    options.params.isReload = true;

    log.debug("createHeaderFields", options.params);

    try {
      let htmlFileId = rxrs_sl_module.getFileId("SL_loading_html.html"); // HTML file for loading animation
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

      let numOfRes = " ";

      let cmInfos = rxrs_custom_rec.getCMInfos(invId);
      if (cmInfos) {
        numOfRes = cmInfos.length ? cmInfos.length : 0;
      }
      log.emergency("SO Line", cmInfos);
      let sublistFields = rxrs_sl_module.VIEWCREDITMEMOSUBLIST;
      rxrs_sl_module.createSublist({
        form: form,
        sublistFields: sublistFields,
        value: cmInfos,
        clientScriptAdded: true,
        title: `Credit memo: ${numOfRes}`,
      });
      // let createCMParam = {
      //   invId: invId,
      //   isEdit: isEdit,
      //   previousParam: options.params,
      // };
      form.addButton({
        id: "custpage_save",
        label: "Save",
        functionName: `updateCM()`,
      });

      return form;
    } catch (e) {
      log.error("createHeaderFields", e.message);
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

  return { onRequest };
});
