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
  "N/cache",
  "N/file",
  "N/record",
  "N/redirect",
  "N/task",
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
  cache,
  file,
  record,
  redirect,
  task,
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
    let form = displayForms(params);
    if (context.request.method === "GET") {
      try {
        context.response.writePage(form);
      } catch (e) {
        log.error("GET", e.message);
      }
    } else {
      try {
        let link;
        let response;
        let invoiceId = params.custpage_invoice_id;

        const uploadedFile = context.request.files.custpage_file_upload;
        log.emergency("Params", uploadedFile);
        const newFile = file.create({
          name: invoiceId + "_" + uploadedFile.name,
          fileType: file.Type.PLAINTEXT, // Default file type, adjust as necessary
          contents: uploadedFile.getContents(),
          description: "Uploaded via Suitelet",
          folder: 7293, // Optional: Specify a folder ID for the File Cabinet (if desired)
        });

        // Save the file to the File Cabinet
        const fileId = newFile.save();
        if (fileId) {
          const mrTask = task.create({
            taskType: task.TaskType.MAP_REDUCE,
            scriptId: "customscript_rxrs_mr_create_credit_memo",
            deploymentId: "customdeploy_rxrs_mr_create_credit_memo",
            params: {
              custscript_cm_file: fileId,
            },
          });
          const mrTaskId = mrTask.submit();
          const mrTaskStatus = task.checkStatus({
            taskId: mrTaskId,
          });
          log.debug("MR STATUS" + mrTaskStatus);
          link = `<a href ="https://6816904-sb1.app.netsuite.com/app/common/scripting/mapreducescriptstatus.nl?sortcol=dcreated&sortdir=DESC&date=TODAY&datefrom=12/17/2024&dateto=12/17/2024&scripttype=1393&primarykey=3088">Status Page</a>`;
        }

        context.response.writeLine(`<h1>View Status ${link}</h1>`);
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
        title: "Upload Credit Memo",
        hideNavBar: true,
      });
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

    // let { invId, type, tranId, total, isEdit, creditMemoId, isGovernment } =
    //   options.params;
    // options.params.isReload = true;

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
      // let cmParentInfo;

      const fileUpload = form.addField({
        id: "custpage_file_upload",
        label: "File Upload",
        type: serverWidget.FieldType.FILE,
      });

      form.clientScriptFileId = rxrs_util.getFileId(
        "rxrs_cs_credit_memo_sl.js",
      );

      form.addSubmitButton({
        label: "Upload File",
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
