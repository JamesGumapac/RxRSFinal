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
  "N/search",
  "N/runtime",
  "N/url",
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
  search,
  runtime,
  url,
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
    const folderId = runtime.getCurrentScript().getParameter({
      name: "custscript_cm_multiple_folder",
    });
    log.debug("params", params);
    params.folderId = folderId;
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
        let invoiceId = params.custpage_invoice_id;

        const uploadedFile = context.request.files.custpage_file_upload;
        log.emergency("Params", uploadedFile);
        const newFile = file.create({
          name: uploadedFile.name,
          fileType: file.Type.PLAINTEXT, // Default file type, adjust as necessary
          contents: uploadedFile.getContents(),
          description: "Uploaded via Suitelet",
          folder: folderId, // Optional: Specify a folder ID for the File Cabinet (if desired)
        });

        // Save the file to the File Cabinet
        const fileId = newFile.save();
        if (fileId) {
          let cmFileUploadId = null;
          cmFileUploadId = rxrs_custom_rec.getCMFileUpload({
            name: uploadedFile.name,
          });
          if (!cmFileUploadId) {
            cmFileUploadId = rxrs_custom_rec.createCMFileUpload({
              name: uploadedFile.name,
              fileId: fileId,
            });
          } else {
            record.submitFields({
              type: "customrecord_credit_memo_upload",
              id: cmFileUploadId,
              values: { custrecord_result: "" },
            });
          }
          log.audit("cmFileUploadId", cmFileUploadId);
          const mrTask = task.create({
            taskType: task.TaskType.MAP_REDUCE,
            scriptId: "customscript_rxrs_mr_create_credit_memo",
            deploymentId: "customdeploy_rxrs_mr_create_credit_memo",
            params: {
              custscript_cm_file: fileId,
              custscript_cm_file_rec: cmFileUploadId,
            },
          });
          const mrTaskId = mrTask.submit();
          const mrTaskStatus = task.checkStatus({
            taskId: mrTaskId,
          });
          log.debug("MR STATUS" + mrTaskStatus);
          link = `<h2><a href ="https://6816904-sb1.app.netsuite.com/app/common/scripting/mapreducescriptstatus.nl?sortcol=dcreated&sortdir=DESC&date=TODAY&scripttype=1393&primarykey=3088">Status Page</a></h2>`;

          let displayParams = {
            fileId: fileId,
            title: "Result",
            folderId: folderId,
            link: link,
            cmFileUploadId: cmFileUploadId,
          };
          let stSuiteletUrl = url.resolveScript({
            scriptId: "customscript_rxrs_sl_upload_credit_memo",
            deploymentId: "customdeploy_rxrs_sl_upload_credit_memo",
            params: displayParams,
          });
          redirect.redirect({ url: stSuiteletUrl });
        }
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
      let title = params.title;
      let form = serverWidget.createForm({
        title: title ? title : "Upload Credit Memo",
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
    let { form, params } = options;

    let { fileId, folderId, link, cmUploadRecId, cmFileUploadId } = params;

    log.debug("createHeaderFields", options.params);

    try {
      form.clientScriptFileId = rxrs_util.getFileId(
        "rxrs_cs_credit_memo_sl.js",
      );
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

      if (fileId) {
        const fileUpload = form.addField({
          id: "custpage_uploaded_file",
          label: "Uploaded File",
          type: serverWidget.FieldType.SELECT,
        });
        fileUpload.addSelectOption({
          value: "",
          text: "-- Select a File --",
          isSelected: true,
        });
        const cmUploadRecField = form
          .addField({
            id: "custpage_cm_upload_id",
            label: "CM Upload Reference",
            source: "customrecord_credit_memo_upload",
            type: serverWidget.FieldType.SELECT,
          })
          .updateDisplayType({
            displayType: serverWidget.FieldDisplayType.INLINE,
          });
        if (cmFileUploadId) {
          cmUploadRecField.defaultValue = cmFileUploadId;
          // let rsLookUp = search.lookupFields({
          //   type: "customrecord_credit_memo_upload",
          //   id: cmFileUploadId,
          //   columns: ["custrecord_result"],
          // });
          // const val = rsLookUp.custrecord_result;
          // if (val) {
          //   rxrs_sl_module.createSublist({
          //     form: form,
          //     sublistFields: rxrs_sl_module.CMUPLOADFIELDS,
          //     value: JSON.parse(val),
          //     title: "Result",
          //   });
          // } else {
          //   form.addButton({
          //     id: "custpage_refresh",
          //     label: "Refresh",
          //     functionName: `refresh()`,
          //   });
          // }
        }
        const fileSearch = search.create({
          type: "file",
          filters: [["folder", "anyof", folderId]],
          columns: [
            search.createColumn({ name: "name", label: "Name" }),
            search.createColumn({ name: "internalid", label: "Internal ID" }),
          ],
        });

        const fileResultSet = fileSearch.run();

        // Add files to the select options
        fileResultSet.each(function (result) {
          const fileId = result.getValue({ name: "internalid" });
          const fileName = result.getValue({ name: "name" });

          fileUpload.addSelectOption({
            value: fileId,
            text: fileName,
          });

          return true; // continue iterating over the results
        });
        fileUpload.defaultValue = fileId;
        if (link) {
          const mrStatusPageField = (form.addField({
            id: "custpage_mr_link",
            type: serverWidget.FieldType.INLINEHTML,
            label: "MR STATUS PAGE",
          }).defaultValue = link);
        }
      } else {
        const fileUpload = form.addField({
          id: "custpage_file_upload",
          label: "File Upload",
          type: serverWidget.FieldType.FILE,
        });
        form.addSubmitButton({
          label: "Upload File",
        });
      }

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
