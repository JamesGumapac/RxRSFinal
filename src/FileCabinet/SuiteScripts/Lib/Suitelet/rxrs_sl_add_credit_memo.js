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
  message,
  cache,
  file,
  record,
  redirect,
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
        let response;
        let invoiceId = params.custpage_invoice_id;

        const uploadedFile = context.request.files.custpage_file_upload;
        log.emergency("Params", uploadedFile);
        const newFile = file.create({
          name: invoiceId + "_" + uploadedFile.name,
          fileType: file.Type.PLAINTEXT, // Default file type, adjust as necessary
          contents: uploadedFile.getContents(),
          description: "Uploaded via Suitelet",
          folder: runtime.getCurrentScript().getParameter({
            name: "custscript_cm_file_id",
          }), // Optional: Specify a folder ID for the File Cabinet (if desired)
        });

        // Save the file to the File Cabinet
        const fileId = newFile.save();
        if (fileId) {
          record.submitFields({
            type: record.Type.INVOICE,
            id: invoiceId,
            values: {
              custbody_credit_memo_file: fileId,
            },
          });
          const cmFile = file.load({
            id: fileId,
          });

          response = rxrs_custom_rec.createCreditMemoUpload({
            requestBody: JSON.parse({
              requestBody: cmFile.getContents(),
              fileId: fileId,
            }),
          });
          log.audit("Response", response);
        }

        context.response.write(response.response);
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

    let {
      invId,
      type,
      tranId,
      total,
      isEdit,
      creditMemoId,
      isTopCo,
      isGovernment,
      dateCreated,
      showAccount,
      manufacturer,
      remitTo,
      action,
      status,
      closed,
      assignee,
    } = options.params;
    options.params.isReload = true;
    let creditMemoFGText = JSON.parse(isEdit) == false ? "ADD" : "EDIT";
    log.debug("createHeaderFields", options.params);

    try {
      if (action) {
        initiateAction({
          action: action,
          params: { invId: invId, creditMemoId: creditMemoId },
        });
      }
      const debitMemoSummary = form.addFieldGroup({
        label: `<span style="position: absolute; left: 30px;">
    <b style="color: #ff3333">DEBIT MEMO SUMMARY</b>  </span>
   <span style="position: absolute; right: 20px;"> <b style="color: #ff3333;">STATUS: </b> 
    <b>${status}</b>
</span>`, //`<b style="color: #ff3333">DEBIT MEMO SUMMARY</b> <b style="color: #ff3333">STATUS: </b> <b>${status}</b>   `,
        id: "custpage_debitmemo",
      });
      const debitMemoNumberField = form
        .addField({
          id: "custpage_debitmemonumber",
          label: "Debit Memo Number",
          type: serverWidget.FieldType.TEXT,
          container: "custpage_debitmemo",
        })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.INLINE,
        });
      const invLink = rxrs_util.generateRedirectLink({
        type: "invoice",
        id: invId,
      });
      debitMemoNumberField.defaultValue = ` <a href="${invLink}" style="color: blue;" > ${tranId} </a>`;
      const dateCreatedField = (form
        .addField({
          id: "custpage_datecreated",
          label: "Date Created",
          type: serverWidget.FieldType.DATE,
          container: "custpage_debitmemo",
        })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.INLINE,
        }).defaultValue = new Date(dateCreated));

      const assignedToField = form.addField({
        id: "custpage_assignee",
        label: "Assigned To",
        type: serverWidget.FieldType.SELECT,
        source: "employee",
        container: "custpage_debitmemo",
      });
      if (assignee) {
        assignedToField.defaultValue = assignee;
      }

      const manufField = (form
        .addField({
          id: "custpage_manufacturer",
          label: "Manufacturer",
          type: serverWidget.FieldType.SELECT,
          source: "customer",
          container: "custpage_debitmemo",
        })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.INLINE,
        }).defaultValue = manufacturer);
      const remmitToField = form
        .addField({
          id: "custpage_remit_to",
          label: "Issue Credits To",
          type: serverWidget.FieldType.SELECT,
          source: "customer",
          container: "custpage_debitmemo",
        })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.INLINE,
        });
      if (remitTo) {
        remmitToField.defaultValue = remitTo;
      }
      const isClosedField = form
        .addField({
          id: "custpage_isclosed",
          label: "Closed",
          type: serverWidget.FieldType.CHECKBOX,
          container: "custpage_debitmemo",
        })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.INLINE,
        });
      if (closed) {
        isClosedField.defaultValue = closed;
      }
      const showAccountField = form.addField({
        id: "custpage_show_account",
        label: "Show Account",
        type: serverWidget.FieldType.CHECKBOX,
        container: "custpage_debitmemo",
      });
      showAccountField.defaultValue = showAccount == "true" ? "T" : "F";

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
      const creditMemos = form.addFieldGroup({
        label: `<b style="color: #ff3333">${creditMemoFGText} CREDIT MEMO</b>`,
        id: "custpage_creditmemos",
      });
      if (JSON.parse(isEdit) == false) {
        const creditMemoNumberField = (form.addField({
          id: "custpage_credit_memo_number",
          label: "Credit Memo Number",
          type: serverWidget.FieldType.TEXT,
          container: "custpage_creditmemos",
        }).isMandatory = true);
        form.addFieldGroup({
          label: `<b style="color: #ff3333">CREDIT MEMO SUMMARY</b>`,
          id: "custpage_cm_summary",
        });
        let cmTable = createCMTABLE({
          invId: invId,
          initialParams: options.params,
        });
        if (cmTable !== "") {
          const cmTableField = form
            .addField({
              id: "custpage_cmtable",
              type: serverWidget.FieldType.INLINEHTML,
              label: "Dialog HTML Field",
              container: "custpage_cm_summary",
            })
            .updateBreakType({
              breakType: serverWidget.FieldBreakType.STARTROW,
            });
          cmTableField.defaultValue = cmTable;
        }
      } else {
        const creditMemoNumberField = form.addField({
          id: "custpage_credit_memo",
          label: "Credit Memo",
          type: serverWidget.FieldType.SELECT,
          container: "custpage_creditmemos",
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
          container: "custpage_creditmemos",
        }).defaultValue = "T");
      }
      if (JSON.parse(isTopCo) == true) {
        const isTopCoField = (form.addField({
          id: "custpage_is_topco",
          label: "Top Co",
          type: serverWidget.FieldType.CHECKBOX,
          container: "custpage_creditmemos",
        }).defaultValue = "T");
      }
      const packingSlipTotalField = form
        .addField({
          id: "custpage_packing_slip_total",
          label: "Packing Slip Total",
          type: serverWidget.FieldType.CURRENCY,
          container: "custpage_creditmemos",
        })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.INLINE,
        });
      packingSlipTotalField.defaultValue = total ? total : 0;
      const serviceFeeField = form.addField({
        id: "custpage_service_fee",
        label: "Service Fee (%)",
        type: serverWidget.FieldType.PERCENT,
        container: "custpage_creditmemos",
      });

      const fileUpload = form.addField({
        id: "custpage_file_upload",
        label: " ",
        type: serverWidget.FieldType.FILE,
      });

      const issuedOnField = form.addField({
        id: "custpage_issued_on",
        label: "Issued On",
        type: serverWidget.FieldType.DATE,
        container: "custpage_creditmemos",
      });

      const amountField = form
        .addField({
          id: "custpage_amount",
          label: "Credit Memo Amount",
          type: serverWidget.FieldType.CURRENCY,
          container: "custpage_creditmemos",
        })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.NORMAL,
        });
      const customAmountField = form.addField({
        id: "custpage_custom_amount",
        label: "Custom Amount",
        type: serverWidget.FieldType.CURRENCY,
        container: "custpage_creditmemos",
      });

      form.clientScriptFileId = rxrs_util.getFileId(
        "rxrs_cs_credit_memo_sl.js",
      );

      const invoiceId = (form
        .addField({
          id: "custpage_invoice_id",
          label: "Invoice Internal Id",
          type: serverWidget.FieldType.TEXT,
          container: "custpage_creditmemos",
        })
        .updateDisplayType({
          displayType: serverWidget.FieldDisplayType.HIDDEN,
        }).defaultValue = invId);
      if (creditMemoId) {
        try {
          cmParentInfo = rxrs_custom_rec.getCMParentInfo(creditMemoId);

          if (cmParentInfo.dateIssued) {
            issuedOnField.defaultValue = new Date(cmParentInfo.dateIssued);
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
        } catch (e) {
          log.error("Setting Parent CM Values", e.message);
        }
      } else {
        issuedOnField.isMandatory = true;
      }
      let numOfRes = " ";
      let values;
      let soLine = rxrs_tran_lib.getSalesTransactionLine({
        type: type,
        id: invId,
        isEdit: isEdit,
        creditMemoId: creditMemoId,
      });

      if (showAccount == "true") {
        values = groupByReturnRequest(soLine);
      } else {
        values = soLine;
      }
      log.audit("values", values);
      if (values) {
        numOfRes = values.length ? values.length : 0;
      }

      rxrs_sl_module.createSublist({
        form: form,
        sublistFields: rxrs_sl_module.ADDCREDITMEMOSUBLIST,
        value: values,
        clientScriptAdded: true,
        title: `PRODUCTS: ${numOfRes}`,
      });
      const createCMParam = {
        invId: invId,
        isEdit: isEdit,
        previousParam: options.params,
      };
      form.addButton({
        id: "custpage_save",
        label: "Save",
        functionName: `createCreditMemo(${JSON.stringify(createCMParam)})`,
      });

      form.addSubmitButton({
        label: "Upload File",
      });

      return form;
    } catch (e) {
      log.error("createHeaderFields", e.message);
    }
  };

  /**
   * Groups the given data by return request, keeping HTML tags.
   *
   * @param {Array} data - Array of data items to be grouped.
   * @return {Array} - Grouped data in an array format.
   */
  function groupByReturnRequest(data) {
    const grouped = {};

    // Group by returnRequest (keeping HTML tags)
    data.forEach((item) => {
      const returnRequest = item.returnRequest.trim(); // Keep HTML tags
      if (!grouped[returnRequest]) {
        grouped[returnRequest] = {
          header: {
            lineUniqueKey: "INVALID",
            itemId: "",
            item: item.pharmacy,
            description: returnRequest,
            lotNumber: "",
            expDate: "",
            fullPartial: "",
            packageSize: "",
            quantity: "",
            partialQuantity: "",
            rate: "",
            amount: "",
            creditMemoReference: "",
            creditMemoParent: "",
            pharmacy: "",
          },
          items: [],
        };
      }
      // Keep creditMemoReference and creditMemoParent
      grouped[returnRequest].items.push(item);
    });

    // Flatten the grouped object into an array
    return Object.values(grouped).flatMap((group) => [
      group.header,
      ...group.items,
    ]);
  }

  /**
   * Creates a table displaying credit memos and payment information based on the provided options.
   *
   * @param {Object} options - The options object containing invId and initialParams.
   * @param {string} options.invId - The invoice ID to retrieve credit memo information.
   * @param {Object} options.initialParams - The initial parameters for rendering the table.
   * @return {string} The HTML string representing the credit memos and payment information table.
   */
  function createCMTABLE(options) {
    try {
      const { invId, initialParams } = options;
      const data = rxrs_custom_rec.getCMInfos(invId);
      let editParams = initialParams;
      log.audit("createCMTABLE data", data);
      const paymentInfo = [];
      let paymentTableHTML = "";

      if (data.length == 0) {
        return "";
      }
      let paymentDataHtml = "";
      let htmlStr = "",
        innerHTML = "";

      data.forEach((item) => {
        let deleteCMSuiteletUrl = "",
          viewCMLink = "";
        let existingPaymentInfo = rxrs_tran_lib.checkExistingPayment({
          invId: invId,
          cmId: item.id,
        });
        paymentInfo.push(existingPaymentInfo);
        log.audit("ExistingPayment Info", existingPaymentInfo);
        editParams.creditMemoId = item.id;
        editParams.isReload = false;
        editParams.isEdit = true;
        viewCMLink = url.resolveScript({
          scriptId: "customscript_sl_add_credit_memo",
          deploymentId: "customdeploy_sl_add_credit_memo",
          params: editParams,
        });
        log.audit("viewLink", { viewCMLink, initialParams });
        if (rxrs_tran_lib.checkExistingPaymentInfo(item.id) == false) {
          initialParams.isEdit = false;
          initialParams.action = "deleteCreditMemo";
          initialParams.isReload = true;
          deleteCMSuiteletUrl = url.resolveScript({
            scriptId: "customscript_sl_add_credit_memo",
            deploymentId: "customdeploy_sl_add_credit_memo",
            params: initialParams,
          });
        }

        innerHTML += `<tr>`;
        innerHTML += `
                    <td style='border: 1px solid #ccc; padding: 8px;'>${item.cmNumber}</td>
                    <td style='border: 1px solid #ccc; padding: 8px;'>${item.issuedOn}</td>
                    <td style='border: 1px solid #ccc; padding: 8px;'>${item.createdOn}</td>
                    <td  style='border: 1px solid #ccc; padding: 8px;'>${item.createdBy}</td>
                 <td id="notReconciled" style='border: 1px solid #ccc; padding: 8px;'>
    <input type='checkbox' id="custpage_checkbox" ${item.notReconciled == "T" ? "checked" : ""}></td>

                    <td style='border: 1px solid #ccc; padding: 8px;'>$${item.amount}</td>
                     <td id="cmId" style='border: 1px solid #ccc; padding: 8px;display: none;'>${item.id}</td>
                      <td style='border: 1px solid #ccc; padding: 8px;'>
                        <a href='${viewCMLink}' style='margin-right: 10px; text-decoration: none; color: blue;'>Edit</a>|   
     <a href="${deleteCMSuiteletUrl}" class="confirm-link" style='margin-right: 10px; text-decoration: none; color: blue;'>Delete</a>
                    </td>
                `;
        innerHTML += `</tr>`;
      });
      if (paymentInfo.length > 0) {
        paymentInfo.forEach((data) => {
          paymentDataHtml += `<tr>`;
          paymentDataHtml += `
            <td style="border: 1px solid #ddd; padding: 8px;">$${data.amount}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${data.date}</td>
          <td style="border: 1px solid #ddd; padding: 8px;">
    <a href="/app/accounting/transactions/custom.nl?id=${data.id}&e=T&customtype=107&whence=" style="color: orange; text-decoration: none; cursor: pointer;">
        ✏️ Edit
    </a>
    
</td>`;
          paymentDataHtml += ` </tr>`;
        });
        paymentTableHTML = `</div>

        <div style="padding: 15px; border-radius: 5px; background: #fff; flex: 1;">
          <h2 style="color: darkred; margin-bottom: 10px;">PAYMENT INFO</h2>
          <table style="width: 200%; border-collapse: collapse; margin-top: 10px;right:1000px">
            <thead>
            <tr>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #eee;">Payment Amount</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #eee;">Date Payment Received</th>
              <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #eee;">Actions</th>
            </tr>
            </thead>
            <tbody>

            ${paymentDataHtml}
            </tbody>
          </table>
        </div>`;
      }
      htmlStr = `
<div style="display: flex; gap: 300px;">
 <!-- Credit Memos Section -->
    <div style="padding: 15px; border-radius: 5px; margin-right: 3000px%; background: #fff; flex: 2;">
      <h2 style="color: darkred; margin-bottom: 10px;">CREDIT MEMOS</h2>
          <table style="width: 150%; border-collapse: collapse; float: left;">
          
              <thead>
                  <tr>
                      <th style="border: 1px solid #ccc; padding: 8px; text-align: left; background-color: #f4f4f4;">Credit Memo Number</th>
                      <th style="border: 1px solid #ccc; padding: 8px; text-align: left; background-color: #f4f4f4;">Issued On</th>
                      <th style="border: 1px solid #ccc; padding: 8px; text-align: left; background-color: #f4f4f4;">Created On</th>
                      <th style="border: 1px solid #ccc; padding: 8px; text-align: left; background-color: #f4f4f4;">Created By</th>
                      <th style="border: 1px solid #ccc; padding: 8px; text-align: left; background-color: #f4f4f4;">Not Reconciled</th>
                      <th style="border: 1px solid #ccc; padding: 8px; text-align: left; background-color: #f4f4f4;">Amount</th>
                       <th style="border: 1px solid #ccc; padding: 8px; text-align: left; background-color: #f4f4f4;display: none;">ID</th>
                           <th style="border: 1px solid #ccc; padding: 8px; text-align: left; background-color: #f4f4f4;">Action</th>
                     
                  </tr>
              </thead>
              <tbody>
               
                ${innerHTML}
              </tbody>
          </table>
            <div style="margin-top: 50px;">
    <button id="updateCMIds" style="
         display: none; /* Initially hidden */
        background-color: #007bff;
        color: white;
        border: none;
        padding: 5px 10px;
        font-size: 13px;
        font-weight: bold;
        cursor: pointer;
        border-radius: 5px;
        transition: background-color 0.3s ease, transform 0.1s ease;
        box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.2);
        
        text-align: center;"
        onmouseover="this.style.backgroundColor='#0056b3';"
        onmouseout="this.style.backgroundColor='#007bff';"
        onmousedown="this.style.transform='scale(0.98)';"
        onmouseup="this.style.transform='scale(1)';">
        Save Changes
    </button>
</div>
      
${paymentTableHTML}
`;
      return htmlStr;
    } catch (e) {
      log.error("createCMTABLE", e.message);
    }
  }

  function initiateAction(options) {
    log.audit("initiateAction", options);
    const { action, params } = options;
    log.audit("initiateAction", params);
    switch (action) {
      case "deleteCreditMemo":
        const deleteResult = rxrs_custom_rec.deleteCreditMemo(
          JSON.stringify(params),
        );
        log.audit("deleteResult", deleteResult);
    }
  }

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
