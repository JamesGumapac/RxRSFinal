/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(["N/currentRecord", "N/search", "N/url", "N/https", "N/ui/message"], /**
 * @param{currentRecord} currentRecord
 * @param{search} search
 * @param{url} url
 * @param https
 * @param message
 */ function (currentRecord, search, url, https, message) {
  let generatedForm;

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
    generatedForm = urlParams.get("GeneratedForm");
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
  }

  window.onload = function () {
    //considering there aren't any hashes in the urls already
  };

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
    let { currentRecord, fieldId } = scriptContext;
    try {
      if (fieldId == "custpage_credit_memo") {
        const creditMemoId = currentRecord.getValue("custpage_credit_memo");
        const invoiceId = currentRecord.getValue("custpage_invoice_id");
        const invLineCount = currentRecord.getValue("custpage_num_of_lines");
        let stSuiteletUrl = url.resolveScript({
          scriptId: "customscript_add_payment",
          deploymentId: "customdeploy_add_payment",
          returnExternalUrl: false,
          params: {
            invoiceId: invoiceId,
            creditMemoId: creditMemoId,
            lineCount: invLineCount,
          },
        });
        window.ischanged = false;
        window.open(stSuiteletUrl, "_self");
      }
      if (fieldId == "custpage_amount") {
        const paymentAmount = currentRecord.getValue("custpage_amount");
        const cmAmount = currentRecord.getValue("custpage_cm_amount");

        if (Number(paymentAmount) > Number(cmAmount)) {
          alert("Payment must be less than or equal to Credmit Memo Amount");
          currentRecord.setValue({
            fieldId: "custpage_amount",
            value: 0,
          });
        }
      }
    } catch (e) {
      console.error("fieldChanged", e.message);
    }
  }

  /**
   * Function to be executed when field is slaved.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   * @param {string} scriptContext.fieldId - Field name
   *
   * @since 2015.2
   */
  function postSourcing(scriptContext) {}

  /**
   * Function to be executed after sublist is inserted, removed, or edited.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   *
   * @since 2015.2
   */
  function sublistChanged(scriptContext) {}

  /**
   * Function to be executed after line is selected.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   *
   * @since 2015.2
   */
  function lineInit(scriptContext) {}

  /**
   * Validation function to be executed when field is changed.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   * @param {string} scriptContext.fieldId - Field name
   * @param {number} scriptContext.lineNum - Line number. Will be undefined if not a sublist or matrix field
   * @param {number} scriptContext.columnNum - Line number. Will be undefined if not a matrix field
   *
   * @returns {boolean} Return true if field is valid
   *
   * @since 2015.2
   */
  function validateField(scriptContext) {}

  /**
   * Validation function to be executed when sublist line is committed.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   *
   * @returns {boolean} Return true if sublist line is valid
   *
   * @since 2015.2
   */
  function validateLine(scriptContext) {}

  /**
   * Validation function to be executed when sublist line is inserted.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   *
   * @returns {boolean} Return true if sublist line is valid
   *
   * @since 2015.2
   */
  function validateInsert(scriptContext) {}

  /**
   * Validation function to be executed when record is deleted.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.sublistId - Sublist name
   *
   * @returns {boolean} Return true if sublist line is valid
   *
   * @since 2015.2
   */
  function validateDelete(scriptContext) {}

  /**
   * Validation function to be executed when record is saved.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @returns {boolean} Return true if record is valid
   *
   * @since 2015.2
   */
  function saveRecord(scriptContext) {}

  function addPayment(cmInternalIds) {
    const curRec = currentRecord.get();

    let params = {
      dateReceived: curRec.getText("custpage_payment_date_received"),
      invoiceId: curRec.getValue("custpage_invoice_id"),
      cmLinesCount: curRec.getValue("custpage_num_of_lines"),
      cmLinesCountWithPayment: curRec.getValue(
        "custpage_num_of_lines_with_amt",
      ),
      paymentAmount: curRec.getValue("custpage_amount"),
      cmId: curRec.getValue("custpage_credit_memo"),
      cmAmount: curRec.getValue("custpage_cm_amount"),
      paymentId: curRec.getValue("custpage_payment_id"),
      cmTotalAmount: curRec.getValue("custpage_total_cm_amount"),
      cmInternalIds: cmInternalIds,
    };
    let paymentParams = {
      paymentDetails: JSON.stringify(params),
      action: "createCustPayment",
      isReload: true,
    };
    console.table(paymentParams);
    handleButtonClick();
    let stSuiteletUrl = url.resolveScript({
      scriptId: "customscript_sl_cs_custom_function",
      deploymentId: "customdeploy_sl_cs_custom_function",
      params: paymentParams,
    });

    postURL({ URL: stSuiteletUrl });
    setTimeout(function () {
      let suiteletURL = url.resolveScript({
        scriptId: "customscript_add_payment",
        deploymentId: "customdeploy_add_payment",
        returnExternalUrl: false,
        params: {
          isReload: true,
          creditMemoId: params.cmId,
          invoiceId: params.invoiceId,
        },
      });
      window.ischanged = false;
      window.open(`${suiteletURL}`, "_self");
    }, 2000);
  }

  /**
   * Call the Suitelet to create the Return Packages Per Return Request
   * @param mrrId
   */

  function createReturnPackages(mrrId) {
    try {
      const C2Category = 3;
      const curRec = currentRecord.get();
      const category = curRec.getValue("custpage_product_group");
      const rrId = curRec.getValue("custpage_returnrequest");
      const numberOfLabels = curRec.getValue("custpage_num_of_labels");
      let params = {
        category: category,
        mrrId: mrrId,
        requestedDate: curRec.getValue("custpage_estimated_ship_date"),
        customer: curRec.getValue("custpage_entity"),
      };

      if (rrId) {
        params.rrId = rrId;
      }
      // else {
      //   if (category == C2Category && generatedForm != "true") {
      //     alert("Cannot create package. Form 222 Kit must be created first.");
      //     return;
      //   }
      // }
      let returnPackageParams = {
        returnPackageDetails: JSON.stringify(params),
        action: "createReturnPackages",
        numberOfLabels: numberOfLabels,
        isReload: true,
      };
      console.table(returnPackageParams);
      handleButtonClick();
      let stSuiteletUrl = url.resolveScript({
        scriptId: "customscript_rxrs_sl_generate_label",
        deploymentId: "customdeploy_rxrs_sl_generate_label",
        params: returnPackageParams,
      });

      postURL({ URL: stSuiteletUrl });
      setTimeout(function () {
        let suiteletURL = url.resolveScript({
          scriptId: "customscript_rxrs_sl_generate_label",
          deploymentId: "customdeploy_rxrs_sl_generate_label",
          returnExternalUrl: false,
          params: {
            isReload: true,
            mrrId: mrrId,
          },
        });
        window.ischanged = false;
        window.open(`${suiteletURL}`, "_self");
      }, 2000);
    } catch (e) {
      console.error("createReturnPackages", e.message);
    }
  }

  function handleButtonClick(str) {
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
          console.log(response.body);
          jQuery("body").loadingModal("destroy");
          if (JSON.stringify(response.body).includes("ERROR")) {
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
              window.close();
            }, 2000);
          }
        }
      }, 100);
    } catch (e) {
      console.error("postURL", e.message);
    }
  }

  return {
    pageInit: pageInit,
    addPayment: addPayment,
    fieldChanged: fieldChanged,
    createReturnPackages: createReturnPackages,
  };
});
