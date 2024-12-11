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

    let { invId, type, tranId, total, isEdit, creditMemoId, isGovernment } =
      options.params;
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
      let cmParentInfo;

      if (JSON.parse(isEdit) == false) {
        const creditMemoNumberField = form.addField({
          id: "custpage_credit_memo_number",
          label: "Credit Memo Number",
          type: serverWidget.FieldType.TEXT,
        });
      } else {
        const creditMemoNumberField = form.addField({
          id: "custpage_credit_memo",
          label: "Credit Memo",
          type: serverWidget.FieldType.SELECT,
        });

        const cmIds = rxrs_custom_rec.getAllCM(invId);
        log.emergency("cmIds", cmIds);
        let cmInternalIds = [];
        if (cmIds.length > 0) {
          creditMemoNumberField.addSelectOption({
            value: " ",
            text: " ",
          });

          for (let i = 0; i < cmIds.length; i++) {
            cmInternalIds.push(cmIds[i].value);
            if (!isEmpty(creditMemoId) && cmIds[i].value == creditMemoId) {
              creditMemoNumberField.addSelectOption({
                value: cmIds[i].value,
                text: cmIds[i].text,
                isSelected: true,
              });
            } else {
              creditMemoNumberField.addSelectOption({
                value: cmIds[i].value,
                text: cmIds[i].text,
              });
            }
          }
        }
      }
      if (JSON.parse(isGovernment) == true) {
        const governmentField = (form.addField({
          id: "custpage_is_government",
          label: "Government",
          type: serverWidget.FieldType.CHECKBOX,
        }).defaultValue = "T");
      }
      const packingSlipTotalField = form
        .addField({
          id: "custpage_packing_slip_total",
          label: "Packing Slip Total",
          type: serverWidget.FieldType.CURRENCY,
        })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.INLINE,
        });
      packingSlipTotalField.defaultValue = total ? total : 0;
      const serviceFeeField = form.addField({
        id: "custpage_service_fee",
        label: "Service Fee (%)",
        type: serverWidget.FieldType.PERCENT,
      });

      const fileUpload = form.addField({
        id: "custpage_file_upload",
        label: "File Upload",
        type: serverWidget.FieldType.FILE,
      });

      const issuedOnField = form.addField({
        id: "custpage_issued_on",
        label: "Issued On",
        type: serverWidget.FieldType.DATE,
      });

      issuedOnField.isMandatory = true;
      const amountField = form
        .addField({
          id: "custpage_amount",
          label: "Credit Memo Amount",
          type: serverWidget.FieldType.CURRENCY,
        })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.INLINE,
        });
      const customAmountField = form.addField({
        id: "custpage_custom_amount",
        label: "Custom Amount",
        type: serverWidget.FieldType.CURRENCY,
      });

      form.clientScriptFileId = rxrs_util.getFileId(
        "rxrs_cs_credit_memo_sl.js",
      );

      const invoiceId = (form
        .addField({
          id: "custpage_invoice_id",
          label: "Invoice Internal Id",
          type: serverWidget.FieldType.TEXT,
        })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.HIDDEN,
        }).defaultValue = invId);
      if (creditMemoId) {
        cmParentInfo = rxrs_custom_rec.getCMParentInfo(creditMemoId);
        if (cmParentInfo.dateIssued) {
          issuedOnField.defaultValue = cmParentInfo.dateIssued;
        }
        if (cmParentInfo.serviceFee) {
          serviceFeeField.defaultValue = cmParentInfo.serviceFee;
        }
        const deleteParams = {
          invId: invId,
          creditMemoId: creditMemoId,
        };
        if (rxrs_tran_lib.checkExistingPaymentInfo(creditMemoId) == false) {
          form.addButton({
            id: "custpage_delete",
            label: "Delete",
            functionName: `deleteCreditMemo(${JSON.stringify(deleteParams)})`,
          });
        }
      }
      let numOfRes = " ";

      let soLine = rxrs_tran_lib.getSalesTransactionLine({
        type: type,
        id: invId,
        isEdit: isEdit,
        creditMemoId: creditMemoId,
      });
      if (soLine) {
        numOfRes = soLine.length ? soLine.length : 0;
      }
      log.emergency("SO Line", soLine);
      let sublistFields = rxrs_sl_module.ADDCREDITMEMOSUBLIST;
      rxrs_sl_module.createSublist({
        form: form,
        sublistFields: sublistFields,
        value: soLine,
        clientScriptAdded: true,
        title: `Item: ${numOfRes}`,
      });
      let createCMParam = {
        invId: invId,
        isEdit: isEdit,
        previousParam: options.params,
      };
      form.addButton({
        id: "custpage_save",
        label: "Save",
        functionName: `createCreditMemo(${JSON.stringify(createCMParam)})`,
      });
      form.addButton({
        id: "custpage_upload_file",
        label: "Upload File",
        functionName: `uploadFile()`,
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
