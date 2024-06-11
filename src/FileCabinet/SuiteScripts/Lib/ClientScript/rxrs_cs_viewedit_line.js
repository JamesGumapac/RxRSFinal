/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([
  "N/runtime",
  "N/url",
  "N/currentRecord",
  "N/ui/message",
  "N/record",
  "N/https",
  "../rxrs_item_lib",
], /**
 * @param{runtime} runtime
 * @param{url} url
 * @param currentRecord
 * @param message
 * @param record
 * @param https
 * @param rxrs_rcl_lib
 * @param tranlib
 */ function (runtime, url, currentRecord, message, record, https, itemlib) {
  let suitelet = null;
  const SUBLIST = "custpage_items_sublist";
  let urlParams;
  let lineTobeUpdated = [];
  let paramsToBeUpdated = [];
  let initialPaymentName;
  const MFGPROCESSINGFIELD = "custpage_mfgprocessing";
  const PHARMAPROCESSINGFIELD = "custpage_pharmaprocessing";
  const CHANGEPHARMAPROCESSINGFIELD = "custpage_change_processing";
  const NOTESFIELD = "custpage_notes";
  const RATEFIELD = "custpage_rate";
  const UPDATEPRODUCTCATALOGFIELD = "custpage_update_product_catalog";
  const NONRETURNABLEREASONFIELD = "custpage_nonreturnable_reason";
  const NONRETURNABLE = 1;
  const RETURNABLE = 2;
  let selectedLine = null;
  const MCONFIGURED = 8;

  /**
   * Function to be executed after page is initialized.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
   *
   * @since 2015.2
   */
  function pageInit(scriptContext) {
    suitelet = scriptContext.currentRecord;
    let arrTemp = window.location.href.split("?");
    urlParams = new URLSearchParams(arrTemp[1]);
    initialPaymentName = suitelet.getValue("custpage_payment_name");
    if (window.location.href.indexOf("isReload") != -1) {
      let isReload = urlParams.get("isReload");
      console.log("isReload" + isReload);
      if (isReload == true || isReload == "true") {
        setTimeout(function () {
          opener.location.reload();
          if (!window.location.hash) {
            //setting window location
            window.location = window.location + "#loaded";
            //using reload() method to reload web page
            window.location.reload();
            window.close();
          }
        }, 100);
      }
    }
    let lineCount = suitelet.getLineCount("custpage_items_sublist");
    for (let i = 0; i < lineCount; i++) {
      const mfgProcessing = suitelet.getSublistValue({
        sublistId: SUBLIST,
        fieldId: MFGPROCESSINGFIELD,
        line: i,
      });
      const rateFieldColumn = suitelet.getSublistField({
        sublistId: SUBLIST,
        fieldId: RATEFIELD,
        line: i,
      });
      rateFieldColumn.isDisabled = true;
      const pharmaProcessing = suitelet.getSublistValue({
        sublistId: SUBLIST,
        fieldId: PHARMAPROCESSINGFIELD,
        line: i,
      });
      const nonRetuurnableReason = suitelet.getSublistField({
        sublistId: SUBLIST,
        fieldId: NONRETURNABLEREASONFIELD,
        line: i,
      });
      nonRetuurnableReason.isDisabled = true;
      let pharmaProcessingField = suitelet.getSublistField({
        sublistId: SUBLIST,
        fieldId: "custpage_change_processing",
        line: i,
      });
      if (pharmaProcessing == "Returnable") {
        pharmaProcessing.isDisabled = false;
      } else if (mfgProcessing == "Returnable") {
        pharmaProcessingField.isDisabled = false;
      } else {
        continue;
      }
      console.table(mfgProcessing, pharmaProcessing);
      if (mfgProcessing == "Returnable" && pharmaProcessing == "Returnable") {
        pharmaProcessingField.isDisabled = false;
      }
      console.log(mfgProcessing);
    }
  }

  window.onload = function () {
    //considering there aren't any hashes in the urls already
  };

  function updateIRS() {
    alert("SavingChanges Test");
    handleButtonClick("Please Wait..");
    let count = 0;
    try {
      let rec = currentRecord.get();
      let paymentSublistCount = rec.getLineCount({
        sublistId: RETURNABLESUBLIST,
      });

      for (let i = 0; i < paymentSublistCount; i++) {
        let setToNonReturnble = rec.getSublistValue({
          sublistId: RETURNABLESUBLIST,
          fieldId: "custpage_settononreturnable",
          line: i,
        });
        if (setToNonReturnble == false) continue;
        count += 1;
        let id = rec.getSublistValue({
          sublistId: SUBLIST,
          fieldId: "custpage_internalid",
          line: i,
        });

        let nonReturnableReason = rec.getSublistValue({
          sublistId: RETURNABLESUBLIST,
          fieldId: "custpage_nonreturnable_reason",
          line: i,
        });

        const amount = rec.getSublistValue({
          sublistId: RETURNABLESUBLIST,
          fieldId: "custpage_amount",
          line: i,
        });
        let values = [
          {
            fieldId: "custrecord_cs_cb_or_non_ret_reason",
            value: true,
          },
          {
            fieldId: "custrecord_scannonreturnreason",
            value: nonReturnableReason,
          },
          { fieldId: "custrecord_cs__rqstprocesing", value: 1 },
          {
            fieldId: "custrecord_irc_total_amount",
            value: amount,
          },
        ];
        let params = {
          action: "updateRecordHeader",
          type: "customrecord_cs_item_ret_scan",
          id: id,
          values: JSON.stringify(values),
        };
        console.table(params);
        let stSuiteletUrl = url.resolveScript({
          scriptId: "customscript_sl_cs_custom_function",
          deploymentId: "customdeploy_sl_cs_custom_function",
          returnExternalUrl: false,
          params: params,
        });
        let response = https.post({
          url: stSuiteletUrl,
        });
      }
    } catch (e) {
      console.error("updateIRS" + e.message);
    }

    setTimeout(function () {
      jQuery("body").loadingModal("destroy");
      window.onbeforeunload = null;
      location.reload();
    }, 5000 + count);
  }

  /**
   * Function to be executed when field is changed.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   * @param {string} scriptContext.fieldId - Field name
   * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
   * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
   *
   * @since 2015.2
   */
  function fieldChanged(scriptContext) {
    console.log(scriptContext.fieldId);
    console.log(scriptContext.sublistId);

    let params = {};
    try {
      if (scriptContext.sublistId === SUBLIST) {
        let line = suitelet.getCurrentSublistIndex({
          sublistId: SUBLIST,
        });
        selectedLine = line;
        console.log("line", lineTobeUpdated.indexOf(line));
        if (
          lineTobeUpdated.indexOf(line) == -1 ||
          lineTobeUpdated.length == 0
        ) {
          lineTobeUpdated.push(line);
          console.table(lineTobeUpdated);
        }
        console.log("selected line:" + lineTobeUpdated);

        switch (scriptContext.fieldId) {
          case CHANGEPHARMAPROCESSINGFIELD:
            const nonReturnableReasonField = suitelet.getSublistField({
              sublistId: SUBLIST,
              fieldId: NONRETURNABLEREASONFIELD,
              line: line,
            });
            const RATEFIELDCOLUMN = suitelet.getSublistField({
              sublistId: SUBLIST,
              fieldId: RATEFIELD,
              line: line,
            });

            const notesFields = suitelet.getSublistField({
              sublistId: SUBLIST,
              fieldId: NOTESFIELD,
              line: line,
            });
            const pharmaProcessing = suitelet.getSublistValue({
              sublistId: SUBLIST,
              fieldId: PHARMAPROCESSINGFIELD,
              line: selectedLine,
            });
            let changePharmaProcessing = suitelet.getCurrentSublistValue({
              sublistId: SUBLIST,
              fieldId: CHANGEPHARMAPROCESSINGFIELD,
            });

            console.table(changePharmaProcessing, pharmaProcessing);
            if (changePharmaProcessing == true) {
              console.log("enabling rate");
              RATEFIELDCOLUMN.isDisabled = false;
            } else {
              RATEFIELDCOLUMN.isDisabled = true;
            }
            if (
              changePharmaProcessing == true &&
              pharmaProcessing !== "Non-Returnable"
            ) {
              nonReturnableReasonField.isDisabled = false;
              notesFields.isDisabled = false;
            } else {
              nonReturnableReasonField.isDisabled = true;
              notesFields.isDisabled = true;
            }
            break;
          case RATEFIELD:
            const updateProductCatalogField = suitelet.getSublistField({
              sublistId: SUBLIST,
              fieldId: UPDATEPRODUCTCATALOGFIELD,
              line: line,
            });
            const rate = suitelet.getCurrentSublistValue({
              sublistId: SUBLIST,
              fieldId: RATEFIELD,
            });
            console.log("rate", rate);
            console.log("rate is empty", !isEmpty(rate));
            if (!isEmpty(rate)) {
              updateProductCatalogField.isDisabled = false;
            } else {
              updateProductCatalogField.isDisabled = true;
            }
            break;
        }
      }
    } catch (e) {
      console.error("fieldChanged", e.message);
    }
  }

  function getLineDetailsToBeProcessed(selectedLine) {
    try {
      console.log("getLineDetailsToBeProcessed: " + selectedLine);
      let params = {};
      params.itemId = suitelet.getSublistValue({
        sublistId: SUBLIST,
        fieldId: "custpage_itemid",
        line: selectedLine,
      });
      params.id = suitelet.getSublistValue({
        sublistId: SUBLIST,
        fieldId: "custpage_internalid",
        line: selectedLine,
      });
      let rate = suitelet.getSublistValue({
        sublistId: SUBLIST,
        fieldId: RATEFIELD,
        line: selectedLine,
      });
      let changePharmaProcessing = suitelet.getSublistValue({
        sublistId: SUBLIST,
        fieldId: CHANGEPHARMAPROCESSINGFIELD,
        line: selectedLine,
      });
      // console.log("changePharmaProcessing: " + changePharmaProcessing);
      if (changePharmaProcessing == true || changePharmaProcessing == "true") {
        let pharmaProcessing = suitelet.getSublistValue({
          sublistId: SUBLIST,
          fieldId: PHARMAPROCESSINGFIELD,
          line: selectedLine,
        });
        // console.log("pharmaProcessing: " + pharmaProcessing);
        if (pharmaProcessing == "Non-Returnable") {
          params.pharmaProcessing = RETURNABLE;
          params.nonReturnableReason = 8; // No Reason Selected
          //console.log("nonReturnableReason: " + nonReturnableReason);
        } else {
          let nonReturnableReason = suitelet.getSublistValue({
            sublistId: SUBLIST,
            fieldId: NONRETURNABLEREASONFIELD,
            line: selectedLine,
          });
          if (nonReturnableReason != 8) {
            // NO REASON SELECTED
            params.nonReturnableReason = nonReturnableReason;
          }
          params.pharmaProcessing = NONRETURNABLE;
        }
      }
      if (rate != " ") {
        params.rate = rate;
        let updateProductCatalog = suitelet.getSublistValue({
          sublistId: SUBLIST,
          fieldId: UPDATEPRODUCTCATALOGFIELD,
          line: selectedLine,
        });
        if (updateProductCatalog == true) {
          params.updateCatalog = true;
        }
      }

      console.table(params, selectedLine);
      return params;
    } catch (e) {
      console.error("getLineDetailsToBeProcessed", e.message);
    }
  }

  function submit() {
    {
      handleButtonClick("Please wait...");
      setTimeout(function () {
        let itemToBeProcess = [];
        if (selectedLine == null || selectedLine == "null") {
          showMessage();
        } else {
          console.table(selectedLine);
          let lineData = getLineDetailsToBeProcessed(selectedLine);
          itemToBeProcess.push(lineData);

          console.table(itemToBeProcess);
          let params = {
            action: "updateIRS",
            values: JSON.stringify(itemToBeProcess),
          };
          console.table(params);
          let stSuiteletUrl = url.resolveScript({
            scriptId: "customscript_sl_cs_custom_function",
            deploymentId: "customdeploy_sl_cs_custom_function",
            returnExternalUrl: false,
            params: params,
          });
          postURL({
            URL: stSuiteletUrl,
          });
        }
      }, 200);
    }
  }

  function submitAll() {
    if (lineTobeUpdated.length == 0) {
      showMessage();
    } else {
      handleButtonClick("Please wait...");
      setTimeout(function () {
        let itemsToProcess = [];
        lineTobeUpdated.forEach((line) => {
          itemsToProcess.push(getLineDetailsToBeProcessed(line));
        });
        let params = {
          action: "updateIRS",
          values: JSON.stringify(itemsToProcess),
        };
        console.table(params);
        let stSuiteletUrl = url.resolveScript({
          scriptId: "customscript_sl_cs_custom_function",
          deploymentId: "customdeploy_sl_cs_custom_function",
          returnExternalUrl: false,
          params: params,
        });
        postURL({
          URL: stSuiteletUrl,
        });
      }, 200);
    }
  }

  function showMessage() {
    let m = message.create({
      type: message.Type.WARNING,
      title: "WARNING",
      message: "NO ITEM TO PROCESS",
    });
    m.show({
      duration: 2000,
    });
  }

  /**
   * Mark and Unmark the Sublist
   * @param {string} value
   */
  function markAll(value) {
    const SUBLIST = "custpage_items_sublist";
    let curRec = currentRecord.get();
    for (let i = 0; i < curRec.getLineCount(SUBLIST); i++) {
      curRec.selectLine({
        sublistId: SUBLIST,
        line: i,
      });
      curRec.setCurrentSublistValue({
        sublistId: SUBLIST,
        fieldId: "custpage_select",
        value: JSON.parse(value),
      });
      if (value == "false" || value == false)
        curRec.setCurrentSublistValue({
          sublistId: SUBLIST,
          fieldId: "custpage_form222_ref",
          value: " ",
        });
      curRec.commitLine(SUBLIST);
    }
  }

  function handleButtonClick(str) {
    try {
      jQuery("body").loadingModal({
        position: "auto",
        text: str,
        color: "#fff",
        opacity: "0.7",
        backgroundColor: "rgb(220,220,220)",
        animation: "doubleBounce",
      });
    } catch (e) {
      console.error("handleButtonClick", e.message);
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

  /**
   * Post URL request
   * @param {string} options.URL Suitelet URL
   *
   */
  function postURL(options) {
    let { URL } = options;
    try {
      setTimeout(function () {
        let response = https.post({
          url: URL,
        });
        if (response) {
          console.log(response);
          jQuery("body").loadingModal("destroy");
          if (response.body.includes("ERROR")) {
            let m = message.create({
              type: message.Type.ERROR,
              title: "ERROR",
              message: response.body,
            });
            m.show(10000);
          } else {
            let m = message.create({
              type: message.Type.CONFIRMATION,
              title: "SUCCESS",
              message: response.body,
            });
            m.show(10000);
            setTimeout(function () {
              location.reload();
            }, 2000);
          }
        }
      }, 100);
    } catch (e) {
      console.error("postURL", e.message);
    }
  }

  function destroyModal() {
    jQuery("#_loading_dialog").dialog("destroy");
  }

  return {
    pageInit: pageInit,
    fieldChanged: fieldChanged,
    showMessage: showMessage,
    markAll: markAll,
    submitAll: submitAll,
    submit: submit,
    updateIRS: updateIRS,
  };
});
