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
  "N/file",
], /**
 * @param{runtime} runtime
 * @param{url} url
 * @param currentRecord
 * @param message
 * @param record
 * @param https
 * @param rxrs_rcl_lib
 * @param tranlib
 */ function (runtime, url, currentRecord, message, record, https, file) {
  let suitelet = null;
  let lineCount = 0;
  let urlParams;
  let isGovernment = false;
  const columnToDisable = [
    "custpage_full_partial",
    "custpage_package_size",
    "custpage_full",
    "custpage_partial",
    "custpage_unit_price",
    "custpage_amount_paid",
    "custpage_packing_slip_value",
    "custpage_packing_slip_price",
    // "custpage_erv_discounted_unit_price",
    // "custpage_erv_discounted_amount",
  ];
  const columnToDisableEnabled = [
    "custpage_unit_price",
    "custpage_amount_paid",
  ];
  const columnToDisableEnabledOnEdit = [
    "custpage_select",
    "custpage_unit_price",
    "custpage_amount_paid",
  ];

  let isSelectedNeed = true;

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
    console.log("pageInit");
    let arrTemp = window.location.href.split("?");
    urlParams = new URLSearchParams(arrTemp[1]);
    let isEdit = urlParams.get("isEdit");
    if (window.location.href.indexOf("isReload") != -1) {
      let isReload = urlParams.get("isReload");
      console.log("isReload" + isReload);
      if (isReload == true || isReload == "true") {
        setTimeout(function () {
          console.log("loading main page");
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
    suitelet = scriptContext.currentRecord;
    let cmCount = 0;
    let totalAmount = 0;
    isGovernment = suitelet.getValue("custpage_is_government");

    lineCount = suitelet.getLineCount("custpage_items_sublist");
    for (let i = 0; i < lineCount; i++) {
      const parentCM = suitelet.getSublistValue({
        sublistId: "custpage_items_sublist",
        fieldId: "custpage_credit_memo_parent",
        line: i,
      });
      const fullPartial = suitelet.getSublistText({
        sublistId: "custpage_items_sublist",
        fieldId: "custpage_full_partial",
        line: i,
      });

      const selectField = suitelet.getSublistField({
        sublistId: "custpage_items_sublist",
        fieldId: "custpage_select",
        line: i,
      });
      const amount = suitelet.getSublistValue({
        sublistId: "custpage_items_sublist",
        fieldId: "custpage_amount_paid",
        line: i,
      });
      console.log("parent cm" + parentCM);
      if (parentCM !== " ") {
        cmCount += 1;
        totalAmount += amount;
      } else {
        selectField.isDisabled = false;
      }

      for (let a = 0; a < columnToDisable.length; a++) {
        const itemField = suitelet.getSublistField({
          sublistId: "custpage_items_sublist",
          fieldId: columnToDisable[a],
          line: i,
        });
        if (
          fullPartial.includes("Full") &&
          columnToDisable[a] == "custpage_full"
        ) {
          continue;
        }
        if (
          !fullPartial.includes("Full") &&
          columnToDisable[a] == "custpage_partial"
        ) {
          continue;
        }
        if (
          columnToDisable[a] == "custpage_unit_price" ||
          columnToDisable[a] == "custpage_amount_paid"
        ) {
          if (parentCM) {
            itemField.isDisabled = false;
          } else {
            itemField.isDisabled = true;
          }
        } else {
          itemField.isDisabled = true;
        }
      }
    }

    suitelet.setValue({
      fieldId: "custpage_amount",
      value: +totalAmount,
    });
  }

  window.onload = function () {
    //considering there aren't any hashes in the urls already
  };

  function edit() {
    location.href = location.href + "&isEdit=T";
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
    try {
      console.log(scriptContext.fieldId);
      if (scriptContext.fieldId == "custpage_file_upload") {
        let file = currentRecord.getValue("custpage_file_upload");
      }
      if (scriptContext.fieldId == "custpage_custom_amount") {
        //console.log("fieldChanged custpage_custom_amount");
        const customAmount = suitelet.getValue("custpage_custom_amount");
        const invAmount = suitelet.getValue("custpage_packing_slip_total");
        // console.table(customAmount, invAmount);
        for (let i = 0; i < lineCount; i++) {
          suitelet.selectLine({
            sublistId: "custpage_items_sublist",
            line: i,
          });
          const lineTotal = suitelet.getCurrentSublistValue({
            sublistId: "custpage_items_sublist",
            fieldId: "custpage_packing_slip_value",
          });
          const percentage = lineTotal / invAmount;
          let newAmount = Number(percentage) * customAmount;
          //  console.table(percentage, lineTotal);

          if (isGovernment == true) {
            console.log("erv amount " + newAmount * 0.15);
            suitelet.setCurrentSublistValue({
              sublistId: "custpage_items_sublist",
              fieldId: "custpage_amount_paid",
              value: newAmount * 0.15,
            });
          } else {
            suitelet.setCurrentSublistValue({
              sublistId: "custpage_items_sublist",
              fieldId: "custpage_amount_paid",
              value: newAmount.toFixed(2),
            });
          }
        }
      }
      if (scriptContext.fieldId == "custpage_credit_memo") {
        const creditMemoId = suitelet.getValue("custpage_credit_memo");
        let URL = removeParamFromURL(location.href, "creditMemoId");
        URL += "&creditMemoId=" + creditMemoId;
        // console.log("newURL: " + URL);
        window.onbeforeunload = null;
        window.open(URL, "_self");
      }

      if (scriptContext.sublistId === "custpage_items_sublist") {
        //  console.log("FieldId" + scriptContext.fieldId);

        const currIndex = suitelet.getCurrentSublistIndex({
          sublistId: "custpage_items_sublist",
        });
        let unitPrice = suitelet.getCurrentSublistValue({
          sublistId: "custpage_items_sublist",
          fieldId: "custpage_unit_price",
        });
        let packageSize = suitelet.getCurrentSublistValue({
          sublistId: "custpage_items_sublist",
          fieldId: "custpage_package_size",
        });

        let quantity = suitelet.getCurrentSublistValue({
          sublistId: "custpage_items_sublist",
          fieldId: "custpage_full",
        });
        let partialCount = suitelet.getCurrentSublistValue({
          sublistId: "custpage_items_sublist",
          fieldId: "custpage_partial",
        });
        let fullPartial = suitelet.getCurrentSublistText({
          sublistId: "custpage_items_sublist",
          fieldId: "custpage_full_partial",
        });
        if (scriptContext.fieldId == "custpage_partial") {
          let creditAmount = (partialCount / packageSize) * +unitPrice;
          console.table(partialCount, packageSize, unitPrice);
          suitelet.setCurrentSublistValue({
            sublistId: "custpage_items_sublist",
            fieldId: "custpage_amount_paid",
            value: creditAmount.toFixed(2),
          });
        }
        if (scriptContext.fieldId == "custpage_full") {
          let creditAmount = quantity * +unitPrice;
          suitelet.setCurrentSublistValue({
            sublistId: "custpage_items_sublist",
            fieldId: "custpage_amount_paid",
            value: creditAmount.toFixed(2),
          });
        }
        if (scriptContext.fieldId == "custpage_select") {
          let isSelected = suitelet.getCurrentSublistValue({
            sublistId: "custpage_items_sublist",
            fieldId: "custpage_select",
          });

          if (isSelected == false) {
            suitelet.setCurrentSublistValue({
              sublistId: "custpage_items_sublist",
              fieldId: "custpage_unit_price",
              value: 0,
            });
            suitelet.setCurrentSublistValue({
              sublistId: "custpage_items_sublist",
              fieldId: "custpage_amount_paid",
              value: 0,
            });
          }
          columnToDisableEnabled.forEach((fieldId) => {
            const itemField = suitelet.getSublistField({
              sublistId: "custpage_items_sublist",
              fieldId: fieldId,
              line: currIndex,
            });
            itemField.isDisabled = !JSON.parse(isSelected);
          });
        }

        if (scriptContext.fieldId === "custpage_unit_price") {
          // console.table([
          //   unitPrice,
          //   packageSize,
          //   quantity,
          //   partialCount,
          //   fullPartial,
          // ]);
          let newAmount = 0;
          if (fullPartial.includes("Part")) {
            newAmount =
              (Number(partialCount) / Number(packageSize)) * Number(unitPrice);
          } else {
            newAmount = Number(quantity) * Number(unitPrice);
          }

          const totalLineAmount = suitelet.getCurrentSublistValue({
            sublistId: "custpage_items_sublist",
            fieldId: "custpage_packing_slip_value",
          });

          // console.table(newAmount, totalLineAmount);

          suitelet.setCurrentSublistValue({
            sublistId: "custpage_items_sublist",
            fieldId: "custpage_amount_paid",
            value: newAmount.toFixed(2),
          });
          // suitelet.setCurrentSublistValue({
          //   sublistId: "custpage_items_sublist",
          //   fieldId: "custpage_erv_discounted_amount",
          //   value: newAmount * 0.15,
          // });
          let totalAmount = 0;
          for (
            let i = 0;
            i < suitelet.getLineCount("custpage_items_sublist");
            i++
          ) {
            let isSelected = suitelet.getSublistValue({
              sublistId: "custpage_items_sublist",
              fieldId: "custpage_select",
              line: i,
            });
            if (isSelected == true || isSelected == "true") {
              let amount = 0;
              amount = suitelet.getSublistValue({
                sublistId: "custpage_items_sublist",
                fieldId: "custpage_amount_paid",
                line: i,
              });
              totalAmount += Number(amount);
            }
          }

          totalAmount &&
            suitelet.setValue({
              fieldId: "custpage_amount",
              value: totalAmount,
            });
        }
        if (scriptContext.fieldId === "custpage_amount_paid") {
          let amountPaid = suitelet.getCurrentSublistValue({
            sublistId: "custpage_items_sublist",
            fieldId: "custpage_amount_paid",
          });
          const packageSize = suitelet.getCurrentSublistValue({
            sublistId: "custpage_items_sublist",
            fieldId: "custpage_package_size",
          });
          // console.log("packageSize", packageSize);
          let quantity = suitelet.getCurrentSublistValue({
            sublistId: "custpage_items_sublist",
            fieldId: "custpage_full",
          });
          let partialCount = suitelet.getCurrentSublistValue({
            sublistId: "custpage_items_sublist",
            fieldId: "custpage_partial",
          });
          let fullPartial = suitelet.getCurrentSublistText({
            sublistId: "custpage_items_sublist",
            fieldId: "custpage_full_partial",
          });

          // console.table([
          //   amountPaid,
          //   packageSize,
          //   quantity,
          //   partialCount,
          //   fullPartial,
          // ]);
          let unitPrice = 0;
          if (fullPartial.includes("Part")) {
            unitPrice =
              Number(amountPaid) / (Number(partialCount) / Number(packageSize));
          } else {
            unitPrice = Number(amountPaid) / Number(quantity);
          }

          const totalLineAmount = suitelet.getCurrentSublistValue({
            sublistId: "custpage_items_sublist",
            fieldId: "custpage_packing_slip_value",
          });
          // console.table(amountPaid, totalLineAmount);

          suitelet.setCurrentSublistValue({
            sublistId: "custpage_items_sublist",
            fieldId: "custpage_unit_price",
            value: unitPrice.toFixed(2),
          });
          // if (isGovernment == true) {
          //   suitelet.setCurrentSublistValue({
          //     sublistId: "custpage_items_sublist",
          //     fieldId: "custpage_erv_discounted_unit_price",
          //     value: (unitPrice * 0.15).toFixed(2),
          //   });
          // }
          let totalAmount = 0;
          for (
            let i = 0;
            i < suitelet.getLineCount("custpage_items_sublist");
            i++
          ) {
            let isSelected = suitelet.getSublistValue({
              sublistId: "custpage_items_sublist",
              fieldId: "custpage_select",
              line: i,
            });
            if (isSelected == true || isSelected == "true") {
              let amount = 0;
              amount = suitelet.getSublistValue({
                sublistId: "custpage_items_sublist",
                fieldId: "custpage_amount_paid",
                line: i,
              });
              totalAmount += Number(amount);
            }
          }

          totalAmount &&
            suitelet.setValue({
              fieldId: "custpage_amount",
              value: totalAmount,
            });
        }
      }
    } catch (e) {
      console.error("fieldChanged", e.message);
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

      curRec.commitLine(SUBLIST);
    }
  }

  /**
   * Post URL request
   * @param {string} options.URL Suitelet URL
   *
   */
  function postURL(options) {
    let { URL } = options;
    let errorCount = 0;
    try {
      setTimeout(function () {
        let response = https.post({
          url: URL,
        });
        if (response) {
          //console.log(response);
          jQuery("body").loadingModal("destroy");
          if (response.body.includes("ERROR")) {
            error += 1;
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
      return errorCount;
    } catch (e) {
      console.error("postURL", e.message);
    }
  }

  function handleButtonClick() {
    try {
      jQuery("body").loadingModal({
        position: "auto",
        text: "Processing. Please wait...",
        color: "#fff",
        opacity: "0.7",
        backgroundColor: "rgb(220,220,220)",
        animation: "doubleBounce",
      });
    } catch (e) {
      console.error("handleButtonClick", e.message);
    }
  }

  /**
   *
   * @param {object}options
   * @param {string}options.invId
   * @param {string}options.isEdit
   * @param {object}options.previousParam
   */
  function createCreditMemo(options) {
    window.onbeforeunload = null;
    let creditMemoNumber;
    console.log("createCreditMemo", JSON.stringify(options));
    let { isEdit, invId, previousParam } = options;
    console.log("isEdit" + isEdit);
    let cmInfo = {};
    let parentParams = {};
    parentParams.forUpdate = [];
    parentParams.forCreation = {};
    let selectedLine = [];
    parentParams.isGovernment = isGovernment;
    try {
      creditMemoNumber = suitelet.getValue("custpage_credit_memo_number");
      if (creditMemoNumber) {
        cmInfo.creditMemoNumber = creditMemoNumber;
        cmInfo.invoiceId = invId;
        cmInfo.amount = suitelet.getValue("custpage_amount");
        cmInfo.serviceFee = suitelet.getValue("custpage_service_fee");
        cmInfo.dateIssued = suitelet.getText("custpage_issued_on");
        cmInfo.fileId = suitelet.getValue("custpage_file_upload");
        cmInfo.isGovernment = isGovernment;
      }
      if (isEdit == "false")
        if (
          isEmpty(cmInfo.creditMemoNumber) ||
          isEmpty(cmInfo.amount) ||
          isEmpty(cmInfo.dateIssued)
        ) {
          let m = message.create({
            type: message.Type.WARNING,
            title: "WARNING",
            message: "Please enter all required fields",
          });
          m.show(2000);
          return;
        }
      parentParams.forCreation = cmInfo;
      // if (isEmpty(cmInfo.creditMemoNumber) || isEmpty(cmInfo.dateIssued)) {
      //   alert("Please enter value for mandatory fields");
      //   return;
      // }
      let packingSlipAmountTotal = 0;
      let total = 0;
      const SUBLIST = "custpage_items_sublist";
      try {
        for (
          let i = 0;
          i < suitelet.getLineCount("custpage_items_sublist");
          i++
        ) {
          let isSelected = suitelet.getSublistValue({
            sublistId: SUBLIST,
            fieldId: "custpage_select",
            line: i,
          });

          let lineUniqueKey = suitelet.getSublistValue({
            sublistId: SUBLIST,
            fieldId: "custpage_lineuniquekey",
            line: i,
          });
          let NDC = suitelet.getSublistValue({
            sublistId: SUBLIST,
            fieldId: "custpage_itemid",
            line: i,
          });

          let unitPrice = suitelet.getSublistValue({
            sublistId: SUBLIST,
            fieldId: "custpage_unit_price",
            line: i,
          });

          let amountApplied = suitelet.getSublistValue({
            sublistId: SUBLIST,
            fieldId: "custpage_amount_paid",
            line: i,
          });
          if (isGovernment == true) {
            total = packingSlipAmountTotal * 0.15;
            unitPrice *= 0.15;
            amountApplied *= 0.15;
          }
          let cmLineId = suitelet.getSublistValue({
            sublistId: SUBLIST,
            fieldId: "custpage_credit_memo",
            line: i,
          });
          const packingSlipAmount = suitelet.getSublistValue({
            sublistId: SUBLIST,
            fieldId: "custpage_packing_slip_value",
            line: i,
          });

          const cmParentId = suitelet.getSublistValue({
            sublistId: SUBLIST,
            fieldId: "custpage_credit_memo_parent",
            line: i,
          });
          parentParams.forCreation.cmLines = selectedLine;

          if (isSelected == false) continue;
          total += Number(amountApplied);
          packingSlipAmountTotal += Number(packingSlipAmount);
          console.log("isEdit:" + isEdit);
          if (isEdit == "true") {
            console.log("isEdited");

            parentParams.forUpdate.push({
              unitPrice: unitPrice,
              amountApplied: amountApplied,
              lineUniqueKey: lineUniqueKey,
              invId: invId,
              cmLineId: cmLineId,
              cmId: cmParentId,
            });
          }
          if (isEdit != "true") {
            console.log("isNotEdit");

            selectedLine.push({
              lineUniqueKey: lineUniqueKey,
              NDC: NDC,
              unitPrice: unitPrice,
              amountApplied: amountApplied,
              cmLineId: cmLineId,
              invId: invId,
            });
          }
        }
        parentParams.forCreation.packingSlipAmount = packingSlipAmountTotal;
        parentParams.forCreation.amount = total;
        //console.table(selectedLine);
        let m = message.create({
          type: message.Type.WARNING,
          title: "WARNING",
          message: "NO ITEM TO PROCESS",
        });

        console.table(parentParams);

        if (isEdit == "true") {
          if (parentParams.forUpdate.length <= 0) {
            m.show({
              duration: 2000,
            });
            return;
          }
        } else {
          if (parentParams.forCreation.cmLines.length <= 0) {
            m.show({
              duration: 2000,
            });
            return;
          }
        }

        let cmParams = {
          cmDetails: JSON.stringify(parentParams),
          action: "createCreditMemo",
          isReload: true,
        };
        handleButtonClick();
        let stSuiteletUrl = url.resolveScript({
          scriptId: "customscript_sl_cs_custom_function",
          deploymentId: "customdeploy_sl_cs_custom_function",
          params: cmParams,
        });

        let errorCount = postURL({ URL: stSuiteletUrl });

        setTimeout(function () {
          // let rclSuiteletURL = url.resolveScript({
          //   scriptId: "customscript_sl_add_credit_memo",
          //   deploymentId: "customdeploy_sl_add_credit_memo",
          //   returnExternalUrl: false,
          //   params: JSON.parse(previousParam),
          // });
          // window.ischanged = false;
          opener.location.reload();
          setTimeout(function () {
            window.close();
          }, 2000);
          //   window.open(`${rclSuiteletURL}`, "_self");
        }, 5000);
      } catch (e) {
        console.error("createCreditMemo", e.message);
      }
    } catch (e) {
      console.error("createCreditMemo", e.message);
    }
  }

  function destroyModal() {
    jQuery("#_loading_dialog").dialog("destroy");
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
   *
   * @param options
   */
  function deleteCreditMemo(options) {
    //alert(JSON.stringify(options));
    try {
      let deleteParams = {
        deleteParams: JSON.stringify(options),
        action: "deleteCreditMemo",
        isReload: true,
      };
      handleButtonClick();
      let stSuiteletUrl = url.resolveScript({
        scriptId: "customscript_sl_cs_custom_function",
        deploymentId: "customdeploy_sl_cs_custom_function",
        params: deleteParams,
      });

      let errorCount = postURL({ URL: stSuiteletUrl });

      setTimeout(function () {
        opener.location.reload();
        setTimeout(function () {
          window.close();
        }, 2000);
      }, 5000);
    } catch (e) {
      console.error("deleteCreditMemo", e.message);
    }
  }

  function removeParamFromURL(url, param) {
    const [path, searchParams] = url.split("?");
    const newSearchParams = searchParams
      ?.split("&")
      .filter((p) => !(p === param || p.startsWith(`${param}=`)))
      .join("&");
    return newSearchParams ? `${path}?${newSearchParams}` : path;
  }

  function uploadFile() {
    let fileName = suitelet.getValue("custpage_file_upload");
    if (!fileName) {
      alert("No file to process");
      return;
    }

    if (fileName.includes(".txt") == false) {
      alert("Please upload .txt file only");
    } else {
      const fileObj = file.create({
        name: "test.txt",
        fileType: file.Type.PLAINTEXT,
        contents: fileName,
      });

      fileObj.folder = 30;
      var fileId = fileObj.save();
      // let uploadCMParams = {
      //   file: file,
      //   action: "uploadCMFile",
      //   isReload: true,
      // };
      // handleButtonClick();
      // let stSuiteletUrl = url.resolveScript({
      //   scriptId: "customscript_sl_cs_custom_function",
      //   deploymentId: "customdeploy_sl_cs_custom_function",
      //   params: uploadCMParams,
      // });
      //
      // let errorCount = postURL({ URL: stSuiteletUrl });
      //
      // setTimeout(function () {
      //   opener.location.reload();
      //   setTimeout(function () {
      //     window.close();
      //   }, 2000);
      // }, 5000);
    }
  }

  /**
   * Validation function to be executed when record is saved.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @returns {boolean} Return true if record is valid
   *
   * @since 2015.2
   */
  function saveRecord(scriptContext) {
    try {
      let fileName = suitelet.getValue("custpage_file_upload");
      if (!fileName) {
        alert("No file to process");
        return false;
      }
      if (fileName.includes(".txt") == false) {
        alert("Please upload .txt file only");
        return false;
      } else {
        return true;
      }
    } catch (e) {
      console.error("saveRecord", e.message);
    }
  }

  return {
    pageInit: pageInit,
    fieldChanged: fieldChanged,
    uploadFile: uploadFile,
    showMessage: showMessage,
    createCreditMemo: createCreditMemo,
    markAll: markAll,
    edit: edit,
    deleteCreditMemo: deleteCreditMemo,
    saveRecord: saveRecord,
  };
});
