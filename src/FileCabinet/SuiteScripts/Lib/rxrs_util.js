/**
 * @NApiVersion 2.1
 */
define([
  "N/url",
  "N/email",
  "N/file",
  "N/runtime",
  "N/search",
  "N/record",
  "N/https",
  "./rxrs_verify_staging_lib",
], /**
 * @param url
 * @param{email} email
 * @param{file} file
 * @param{runtime} runtime
 * @param{search} search
 * @param record
 * @param https
 * @param vslib
 */ (url, email, file, runtime, search, record, https, vslib) => {
  const RRCATEGORY = Object.freeze({
    C2: 3,
    RXOTC: 1,
    C3TO5: 4,
  });

  const priceLevel = [
    { priceName: "ERV : GOVERNMENT", column: "price15" },
    { priceName: "ERV-CONFIGURED", column: "price14" },
    { priceName: "M-CONFIGURED", column: "price8" },
    { priceName: "MANUAL INPUT", column: "price12" },
    { priceName: "MFG ERV", column: "price12" },
    { priceName: "TOPCO RETURN VALUE", column: "price2" },
    { priceName: "U-CONFIGURED : EMES", column: "price18" },
    { priceName: "U-CONFIGURED : MKRX", column: "price7" },
    { priceName: "U-CONFIGURED : RXR", column: "price16" },
    { priceName: "WHOLESALE ACQUISITION COST", column: "price17" },

    {
      priceName: "BASE PRICE",
      column: "baseprice",
    },
  ];

  /**
   * Move the processed CSV file to done folder
   * @param {*} options.fileId
   * @param {*} options.folderId
   */
  function moveFolderToDone(options) {
    let { fileId, folderId } = options;
    const fileObj = file.load({
      id: fileId,
    });
    if (fileObj) {
      fileObj.folder = folderId;
      const moved = fileObj.save();
      log.debug(
        `File with internal ID: ${moved}  moved to folder ${folderId}.`,
      );
    } else log.debug(`File with internal ID:  ${fileId} not found.`);
  }

  /**
   * Return file Id based on filename
   * @param fileName
   * @returns {number}
   */
  function getFileId(fileName) {
    log.audit("getFileId", fileName);
    try {
      const fileSearch = search
        .create({
          type: "file",
          filters: [["name", "is", fileName]],
        })
        .run()
        .getRange({ start: 0, end: 1 });
      log.debug("fileSearch", fileSearch);
      return fileSearch[0].id;
    } catch (e) {
      log.error("getFileId", { error: e.message, file: fileName });
    }
  }

  /**
   * Return Folder Id based on Folder Name
   * @param FolderName
   * @returns {number}
   */
  function getFolderId(FolderName) {
    log.audit("getFolderId", FolderName);
    let folderId;
    try {
      var folderSearchObj = search.create({
        type: "folder",
        filters: [["name", "is", FolderName]],
      });

      folderSearchObj.run().each(function (result) {
        folderId = result.id;
        return true;
      });

      return folderId;
    } catch (e) {
      log.error("getFolderId", e.message);
    }
  }

  const SERVICETYPE = {
    "SELF SERVICE": 1,
    "MAIL-IN": 2,
    "REP SERVICE": 3,
  };
  const rrStatus = Object.freeze({
    PendingReview: "A",
    Rejected: "B",
    Authorized: "C",
    PendingPackageReceipt: "D",
    ReceivedPendingProcessing: "E",
    Processing: "F",
    PendingApproval: "G",
    Rejected_Resubmission: "H",
    Approved: "I",
    C2Kittobemailed: "J",
    PendingVerification: "K",
  });
  const mrrStatus = Object.freeze({
    CustomerSubmitted: 1,
    New: 11,
    WaitingForApproval: 8,
    Approved: 10,
    PriceLocked: 12,
    Archived: 13,
    InProgress: 14,
    reviewPrices: 15,
  });
  const QUICKCASH = 4;

  const rxrsItem = Object.freeze({
    RxOTC: 897,
    C3To5: 896,
    C2: 895,
    NonScannableItem: 649,
  });

  /**
   * Return the first employee that is checked as DEFAULT TASK ASSIGNEE FOR EXPIRED LICENSE
   * @return {number} return the internal Id of the employee
   */
  function getDefaultTaskAssignee() {
    let empId;
    const employeeSearchObj = search.create({
      type: "employee",
      filters: [["custentity_def_task_assignee_for_exp_lic", "is", "T"]],
    });
    const searchResultCount = employeeSearchObj.runPaged().count;
    log.debug("employeeSearchObj result count", searchResultCount);
    employeeSearchObj.run().each(function (result) {
      empId = result.id;
      return true;
    });
    return empId;
  }

  /**
   * Send email to the customer
   * @param {number} options.category
   * @param {string} options.transtatus
   * @param {number} options.entity
   * @param {number} options.tranid
   * @param {number} options.internalId
   */
  const sendEmail = (options) => {
    try {
      log.debug("sendEmail", options);
      let strSubject = "";
      let strBody = "";
      let recipient = "";
      if (
        options.category === RRCATEGORY.C2 &&
        options.transtatus === rrStatus.C2Kittobemailed
      ) {
        recipient = +options.entity;
        strSubject =
          " Your Order #" + options.tranid + "  222 Kit is on the way";
        strBody = " Your Order #" + options.tranid + "  222 Kit is on the way";
      } else {
        recipient = +options.entity;
        strSubject = " Your Order #" + options.tranid + "  Has Been Submitted";
        strBody = " Your Order #" + options.tranid + "  Has Been Submitted";
      }
      log.audit("send email info", { recipient, strSubject, strBody });
      if (recipient) {
        const userObj = runtime.getCurrentUser();
        if (userObj.id) {
          email.send({
            author: userObj.id,
            recipients: recipient,
            subject: strSubject,
            body: strBody,
            relatedRecords: {
              entityId: +options.entity,
              transactionId: options.internalId,
            },
          });
        } else {
          email.send({
            author: -5,
            recipients: recipient,
            subject: strSubject,
            body: strBody,
            relatedRecords: {
              entityId: options.entity,
              transactionId: options.internalId,
            },
          });
        }
      }
    } catch (e) {
      log.error("sendEmail", {
        errorMessage: e.message,
        parameters: options,
      });
    }
  };
  /**
   * Create Tasks
   * @param options.tranId
   * @param options.rrId
   */
  const createTask = (options) => {
    try {
      log.debug("Create Tasks Params", options);
      const taskRec = record.create({
        type: record.Type.TASK,
      });
      taskRec.setValue({
        fieldId: "title",
        value: options.tranId,
      });
      taskRec.setValue({
        fieldId: "message",
        value: "Print labels and form 222",
      });
      taskRec.setValue({
        fieldId: "assigned",
        value: runtime.getCurrentUser().id || getDefaultTaskAssignee(),
      });
      taskRec.setValue({
        fieldId: "custevent_kd_ret_req",
        value: options.rrId,
      });
      log.debug("task id ", taskRec.save());
    } catch (e) {
      log.error("createTask", e.message);
    }
  };
  /**
   * Create Tasks
   * @param options.title - Title of the Tasks
   * @param options.entityId - Associated Entity (Vendor/Customer Pharmacy)
   * @param options.recordLink - Entity Name
   * @param options.form - Form to used in the Tasks
   * @param options.transaction - Related Transaction
   * @param options.returnRequest - Return Request
   * @param options.replaceMessage Replace the last word in RMA
   * @return the internal id of the created tasks
   */
  const createTaskRecord = (options) => {
    log.audit("CreateTaskRecord", options);
    let {
      title,
      entityId,
      entityName,
      form,
      transaction,
      link,
      replaceMessage,
      returnRequest,
    } = options;
    try {
      const assignee = getDefaultTaskAssignee();
      let companyName = "";
      log.debug("Create Tasks Params", options);
      const taskRec = record.create({
        type: record.Type.TASK,
      });
      taskRec.setValue({
        fieldId: "customform",
        value: form,
      });
      taskRec.setValue({
        fieldId: "title",
        value: title,
      });
      taskRec.setValue({
        fieldId: "message",
        value: title,
      });
      taskRec.setValue({
        fieldId: "assigned",
        value: assignee,
      });

      taskRec.setValue({
        fieldId: "company",
        value: entityId,
      });
      returnRequest &&
        taskRec.setValue({
          fieldId: "custevent_kd_ret_req",
          value: returnRequest,
        });
      taskRec.setValue({
        fieldId: "sendemail",
        value: true,
      });
      let dueDate = addDaysToDate({ date: new Date(), days: 1 });
      log.audit("dueDate", dueDate);
      if (new Date(dueDate).getDay() == 6) {
        dueDate = addDaysToDate({ date: new Date(), days: 2 });
      }
      taskRec.setValue({
        fieldId: "duedate",
        value: new Date(dueDate),
      });
      let taskId = taskRec.save();
      log.debug("task id ", taskId);
      let bodyMessage = "";
      if (replaceMessage == true) {
        bodyMessage = changeLastWord(title, link);
      } else {
        bodyMessage = title + ` for ${link}`;
      }
      email.send({
        author: assignee,
        recipients: assignee,
        subject: title,
        body: bodyMessage,
      });
      if (transaction) {
        record.submitFields({
          type: "task",
          id: taskId,
          values: {
            transaction: transaction,
          },
        });
      }
      return taskId;
    } catch (e) {
      log.error("createTask", e.message);
    }
  };

  function changeLastWord(sentence, newWord) {
    // Split the sentence into words
    let words = sentence.split(" ");

    // Replace the last word
    words[words.length - 1] = newWord;

    // Join the words back into a sentence
    return words.join(" ");
  }

  /**
   * Create inbound packages
   * @param {number} options.mrrId master return request number
   * @param {number} options.rrId return request Id
   * @param {string} options.requestedDate  requested date
   * @param {number} options.category Return request category
   * @param {boolean} options.isC2 Check if the category is C2
   * @param {number} options.customer Customer indicated in the Master Return Request
   */
  const createReturnPackages = (options) => {
    try {
      log.audit("createReturnPackages", options);
      const rpIds = search
        .load("customsearch_kd_package_return_search_2")
        .run()
        .getRange({ start: 0, end: 1 });
      let rpName =
        "RP" +
        (parseInt(
          rpIds[0].getValue({
            name: "internalid",
            summary: search.Summary.MAX,
          }),
        ) +
          parseInt(1));

      const packageRec = record.create({
        type: "customrecord_kod_mr_packages",
        isDynamic: true,
      });

      packageRec.setValue({
        fieldId: "name",
        value: rpName,
      });
      packageRec.setValue({
        fieldId: "custrecord_kod_rtnpack_mr",
        value: options.mrrId,
      });
      // if (options.isC2 === true) {
      //   packageRec.setValue({
      //     fieldId: "custrecord_kd_is_222_kit",
      //     value: true,
      //   });
      // }
      packageRec.setValue({
        fieldId: "custrecord_kod_packrtn_rtnrequest",
        value: options.rrId,
      });
      packageRec.setValue({
        fieldId: "custrecord_kod_packrtn_control",
        value: options.category,
      });
      packageRec.setValue({
        fieldId: "custrecord_kod_packrtn_reqpickup",
        value: options.requestedDate,
      });
      packageRec.setValue({
        fieldId: "custrecord_kd_rp_customer",
        value: options.customer,
      });
      let id = packageRec.save({ ignoreMandatoryFields: true });
      log.debug("Package Return Id" + id);

      // let url =
      //   "https://aiworksdev.agiline.com/global/index?globalurlid=07640CE7-E9BA-4931-BB84-5AB74842AC99&param1=ship";
      //
      // url = url + "&param2=" + id;
      //
      // var env = runtime.envType;
      // if (env === runtime.EnvType.SANDBOX) {
      //   env = "SANDB";
      // } else if (env === runtime.EnvType.PRODUCTION) {
      //   env = "PROD";
      // }
      // url = url + "&param3=" + env + "&param4=CREATE";
      //
      // log.debug("DEBUG", url);
      // var response = https.get({
      //   url: url,
      // });
      //
      // log.debug({
      //   title: "Server Response Headers",
      //   details: response.headers,
      // });
    } catch (e) {
      log.error("createReturnPackages", {
        errorMessage: e.message,
        parameters: options,
      });
    }
  };

  /**
   * Check if both deployments is currently in progress or pending
   * @return {boolean} return if the both deployments is currently active
   */
  function checkInstanceInstnaceMR() {
    const scheduledscriptinstanceSearchObj = search.create({
      type: "scheduledscriptinstance",
      filters: [
        [
          [
            "scriptdeployment.scriptid",
            "startswith",
            "customdeploy_rxrs_mr_create_rr_and_pack",
          ],
          "OR",
          [
            "scriptdeployment.scriptid",
            "startswith",
            "customdeploy_rxrs_mr_create_rr_and_pack2",
          ],
        ],
        "AND",
        ["status", "anyof", "PENDING", "PROCESSING"],
      ],
      columns: [
        search.createColumn({
          name: "scriptid",
          join: "scriptDeployment",
          label: "Custom ID",
        }),
      ],
    });
    const searchResultCount = scheduledscriptinstanceSearchObj.runPaged().count;
    return searchResultCount == 2;
  }

  /**
   * Check if there's a current deployment running in the background
   * @param {string} deploymentId Deployment Id of the Script
   * @return {boolean}
   */
  function scriptInstanceChecker(deploymentId) {
    try {
      var scheduledscriptinstanceSearchObj = search.create({
        type: "scheduledscriptinstance",
        filters: [
          ["scriptdeployment.scriptid", "is", deploymentId],
          "AND",
          ["status", "anyof", "PROCESSING"],
        ],
      });
      let count = scheduledscriptinstanceSearchObj.runPaged().count;
      log.audit("count", { count, deploymentId });
      return scheduledscriptinstanceSearchObj.runPaged().count != 0;
    } catch (e) {
      log.error("scriptInstanceChecker", e.message);
    }
  }

  function generateRRPODocumentNumber() {
    let name = "RRPO";
    const transactionSearchObj = search.create({
      type: "transaction",
      filters: [["type", "anyof", "CuTrPrch106"]],
      columns: [
        search.createColumn({
          name: "transactionnumber",
          summary: "COUNT",
          label: "Transaction Number",
        }),
      ],
    });
    transactionSearchObj.run().each(function (result) {
      name =
        name +
        (+result.getValue({
          name: "transactionnumber",
          summary: "COUNT",
        }) +
          1);
    });
    return name;
  }

  /**
   * Get the return request transaction type
   * @param rrId
   * @return {string} return request type
   */
  function getReturnRequestType(rrId) {
    var type;
    const transactionSearchObj = search.create({
      type: "transaction",
      filters: [["internalid", "anyof", rrId]],
      columns: [
        search.createColumn({ name: "recordtype", label: "Record Type" }),
      ],
    });
    transactionSearchObj.run().each(function (result) {
      type = result.getValue("recordtype");
    });
    return type;
  }

  /**
   * Get the entity Type
   * @param internalId
   * @returns {string}
   */
  function getEntityType(internalId) {
    log.audit("getEntityType", internalId);
    try {
      let type;
      const entitySearchObj = search.create({
        type: "entity",
        filters: [["internalid", "anyof", internalId]],
        columns: [
          search.createColumn({
            name: "formulatext",
            formula: "{type}",
            label: "Formula (Text)",
          }),
        ],
      });
      entitySearchObj.run().each(function (result) {
        type = result.getValue({
          name: "formulatext",
          formula: "{type}",
        });
        return true;
      });
      return type.toLowerCase();
    } catch (e) {
      log.error("getEntityType", e.message);
    }
  }

  /**
   * Get the item rate based on item id and price level name
   * @param {string} options.priceLevelName
   * @param {number} options.itemId
   * @return {number} return rate of the selected price level of the item
   */
  function getItemRate(options) {
    log.audit("getItemRate", options);
    try {
      let column = "";
      let rate;
      priceLevel.forEach((val) => {
        if (val.priceName == options.priceLevelName) {
          column = val.column;
        }
      });
      let filters = [];
      filters[0] = search.createFilter({
        name: "internalID",
        operator: search.Operator.IS,
        values: options.itemId,
      });
      let columns = [];
      columns[0] = search.createColumn({
        name: column,
      });

      const itemSearch = search.create({
        type: search.Type.ITEM,
        filters: filters,
        columns: columns,
      });
      const result = itemSearch.run();

      result.each(function (row) {
        rate = row.getValue({
          name: column,
        });
      });
      return rate;
    } catch (e) {
      log.error("getItemRate", e.message);
    }
  }

  /**
   * Update record header
   * @param options.type record Type
   * @param options.id record id
   * @param options.values fieldId and value together
   * @returns {*} the internal id of the updated record
   */
  function updateRecordHeader(options) {
    let { type, id, values } = options;
    let irsId, amount;
    try {
      const rec = record.load({
        type: type,
        id: id,
      });
      let val = JSON.parse(values);
      log.audit("val", val);
      val.forEach((val) => {
        log.audit("val", val);
        let { fieldId, value } = val;
        rec.setValue({
          fieldId: fieldId,
          value: value,
        });
      });
      amount = rec.getValue("custrecord_irc_total_amount");
      irsId = rec.save({
        ignoreMandatoryFields: true,
      });
      log.audit("IRSID", irsId);
      const newPharmaProcessing = rec.getValue("custrecord_cs__rqstprocesing");

      const newMFGProcessing = rec.getValue("custrecord_cs__mfgprocessing");
      /**
       *  Update PO, Bill and IR processing
       */

      log.audit("updating related tran line processing");
      let params = {
        mfgProcessing: newMFGProcessing,
        pharmaProcessing: newPharmaProcessing,
        irsId: irsId,
        amount: amount,
        action: "updateTranLineProcessing",
      };
      log.audit("updating related tran line processing", params);

      let functionSLURL = url.resolveScript({
        scriptId: "customscript_sl_cs_custom_function",
        deploymentId: "customdeploy_sl_cs_custom_function",
        returnExternalUrl: true,
        params: params,
      });
      let response = https.post({
        url: functionSLURL,
      });
    } catch (e) {
      log.error("updateRecordHeader", e.message);
    }
  }

  /**
   * Added weeks to current Date
   * @param options.date - Date to be added
   * @param options.days - Number of days to Add
   * @return {number}
   */
  function addDaysToDate(options) {
    log.audit("addDaysToDate", options);
    try {
      let { date, days } = options;
      date.setDate(date.getDate() + days);
      let d = Date.parse(date);
      d = getFormattedDate(new Date(d));
      log.audit("date", d);
      return d;
    } catch (e) {
      log.error("addDaysToDate", e.message);
    }
  }

  function addMonths(date, months) {
    date.setMonth(date.getMonth() + months);
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function getDaysBetween(StartDate, EndDate) {
    // The number of milliseconds in all UTC days (no DST)
    const oneDay = 1000 * 60 * 60 * 24;

    // A day in UTC always lasts 24 hours (unlike in other time formats)
    const start = Date.UTC(
      EndDate.getFullYear(),
      EndDate.getMonth(),
      EndDate.getDate(),
    );
    const end = Date.UTC(
      StartDate.getFullYear(),
      StartDate.getMonth(),
      StartDate.getDate(),
    );

    // so it's safe to divide by 24 hours
    return (start - end) / oneDay;
  }

  /**
   * Get Accounting Period Id
   * @param {string} name
   * */
  function getPeriodId(name) {
    log.audit("getPeriodId", name);
    let periodId;
    try {
      const accountingperiodSearchObj = search.create({
        type: "accountingperiod",
        filters: [["periodname", "is", name]],
        columns: [search.createColumn({ name: "periodname", label: "Name" })],
      });

      accountingperiodSearchObj.run().each(function (result) {
        periodId = result.id;
      });
      return periodId;
    } catch (e) {
      log.error("getPeriodId", e.message);
    }
  }

  /**
   * Set the bill due date
   * @param options.date
   * @param {number}options.monthsToAdd
   * @param options.isTopCo
   * @returns {Date}
   */
  function setBillDueDate(options) {
    log.audit("setBillDueDate", options);
    let { isTopCo, monthsToAdd, date } = options;
    try {
      let tempDate = addMonths(date, Number(monthsToAdd));
      log.audit("tempDate", tempDate);
      const daysDifference = getDaysBetween(tempDate, new Date());
      if (isTopCo == true) {
        if (daysDifference >= 90) {
          return tempDate;
        } else {
          return addMonths(new Date(), 4);
        }
      } else {
        return tempDate;
      }
    } catch (e) {
      log.error("setBillDueDate", e.message);
    }
  }

  /**
   * Return formatted date M/D/YYYY
   * @param date
   * @return {string} formatted date
   */
  function getFormattedDate(date) {
    let year = date.getFullYear();
    let month = (1 + date.getMonth()).toString();
    let day = date.getDate().toString();

    return month + "/" + day + "/" + year;
  }

  function formatDate(date) {
    date = date.split("/");
    let day = +date[0] < 10 ? 0 + date[0] : date[0];
    let month = +date[1] < 10 ? 0 + date[1] : date[1];
    return day + "/" + month + "/" + date[2];
  }

  /**
   * Crerate
   * @param options.name
   * @param options.parent
   */
  function createFolder(options) {
    log.audit("create folder", options);
    let { name, parent } = options;
    try {
      const objRecord = record.create({
        type: record.Type.FOLDER,
        isDynamic: true,
      });

      objRecord.setValue({
        fieldId: "name",
        value: name,
      });
      parent &&
        objRecord.setValue({
          fieldId: "parent",
          value: parent,
        });
      return objRecord.save({
        ignoreMandatoryFields: true,
      });
    } catch (e) {
      log.error("createFolder", e.message);
    }
  }

  /**
   * Check if there is changes in the record or not if there is update the Lot item custom record.
   * @param {object} options.oldRec
   * @param {object} options.newRec
   * @param {object} options.FIELDS
   *@return {boolean} if there's update
   */

  function checkIfThereIsUpdate(options) {
    log.audit("checkIfThereIsUpdate", options);
    let updateNeed = false;
    let { oldRec, newRec, FIELDS } = options;

    try {
      FIELDS.forEach((field) => {
        const oldValue = oldRec.getValue(field);
        const newValue = newRec.getValue(field);
        log.debug("values", { field, oldValue, newValue });
        if (oldValue != newValue) {
          updateNeed = true;
        }
      });
      return updateNeed;
    } catch (e) {
      log.error("checkIfThereIsUpdate", e.message);
    }
  }

  /**
   *
   * @params options.oldBag - Previous Bag assignment
   * @params options.newBag - New Bag Assignment
   * @params options.newBin - New Bin
   * @params options.oldBin - oldBin
   * @params options.itemText - Item Text
   * @params options.RRText - Return Request Text
   */
  function sendEmailMFGProcessingIsUpdated(options) {
    log.audit("sendEmailMFGProcessingIsUpdated", options);
    let {
      newRec,
      receipient,
      sender,
      newBag,
      oldBag,
      oldBin,
      newBin,
      itemText,
      RRText,
    } = options;
    try {
      const emailParams = {
        itemNDC: generateRedirectLink({
          type: "lotnumberedinventoryitem",
          id: newRec.getValue("custrecord_cs_return_req_scan_item"),
        }),
        returnRequestText: newRec.getText("custrecord_cs_ret_req_scan_rrid"),
        bagPreviousAssignment: generateRedirectLink({
          type: "customrecord_kd_taglabel",
          id: oldBag,
        }),
        returnRequestLink: generateRedirectLink({
          id: newRec.getValue("custrecord_cs_ret_req_scan_rrid"),
          type: getReturnRequestType(
            newRec.getValue("custrecord_cs_ret_req_scan_rrid"),
          ),
        }),
        newBagAssignment: generateRedirectLink({
          type: "customrecord_kd_taglabel",
          id: newBag,
        }),
        newBin: newBin,
        oldBin: oldBin,
      };

      log.emergency("EMAIL PARAMS", emailParams);
      email.send({
        author: -5,
        recipients: getWareHouseEmployeeRole(),
        subject: "Manuf Processing or Bin has been changed ",
        body: `
<p> <a href="https://6816904-sb1.app.netsuite.com/app/common/search/searchresults.nl?searchid=1031&saverun=T&whence="> Report Link</a> </p>
<table style="padding: 2px">
  <tr>
   <td>Item</td>
   <td>Return Request</td>
   <td>Previous Bag</td>
   <td>New Bag </td>
   <td>New Bin</td>
   <td>Old Bin</td>
  </tr>
  <tr>
    <td><a href="${emailParams.itemNDC}">${newRec.getText("custrecord_cs_return_req_scan_item")} <a/>&nbsp;&nbsp;</td>
    <td><a href=" ${emailParams.returnRequestLink}">${emailParams.returnRequestText}&nbsp;&nbsp;</a></td>
   <td><a href="${emailParams.bagPreviousAssignment}">${oldBag}&nbsp;&nbsp;<a></td>    
   <td><a href="${emailParams.newBagAssignment}"> ${newBag}&nbsp;&nbsp;</a> </td>
        <td>${emailParams.newBin}&nbsp;&nbsp;</td>
       <td>${emailParams.oldBin}&nbsp;&nbsp;</td>
  </tr>
</table>`,
      });
      //  }
    } catch (e) {
      log.error("sendEmailMFGProcessingIsUpdated", e.message);
    }
  }

  /**
   * Create a redirect link
   * @params {string} options.type
   * @params {number} options.id
   * @return {url} return URL
   */
  function generateRedirectLink(options) {
    try {
      return url.resolveRecord({
        recordType: options.type,
        recordId: options.id,
        isEditMode: false,
      });
    } catch (e) {
      log.error("generateRedirectLink", e.message);
    }
  }

  /**
   *Get Entity Internal Id
   * @param options.entityId
   */
  function getEntityId(options) {
    log.audit("getEntityId", options);
    try {
      let id;
      let { entityId } = options;
      const entitySearchObj = search.create({
        type: "entity",
        filters: [["formulatext: {entityid}", "is", entityId]],
      });

      entitySearchObj.run().each(function (result) {
        id = result.id;
        return true;
      });
      return id;
    } catch (e) {
      log.error("getEntityId", e.message);
    }
  }

  function removeDuplicates(arr) {
    return [...new Set(arr)];
  }

  /**
   * Group By Date
   * @param items
   * @param dateField
   * @returns {*}
   */
  function groupByDate(items, dateField) {
    return items.reduce((acc, item) => {
      // Ensure the date field exists and is a valid date string
      const date = new Date(item[dateField]);
      if (isNaN(date.getTime())) {
        throw new Error(`Invalid date: ${item[dateField]}`);
      }

      // Format the date as YYYY-MM-DD (or any format you prefer)
      const dateString = date.toISOString().split("T")[0];

      // Initialize the array for this date if it doesn't exist yet
      if (!acc[dateString]) {
        acc[dateString] = [];
      }

      // Add the item to the array for this date
      acc[dateString].push(item);

      return acc;
    }, {});
  }

  function removeEmptyArrays(arr) {
    return arr.filter((item) => Array.isArray(item) && item.length > 0);
  }

  /**
   * Get the user with  warehouse verifier, warehouse assistant manager and warehouse manager for sending email update
   * @returns {*[]}
   */
  function getWareHouseEmployeeRole() {
    try {
      let ids = [];
      const employeeSearchObj = search.create({
        type: "employee",
        filters: [["role", "anyof", "1035", "1055", "1052"]],
        columns: [
          search.createColumn({ name: "entityid", label: "Name" }),
          search.createColumn({ name: "email", label: "Email" }),
          search.createColumn({ name: "phone", label: "Phone" }),
          search.createColumn({ name: "altphone", label: "Office Phone" }),
          search.createColumn({ name: "fax", label: "Fax" }),
          search.createColumn({ name: "supervisor", label: "Supervisor" }),
          search.createColumn({ name: "title", label: "Job Title" }),
          search.createColumn({ name: "altemail", label: "Alt. Email" }),
        ],
      });
      const searchResultCount = employeeSearchObj.runPaged().count;
      log.debug("getWareHouseEmployeeRole result count", searchResultCount);
      employeeSearchObj.run().each(function (result) {
        ids.push(result.id);
        return true;
      });
      return ids;
    } catch (e) {
      log.error("getWareHouseEmployeeRole", e.message);
    }
  }

  /**
   * Get the task based on parameters
   * @param options.licenseType - values accepted "DEA" or "STATE"
   * @param options.entityId - Vendor or Customer Internal Id
   * @param options.isCompleted - Set to true
   * @param options.transactionId - Related Transaction Internal Id
   * @return the internal id of the Tasks
   */
  function getTask(options) {
    log.audit("getTask", options);
    let Id = null;
    let { licenseType, entityId, isCompleted, transactionId } = options;
    let keyWords = licenseType == "DEA" ? "DEA Expired" : "STATE License";
    log.audit("keywords", keyWords);
    try {
      let taskSearchObj;
      if (transactionId) {
        taskSearchObj = search.create({
          type: "task",
          filters: [["transaction.internalidnumber", "equalto", transactionId]],
        });
      } else {
        taskSearchObj = search.create({
          type: "task",
        });
        if (keyWords) {
          taskSearchObj.filters.push(
            search.createFilter({
              name: "title",
              operator: "haskeywords",
              values: keyWords,
            }),
          );
        }
      }

      if (entityId) {
        taskSearchObj.filters.push(
          search.createFilter({
            name: "company",
            operator: "anyof",
            values: entityId,
          }),
        );
      }
      if (isCompleted == false) {
        taskSearchObj.filters.push(
          search.createFilter({
            name: "status",
            operator: "anyof",
            values: ["PROGRESS", "NOTSTART"],
          }),
        );
      }

      const searchResultCount = taskSearchObj.runPaged().count;
      log.debug("taskSearchObj result count", searchResultCount);
      taskSearchObj.run().each(function (result) {
        Id = result.id;
      });
      return Id;
    } catch (e) {
      log.error("getTask", e.message);
    }
  }

  /**
   * Create a return request based on the provided options.
   *
   * @param {Object} options - The options for creating the return request.
   * @param {string} options.category - The category of the return request.
   * @param {number} options.numOfLabels - The number of labels.
   * @param {string} options.docFile - The document file.
   * @param {string} options.item - The item for the return request.
   * @param {string} options.requestedDate - The requested pickup date.
   * @param {string} options.masterRecId - The master record ID.
   * @param {string} options.customer - The customer for the return request.
   * @param {string} options.location - The location for the return request.
   * @param {boolean} options.isLicenseExpired - Flag indicating if the license is expired.
   * @param {boolean} options.isStateLicenseExpired - Flag indicating if the state license is expired.
   * @param {string} options.planSelectionType - The plan selection type for the return request.
   *
   * @return {void}
   */
  function createReturnRequest(options) {
    log.audit("createReturnRequest", options);
    const RRCATEGORY = Object.freeze({
      C2: 3,
      RXOTC: 1,
      C3TO5: 4,
    });
    try {
      let recordType = "";
      let {
        category,
        numOfLabels,
        docFile,
        item,
        requestedDate,
        masterRecId,
        customer,
        location,
        isLicenseExpired,
        isStateLicenseExpired,
        planSelectionType,
      } = options;
      let rrpoName;
      let rrRec;
      if (getEntityType(customer) == "vendor") {
        recordType = "custompurchase_returnrequestpo";
        rrpoName = generateRRPODocumentNumber();
      } else {
        recordType = "customsale_kod_returnrequest";
      }

      log.audit("createReturnRequest", { options, recordType });
      rrRec = record.create({
        type: recordType,
        isDynamic: false,
      });
      rrRec.setValue({
        fieldId: "entity",
        value: customer,
      });
      if (
        category == RRCATEGORY.C2 &&
        isLicenseExpired == false &&
        isStateLicenseExpired == false
      ) {
        rrRec.setValue({
          fieldId: "transtatus",
          value: rrStatus.C2Kittobemailed,
        });
      } else {
        rrRec.setValue({
          fieldId: "transtatus",
          value: rrStatus.PendingPackageReceipt,
        });
      }
      rrpoName &&
        rrRec.setValue({
          fieldId: "tranid",
          value: rrpoName,
        });
      rrRec.setValue({
        fieldId: "custbody_kd_master_return_id",
        value: masterRecId,
      });
      rrRec.setValue({
        fieldId: "custbody_kd_rr_category",
        value: category,
      });
      rrRec.setValue({
        fieldId: "location",
        value: location,
      });
      rrRec.setValue({
        fieldId: "custbody_kd_file",
        value: docFile,
      });
      rrRec.setValue({
        fieldId: "custbody_kd_requested_pick_up_date",
        value: requestedDate,
      });

      rrRec.setSublistValue({
        sublistId: "item",
        fieldId: "item",
        line: 0,
        value: item,
      });
      rrRec.setSublistValue({
        sublistId: "item",
        fieldId: "amount",
        line: 0,
        value: 1,
      });
      rrRec.setSublistValue({
        sublistId: "item",
        fieldId: "custcol_kod_fullpartial",
        line: 0,
        value: 1,
      });
      let RRId = rrRec.save({ ignoreMandatoryFields: true });
      if (RRId) {
        const rrRecSave = record.load({
          type: recordType,
          id: RRId,
        });
        let tranId = rrRecSave.getValue("tranid");

        let tranStatus = rrRecSave.getValue("transtatus");
        log.audit("tranId", { tranId, tranStatus });
        if (category == RRCATEGORY.C2) {
          if (
            rrRecSave.getValue("custbody_kd_state_license_expired") === false &&
            rrRecSave.getValue("custbody_kd_license_expired")
          ) {
            sendEmail({
              category: rxrs_util.RRCATEGORY.C2,
              entity: customer,
              transtatus: tranStatus,
              tranid: tranId,
              internalId: RRId,
            });
          }
        }
        log.debug("RR ID " + RRId);
        const cat = rrRecSave.getValue({
          fieldId: "custbody_kd_rr_category",
        });
        const requestedDate = rrRecSave.getValue({
          fieldId: "custbody_kd_requested_pick_up_date",
        });

        const customer = rrRecSave.getValue({
          fieldId: "entity",
        });
        let isC2 = cat == RRCATEGORY.C2;
        sendEmail({
          category: category,
          transtatus: tranStatus,
          entity: customer,
          tranid: tranId,
          internalId: RRId,
        });

        const numOfLabels = numOfLabels;
        const masterRecId = masterRecId;
        log.audit("returnValues ", {
          rrId: RRId,
          numOfLabels: numOfLabels,
          mrrId: masterRecId,
          requestedDate: requestedDate,
          category: cat,
          customer: customer,
          isC2: isC2,
        });
      }
    } catch (e) {
      log.error("createReturnRequest", e.message);
    }
  }

  return {
    addDaysToDate,
    checkInstanceInstnaceMR,
    createFolder,
    createReturnPackages,
    createTask,
    createTaskRecord: createTaskRecord,
    createReturnRequest: createReturnRequest,
    formatDate,
    groupByDate,
    generateRRPODocumentNumber,
    getDefaultTaskAssignee,
    getEntityType,
    getFileId,
    getFolderId,
    getItemRate,
    getPeriodId,
    getReturnRequestType,
    generateRedirectLink,
    moveFolderToDone,
    getWareHouseEmployeeRole,
    mrrStatus,
    priceLevel,
    RRCATEGORY,
    rrStatus,
    rxrsItem,
    getEntityId,
    scriptInstanceChecker,
    sendEmail,
    setBillDueDate,
    updateRecordHeader,
    sendEmailMFGProcessingIsUpdated,
    checkIfThereIsUpdate,
    removeDuplicates,
    removeEmptyArrays,
    getTask,
    SERVICETYPE,
  };
});
