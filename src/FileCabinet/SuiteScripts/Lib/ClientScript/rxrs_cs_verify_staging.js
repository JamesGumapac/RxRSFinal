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
], /**
 * @param{runtime} runtime
 * @param{url} url
 * @param currentRecord
 * @param message
 * @param record
 * @param https
 * @param rxrs_rcl_lib
 * @param tranlib
 */ function (runtime, url, currentRecord, message, record, https) {
  let suitelet = null;
  const RETURNABLESUBLIST = "custpage_items_sublist";
  let urlParams;
  let lineTobeUpdated = [];
  let initialPaymentName;
  const RETURNABLE = 2;
  const NONRETURNABLE = 1;
  const RRCATEGORY = Object.freeze({
    C2: 3,
    RXOTC: 1,
    C3TO5: 4,
  });

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
    try {
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

      let manualBin = suitelet.getValue("custpage_manual_bin");
      if (manualBin) {
        let binCategoryField = suitelet.getField("custpage_bincategory");
        let binNumberField = suitelet.getField("custpage_bin");
        let returntoField = suitelet.getField("custpage_returnto");

        if (manualBin == true) {
          binNumberField.isDisabled = false;
          binCategoryField.isDisabled = false;
          returntoField.isDisabled = false;
        } else {
          binNumberField.isDisabled = true;
          binCategoryField.isDisabled = true;
          returntoField.isDisabled = true;
        }
      }
    } catch (e) {
      log.error("pageInit", e.message);
    }
  }

  window.onload = function () {
    //considering there aren't any hashes in the urls already
  };

  function updateIRS() {
    alert("SavingChanges");
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
          sublistId: RETURNABLESUBLIST,
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
    let rrId = suitelet.getValue("custpage_rrid");
    let tranId = suitelet.getValue("custpage_tranid");
    let rrType = suitelet.getValue("custpage_rr_type");
    let mrrId = suitelet.getValue("custpage_mrrid");
    let binCategory = suitelet.getValue("custpage_bincategory");
    console.log("fieldChanged");
    console.log(scriptContext.fieldId);
    console.log(scriptContext.sublistId);
    console.log(rrId + tranId);
    let params = {};
    try {
      if (scriptContext.fieldId == "custpage_radio") {
        let selection = suitelet.getValue("custpage_radio");
        if (selection === "Returnable") {
          params.isMainReturnable = true;
        } else if (selection === "Destruction") {
          params.isMainDestruction = true;
        } else {
          params.isMainInDated = true;
        }
        params.selectionType = selection;
        params.tranId = tranId;
        params.rrId = rrId;
        params.rrType = rrType;
        params.mrrId = mrrId;
        console.log(params);
        let stSuiteletUrl = url.resolveScript({
          scriptId: "customscript_sl_returnable_page",
          deploymentId: "customdeploy_sl_returnable_page",
          returnExternalUrl: false,
          params: params,
        });
        window.ischanged = false;
        window.ischanged = false;
        window.open(stSuiteletUrl, "_self");
      }
      if (scriptContext.fieldId == "custpage_manual_bin") {
        let manualBin = suitelet.getValue("custpage_manual_bin");
        let binCategoryField = suitelet.getField("custpage_bincategory");
        let binNumberField = suitelet.getField("custpage_bin");
        let returnToField = suitelet.getField("custpage_returnto");
        if (manualBin == true) {
          binNumberField.isDisabled = false;
          binCategoryField.isDisabled = false;
          returnToField.isDisabled = false;
        } else {
          suitelet.setValue({
            fieldId: "custpage_bincategory",
            value: " ",
          });
          suitelet.setValue({
            fieldId: "custpage_bin",
            value: " ",
          });
          binNumberField.isDisabled = true;
          binCategoryField.isDisabled = true;
          returnToField.isDisabled = true;
        }
      }
      if (
        scriptContext.fieldId == "custpage_bincategory" ||
        scriptContext.fieldId == "custpage_returnto"
      ) {
        window.ischanged = false;
        window.ischanged = false;
        let url = window.location.href;
        url = removeURLParameter(url, "binCategory");
        url = removeURLParameter(url, "manualBin");
        url = removeURLParameter(url, "returnTo");
        url += "&binCategory=" + suitelet.getValue("custpage_bincategory");
        url += "&manualBin=" + suitelet.getValue("custpage_manual_bin");
        url += "&returnTo=" + suitelet.getValue("custpage_returnto");
        window.open(url, "_self");
      }

      /**
       * SO suitelet 222 form reference
       */
      if (scriptContext.sublistId === "custpage_items_sublist") {
        if (scriptContext.fieldId === "custpage_select") {
          let isSelected = suitelet.getCurrentSublistValue({
            sublistId: "custpage_items_sublist",
            fieldId: "custpage_select",
          });
          if (isSelected == false || isSelected == "false") {
            suitelet.setCurrentSublistValue({
              sublistId: "custpage_items_sublist",
              fieldId: "custpage_form222_ref",
              value: " ",
            });
          }
        }
      }
    } catch (e) {
      console.error("fieldChanged", e.message);
    }
  }

  /**
   * Return to returnable page group by Manufacturer
   */
  function backToReturnable() {
    let params = {};
    let rrId = suitelet.getValue("custpage_rrid");
    let tranId = suitelet.getValue("custpage_tranid");
    let rrType = suitelet.getValue("custpage_rr_type");
    let mrrId = suitelet.getValue("custpage_mrrid");
    params.tranId = tranId;
    params.rrId = rrId;
    params.rrType = rrType;
    params.mrrId = mrrId;
    params.selectionType = suitelet.getValue("custpage_radio");

    if (params.selectionType == "Returnable") {
      params.isMainReturnable = true;
    } else if (params.selectionType == "Destruction") {
      params.isMainDestruction = true;
    } else {
      params.isMainInDated = true;
    }

    let stSuiteletUrl = url.resolveScript({
      scriptId: "customscript_sl_returnable_page",
      deploymentId: "customdeploy_sl_returnable_page",
      returnExternalUrl: false,
      params: params,
    });
    window.ischanged = false;
    window.open(stSuiteletUrl, "_self");
  }

  function removeURLParameter(url, parameter) {
    //prefer to use l.search if you have a location/link object
    var urlparts = url.split("?");
    if (urlparts.length >= 2) {
      var prefix = encodeURIComponent(parameter) + "=";
      var pars = urlparts[1].split(/[&;]/g);

      //reverse iteration as may be destructive
      for (var i = pars.length; i-- > 0; ) {
        //idiom for string.startsWith
        if (pars[i].lastIndexOf(prefix, 0) !== -1) {
          pars.splice(i, 1);
        }
      }

      return urlparts[0] + (pars.length > 0 ? "?" + pars.join("&") : "");
    }
    return url;
  }

  function verify() {
    try {
      let arrTemp = window.location.href.split("?");
      urlParams = new URLSearchParams(arrTemp[1]);
      let isHazardous = urlParams.get("isHazardous");
      const category = suitelet.getValue("custpage_category");

      let existingBags = [];
      let selectionType = suitelet.getValue("custpage_radio");
      let binNumber = suitelet.getValue("custpage_bin");
      const RETURNABLE = 2;
      let exitingBagId;
      const NONRETURNABLE = 1;
      let mfgProcessing;
      let bagCount = 0;
      let itemWithoutBag = 0;
      if (selectionType == "Returnable") {
        console.log("setting to returnable");
        mfgProcessing = RETURNABLE;
      } else if (selectionType == "Destruction") {
        console.log("setting to non-returnabe");
        mfgProcessing = NONRETURNABLE;
      } else {
        console.log("setting to returnable");
        mfgProcessing = RETURNABLE;
      }

      const manualBin = suitelet.getValue("custpage_manual_bin");
      console.log("MFG PROCESSING", mfgProcessing);
      let maxAmount = suitelet.getValue("custpage_manuf_max_so_amt");
      let returnItemScanIds = [];
      let tempHolder = [];
      let returnType = suitelet.getValue("custpage_radio");
      console.log("returntype", returnType);
      for (
        let i = 0;
        i < suitelet.getLineCount("custpage_items_sublist");
        i++
      ) {
        let internalId = suitelet.getSublistValue({
          sublistId: RETURNABLESUBLIST,
          fieldId: "custpage_internalid",
          line: i,
        });
        const isSelected = suitelet.getSublistValue({
          sublistId: RETURNABLESUBLIST,
          fieldId: "custpage_verified",
          line: i,
        });
        console.log("isSelected", isSelected, i);
        let amount = suitelet.getSublistValue({
          sublistId: RETURNABLESUBLIST,
          fieldId: "custpage_amount",
          line: i,
        });
        let itemId = suitelet.getSublistValue({
          sublistId: RETURNABLESUBLIST,
          fieldId: "custpage_item_id",
          line: i,
        });
        let prevBag = suitelet.getSublistValue({
          sublistId: RETURNABLESUBLIST,
          fieldId: "custpage_bag_tag_label",
          line: i,
        });
        const indate = suitelet.getSublistValue({
          sublistId: RETURNABLESUBLIST,
          fieldId: "custpage_in_date",
          line: i,
        });
        const isAerosol = suitelet.getSublistValue({
          sublistId: RETURNABLESUBLIST,
          fieldId: "custpage_aerosol",
          line: i,
        });
        const isSharp = suitelet.getSublistValue({
          sublistId: RETURNABLESUBLIST,
          fieldId: "custpage_sharp",
          line: i,
        });
        const nonScannable = suitelet.getSublistValue({
          sublistId: RETURNABLESUBLIST,
          fieldId: "custpage_nonscannable",
          line: i,
        });
        const patientVial = suitelet.getSublistValue({
          sublistId: RETURNABLESUBLIST,
          fieldId: "custpage_patientvial",
          line: i,
        });
        if (prevBag.length <= 96) {
          prevBag = null;
          itemWithoutBag += 1;
        } else {
          existingBags.push(prevBag);
          bagCount += 1;
        }
        switch (returnType) {
          case "InDated":
            console.log("This is Indated");
            console.log("manualbin ", manualBin);
            if (manualBin == true) {
              if (isSelected == true) {
                returnItemScanIds.push({
                  id: internalId,
                  amount: amount || 0,
                  itemId: itemId,
                  prevBag: prevBag,
                  indate: indate,
                });
              }
            } else {
              returnItemScanIds.push({
                id: internalId,
                amount: amount || 0,
                itemId: itemId,
                prevBag: prevBag,
                indate: indate,
              });
            }
            break;
          case "Destruction":
            console.log("This is Destruction");
            console.log("manualbin ", manualBin);
            if (manualBin == true) {
              if (isSelected == true) {
                returnItemScanIds.push({
                  id: internalId,
                  amount: amount || 0,
                  itemId: itemId,
                  prevBag: prevBag,
                  isAerosol: isAerosol,
                  isSharp: isSharp,
                });
              }
            } else {
              if (isHazardous == false || isHazardous == "false") {
                returnItemScanIds.push({
                  id: internalId,
                  amount: amount || 0,
                  itemId: itemId,
                  prevBag: prevBag,
                  indate: indate,
                  isAerosol: isAerosol,
                  isSharp: isSharp,
                  patientVial: patientVial,
                  nonScannable: nonScannable,
                });
              }
            }
            break;
          case "Returnable":
            if (prevBag == null) {
              returnItemScanIds.push({
                id: internalId,
                amount: amount || 0,
                itemId: itemId,
                prevBag: prevBag,
              });
            } else {
              exitingBagId = getPreviousBag(prevBag);
            }
            tempHolder.push({
              id: internalId,
              amount: amount || 0,
              itemId: itemId,
              prevBag: prevBag,
              indate: indate,
            });
            break;
        }
      }

      switch (returnType) {
        case "Returnable":
          console.table(tempHolder);
          console.log("all bags the same", allSame(existingBags));
          const allBagTheSame = allSame(existingBags);
          console.table(
            bagCount,
            itemWithoutBag,
            exitingBagId,
            returnItemScanIds,
          );
          console.table("returnItemScanIds: " + returnItemScanIds);
          let m = message.create({
            type: message.Type.WARNING,
            title: "WARNING",
            message:
              "NO ITEM TO PROCESS. All ITEM IS ALREADY ASSIGNED TO A BAG",
          });
          if (
            returnItemScanIds.length <= 0 &&
            allBagTheSame == true &&
            category == RRCATEGORY.RXOTC
          ) {
            m.show({
              duration: 2000,
            });

            return;
          } else {
            alert("ASSIGNING ALL ITEM TO NEW BAG");
            returnItemScanIds = tempHolder;
            exitingBagId = null;
          }
          break;
        case "InDated":
          if (manualBin == true) {
            let warning;

            if (returnItemScanIds.length == 0) {
              warning = message.create({
                type: message.Type.WARNING,
                title: "WARNING",
                message: "NO ITEM TO PROCESS.",
              });
              warning.show({
                duration: 2000,
              });
              return;
            }
            if (isEmpty(binNumber) == true) {
              warning = message.create({
                type: message.Type.WARNING,
                title: "WARNING",
                message: "Bin is Required",
              });
              warning.show({
                duration: 2000,
              });
              return;
            }
          }
          break;
        case "Destruction":
          if (manualBin == true) {
            let warning;

            if (returnItemScanIds.length == 0) {
              warning = message.create({
                type: message.Type.WARNING,
                title: "WARNING",
                message: "NO ITEM TO PROCESS.",
              });
              warning.show({
                duration: 2000,
              });
              return;
            }
            if (isEmpty(binNumber) == true) {
              warning = message.create({
                type: message.Type.WARNING,
                title: "WARNING",
                message: "Bin is Required",
              });
              warning.show({
                duration: 2000,
              });
              return;
            }
          } else {
            if (isHazardous == true || isHazardous == "true") {
              let warning = message.create({
                type: message.Type.ERROR,
                title: "ERROR",
                message: "Manual Bin Selection is Required.",
              });
              warning.show({
                duration: 3000,
              });
              return;
            }
          }
          break;
      }

      console.table(returnItemScanIds);
      let maximumAmount = suitelet.getValue("custpage_manuf_max_so_amt");
      let rrId = suitelet.getValue("custpage_rrid");
      let mrrId = suitelet.getValue("custpage_mrrid");
      let rrType = suitelet.getValue("custpage_rr_type");
      let manufId = suitelet.getValue("custpage_manuf_id");

      let params = {
        custscript_payload: JSON.stringify(returnItemScanIds),
        isVerify: true,
        maximumAmount: maximumAmount ? JSON.stringify(maximumAmount) : 0,
        rrId: rrId,
        binNumber: binNumber,
        mrrid: mrrId,
        rrType: rrType,
        manufId: manufId,
        returnType: returnType,
        exitingBagId: exitingBagId,
        mfgProcessing: mfgProcessing,
        category: category,
        manualBin: manualBin,
        isHazardous: isHazardous,
      };

      console.table(params);

      handleButtonClick();
      setTimeout(function () {
        let stSuiteletUrl = url.resolveScript({
          scriptId: "customscript_sl_validate_return",
          deploymentId: "customdeploy_sl_validate_return",
          params: params,
        });
        let response = https.post({
          url: stSuiteletUrl,
        });

        if (response.body) {
          if (response.body.includes("ERROR")) {
            alert(response.body);
          } else {
            setTimeout(function () {
              location.reload();
            }, 300);
          }
        }
      }, 100);
    } catch (e) {
      console.error("verify", e.message);
    }
  }

  function getPreviousBag(prevBag) {
    prevBag = prevBag.split("&");
    prevBag = prevBag[1]; // get the id from the URL
    prevBag = prevBag.substring(3, prevBag.length);
    return prevBag;
  }

  function allSame(array) {
    // Using the every method to check equality of all elements with the first element
    return array.every((element) => element === array[0]);
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

  function isEmpty(stValue) {
    return (
      stValue === " " ||
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

  function updateSO222Form() {
    try {
      jQuery("body").loadingModal({
        position: "auto",
        text: "Updating Sales Order. Please wait...",
        color: "#fff",
        opacity: "0.7",
        backgroundColor: "rgb(220,220,220)",
        animation: "wave",
      });
    } catch (e) {
      console.error("handleButtonClick", e.message);
    }
  }

  function handleButtonClick(str) {
    try {
      jQuery("body").loadingModal({
        position: "auto",
        text: str
          ? str
          : "Updating Verify Status and Creating Bag Label. Please wait...",
        color: "#fff",
        opacity: "0.7",
        backgroundColor: "rgb(220,220,220)",
        animation: "doubleBounce",
      });
    } catch (e) {
      console.error("handleButtonClick", e.message);
    }
  }

  function getCertainField(options) {
    console.table(options);
    let { type, id, columns } = options;
    try {
      const tranSearch = search.lookupFields({
        type: type,
        id: id,
        columns: [columns],
      });
      let vbStatus = tranSearch[columns][0].value;
      return JSON.stringify(vbStatus);
    } catch (e) {
      log.error("getTransactionStatus", e.message);
    }
  }

  /**
   * Create Payment Record and Assign it to item return scan
   * @param {number} options.mrrId Master Return Id
   * @param {number} options.billId Bill Id
   */
  function createPayment(options) {
    console.table(options);
    const curRec = currentRecord.get();
    const billStatus = curRec.getValue("custpage_bill_status");

    let { mrrId, billId } = options;
    try {
      console.log("billstatus " + billStatus);
      if (billStatus == "paidInFull") {
        alert(
          "Cannot change payment schedule, related bill record is already paid in full",
        );
        return;
      }
      let internalIds = [];
      let rec = currentRecord.get();

      let newPaymentId = rec.getValue("custpage_payment_name");
      let paymentSublistCount = rec.getLineCount({
        sublistId: RETURNABLESUBLIST,
      });
      for (let i = 0; i < paymentSublistCount; i++) {
        if (
          rec.getSublistValue({
            sublistId: RETURNABLESUBLIST,
            fieldId: "custpage_verified",
            line: i,
          }) !== true
        )
          continue;
        let internalId = rec.getSublistValue({
          sublistId: RETURNABLESUBLIST,
          fieldId: "custpage_internalid",
          line: i,
        });
        internalIds.push(internalId);
      }
      console.log(internalIds.length);
      if (internalIds.length == 0) {
        alert("Please select item");
        return;
      }

      let returnList = JSON.stringify(internalIds.join("_"));

      let rclSuiteletURL = url.resolveScript({
        scriptId: "customscript_sl_return_cover_letter",
        deploymentId: "customdeploy_sl_return_cover_letter",
        returnExternalUrl: false,
        params: {
          mrrId: mrrId,
          rclId: rclId,
          isReload: true,
          inDated: false,
          isVerifyStaging: false,
          returnList: returnList,
          createdPaymentId: newPaymentId,
          title: "In-Dated Inventory",
          finalPaymentSched: false,
          initialSplitpaymentPage: false,
        },
      });

      if (billId) {
        let params = {
          billId: billId,
          newPaymentId: newPaymentId,
          action: "deleteBill",
          mrrId: mrrId,
        };

        let functionSLURL = url.resolveScript({
          scriptId: "customscript_sl_cs_custom_function",
          deploymentId: "customdeploy_sl_cs_custom_function",
          returnExternalUrl: false,
          params: params,
        });

        postURL({ URL: functionSLURL });
      }

      window.open(`${rclSuiteletURL}`, "_self");
    } catch (e) {
      console.error("createPayment" + e.message);
    }
  }

  function updateSO222FormReference(soId) {
    try {
      const suitelet = currentRecord.get();

      let soDetails = {};
      soDetails.soId = soId;
      soDetails.soItemToUpdate = [];
      alert("test");
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
          if (isSelected !== true) continue;

          let lineUniqueKey = suitelet.getSublistValue({
            sublistId: SUBLIST,
            fieldId: "custpage_linekey",
            line: i,
          });
          let form222Number = suitelet.getSublistValue({
            sublistId: SUBLIST,
            fieldId: "custpage_form222_ref",
            line: i,
          });
          if (form222Number) {
            soDetails.soItemToUpdate.push({
              lineUniqueKey: lineUniqueKey,
              form222Number: form222Number,
            });
          }
        }

        let m = message.create({
          type: message.Type.WARNING,
          title: "WARNING",
          message: "NO ITEM TO PROCESS",
        });
        if (soDetails.soItemToUpdate.length <= 0) {
          m.show({
            duration: 2000,
          });
          return;
        }

        let params = {
          soDetails: JSON.stringify(soDetails),
          action: "updateSOItem222FormReference",
          isReload: true,
        };

        updateSO222Form();
        let stSuiteletUrl = url.resolveScript({
          scriptId: "customscript_sl_cs_custom_function",
          deploymentId: "customdeploy_sl_cs_custom_function",
          params: params,
        });
        postURL({ URL: stSuiteletUrl });
        setTimeout(function () {
          let rclSuiteletURL = url.resolveScript({
            scriptId: "customscript_rxrs_sl_add_222_form_ref",
            deploymentId: "customdeploy_rxrs_sl_add_222_form_ref",
            returnExternalUrl: false,
            params: {
              isReload: true,
            },
          });
          window.ischanged = false;
          window.open(`${rclSuiteletURL}`, "_self");
        }, 2000);
      } catch (e) {
        console.error("updateSO222FormReference", e.message);
      }
    } catch (e) {
      console.error("updateSO222FormReference", e.message);
    }
  }

  function update222FormReference() {
    try {
      const SUBLIST = "custpage_items_sublist";
      const curRec = currentRecord.get();
      let lineCount = curRec.getLineCount(SUBLIST);
      console.log("Linecount" + lineCount);
      const form222Number = curRec.getValue("custpage_form222_field");
      if (!form222Number) {
        alert("Please enter 222 form number");
      }

      for (let i = 0; i < lineCount; i++) {
        curRec.selectLine({
          sublistId: SUBLIST,
          line: i,
        });
        if (
          curRec.getCurrentSublistValue({
            sublistId: SUBLIST,
            fieldId: "custpage_select",
          }) !== true
        )
          continue;
        curRec.setCurrentSublistValue({
          sublistId: SUBLIST,
          fieldId: "custpage_form222_ref",
          value: form222Number,
        });
      }
    } catch (e) {
      console.error("update222FormReference", e.message);
    }
  }

  function destroyModal() {
    jQuery("#_loading_dialog").dialog("destroy");
  }

  return {
    pageInit: pageInit,
    fieldChanged: fieldChanged,
    verify: verify,
    backToReturnable: backToReturnable,
    showMessage: showMessage,
    createPayment: createPayment,
    markAll: markAll,
    update222FormReference: update222FormReference,
    updateSO222FormReference: updateSO222FormReference,
    updateIRS: updateIRS,
  };
});
