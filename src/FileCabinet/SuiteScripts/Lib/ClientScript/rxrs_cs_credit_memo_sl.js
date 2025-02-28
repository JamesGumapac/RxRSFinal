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
 */ function (
  runtime,
  url,
  currentRecord,
  message,
  record,
  https,
  file,
  itemlib,
) {
  let suitelet = null;
  let lineCount = 0;
  let urlParams;
  let isGovernment = false;
  let isTopCo = false;
  const columnToDisable = [
    "custpage_packing_slip_value",
    "custpage_packing_slip_price",
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
  let isEdit, invAmount;
  let isSelectedNeed = true;
  let alreadyAppliedAmount = 0,
    totalAmount = 0,
    cmCount = 0;
  const SUBLIST = "custpage_items_sublist";
  /**
   * Function to be executed after page is initialized.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
   *
   * @since 2015.2
   */
  let columnsHidden = [1, 2, 15, 16];
  const cmWithChanges = [];

  function pageInit(scriptContext) {
    try {
      console.log("pageInit");
      attachCheckboxListener();
      attachButtonListener();
      attachConfirmLinks();
      let arrTemp = window.location.href.split("?");
      urlParams = new URLSearchParams(arrTemp[1]);
      isEdit = urlParams.get("isEdit");
      const tdColor = "#ebebed";
      const tdColorHeader = "#e3f3fd";
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
            }
          }, 100);
        }
      }
      setTimeout(moveFileField, 0);
      suitelet = scriptContext.currentRecord;

      isGovernment = suitelet.getValue("custpage_is_government");
      const fileUploaded = suitelet.getText("custpage_uploaded_file");
      isTopCo = suitelet.getValue("custpage_is_topco");

      lineCount = suitelet.getLineCount("custpage_items_sublist");
      for (let i = 0; i < lineCount; i++) {
        const parentCM = suitelet.getSublistValue({
          sublistId: "custpage_items_sublist",
          fieldId: "custpage_credit_memo_parent",
          line: i,
        });
        let lineUniqueKey = suitelet.getSublistValue({
          sublistId: SUBLIST,
          fieldId: "custpage_lineuniquekey",
          line: i,
        });

        console.log("parent CM " + parentCM);
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
        const unitPriceField = suitelet.getSublistField({
          sublistId: "custpage_items_sublist",
          fieldId: "custpage_unit_price",
          line: i,
        });
        const amountField = suitelet.getSublistField({
          sublistId: "custpage_items_sublist",
          fieldId: "custpage_amount_paid",
          line: i,
        });
        const amount = suitelet.getSublistValue({
          sublistId: "custpage_items_sublist",
          fieldId: "custpage_amount_paid",
          line: i,
        });
        console.log("parent cm", i + parentCM);
        if (parentCM !== " ") {
          cmCount += 1;
          totalAmount += amount;
          console.log("isEdit " + isEdit);
          if (isEdit == "false") {
            selectField.isDisabled = true;
            if (lineUniqueKey == "INVALID") {
              amountField.isDisabled = true;
              unitPriceField.isDisabled = true;
              const trDom = document.getElementById(
                  "custpage_items_sublistrow" + i,
                ),
                trDomChild = trDom.children;

              for (let t = 0; t < trDomChild.length; t += 1) {
                if (columnsHidden.indexOf(t) != -1) continue;
                let tdDom = trDomChild[t];

                tdDom.setAttribute(
                  "style",
                  "background-color: " +
                    tdColorHeader +
                    "!important;border-color: white " +
                    tdColorHeader +
                    " " +
                    tdColorHeader +
                    " " +
                    tdColorHeader +
                    "!important;",
                );
              }
            } else {
              amountField.isDisabled = true;
              unitPriceField.isDisabled = true;
              const trDom = document.getElementById(
                  "custpage_items_sublistrow" + i,
                ),
                trDomChild = trDom.children;

              for (let t = 0; t < trDomChild.length; t += 1) {
                if (columnsHidden.indexOf(t) != -1) continue;
                let tdDom = trDomChild[t];
                let header = document.getElementById(
                  "custpage_items_sublistdir13",
                );

                tdDom.setAttribute(
                  "style",
                  "background-color: " +
                    tdColor +
                    "!important;border-color: white " +
                    tdColor +
                    " " +
                    tdColor +
                    " " +
                    tdColor +
                    "!important;",
                );
              }
            }

            alreadyAppliedAmount += Number(amount);
          } else {
            if (lineUniqueKey == "INVALID") {
              selectField.isDisabled = true;
              amountField.isDisabled = true;
              unitPriceField.isDisabled = true;
              const trDom = document.getElementById(
                  "custpage_items_sublistrow" + i,
                ),
                trDomChild = trDom.children;
              console.log(trDomChild);
              for (let t = 0; t < trDomChild.length - 1; t += 1) {
                console.log(trDomChild);
                if (columnsHidden.indexOf(t) != -1) continue;
                let tdDom = trDomChild[t];

                tdDom.setAttribute(
                  "style",
                  "background-color: " +
                    tdColorHeader +
                    "!important;border-color: white " +
                    tdColorHeader +
                    " " +
                    tdColorHeader +
                    " " +
                    tdColorHeader +
                    "!important;",
                );
              }
            } else {
              selectField.isDisabled = false;
            }
          }
        } else {
          selectField.isDisabled = false;
        }

        for (let a = 0; a < columnToDisable.length; a++) {
          const itemField = suitelet.getSublistField({
            sublistId: "custpage_items_sublist",
            fieldId: columnToDisable[a],
            line: i,
          });
          // if (
          //   fullPartial.includes("Full") &&
          //   columnToDisable[a] == "custpage_full"
          // ) {
          //   continue;
          // }
          // if (
          //   !fullPartial.includes("Full") &&
          //   columnToDisable[a] == "custpage_partial"
          // ) {
          //   continue;
          // }

          if (
            columnToDisable[a] == "custpage_unit_price" ||
            columnToDisable[a] == "custpage_amount_paid"
          ) {
            if (parentCM && isEdit == false) {
              // itemField.isDisabled = false;
              amountField.isDisabled = true;
              unitPriceField.isDisabled = true;
            } else {
              if (lineUniqueKey == "INVALID") {
                selectField.isDisabled = true;
              }
              // itemField.isDisabled = true;

              amountField.isDisabled = true;
              unitPriceField.isDisabled = true;
            }
          } else {
            // itemField.isDisabled = true;
          }
        }
      }

      suitelet.setValue({
        fieldId: "custpage_amount",
        value: +totalAmount.toFixed(2),
      });
    } catch (e) {
      console.error("pageInit", e.message);
    }
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
      if (scriptContext.fieldId === "custpage_checkbox") {
        // Make sure this ID matches the checkbox ID in your Suitelet-generated table
        const checkboxElement = document.getElementById(scriptContext.fieldId);
        const isChecked = checkboxElement.checked;

        // Find the closest row and get the CM ID
        const row = checkboxElement.closest("tr");
        const cmId = row.querySelector("#cmId").textContent.trim();

        console.log("Checkbox Checked:", isChecked);
        console.log("CM ID:", cmId);

        // Perform any action needed, such as saving this data using a Suitelet or AJAX call
      }

      if (scriptContext.fieldId == "custpage_show_account") {
        const showAccount = suitelet.getValue("custpage_show_account");
        let URL = removeParamFromURL(location.href, "showAccount");
        URL += "&showAccount=" + showAccount;
        // console.log("newURL: " + URL);
        window.onbeforeunload = null;
        window.open(URL, "_self");
      }
      if (scriptContext.fieldId == "custpage_custom_amount") {
        //console.log("fieldChanged custpage_custom_amount");
        const customAmount = suitelet.getValue("custpage_custom_amount");
        const invAmount = suitelet.getValue("custpage_amount");
        // console.table(customAmount, invAmount);
        for (let i = 0; i < lineCount; i++) {
          suitelet.selectLine({
            sublistId: "custpage_items_sublist",
            line: i,
          });
          const isSelected = suitelet.getSublistValue({
            sublistId: "custpage_items_sublist",
            fieldId: "custpage_select",
            line: i,
          });
          log.audit("isSelected " + isSelected);
          if (isSelected != true) continue;

          const lineTotal = suitelet.getSublistValue({
            sublistId: "custpage_items_sublist",
            fieldId: "custpage_packing_slip_value",
            line: i,
          });

          const percentage = lineTotal / invAmount;
          console.table(percentage, lineTotal, invAmount);
          let newAmount = Number(percentage) * customAmount;

          // if (isGovernment == true) {
          //   const res = itemlib.getCurrentDiscountPercentage({
          //     displayName: "Government",
          //   });
          //   console.log("erv amount " + newAmount * res.totalPercent);
          //   suitelet.setCurrentSublistValue({
          //     sublistId: "custpage_items_sublist",
          //     fieldId: "custpage_amount_paid",
          //     value: newAmount * res.totalPercent,
          //   });
          // } else {
          suitelet.setCurrentSublistValue({
            sublistId: "custpage_items_sublist",
            fieldId: "custpage_amount_paid",
            value: newAmount.toFixed(2),
          });
          //}
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

        let unitPrice = suitelet.getSublistValue({
          sublistId: "custpage_items_sublist",
          fieldId: "custpage_unit_price",
          line: currIndex,
        });
        let packageSize = suitelet.getSublistValue({
          sublistId: "custpage_items_sublist",
          fieldId: "custpage_package_size",
          line: currIndex,
        });

        let quantity = suitelet.getSublistValue({
          sublistId: "custpage_items_sublist",
          fieldId: "custpage_full",
          line: currIndex,
        });
        let partialCount = suitelet.getSublistValue({
          sublistId: "custpage_items_sublist",
          fieldId: "custpage_partial",
          line: currIndex,
        });
        let fullPartial = suitelet.getSublistValue({
          sublistId: "custpage_items_sublist",
          fieldId: "custpage_full_partial",
          line: currIndex,
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
          let totalAmount = 0;
          if (isEdit == false || isEdit == "false") {
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
              console.table("isSelected", isSelected + i);
              if (isSelected == true || isSelected == "true") {
                let amount = suitelet.getSublistValue({
                  sublistId: "custpage_items_sublist",
                  fieldId: "custpage_packing_slip_value",
                  line: i,
                });
                console.table("amount", amount, i);
                totalAmount += Number(amount);
              }
            }
            totalAmount &&
              suitelet.setValue({
                fieldId: "custpage_amount",
                value: totalAmount,
              });
          }

          if (isSelected == false) {
            let currentAmount = suitelet.getCurrentSublistValue({
              sublistId: "custpage_items_sublist",
              fieldId: "custpage_amount_paid",
            });
            suitelet.setValue({
              fieldId: "custpage_amount",
              value: totalAmount - currentAmount,
            });

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
              value: totalAmount.toFixed(2),
            });
        }
        if (scriptContext.fieldId === "custpage_amount_paid") {
          let amountPaid = suitelet.getSublistValue({
            sublistId: "custpage_items_sublist",
            fieldId: "custpage_amount_paid",
            line: currIndex,
          });
          const packageSize = suitelet.getSublistValue({
            sublistId: "custpage_items_sublist",
            fieldId: "custpage_package_size",
            line: currIndex,
          });
          // console.log("packageSize", packageSize);
          let quantity = suitelet.getSublistValue({
            sublistId: "custpage_items_sublist",
            fieldId: "custpage_full",
            line: currIndex,
          });
          let partialCount = suitelet.getSublistValue({
            sublistId: "custpage_items_sublist",
            fieldId: "custpage_partial",
            line: currIndex,
          });
          let fullPartial = suitelet.getSublistValue({
            sublistId: "custpage_items_sublist",
            fieldId: "custpage_full_partial",
            line: currIndex,
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

          const totalLineAmount = suitelet.getSublistValue({
            sublistId: "custpage_items_sublist",
            fieldId: "custpage_packing_slip_value",
            line: currIndex,
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
      const selectField = curRec.getCurrentSublistField({
        sublistId: SUBLIST,
        fieldId: "custpage_select",
      });
      if (selectField.isDisabled == true) continue;

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
      // Allow UI to update before heavy execution
      setTimeout(() => {
        jQuery("body").loadingModal({
          position: "auto",
          text: "Processing. Please wait...",
          color: "#fff",
          opacity: "0.7",
          backgroundColor: "rgb(220,220,220)",
          animation: "doubleBounce",
        });

        // Ensure the browser updates UI first
        requestAnimationFrame(() => console.log("Loading animation started"));
      }, 10); // Small delay to allow the UI to refresh
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

      try {
        for (
          let i = 0;
          i < suitelet.getLineCount("custpage_items_sublist");
          i++
        ) {
          let lineUniqueKey = suitelet.getSublistValue({
            sublistId: SUBLIST,
            fieldId: "custpage_lineuniquekey",
            line: i,
          });
          if (lineUniqueKey == "INVALID") continue;
          let isSelected = suitelet.getSublistValue({
            sublistId: SUBLIST,
            fieldId: "custpage_select",
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

          if (isGovernment == true && amountApplied > 0) {
            const res = itemlib.getCurrentDiscountPercentage({
              displayName: "Government",
            });
            total = packingSlipAmountTotal * res.totalPercent;
            unitPrice *= res.totalPercent;
            amountApplied *= res.totalPercent;
          } else if (isTopCo == true && amountApplied > 0) {
            const res = itemlib.getCurrentDiscountPercentage({
              displayName: "Top Co",
            });
            total = packingSlipAmountTotal * res.totalPercent;
            unitPrice *= res.totalPercent;
            amountApplied *= res.totalPercent;
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
          if (isEmpty(unitPrice) || isEmpty(amountApplied)) {
            alert("Please enter amount on line: " + (i + 1));
            return;
          }
          total += Number(amountApplied);
          if (amountApplied > 0) {
            packingSlipAmountTotal += Number(packingSlipAmount);
          }

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
          // setTimeout(function () {
          //   window.close();
          // }, 2000);
          //   window.open(`${rclSuiteletURL}`, "_self");
        }, 2000);
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

  function refresh() {
    location.reload();
  }

  /**
   * Updates the content management system.
   *
   * @returns {void}
   */
  function updateCM(context) {
    let ids = [];
    try {
      for (let i = 0; i < suitelet.getLineCount(SUBLIST); i++) {
        const isSelected = suitelet.getSublistValue({
          sublistId: SUBLIST,
          fieldId: "custpage_notreconciled",
          line: i,
        });
        if (isSelected == false) {
          continue;
        }
        const internalId = suitelet.getSublistValue({
          sublistId: SUBLIST,
          fieldId: "custpage_internalid",
          line: i,
        });

        ids.push(internalId);
      }

      if (ids.length == 0) {
        alert("Please select credit memo");
      }
      handleButtonClick();
      let stSuiteletUrl = url.resolveScript({
        scriptId: "customscript_rxrs_sl_view_credit_memo",
        deploymentId: "customdeploy_rxrs_sl_view_credit_memo",
        params: {
          cmIds: JSON.stringify(ids),
        },
      });

      postURL({ URL: stSuiteletUrl });
      window.opener.location.reload();
      setTimeout(function () {
        window.close();
      }, 200);
    } catch (e) {
      console.error("updateCM", e.message);
    }
  }

  /**
   * Attach event listener to detect checkbox changes in the "notReconciled" column
   *
   * @return {void}
   */
  function attachCheckboxListener() {
    // Attach event listener to detect checkbox changes
    document.addEventListener("change", function (event) {
      let target = event.target;

      // Check if the changed element is a checkbox inside the "notReconciled" column
      if (target.matches("#notReconciled input[type='checkbox']")) {
        handleCheckboxChange(target);
      }
    });
  }

  /**
   * Handles the change event for a checkbox and updates the corresponding cmId in the cmWithChanges array.
   *
   * @param {HTMLInputElement} checkbox - The checkbox element that triggered the change event.
   * @returns {void}
   */
  function handleCheckboxChange(checkbox) {
    let isChecked = checkbox.checked; // Check if checkbox is checked

    // Get the corresponding cmId from the same row
    let row = checkbox.closest("tr"); // Find the closest table row
    let cmId = row.querySelector("#cmId").textContent.trim(); // Get cmId from that row
    let existingIndex = cmWithChanges.findIndex((item) => item.cmId === cmId);

    if (existingIndex !== -1) {
      // Update the existing object's isChecked value (even if unchecked)
      cmWithChanges[existingIndex].isChecked = isChecked;
    } else {
      // Always add new entry if not found
      cmWithChanges.push({ cmId: cmId, isChecked: isChecked });
    }

    // Log the results
    console.table(cmWithChanges);

    // Toggle button visibility based on cmWithChanges length
    toggleButtonVisibility();
  }

  /**
   * Attaches a button listener to the element with id "updateCMIds".
   * The listener prevents form submission and stops other events from triggering,
   * then calls the function getAllCmIdsAndReconciledStatus().
   *
   * @return {void}
   */
  function attachButtonListener() {
    let updateCM = document.getElementById("updateCMIds");
    if (updateCM) {
      updateCM.addEventListener("click", function (event) {
        event.preventDefault(); // Prevent unintended form submission
        event.stopPropagation(); // Stop other events from triggering
        getAllCmIdsAndReconciledStatus();
      });
    }
  }

  /**
   * Toggles the visibility of the upload button based on the number of checkboxes checked
   *
   * @return {undefined}
   */
  function toggleButtonVisibility() {
    let uploadButton = document.getElementById("updateCMIds");

    // Check if at least one checkbox is checked
    if (cmWithChanges.length > 0) {
      uploadButton.style.display = "block"; // Show button
    } else {
      uploadButton.style.display = "none"; // Hide button
    }
  }

  /**
   * Retrieves all credit memo IDs and their reconciliation status.
   *
   * @return {void}
   */
  function getAllCmIdsAndReconciledStatus() {
    // Log and alert the collected data
    log.debug("Collected CM Data:", cmWithChanges);
    if (cmWithChanges.length == 0) {
      showMessage();
    } else {
      cmWithChanges.forEach((val) => {
        const { cmId, isChecked } = val;
        record.submitFields({
          type: "customrecord_creditmemo",
          id: cmId,
          values: {
            custrecord_not_reconciled: isChecked,
          },
        });
      });
      window.location.reload();
    }

    // Here you can send the cmData to a NetSuite Suitelet or RESTlet via AJAX if needed.
  }

  /**
   * Attach event listeners to all links with the "confirm-link" class that displays a confirmation message before the action.
   *
   * @return {void}
   */
  function attachConfirmLinks() {
    // Get all links with the "confirm-link" class
    const links = document.getElementsByClassName("confirm-link");
    for (var i = 0; i < links.length; i++) {
      // Attach event listener using traditional function syntax
      links[i].addEventListener("click", function (e) {
        // Display confirmation message
        if (!confirm("Are you sure you want to delete this?")) {
          e.preventDefault(); // Prevent the link's default action if canceled
        }
      });
    }
  }

  /**
   * moveFileField moves the file field container to the target group container using jQuery.
   * If both containers are found, the file field is moved visually.
   *
   * @return {void}
   */
  function moveFileField() {
    // Ensure jQuery is loaded
    if (typeof jQuery !== "undefined") {
      console.log("jQuery is loaded");

      const fileFieldContainer = jQuery("#custpage_file_upload_fs"); // File field container
      const targetGroup = jQuery("#tr_fg_custpage_creditmemos"); // Field group container

      console.log("File Field:", fileFieldContainer.length);
      console.log("Target Group:", targetGroup.length);

      if (fileFieldContainer.length && targetGroup.length) {
        targetGroup.append(fileFieldContainer); // Move file field visually
        console.log("File field moved successfully!");
      } else {
        console.log("Could not find elements. Check IDs.");
      }
    } else {
      console.log("jQuery is not loaded");
    }
  }

  return {
    pageInit: pageInit,
    refresh: refresh,
    updateCM: updateCM,
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
