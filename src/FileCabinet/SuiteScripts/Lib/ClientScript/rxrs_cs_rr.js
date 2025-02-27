/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define([
  "N/currentRecord",
  "N/url",
  "N/https",
  "N/ui/message",
  "N/ui/dialog",
  "N/search",
  "N/transaction",
  "N/record",
], /**
 * @param{currentRecord} currentRecord
 * @param{url} url
 * @param https
 * @param message
 */ function (
  currentRecord,
  url,
  https,
  message,
  dialog,
  search,
  transaction,
  record,
) {
  var bool = true;
  let mode, type;
  let existingRR = null;

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
    mode = scriptContext.mode;
    currentRecord = scriptContext.currentRecord;
    type = currentRecord.type;
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
    const { currentRecord, fieldId } = scriptContext;
    try {
      if ((scriptContext.mode = "create")) {
        if (
          fieldId == "custbody_kd_master_return_id" ||
          fieldId == "custbody_kd_rr_category"
        ) {
          const category = currentRecord.getValue("custbody_kd_rr_category");
          const mrrId = currentRecord.getValue("custbody_kd_master_return_id");
          if (category && mrrId) {
            existingRR = getReturnRequestPerCategory({
              mrrId: mrrId,
              category: category,
            });
            console.log("existingRR", +existingRR);
            if (existingRR) {
              validateCreation();
            }
          }
        }
      }
    } catch (e) {
      log.error("fieldChanged", e.message);
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

  function saveRecord(scriptContext) {
    try {
      console.log(mode, bool);
      if (mode == "create") {
        if (bool == true) {
          transaction.void({
            type: currentRecord.type,
            id: existingRR,
          });
        }
        return bool;
      }
    } catch (e) {
      log.error("saveRecord", e.message);
    }
  }

  function validateCreation() {
    let button1 = {
      label: "Okay",
      value: true,
    };
    let button2 = {
      label: "Cancel",
      value: false,
    };

    let options = {
      title: "WARNING",
      message:
        "Return Category Already Exist. Saving this transaction will void the existing Return Request",
      buttons: [button1, button2],
    };

    function success(result) {
      console.log("Success with value " + result);
      bool = result;
      if (result == false) {
        let m = message.create({
          type: message.Type.ERROR,
          title: "ERROR",
          message: "YOU CANNOT SAVE THIS TRANSACTION. ",
        });
        m.show(100000000);
      }
    }

    function failure(reason) {
      console.log("Failure: " + reason);
    }

    dialog.create(options).then(success).catch(failure);
  }

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

  // Represent common settings with constants.
  const DEFAULT_DIMENSIONS = "width=1500,height=1200,left=100,top=1000";
  const LARGE_DIMENSIONS = "width=2000,height=1200,left=100,top=1000";

  // Suitelet actions with respective options.
  const ACTION_CONFIG = {
    fullWindow: { windowName: "fullWindow", dimensions: DEFAULT_DIMENSIONS },
    verifyItems: { windowName: "verifyItems", dimensions: DEFAULT_DIMENSIONS },
    add222FormReference: {
      windowName: "add222FormReference",
      dimensions: LARGE_DIMENSIONS,
    },
    splitPayment: {
      windowName: "splitPayment",
      dimensions: DEFAULT_DIMENSIONS,
    },
    default: { windowName: "default", dimensions: DEFAULT_DIMENSIONS },
  };

  function openSuitelet(options) {
    let { url, action = "default" } = options;
    console.log(url);
    console.log(action);

    // Retrieve the configuration for this action.
    const config = ACTION_CONFIG[action] || ACTION_CONFIG["default"];

    // Opens the window with the configuration for this action.
    window.open(url, config.windowName, config.dimensions);
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

  /**
   * Get the return request id per category
   * @param {string}options.mrrId - Master Return
   * @param {string}options.category
   * @return the Internal Id of the Return Request
   */
  function getReturnRequestPerCategory(options) {
    log.audit("getReturnRequestPerCategory", options);
    let { mrrId, category } = options;
    let rrId;
    try {
      const transactionSearchObj = search.create({
        type: "transaction",
        filters: [
          ["type", "anyof", "CuTrSale102", "CuTrPrch106"],
          "AND",
          ["custbody_kd_master_return_id", "anyof", mrrId],
          "AND",
          ["voided", "is", "F"],
        ],
      });
      category &&
        transactionSearchObj.filters.push(
          search.createFilter({
            name: "custbody_kd_rr_category",
            operator: "anyof",
            values: category,
          }),
        );

      transactionSearchObj.run().each(function (result) {
        rrId = result.id;
        return true;
      });
      return rrId;
    } catch (e) {
      log.error("getReturnRequestPerCategory", e.message);
    }
  }

  /**
   * Retrieves a list of all employees from the system.
   *
   * @returns {Object[]} An array of employee objects containing their ID and name.
   */
  const getAllEmployees = () => {
    const employeeList = [];

    const employeeSearch = search.create({
      type: search.Type.EMPLOYEE,
      columns: ["internalid", "entityid"],
    });

    const pagedResults = employeeSearch.runPaged({ pageSize: 1000 });

    pagedResults.pageRanges.forEach((pageRange) => {
      const page = pagedResults.fetch({ index: pageRange.index });
      page.data.forEach((result) => {
        employeeList.push({
          id: result.getValue("internalid"),
          name: result.getValue("entityid"),
        });
      });
    });

    return employeeList;
  };
  /**
   * Create and display a popup dialog to assign an employee by selecting from a dropdown list.
   *
   * The function performs the following actions:
   * 1. Creates a select element using vanilla JavaScript with employee options.
   * 2. Listens for changes in the selection and logs the selected employee's ID.
   * 3. Displays the dialog with buttons for assigning or canceling.
   * 4. Assigns the selected employee if the user chooses to assign.
   *
   * @returns {Promise<void>} A Promise that resolves once the operation is completed.
   * @throws {Error} If no employee is selected during the assignment process.
   */
  const openEmployeePopup = async () => {
    try {
      // Create a select element using vanilla JavaScript
      let select = document.createElement("select");
      select.id = "employeeSelect";
      select.style.width = "100%";
      select.style.padding = "5px";
      select.style.marginTop = "10px";

      // Sample employee options
      let employeeOptions = getAllEmployees();
      employeeOptions.forEach((emp) => {
        let option = document.createElement("option");
        option.value = emp.id;
        option.textContent = emp.name;
        select.appendChild(option);
      });

      // Listen for selection change
      let selectedEmployeeId = select.value;
      select.addEventListener("change", function () {
        selectedEmployeeId = this.value;
        console.log("New selected employee:", selectedEmployeeId);
      });

      // Create a container div and add the dropdown
      let container = document.createElement("div");
      container.innerHTML = "<p>Select an employee:</p>";
      container.appendChild(select);

      // Show the dialog
      const result = await dialog.create({
        title: "Assign Employee",
        message: container,
        buttons: [
          { label: "Assign", value: true },
          { label: "Cancel", value: false },
        ],
      });

      if (result) {
        if (!selectedEmployeeId) throw new Error("No employee selected.");
        await assignEmployee(selectedEmployeeId);
      }
    } catch (error) {
      console.error("Error in popup:", error);
    }
  };

  /**
   * Assigns a new employee to the current record by updating the 'custbody_assignee' field.
   * This function takes the employeeId as a parameter and uses it to update the record.
   * After updating the record, it reloads the page to reflect the changes made.
   *
   * @param {String} employeeId - The employee Id to be assigned to the record
   * @returns {Promise} - A promise that resolves after updating the record and reloading the page
   */
  const assignEmployee = async (employeeId) => {
    try {
      const rec = currentRecord.get();
      record.submitFields({
        type: rec.type,
        id: rec.id,
        values: {
          custbody_assignee: employeeId,
        },
      });
      location.reload(); // Refresh page after updating the record
    } catch (error) {
      console.error("Error updating record:", error);
    }
  };

  return {
    createTransaction: createTransaction,
    pageInit: pageInit,
    openSuitelet: openSuitelet,
    generate222Form: generate222Form,
    saveRecord: saveRecord,
    fieldChanged: fieldChanged,
    openEmployeePopup: openEmployeePopup,
  };
});
