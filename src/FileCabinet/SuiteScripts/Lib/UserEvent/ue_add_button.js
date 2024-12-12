/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
  "N/record",
  "N/search",
  "N/url",
  "../rxrs_util",
  "N/ui/serverWidget",
  "N/file",
  "../rxrs_transaction_lib",
  "../rxrs_custom_rec_lib",
], /**
 * @param{record} record
 * @param{search} search
 * @param{url} url
 * @param rxrs_util
 * @param serverWidget
 * @param file
 * @param tranlib
 */ (
  record,
  search,
  url,
  rxrs_util,
  serverWidget,
  file,
  tranlib,
  rxrs_cust_rec_lib,
) => {
  /**
   * Defines the function definition that is executed before record is loaded.
   * @param {Object} context
   * @param {Record} context.newRecord - New record
   * @param {string} context.type - Trigger type; use values from the context.UserEventType enum
   * @param {Form} context.form - Current form
   * @param {ServletRequest} context.request - HTTP request information sent from the browser for a client action only.
   * @since 2015.2
   */
  const beforeLoad = (context) => {
    const rec = context.newRecord;
    const id = rec.id;
    let poId;
    try {
      context.form.clientScriptFileId = rxrs_util.getFileId("rxrs_cs_rr.js");
      let htmlFileId = rxrs_util.getFileId("SL_loading_html.html"); // HTML file for loading animation
      if (htmlFileId) {
        const dialogHtmlField = context.form.addField({
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
      if (context.type == "view") {
        switch (rec.type) {
          case "customsale_kod_returnrequest":
            const rrId = rec.getValue("tranid");

            const rrMrrId = rec.getValue("custbody_kd_master_return_id");
            const DEA222Fees = rec.getValue("custbody_kd_total_222_form_fee");
            const rrSaleStatus = rec.getValue("transtatus");
            let forVerificationSLUrl = url.resolveScript({
              scriptId: "customscript_sl_returnable_page",
              deploymentId: "customdeploy_sl_returnable_page",
              returnExternalUrl: false,
              params: {
                selectionType: "Returnable",
                rrId: id,
                tranId: rrId,
                mrrId: rrMrrId,
                rrType: rec.type,
                category: rec.getValue("custbody_kd_rr_category"),
              },
            });
            let paramsRR = {
              url: forVerificationSLUrl,
              action: "verifyItems",
            };
            if (rrSaleStatus == rxrs_util.rrStatus.PendingVerification) {
              context.form.addButton({
                id: "custpage_verify",
                label: "Verify Items",
                functionName: `openSuitelet(${JSON.stringify(paramsRR)})`,
              });
              let approveParams = {
                rrId: id,
                mrrId: rrMrrId,
                action: "createInventoryAdjustment",
              };

              context.form.addButton({
                id: "custpage_approve",
                label: "Approve",
                functionName: `createTransaction(${JSON.stringify(
                  approveParams,
                )})`,
              });
            }
            if (rrSaleStatus == rxrs_util.rrStatus.C2Kittobemailed) {
              let generateLabelURL = url.resolveScript({
                scriptId: "customscript_rxrs_sl_generate_label",
                deploymentId: "customdeploy_rxrs_sl_generate_label",
                returnExternalUrl: false,
                params: {
                  rrId: rrId,
                  action: "createLabelC2",
                  customerId: rec.getValue("entity"),
                  mrrId: rec.getValue("custbody_kd_master_return_id"),
                },
              });
              let mmrParamsGenerateLabel = {
                url: generateLabelURL,
              };

              //Customer Submitted
              context.form.addButton({
                id: "custpage_generate_label",
                label: "Add Label",
                functionName: `openSuitelet(${JSON.stringify(
                  mmrParamsGenerateLabel,
                )})`,
              });
              const form222ForReprinting =
                rxrs_cust_rec_lib.getReturnRequestForReprinting222Form(rec.id);
              log.audit("form222ForReprinting", form222ForReprinting);
              if (form222ForReprinting.length > 0) {
                context.form.addButton({
                  id: "custpage_reprint_222_form",
                  label: "Generate 222 Form PDF",
                  functionName: `generate222Form(${JSON.stringify(form222ForReprinting)})`,
                });
              }
            }
            break;
          case "custompurchase_returnrequestpo":
            const rrpoId = rec.id;
            const rrPOStatus = rec.getValue("transtatus");
            const rrpoMrrId = rec.getValue("custbody_kd_master_return_id");
            const customer = rec.getValue("entity");
            const DEA222Feespo = rec.getValue("custbody_kd_total_222_form_fee");
            const rrpoCategory = rec.getValue("custbody_kd_rr_category");
            if (rrPOStatus == rxrs_util.rrStatus.C2Kittobemailed) {
              const returnItemRequestedURL = `https://6816904.app.netsuite.com/app/common/custom/custrecordentry.nl?rectype=393&whence=&mrrId=${rrpoMrrId}&rrId=${rrpoId}`;

              context.form.addButton({
                id: "custpage_create_rir",
                label: "Create Item Requested",
                functionName: `openSuitelet(${JSON.stringify({
                  url: returnItemRequestedURL,
                })})`,
              });

              let generateLabelURL = url.resolveScript({
                scriptId: "customscript_rxrs_sl_generate_label",
                deploymentId: "customdeploy_rxrs_sl_generate_label",
                returnExternalUrl: false,
                params: {
                  rrId: rrpoId,
                  action: "createLabelC2",
                  customerId: rec.getValue("entity"),
                  mrrId: rec.getValue("custbody_kd_master_return_id"),
                },
              });
              let mmrParamsGenerateLabel = {
                url: generateLabelURL,
              };

              //Customer Submitted
              context.form.addButton({
                id: "custpage_generate_label",
                label: "Add Label",
                functionName: `openSuitelet(${JSON.stringify(
                  mmrParamsGenerateLabel,
                )})`,
              });
              /**
               * Print 222 Form
               */
              const form222ForReprinting =
                rxrs_cust_rec_lib.getReturnRequestForReprinting222Form(rec.id);
              log.audit("form222ForReprinting", form222ForReprinting);
              if (form222ForReprinting.length > 0) {
                context.form.addButton({
                  id: "custpage_reprint_222_form",
                  label: "Generate 222 Form PDF",
                  functionName: `generate222Form(${JSON.stringify(form222ForReprinting)})`,
                });
              }
            }
            let forVerificationSLUrlPO = url.resolveScript({
              scriptId: "customscript_sl_returnable_page",
              deploymentId: "customdeploy_sl_returnable_page",
              returnExternalUrl: false,
              params: {
                selectionType: "Returnable",
                rrId: id,
                tranId: rrpoId,
                mrrId: rrpoMrrId,
                rrType: rec.type,
                category: rec.getValue("custbody_kd_rr_category"),
              },
            });
            let paramsRRPO = {
              url: forVerificationSLUrlPO,
              action: "verifyItems",
            };
            if (rrPOStatus == rxrs_util.rrStatus.PendingVerification) {
              context.form.addButton({
                id: "custpage_verify",
                label: "Verify Items",
                functionName: `openSuitelet(${JSON.stringify(paramsRRPO)})`,
              });
            }

            let approveParams = {
              mrrId: rrpoMrrId,
              rrId: rrpoId,
              entity: customer,
              planSelectionType: rec.getValue("custbody_plan_type"),
              action: "createPO",
            };

            poId = tranlib.checkIfTransAlreadyExist({
              mrrId: rrpoMrrId,
              searchType: "PurchOrd",
            });
            log.debug("POID", poId);
            let poRec;
            if (poId) {
              poRec = record.load({
                type: record.Type.PURCHASE_ORDER,
                id: poId,
                isDynamic: true,
              });
              let returnRequestValues = poRec.getValue(
                "custbody_kd_return_request2",
              );
              log.debug(
                "poId",
                returnRequestValues.indexOf(JSON.stringify(rrpoId)),
              );
              if (returnRequestValues.indexOf(JSON.stringify(rrpoId)) === -1) {
                context.form.addButton({
                  id: "custpage_approve",
                  label: "Approve",
                  functionName: `createTransaction(${JSON.stringify(
                    approveParams,
                  )})`,
                });
              }
            } else {
              log.audit("RRPO else");
              if (rrPOStatus == rxrs_util.rrStatus.PendingVerification) {
                context.form.addButton({
                  id: "custpage_approve",
                  label: "Approve",
                  functionName: `createTransaction(${JSON.stringify(
                    approveParams,
                  )})`,
                });
              }
            }

            break;
          case "invoice":
            if (context.type === "create") return;
            let invRec = context.newRecord;
            const lineCount = invRec.getLineCount("item");
            let itemWithCM = 0;
            const invoiceStatus = invRec.getValue("custbody_invoice_status");
            if (invoiceStatus == 6 || invoiceStatus == 7) return;
            for (let i = 0; i < lineCount; i++) {
              const cmId = invRec.getSublistValue({
                sublistId: "item",
                fieldId: "custcol_credit_memo_reference",
                line: i,
              });
              if (cmId) itemWithCM++;
            }

            log.debug("line count", { itemWithCM, lineCount });
            if (itemWithCM == lineCount || itemWithCM != 0) {
              const cmParams = {
                type: invRec.type,
                invId: invRec.id,
                tranId: invRec.getValue("tranid"),
                total: invRec.getValue("total"),
                isGovernment: invRec.getValue("custbody_plan_type") == 11,
                isEdit: true,
              };
              let addCreditMemoUrl = url.resolveScript({
                scriptId: "customscript_sl_add_credit_memo",
                deploymentId: "customdeploy_sl_add_credit_memo",
                returnExternalUrl: false,
                params: cmParams,
              });
              const invParamsAddCM = {
                action: "add222FormReference",
                url: addCreditMemoUrl,
              };
              context.form.addButton({
                id: "custpage_edit_credit_memo",
                label: "Edit Credit Memo",
                functionName: `openSuitelet(${JSON.stringify(invParamsAddCM)})`,
              });
            }
            if (itemWithCM < lineCount) {
              const cmParams = {
                type: invRec.type,
                invId: invRec.id,
                tranId: invRec.getValue("tranid"),
                total: invRec.getValue("total"),
                isGovernment: invRec.getValue("custbody_plan_type") == 11,
                isEdit: false,
              };
              let addCreditMemoUrl = url.resolveScript({
                scriptId: "customscript_sl_add_credit_memo",
                deploymentId: "customdeploy_sl_add_credit_memo",
                returnExternalUrl: false,
                params: cmParams,
              });
              const invParamsAddCM = {
                action: "add222FormReference",
                url: addCreditMemoUrl,
              };
              context.form.addButton({
                id: "custpage_add_credit_memo",
                label: "Add Credit Memo",
                functionName: `openSuitelet(${JSON.stringify(invParamsAddCM)})`,
              });
            }

            let params = {
              type: invRec.type,
              invoiceId: invRec.id,
              lineCount: lineCount,
            };

            let addPaymentUrl = url.resolveScript({
              scriptId: "customscript_add_payment",
              deploymentId: "customdeploy_add_payment",
              returnExternalUrl: false,
              params: params,
            });
            let invParamsPayment = {
              action: "add222FormReference",
              url: addPaymentUrl,
            };

            context.form.addButton({
              id: "custpage_add_payment",
              label: "Add Payment",
              functionName: `openSuitelet(${JSON.stringify(invParamsPayment)})`,
            });

            break;
          case "salesorder":
            if (context.type === "create") return;

            let soRec = context.newRecord;
            if (
              soRec.getValue("custbody_kd_rr_category") != 3 ||
              soRec.getValue("custbody_orderstatus") != 3
            )
              return;
            let addItem222FormURL = url.resolveScript({
              scriptId: "customscript_rxrs_sl_add_222_form_ref",
              deploymentId: "customdeploy_rxrs_sl_add_222_form_ref",
              returnExternalUrl: false,
              params: {
                type: soRec.type,
                soId: soRec.id,
                tranId: soRec.getValue("tranid"),
              },
            });
            let soParams = {
              action: "add222FormReference",
              url: addItem222FormURL,
            };
            context.form.addButton({
              id: "custpage_add_222_reference",
              label: "Add Item 222 reference",
              functionName: `openSuitelet(${JSON.stringify(soParams)})`,
            });
            let isBilled = tranlib.checkIfTransAlreadyExist({
              mrrId: mrrId,
              searchType: "PurchOrd",
              status: "PurchOrd:G",
            });
            let isPOExist = tranlib.checkIfTransAlreadyExist({
              mrrId: mrrId,
              searchType: "PurchOrd",
            });

            break;
          case "customrecord_return_cover_letter":
            const TOPCO = 10;
            if (context.type === "create") return;
            let mrrId = rec.getValue("custrecord_rcl_master_return");
            let tranId = rec.getText("custrecord_rcl_master_return");
            let entity = rec.getValue("custrecord_rcl_customer");
            const planSelectionType = rec.getValue(
              "custrecord_rcl_plan_selection_type",
            );
            let nonReturnableFeeAmount = 0;
            let returnableFeePercent = 0;
            nonReturnableFeeAmount = rec.getValue(
              "custrecord_rcl_non_returnable_fee_amt",
            );
            returnableFeePercent = rec.getValue(
              "custrecord_rcl_returnable_fee",
            );
            let returnableFee = 100 - parseFloat(returnableFeePercent);
            log.debug("planSelection Type", planSelectionType);
            if (planSelectionType != TOPCO) {
              let rclSuiteletURL = url.resolveScript({
                scriptId: "customscript_sl_return_cover_letter",
                deploymentId: "customdeploy_sl_return_cover_letter",
                returnExternalUrl: false,
                params: {
                  finalPaymentSched: false,
                  mrrId: mrrId,
                  tranId: tranId,
                  isVerifyStaging: false,
                  initialSplitpaymentPage: false,
                  returnableFee: returnableFee,
                  nonReturnableFeeAmount: nonReturnableFeeAmount,
                  title: "In-Dated Inventory",
                },
              });
              let paramSplitPayment = {
                url: rclSuiteletURL,
                action: "splitPayment",
              };

              context.form.addButton({
                id: "custpage_split_payment",
                label: "Split Payment",
                functionName: `openSuitelet(${JSON.stringify(
                  paramSplitPayment,
                )})`,
              });

              let printReturnSummaryURL = url.resolveScript({
                scriptId: "customscript_sl_print_return_summary",
                deploymentId: "customdeploy_sl_print_return_summary",
                returnExternalUrl: false,
                params: {
                  rclId: rec.id,
                },
              });

              let paramPrintReturnSummary = {
                url: printReturnSummaryURL,
              };
              context.form.addButton({
                id: "custpage_print_return_summary",
                label: "Print Return Summary",
                functionName: `openSuitelet(${JSON.stringify(
                  paramPrintReturnSummary,
                )})`,
              });

              /**
               * Create Print Return Cover Letter Button
               */

              let printReturnCoverLetterURL = url.resolveScript({
                scriptId: "customscript_sl_print_return_cover_lette",
                deploymentId: "customdeploy_sl_print_return_cover_lette",
                returnExternalUrl: false,
                params: {
                  rclId: rec.id,
                },
              });
              let paramprintReturnCoverLetter = {
                url: printReturnCoverLetterURL,
              };
              context.form.addButton({
                id: "custpage_print_cover_letter",
                label: "Print Return Cover Letter",
                functionName: `openSuitelet(${JSON.stringify(
                  paramprintReturnCoverLetter,
                )})`,
              });

              /**
               * Create Bill Button
               */

              //Check if the purchase order is fully billed/Closed
              let isBilled = tranlib.checkIfTransAlreadyExist({
                mrrId: mrrId,
                searchType: "PurchOrd",
                status: "PurchOrd:G",
              });
              let isPOExist = tranlib.checkIfTransAlreadyExist({
                mrrId: mrrId,
                searchType: "PurchOrd",
              });
              log.debug("create Bill Button", { isPOExist, isBilled });

              if (isPOExist && !isBilled) {
                let createBillParams = {
                  mrrId: mrrId,
                  rclId: rec.id,
                  poId: isPOExist,
                  returnableFee: returnableFee,
                  action: "createBill",
                };
                context.form.addButton({
                  id: "custpage_create_bill",
                  label: "Bill All Remaining",
                  functionName: `createTransaction(${JSON.stringify(
                    createBillParams,
                  )})`,
                });
              }
            } else {
              if (isPOExist && !isBilled) {
                let createBillParams = {
                  mrrId: mrrId,
                  rclId: rec.id,
                  poId: null,
                  returnableFee: returnableFee,
                  action: "createBill",
                };
                context.form.addButton({
                  id: "custpage_create_bill",
                  label: "Create Bill",
                  functionName: `createTransaction(${JSON.stringify(
                    createBillParams,
                  )})`,
                });
              }
            }
            break;
          /**
           * Master Return Request
           */
          case "customrecord_kod_masterreturn":
            const mrrRec = context.newRecord;
            const MAILIN = 2;
            const serviceType = mrrRec.getValue("custrecord_service_type");
            const playnSelectionType = mrrRec.getValue(
              "custrecord_mrrplanselectiontype",
            );
            const GOVERNMENT = 11;
            const DESTRUCTION = 5;
            let generateLabelURL = url.resolveScript({
              scriptId: "customscript_rxrs_sl_generate_label",
              deploymentId: "customdeploy_rxrs_sl_generate_label",
              returnExternalUrl: false,
              params: {
                mrrId: mrrRec.id,
                action: "createLabel",
                customerId: mrrRec.getValue("custrecord_mrrentity"),
                serviceType: serviceType,
              },
            });
            let mmrParamsGenerateLabel = {
              url: generateLabelURL,
            };
            if (
              mrrRec.getValue("custrecord_kod_mr_status") ==
              rxrs_util.mrrStatus.CustomerSubmitted
            ) {
              //Customer Submitted
              context.form.addButton({
                id: "custpage_generate_label",
                label: "Add Label",
                functionName: `openSuitelet(${JSON.stringify(
                  mmrParamsGenerateLabel,
                )})`,
              });
            }
            if (
              mrrRec.getValue("custrecord_kod_mr_status") ==
                rxrs_util.mrrStatus.New &&
              (serviceType == rxrs_util.SERVICETYPE["REP SERVICE"] ||
                serviceType == rxrs_util.SERVICETYPE["SELF SERVICE"])
              // Rep Service
            ) {
              //Customer Submitted
              context.form.addButton({
                id: "custpage_generate_label",
                label: "Add Label",
                functionName: `openSuitelet(${JSON.stringify(
                  mmrParamsGenerateLabel,
                )})`,
              });
            }
            //  let saveSearchURL = `/app/common/search/searchresults.nl?searchid=967&saverun=T&whence=&CUSTRECORD_IRS_MASTER_RETURN_REQUEST=${mrrRec.id}`;
            let viewEditSuiteletUrl = url.resolveScript({
              scriptId: "customscript_rxrs_sl_view_edit_line",
              deploymentId: "customdeploy_rxrs_sl_view_edit_line",
              returnExternalUrl: false,
              params: {
                paymentSchedText: "RO:" + mrrRec.getValue("name"),
                mrrId: mrrRec.id,
                edit: true,
                paymentSchedId: 12,
                pageTitle: "Approval & Completion",
              },
            });
            let mrrViewEditLineURL = {
              url: viewEditSuiteletUrl,
              action: "fullWindow",
            };
            if (
              playnSelectionType != GOVERNMENT ||
              planSelectionType !== DESTRUCTION
            ) {
              if (
                mrrRec.getValue("custrecord_kod_mr_status") ==
                rxrs_util.mrrStatus.WaitingForApproval
              ) {
                context.form.addButton({
                  id: "custpage_viewedit_line",
                  label: "View Edit Line",
                  functionName: `openSuitelet(${JSON.stringify(
                    mrrViewEditLineURL,
                  )})`,
                });
              }
            }

            break;
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
  const afterSubmit = (scriptContext) => {};

  return { beforeLoad };
});
