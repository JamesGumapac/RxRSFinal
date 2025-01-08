/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(["N/currentRecord", "N/url", "N/https", "N/ui/message"], /**
 * @param{currentRecord} currentRecord
 * @param{url} url
 * @param https
 * @param message
 */ function (currentRecord, url, https, message) {
  /**
   * Function to be executed after page is initialized.
   *
   * @param {Object} scriptContext
   * @param {Record} scriptContext.currentRecord - Current form record
   * @param {string} scriptContext.mode - The mode in which the record is being accessed (create, copy, or edit)
   *
   * @since 2015.2
   */
  function pageInit(scriptContext) {}

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
  function fieldChanged(scriptContext) {}

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

  /**
   * Call a suitelet to perform custom action
   * @param options.mrrId Master Return Id
   * @param options.rrId  Return RequestId
   * @param options.rclId  Return Cover Letter Id
   * @param options.entity Entity Id
   * @param options.poId Transaction Id
   * @param options.returnableFee returnable Fee
   * @param options.action Specific action to call in the Suitelet
   */
  function createTransaction(options) {
    console.table(options);
    const curRec = currentRecord.get();
    let {
      mrrId,
      rrId,
      entity,
      rclId,
      action,
      billId,
      poId,
      returnableFee,
      planSelectionType,
      form222List,
    } = options;
    try {
      let params;
      handleButtonClick();
      switch (action) {
        case "createPO":
          params = {
            rrId: rrId,
            mrrId: mrrId,
            entity: entity,
            planSelectionType: planSelectionType,
            action: action,
          };
          break;
        case "updateBill":
          params = {
            billId: billId,
          };
          break;
        case "createBill":
          params = {
            rrId: rrId,
            mrrId: mrrId,
            entity: entity,
            action: action,
            poId: poId,
            rclId: rclId,
            returnableFee: returnableFee,
          };
          break;
        case "createInventoryAdjustment":
          params = {
            rrId: rrId,
            mrrId: mrrId,
            action: "createInventoryAdjustment",
          };
          break;
        case "createReturnCoverLetter":
          params = {
            mrrId: mrrId,
            action: "createReturnCoverLetter",
          };
          break;
      }

      let functionSLURL = url.resolveScript({
        scriptId: "customscript_sl_cs_custom_function",
        deploymentId: "customdeploy_sl_cs_custom_function",
        returnExternalUrl: false,
        params: params,
      });

      postURL({ URL: functionSLURL });
    } catch (e) {
      log.error("createTransaction", e.message);
    }
  }

  /**
   * Generates a 222 Form for the specified IDs by making HTTP POST requests to an external URL.
   *
   * @param {Array} ids - An array of IDs for which 222 Forms should be generated.
   * @return {void}
   */
  function generate222Form(ids) {
    ids.forEach((id) => {
      let SLURL = url.resolveScript({
        scriptId: "customscript_kd_sl_generate_2frn_form222",
        deploymentId: "customdeploy_kd_sl_generate_2frn_form222",
        returnExternalUrl: false,
        params: {
          custscript_kd_2frn_id: id,
        },
      });
      let response = https.post({
        url: SLURL,
      });
      if (response) {
        let m = message.create({
          type: message.Type.CONFIRMATION,
          title: "SUCCESS",
          message: response.body,
        });
        m.show(10000);
        setTimeout(function () {
          location.reload();
        }, 10000);
      }
      postURL({ URL: SLURL });
    });
  }

  /**
   * Show loading animation
   */
  function handleButtonClick() {
    try {
      jQuery("body").loadingModal({
        position: "auto",
        text: "Please wait...",
        color: "#fff",
        opacity: "0.8",
        backgroundColor: "rgb(100,116,156)",
        animation: "foldingCube",
      });
    } catch (e) {
      console.error("handleButtonClick", e.message);
    }
  }

  /**
   * Open suitelet URL
   * @param options.url URL
   * @param options.action
   */
  function openSuitelet(options) {
    let { url, action } = options;
    console.log(url);
    console.log(action);
    action = action ? action : "default";
    switch (action) {
      case "fullWindow":
        window.open(url);
        break;
      case "verifyItems":
        window.open(
          url,
          "verifyItems",
          "width=1500,height=1200,left=100,top=1000",
        );
        break;
      case "add222FormReference":
        window.open(
          url,
          "add222FormReference",
          "width=2000,height=1200,left=100,top=1000",
        );
        break;
      case "splitPayment":
        window.open(
          url,
          "splitPayment",
          "width=1500,height=1200,left=100,top=1000",
        );
        break;
      case "default":
        window.open(url, "default", "width=1500,height=1200,left=100,top=1000");
        break;
      default:
        window.open(
          url,
          "splitPayment",
          "width=1500,height=1200,left=100,top=1000",
        );
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

  return {
    createTransaction: createTransaction,
    pageInit: pageInit,
    openSuitelet: openSuitelet,
    generate222Form: generate222Form,
  };
});
