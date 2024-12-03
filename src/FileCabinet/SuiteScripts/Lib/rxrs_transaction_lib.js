/**
 * @NApiVersion 2.1
 */
define([
  "N/encode",
  "N/file",
  "N/record",
  "N/search",
  "N/url",
  "N/https",
  "./rxrs_verify_staging_lib",
  "./rxrs_util",
  "./rxrs_return_cover_letter_lib",
  "./rxrs_item_lib",
], /**
 * @param{record} record
 * @param{search} search
 * @param url
 * @param https
 * @param rxrsUtil_vl
 * @param rxrs_util
 * @param rxrs_rcl_lib
 */ (
  encode,
  file,
  record,
  search,
  url,
  https,
  rxrsUtil_vl,
  rxrs_util,
  rxrs_rcl_lib,
  rxrs_itemlib,
) => {
  const SUBSIDIARY = 2; //Rx Return Services
  // const ACCOUNT = 212; //50000 Cost of Goods Sold
  const LOCATION = 1; //Clearwater
  const TOPCO_PLAN = 10;
  const TOPCO_VENDOR = 1591;
  const RETURNABLE = 2;
  const NONRETURNABLE = 1;
  const ACCOUNT = {
    Accrued_Purchases: 112,
    Accounts_Payable: 111,
    Service_Fee: 932,
    Cost_of_Goods_Sold: 212,
    Undeposited_Funds: 122,
    Unapplied_Credits: 940,
  };

  /**
   * Create Inventory Adjustment for verified Item Return Scan
   * @param {number}options.rrId Internal I'd of the Return Request
   * @param {number} options.mrrId Internal I'd of the Master Return Request
   * @param  {string}options.vendorCreditId - Vendor Credit Internal Id
   * @param {boolean}options.forViewLineEdit - Creation of Inventory Adjustment in the View Line Edit Page After Approval of Bill
   */
  function createInventoryAdjustment(options) {
    try {
      log.audit("createInventoryAdjustment", options);
      let { rrId, mrrId, forViewLineEdit, vendorCreditId } = options;
      let IAExist, inventoryAdjRec;
      if (forViewLineEdit != true) {
        log.audit(
          "isRR Verified",
          rxrsUtil_vl.checkIfRRIsVerified({ rrId: rrId }),
        );
        if (rxrsUtil_vl.checkIfRRIsVerified({ rrId: rrId }) != true) return;

        /**
         * Set the return request to approve since all the items are verified
         */
        record.submitFields({
          type: rxrs_util.getReturnRequestType(rrId),
          id: rrId,
          values: {
            transtatus: rxrs_util.rrStatus.Approved,
          },
        });
        IAExist = checkIfTransAlreadyExist({
          mrrId: mrrId,
          searchType: "InvAdjst",
        });

        log.debug("createInventoryAdjustment IAExist", IAExist);
      }

      if (IAExist == null || forViewLineEdit == true) {
        inventoryAdjRec = record.create({
          type: record.Type.INVENTORY_ADJUSTMENT,
          isDynamic: true,
        });
      } else {
        inventoryAdjRec = record.load({
          type: record.Type.INVENTORY_ADJUSTMENT,
          id: IAExist,
          isDynamic: true,
        });
      }
      vendorCreditId &&
        inventoryAdjRec.setValue({
          fieldId: "custbody_vendor_credit",
          value: vendorCreditId,
        });
      inventoryAdjRec.setValue({
        fieldId: "subsidiary",
        value: SUBSIDIARY,
      });
      if (forViewLineEdit == true) {
        inventoryAdjRec.setValue({
          fieldId: "account",
          value: ACCOUNT.Accrued_Purchases,
        });
      } else {
        inventoryAdjRec.setValue({
          fieldId: "account",
          value: ACCOUNT.Cost_of_Goods_Sold,
        });
      }

      inventoryAdjRec.setValue({
        fieldId: "adjlocation",
        value: LOCATION,
      });
      inventoryAdjRec.setValue({
        fieldId: "custbody_kd_master_return_id",
        value: mrrId,
      });
      let params = {};
      if (rrId) {
        params.rrId = rrId;
      }
      if (forViewLineEdit) {
        params.forViewLineEdit = forViewLineEdit;
      }
      if (vendorCreditId) {
        params.vendorCreditId = vendorCreditId;
      }
      params.inventoryAdjRec = inventoryAdjRec;
      let IAId = addInventoryAdjustmentLine(params);
      log.audit("IAId", IAId);
      return IAId;
    } catch (e) {
      log.error("createInventoryAdjustment", e.message);
    }
  }

  /**
   *Update the bin number of the return request line if there's changes in the bin number
   * @param options.rrId
   * @param options.itemScanId
   * @param options.binId
   */
  function updateBinNumber(options) {
    log.audit("updateBinNumber", options);
    let { rrId, itemScanId, binId } = options;
    try {
      const rec = record.load({
        type: rxrs_util.getReturnRequestType(rrId),
        id: rrId,
      });
      const itemScanIndex = rec.findSublistLineWithValue({
        sublistId: "item",
        fieldId: "custcol_rsrs_itemscan_link",
        value: itemScanId,
      });
      log.audit("itemScanIndex", itemScanIndex);
      if (itemScanIndex == -1) return;
      const inventoryDetailsRecord = rec.getSublistSubrecord({
        sublistId: "item",
        fieldId: "inventorydetail",
        line: itemScanIndex,
      });
      inventoryDetailsRecord.setSublistValue({
        sublistId: "inventoryassignment",
        fieldId: "binnumber",
        line: 0,
        value: binId,
      });
      return rec.save({
        ignoreMandatoryFields: true,
      });
    } catch (e) {
      log.error("updateBinNumber", e.message);
    }
  }

  /**
   * Add Inventory Adjustment Line
   * @param {object}options.inventoryAdjRec -  Inventory Adjustment Record
   * @param {number}options.rrId - Return Request I'd
   * @param {string}options.vendorCreditId
   * @param {boolean}options.forViewLineEdit - Mark true for creation of the JE after the bill is fully paid
   */
  function addInventoryAdjustmentLine(options) {
    log.audit("addInventoryAdjustmentLine", options);
    try {
      let { inventoryAdjRec, rrId, vendorCreditId, forViewLineEdit } = options;
      let getIRSparams = {};
      let items;
      if (rrId) {
        getIRSparams.rrId = rrId;
      }

      if (forViewLineEdit == true) {
        items = getTransactionLine({ id: vendorCreditId });
      } else {
        items = getIRSLine(getIRSparams);
      }

      items.forEach((IRFields) => {
        const RETURNABLE = 2;
        const NONRETURNABLE = 1;
        log.audit("addInventoryAdjustmentLine line", IRFields);
        let estimatedUnitCost = IRFields.amount;
        if (
          IRFields.pharmaProcessing == NONRETURNABLE &&
          IRFields.mfgProcessing &&
          NONRETURNABLE
        ) {
          estimatedUnitCost = 0;
        }
        log.audit("estimated Unit Cost", estimatedUnitCost);
        inventoryAdjRec.selectNewLine({
          sublistId: "inventory",
        });
        inventoryAdjRec.setCurrentSublistValue({
          sublistId: "inventory",
          fieldId: "location",
          value: LOCATION,
        });
        +IRFields.item &&
          inventoryAdjRec.setCurrentSublistValue({
            sublistId: "inventory",
            fieldId: "item",
            value: +IRFields.item,
          });
        +IRFields.quantity &&
          inventoryAdjRec.setCurrentSublistValue({
            sublistId: "inventory",
            fieldId: "adjustqtyby",
            value: +IRFields.quantity,
          });
        // +IRFields.amount &&
        //   inventoryAdjRec.setCurrentSublistValue({
        //     sublistId: "inventory",
        //     fieldId: "unitcost",
        //     value: +IRFields.amount,
        //   });
        estimatedUnitCost &&
          inventoryAdjRec.setCurrentSublistValue({
            sublistId: "inventory",
            fieldId: "unitcost",
            value: +IRFields.amount,
          });

        /**
         * Adding Inventory Details
         */
        let subrec = inventoryAdjRec.getCurrentSublistSubrecord({
          sublistId: "inventory",
          fieldId: "inventorydetail",
        });
        subrec.selectNewLine({
          sublistId: "inventoryassignment",
        });
        IRFields.quantity &&
          subrec.setCurrentSublistValue({
            sublistId: "inventoryassignment",
            fieldId: "quantity",
            value: IRFields.quantity,
          });
        IRFields.serialLotNumber &&
          subrec.setCurrentSublistValue({
            sublistId: "inventoryassignment",
            fieldId: "receiptinventorynumber",
            value: IRFields.serialLotNumber,
          });
        if (IRFields.expDate !== null) {
          let expDate = new Date(IRFields.expDate);
          subrec.setCurrentSublistValue({
            sublistId: "inventoryassignment",
            fieldId: "expirationdate",
            value: expDate,
          });
        }
        if (IRFields.binNumber) {
          subrec.setCurrentSublistValue({
            sublistId: "inventoryassignment",
            fieldId: "binnumber",
            value: IRFields.binNumber,
          });
        }

        subrec.commitLine({
          sublistId: "inventoryassignment",
        });

        inventoryAdjRec.commitLine("inventory");
      });
      return inventoryAdjRec.save({
        ignoreMandatoryFields: true,
      });
    } catch (e) {
      log.error("addInventoryAdjustmentLine", e.message);
    }
  }

  /**
   * Check if the master return request exist
   * @param options.mrrName Name of the master return
   * @returns {*} the internal id if existing
   */
  function checkIfMRRExist(options) {
    log.audit("checkIfMRRExist", options);
    let { mrrName } = options;
    let internalId = null;
    try {
      const customrecord_kod_masterreturnSearchObj = search.create({
        type: "customrecord_kod_masterreturn",
        filters: [["name", "is", mrrName]],
        columns: [
          search.createColumn({ name: "name", label: "Name" }),
          search.createColumn({
            name: "id",
            label: "ID",
          }),
          search.createColumn({ name: "scriptid", label: "Script ID" }),
          search.createColumn({
            name: "custrecord_kod_customer",
            label: "Customer Name",
          }),
          search.createColumn({
            name: "custrecord_kod_mr_status",
            label: "Status",
          }),
        ],
      });
      customrecord_kod_masterreturnSearchObj.run().each(function (result) {
        internalId = result.id;
      });
      return internalId;
    } catch (e) {
      log.error("checkIfMRRExist", e.message);
    }
  }

  /**
   * Check transaction Already Exist
   *@param {number} options.mrrId - Internal Id of the Return Request
   *@param {string} options.searchType - Transaction Type
   *@param {(string || number)} options.finalPaymentSchedule - Final Payment Schedule
   *@param {string} options.status - Transaction Status
   * @param {string} options.creditMemoId - Custom Credit Memo Id
   *@param {string} options.irsId Item return Scan Id - Transaction Status
   *@return  null if no transaction is created yet | return the internal Id if the transaction exists
   */
  function checkIfTransAlreadyExist(options) {
    log.audit("checkIfTransAlreadyExist", options);
    let {
      searchType,
      mrrId,
      irsId,
      finalPaymentSchedule,
      creditMemoId,
      status,
    } = options;
    log.audit("finalPaymentSchedule", { finalPaymentSchedule, options });
    try {
      let tranId;
      const transactionSearchObj = search.create({
        type: "transaction",
        filters: [["type", "anyof", searchType]],
      });
      let mainLine = irsId === undefined ? "T" : "F";
      transactionSearchObj.filters.push(
        search.createFilter({
          name: "mainline",
          operator: "is",
          values: mainLine,
        }),
      );
      mrrId &&
        transactionSearchObj.filters.push(
          search.createFilter({
            name: "custbody_kd_master_return_id",
            operator: "anyof",
            values: mrrId,
          }),
        );
      creditMemoId &&
        transactionSearchObj.filters.push(
          search.createFilter({
            name: "custbody_credit_memos",
            operator: "anyof",
            values: creditMemoId,
          }),
        );
      status &&
        transactionSearchObj.filters.push(
          search.createFilter({
            name: "status",
            operator: "anyof",
            values: status,
          }),
        );
      if (finalPaymentSchedule) {
        transactionSearchObj.filters.push(
          search.createFilter({
            name: "custbody_kodpaymentsched",
            operator: "anyof",
            values: finalPaymentSchedule,
          }),
        );
      }

      log.emergency("filters", transactionSearchObj.filters);
      const searchResultCount = transactionSearchObj.runPaged().count;
      if (searchResultCount < 1) return null;

      transactionSearchObj.run().each(function (result) {
        tranId = result.id;
        return true;
      });
      return tranId;
    } catch (e) {
      log.error("checkIfTransAlreadyExist", e.message);
    }
  }

  /**
   * Update the Sales Order item 222 Form
   * @param {object} soDetails
   */
  function updateSO222Form(soDetails) {
    log.audit("updateSO222Form", soDetails);
    let { soId, soItemToUpdate } = JSON.parse(soDetails);
    try {
      log.debug("details", { soId, soItemToUpdate });
      if (!soId) return;
      const soRec = record.load({
        type: record.Type.SALES_ORDER,
        id: soId,
      });

      soItemToUpdate.forEach((soItem) => {
        let { lineUniqueKey, form222Number } = soItem;
        let lineIndex = soRec.findSublistLineWithValue({
          sublistId: "item",
          fieldId: "lineuniquekey",
          value: lineUniqueKey,
        });
        if (lineIndex !== -1) {
          soRec.setSublistValue({
            sublistId: "item",
            fieldId: "custcol_so_22formref",
            value: form222Number,
            line: lineIndex,
          });
        }
      });
      soRec.setValue({
        fieldId: "custbody_222formcheck",
        value: true,
      });

      let message =
        "Sucessfully updated SO ID: " +
        soRec.save({
          ignoreMandatoryFields: true,
        });
      return { updateSOResMessage: message };
    } catch (e) {
      log.error("updateSO222Form", e.message);
      return { updateSOError: e.message };
    }
  }

  /**
   * Check if all of the return request is already approved
   * @param options - MRR ID
   * @returns {boolean}
   */
  function checkIfReturnRequuestIsApproved(options) {
    log.audit("checkIfReturnRequuestIsApproved", options);
    let allApproved = false;
    try {
      const transactionSearchObj = search.create({
        type: "transaction",
        settings: [{ name: "consolidationtype", value: "ACCTTYPE" }],
        filters: [
          ["type", "anyof", "CuTrSale102", "CuTrPrch106"],
          "AND",
          ["custbody_kd_master_return_id", "anyof", options],
        ],
        columns: [
          search.createColumn({
            name: "statusref",
            summary: "GROUP",
            label: "Status",
          }),
        ],
      });
      const searchResultCount = transactionSearchObj.runPaged().count;
      log.audit("searchResultCount", searchResultCount);
      if (searchResultCount > 1) return;
      transactionSearchObj.run().each(function (result) {
        let rrStatus = result.getValue({
          name: "statusref",
          summary: "GROUP",
        });

        log.audit(
          "checkIfReturnRequuestIsApproved rrStatus",
          rrStatus.split(":")[1],
        );
        if (rrStatus.split(":")[1] == rxrs_util.rrStatus.Approved) {
          log.audit("UPDATING MRR STATUS TO REVIEW PRICES");
          record.submitFields({
            type: "customrecord_kod_masterreturn",
            id: options,
            values: {
              custrecord_kod_mr_status: rxrs_util.mrrStatus.Approved,
            },
          });
        }
      });
    } catch (e) {
      log.error("checkIfReturnRequuestIsApproved", e.message);
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
   * Get the return request id per master return
   * @param {string}options - Master Return
   * @return the Internal Id of the Return Request
   */
  function getMasterReturnReturnRequest(options) {
    log.audit("getMasterReturnReturnRequest", options);
    let rrId = [];
    try {
      const transactionSearchObj = search.create({
        type: "transaction",
        filters: [
          ["type", "anyof", "CuTrSale102", "CuTrPrch106"],
          "AND",
          ["custbody_kd_master_return_id", "anyof", options],
          "AND",
          ["mainline", "is", "T"],
        ],
        columns: [
          search.createColumn({ name: "tranid", label: "Document Number" }),
          search.createColumn({
            name: "custbody_kd_rr_category",
            label: "Category",
          }),
        ],
      });

      transactionSearchObj.run().each(function (result) {
        rrId.push({
          value: result.id,
          text:
            result.getValue({ name: "tranid" }) +
            " | " +
            result.getText({ name: "custbody_kd_rr_category" }),
        });
        return true;
      });
      return rrId;
    } catch (e) {
      log.error("getMasterReturnReturnRequest", e.message);
    }
  }

  /**
   * Create PO if the type of the Return Request is RRPO
   * @param {number}options.mrrId
   * @param {number}options.rrId
   * @param {number}options.entity
   * @param {string} options.planSelectionType
   */
  function createPO(options) {
    let { mrrId, rrId, entity, planSelectionType } = options;
    let poLinesInfo = [];
    try {
      let forBillCreation = false;
      log.debug("createPO", options);
      let poId = checkIfTransAlreadyExist({
        mrrId: mrrId,
        searchType: "PurchOrd",
      });
      let poRec;
      if (poId !== null) {
        poRec = record.load({
          type: record.Type.PURCHASE_ORDER,
          id: poId,
          isDynamic: true,
        });
      } else {
        poRec = record.create({
          type: record.Type.PURCHASE_ORDER,
          isDynamic: true,
        });
      }
      if (planSelectionType == TOPCO_PLAN) {
        poRec.setValue({
          fieldId: "entity",
          value: TOPCO_VENDOR,
        });
        poRec.setValue({
          fieldId: "custbody_rxrs_non_returnable_rate",
          value: 10,
        });
        poRec.setValue({
          fieldId: "custbody_pharma_account",
          value: entity,
        });
        forBillCreation = true;
      } else {
        poRec.setValue({
          fieldId: "entity",
          value: entity,
        });
      }

      poRec.setValue({
        fieldId: "custbody_kd_master_return_id",
        value: +mrrId,
      });
      let rrIds = poRec.getValue("custbody_kd_return_request2"); // add multiple return request
      if (rrIds.length > 0) {
        rrIds.push(rrId);
        poRec.setValue({
          fieldId: "custbody_kd_return_request2",
          value: rrIds,
        });
      } else {
        poRec.setValue({
          fieldId: "custbody_kd_return_request2",
          value: rrId,
        });
      }

      let poLines = getIRSLine({ rrId: rrId });
      log.audit("poLines", poLines);
      if (poLines.length < 1) throw "No Lines can be set on the Purchase Order";
      let line = 0;
      poLines.forEach((itemInfo) => {
        try {
          let {
            item,
            id,
            manufacturer,
            mfgProcessing,
            pharmaProcessing,
            quantity,
            amount,
            expDate,
            serialLotNumber,
            fullPartial,
            partialCount,
            priceLevel,
            binNumber,
          } = itemInfo;
          poRec.selectNewLine({
            sublistId: "item",
          });

          item &&
            poRec.setCurrentSublistValue({
              sublistId: "item",
              fieldId: "item",
              value: item,
            });
          id &&
            poRec.setCurrentSublistValue({
              sublistId: "item",
              fieldId: "custcol_rsrs_itemscan_link",
              value: id,
            });
          manufacturer &&
            poRec.setCurrentSublistValue({
              sublistId: "item",
              fieldId: "csegmanufacturer",
              value: manufacturer,
            });
          mfgProcessing &&
            poRec.setCurrentSublistValue({
              sublistId: "item",
              fieldId: "custcol_kod_mfgprocessing",
              value: mfgProcessing,
            });
          pharmaProcessing &&
            poRec.setCurrentSublistValue({
              sublistId: "item",
              fieldId: "custcol_kod_rqstprocesing",
              value: pharmaProcessing,
            });
          quantity &&
            poRec.setCurrentSublistValue({
              sublistId: "item",
              fieldId: "quantity",
              value: quantity,
            });
          amount &&
            poRec.setCurrentSublistValue({
              sublistId: "item",
              fieldId: "amount",
              value: amount ? amount : 0,
            });

          fullPartial &&
            poRec.setCurrentSublistValue({
              sublistId: "item",
              fieldId: "custcol_kod_fullpartial",
              value: fullPartial,
            });
          partialCount &&
            poRec.setCurrentSublistValue({
              sublistId: "item",
              fieldId: "custcol_kd_partialcount",
              value: partialCount,
            });
          priceLevel &&
            poRec.setCurrentSublistValue({
              sublistId: "item",
              fieldId: "custcol_rxrs_price_level",
              value: priceLevel,
            });
          try {
            const subRec = poRec.getCurrentSublistSubrecord({
              sublistId: "item",
              fieldId: "inventorydetail",
            });
            if (subRec) {
              setInventoryDetails({
                inventoryDetailSubrecord: subRec,
                quantity: quantity,
                serialLotNumber: serialLotNumber,
                expirationDate: expDate,
                toBinNumber: binNumber,
              });
            }
          } catch (e) {
            log.error("Setting Inventory Detail", {
              error: e.message,
              item: item,
            });
          }

          poLinesInfo.push({
            line: line,
            quantity: +item.quantity,
          });
          poRec.commitLine("item");
          line++;
        } catch (e) {
          log.error("Setting PO Lines", { item: itemInfo, error: e.message });
        }
      });
      let POID = poRec.save({
        ignoreMandatoryFields: true,
      });
      if (POID) {
        rxrs_rcl_lib.updateReturnCoverRecord(mrrId);
        let resMessage;
        const IRId = transformRecord({
          fromType: record.Type.PURCHASE_ORDER,
          toType: record.Type.ITEM_RECEIPT,
          fromId: POID,
          isDynamic: true,
          rrId: rrId,
        });

        // log.audit("IRID", IRId);
        // log.audit("PO Id", POID);
        resMessage = `Successfully Created PO: ${POID}`;
        if (IRId) {
          resMessage += `  Successfully Item Receipt: ${IRId}`;
          if (forBillCreation == true) {
            createBill({
              poId: POID,
              planSelectionType: TOPCO_PLAN,
            });
          }
        }
        return {
          resMessage: resMessage,
        };
      }
    } catch (e) {
      log.error("createPO", e.message);
      return { error: e.message };
    }
  }

  /**
   * Set the transaction inventory detail bin number
   * @param {number}options.id internal id of the transaction
   * @param {string}options.type record type
   * @param {string}options.binNumber - Internal Id of the bin number
   * @return the internal id of the updated transaction
   */
  function setTransactionBinNumber(options) {
    log.audit("setTransactionBinNumber", options);
    let { id, type } = options;
    try {
      const rec = record.load({
        type: type,
        id: id,
      });
    } catch (e) {
      log.error("setTransactionBinNumber", e.message);
    }
  }

  /**
   * Set ERV Discount Price if the selected plan type is government
   * @param {object} rec
   * @return  Object with modified amount
   */
  function setERVDiscountPrice(rec) {
    try {
      log.audit("Setting Partial Amount");
      for (let i = 0; i < rec.getLineCount("item"); i++) {
        try {
          rec.setSublistValue({
            sublistId: "item",
            fieldId: "price",
            line: i,
            value: 15, // ERV DISCOUNT
          });
          const amount = rec.getSublistValue({
            sublistId: "item",
            fieldId: "amount",
            line: i,
          });
          const rate = rec.getSublistValue({
            sublistId: "item",
            fieldId: "rate",
            line: i,
          });
          const ervAmount = amount / 0.15;
          const ervRate = rate / 0.15;
          rec.setSublistValue({
            sublistId: "item",
            fieldId: "custcol_full_amount",
            line: i,
            value: ervAmount, // ERV DISCOUNT
          });
          rec.setSublistValue({
            sublistId: "item",
            fieldId: "custcol_full_unit_price",
            line: i,
            value: ervRate, // ERV DISCOUNT
          });
        } catch (e) {
          log.error("Setting ERV Amount", e.message);
        }
      }
      return rec;
    } catch (e) {
      log.error("setERVDiscountPrice", e.message);
    }
  }

  /**
   * Sets partial amount on each line item in a record based on custom fields.
   *
   * @param  rec - The NetSuite record object to process.
   * @return  rec - The updated record with partial amounts set on line items.
   */
  function setPartialAmount(rec) {
    try {
      log.audit("Setting Partial Amount");
      for (let i = 0; i < rec.getLineCount("item"); i++) {
        const isPartial = rec.getSublistValue({
          sublistId: "item",
          fieldId: "custcol_kod_fullpartial",
          line: i,
        });
        log.audit("Setting Partial Amount", isPartial);
        if (isPartial == 1) {
          rec.setSublistValue({
            sublistId: "item",
            fieldId: "custcol_kd_partialcount",
            value: 0,
            line: i,
          });
        } else {
          const partialCount = rec.getSublistValue({
            sublistId: "item",
            fieldId: "custcol_kd_partialcount",
            line: i,
          });
          const packageSize = rec.getSublistValue({
            sublistId: "item",
            fieldId: "custcol_package_size",
            line: i,
          });
          const rate = rec.getSublistValue({
            sublistId: "item",
            fieldId: "rate",
            line: i,
          });
          const qty = rec.getSublistValue({
            sublistId: "item",
            fieldId: "quantity",
            line: i,
          });

          let newAmount = qty * (partialCount / packageSize) * rate;
          log.audit("setPartialAmount", {
            partialAmount: newAmount.toFixed(2),
            line: i,
          });
          rec.setSublistValue({
            sublistId: "item",
            fieldId: "quantity",
            value: 1,
            line: i,
          });
          rec.setSublistValue({
            sublistId: "item",
            fieldId: "amount",
            line: i,
            value: newAmount.toFixed(2),
          });
        }
      }

      return rec;
    } catch (e) {
      log.error("setPartialAmount", e.message);
    }
  }

  /**
   * Add Vendor Bill Line
   * @param {number}options.existingBillId Vendor Bill ID
   * @param {*[]}options.lineInfo Item Return Scan Details
   */
  function addVendorBillLine(options) {
    log.audit("addVendorBillLine", options);
    let { existingBillId, lineInfo } = options;
    try {
      let vbRec = record.load({
        type: record.Type.VENDOR_BILL,
        id: existingBillId,
        isDynamic: true,
      });
      let line = 0;
      lineInfo.forEach((item) => {
        try {
          vbRec.selectNewLine({
            sublistId: "item",
          });
          vbRec.setCurrentSublistValue({
            sublistId: "item",
            fieldId: "item",
            value: +item.item,
          });
          vbRec.setCurrentSublistValue({
            sublistId: "item",
            fieldId: "custcol_rsrs_itemscan_link",
            value: +item.id,
          });
          vbRec.setCurrentSublistValue({
            sublistId: "item",
            fieldId: "csegmanufacturer",
            value: +item.manufacturer,
          });
          vbRec.setCurrentSublistValue({
            sublistId: "item",
            fieldId: "custcol_kod_mfgprocessing",
            value: +item.mfgProcessing,
          });
          vbRec.setCurrentSublistValue({
            sublistId: "item",
            fieldId: "custcol_kod_rqstprocesing",
            value: +item.pharmaProcessing,
          });
          vbRec.setCurrentSublistValue({
            sublistId: "item",
            fieldId: "quantity",
            value: +item.quantity,
          });
          vbRec.setCurrentSublistValue({
            sublistId: "item",
            fieldId: "amount",
            value: item.amount ? item.amount : 0,
          });
          const subRec = vbRec.getCurrentSublistSubrecord({
            sublistId: "item",
            fieldId: "inventorydetail",
          });
          setInventoryDetails({
            inventoryDetailSubrecord: subRec,
            quantity: item.quantity,
            serialLotNumber: item.serialLotNumber,
          });

          vbRec.commitLine("item");
          line++;
        } catch (e) {
          log.error(" addVendorBillLine Setting VB Lines", e.message);
        }
      });
    } catch (e) {
      log.error("addVendorBillLine", e.message);
    }
  }

  /**
   * Update the transaction related to item return scan mfg and pharma processing.
   * @param options.irsId - Item Return Scan Internal Id
   * @param options.mfgProcessing - MFG Processing
   * @param options.pharmaProcessing - Pharma Processing
   * @param options.pricelevel
   */
  function setIRSRelatedTranLineProcessing(options) {
    log.audit("setIRSRelatedTranLineProcessing", options);
    let { irsId, mfgProcessing, pharmaProcessing, amount, priceLevel, rate } =
      options;
    try {
      const transactionSearchObj = search.create({
        type: "transaction",
        settings: [{ name: "consolidationtype", value: "ACCTTYPE" }],
        filters: [
          ["type", "noneof", "CuTrSale102", "CuTrPrch106", "ItemRcpt"],
          "AND",
          ["custcol_rsrs_itemscan_link", "anyof", irsId],
        ],
        columns: [
          search.createColumn({ name: "line", label: "Line ID" }),
          search.createColumn({
            name: "type",
            label: "Type",
          }),
        ],
      });
      const searchResultCount = transactionSearchObj.runPaged().count;
      log.debug(
        "getIRSRelatedTranLineProcessing result count",
        searchResultCount,
      );
      transactionSearchObj.run().each(function (result) {
        let tranId = result.id;
        let recType = result.getValue({ name: "type" });
        let line = result.getValue({ name: "line" });
        try {
          log.audit("setIRSRelatedTranLineProcessing line", {
            tranId,
            recType,
            line,
            mfgProcessing,
            pharmaProcessing,
            amount,
            rate,
            priceLevel,
          });
          let type;
          switch (recType) {
            case "PurchOrd":
              type = record.Type.PURCHASE_ORDER;
              break;
            case "VendBill":
              type = record.Type.VENDOR_BILL;
              break;
          }
          let rec = record.load({
            type: type,
            id: tranId,
            isDynamic: true,
          });
          rec.selectLine({
            sublistId: "item",
            line: line - 1,
          });
          mfgProcessing &&
            rec.setCurrentSublistValue({
              sublistId: "item",
              fieldId: "custcol_kod_mfgprocessing",
              value: mfgProcessing,
            });
          priceLevel &&
            rec.setCurrentSublistValue({
              sublistId: "item",
              fieldId: "custcol_rxrs_price_level",
              value: priceLevel,
            });
          pharmaProcessing &&
            rec.setCurrentSublistValue({
              sublistId: "item",
              fieldId: "custcol_kod_rqstprocesing",
              value: pharmaProcessing,
            });
          rate &&
            rec.setCurrentSublistValue({
              sublistId: "item",
              fieldId: "rate",
              value: rate,
            });
          amount &&
            rec.setCurrentSublistValue({
              sublistId: "item",
              fieldId: "amount",
              value: amount,
            });
          rec.commitLine({
            sublistId: "item",
          });
          let recId = rec.save({
            ignoreMandatoryFields: true,
          });
          log.audit("succesfully updated : " + recId, {
            tranId,
            recType,
            line,
          });
        } catch (e) {
          let error = e.message;
          log.error(
            "setIRSRelatedTranLineProcessing Setting new pharma processing line ",
            {
              error,
              recType,
              line,
              mfgProcessing,
              pharmaProcessing,
            },
          );
        }
        return true;
      });
    } catch (e) {
      log.error("setIRSRelatedTranLineProcessing", e.message);
    }
  }

  /**
   * Get Item Return Scan Details
   * @param {number}options.rrId - Return Request Id
   * @param {number}options.mrrId - Master Return Request Id
   * @param {number}options.finalyPaymentSchedule
   * @param {number}options.pharmaProcessing
   * @param {number}options.irsId Item Return Scan Id
   * @return {array} return list of verified Item Return Scan
   */
  function getIRSLine(options) {
    log.audit("getIRSLine", getIRSLine);
    let { rrId, pharmaProcessing, finalyPaymentSchedule, mrrId, irsId } =
      options;
    try {
      let poLines = [];
      const customrecord_cs_item_ret_scanSearchObj = search.create({
        type: "customrecord_cs_item_ret_scan", // filters: ["custrecord_cs__rqstprocesing", "anyof", [1, 2]],
        columns: [
          search.createColumn({
            name: "custrecord_final_payment_schedule",
            sort: search.Sort.ASC,
            label: "Final Payment Schedule",
          }),
          search.createColumn({
            name: "custrecord_cs_return_req_scan_item",
            label: "Item",
          }),
          search.createColumn({
            name: "custrecord_cs_expiration_date",
            label: "Expiration Date",
          }),
          search.createColumn({
            name: "custrecord_scanmanufacturer",
            label: "Manufacturer",
          }),
          search.createColumn({
            name: "custrecord_cs__mfgprocessing",
            label: "Mfg Processing",
          }),
          search.createColumn({
            name: "custrecord_cs__rqstprocesing",
            label: "Pharmacy Processing",
          }),
          search.createColumn({
            name: "custrecord_cs_qty",
            label: "Qty",
          }),
          search.createColumn({ name: "custrecord_scanrate", label: "Rate" }),
          search.createColumn({
            name: "custrecord_irc_total_amount",
            label: "Amount ",
          }),
          search.createColumn({
            name: "custrecord_cs_lotnum",
          }),
          search.createColumn({
            name: "custrecord_cs_full_partial_package",
          }),

          search.createColumn({
            name: "custrecord_scanpartialcount",
          }),
          search.createColumn({
            name: "custrecord_scanpricelevel",
          }),
          search.createColumn({
            name: "custrecord_itemscanbin",
          }),
        ],
      });
      if (pharmaProcessing) {
        customrecord_cs_item_ret_scanSearchObj.filters.push(
          search.createFilter({
            name: "custrecord_cs__rqstprocesing",
            operator: "anyof",
            values: pharmaProcessing,
          }),
        );
      } else {
        customrecord_cs_item_ret_scanSearchObj.filters.push(
          search.createFilter({
            name: "custrecord_cs__rqstprocesing",
            operator: "anyof",
            values: [1, 2],
          }),
        );
      }
      if (rrId) {
        customrecord_cs_item_ret_scanSearchObj.filters.push(
          search.createFilter({
            name: "custrecord_cs_ret_req_scan_rrid",
            operator: "anyof",
            values: rrId,
          }),
        );
      }
      if (finalyPaymentSchedule) {
        customrecord_cs_item_ret_scanSearchObj.filters.push(
          search.createFilter({
            name: "custrecord_final_payment_schedule",
            operator: "anyof",
            values: finalyPaymentSchedule,
          }),
        );
      }

      if (mrrId) {
        customrecord_cs_item_ret_scanSearchObj.filters.push(
          search.createFilter({
            name: "custrecord_irs_master_return_request",
            operator: "anyof",
            values: mrrId,
          }),
        );
      }
      if (irsId) {
        customrecord_cs_item_ret_scanSearchObj.filters.push(
          search.createFilter({
            name: "internalid",
            operator: "anyof",
            values: irsId,
          }),
        );
      }
      customrecord_cs_item_ret_scanSearchObj.run().each(function (result) {
        let amount = 0;

        amount = result.getValue("custrecord_irc_total_amount");
        poLines.push({
          id: result.id,
          item: result.getValue("custrecord_cs_return_req_scan_item"),
          manufacturer: result.getValue("custrecord_scanmanufacturer"),
          mfgProcessing: result.getValue("custrecord_cs__mfgprocessing"),
          pharmaProcessing: result.getValue("custrecord_cs__rqstprocesing"),
          quantity: result.getValue("custrecord_cs_qty"),
          amount: amount,
          expDate: result.getText("custrecord_cs_expiration_date"),
          serialLotNumber: result.getValue("custrecord_cs_lotnum"),
          fullPartial: result.getValue("custrecord_cs_full_partial_package"),
          partialCount: result.getValue("custrecord_scanpartialcount"),
          priceLevel: result.getValue("custrecord_scanpricelevel"),
          binNumber: result.getValue("custrecord_itemscanbin"),
        });
        return true;
      });
      log.debug("POLINE", poLines);
      return poLines;
    } catch (e) {
      log.error("getIRSLine", e.message);
    }
  }

  /**
   * Get the transaction line details
   * @param options.id Internal Id of the transaction
   * @return the line item values of the transaction
   */
  function getTransactionLine(options) {
    log.audit("getTransactionLine", options);
    let { id } = options;
    let tranLine = [];
    try {
      const transactionSearchObj = search.create({
        type: "transaction",
        settings: [{ name: "consolidationtype", value: "ACCTTYPE" }],
        filters: [
          ["internalidnumber", "equalto", id],
          "AND",
          ["item.type", "anyof", "InvtPart"],
          "AND",
          ["quantity", "isnotempty", ""],
        ],
        columns: [
          search.createColumn({ name: "item", label: "Item" }),
          search.createColumn({
            name: "quantity",
            label: "Quantity",
          }),
          search.createColumn({
            name: "binnumber",
            join: "inventoryDetail",
            label: "Bin Number",
          }),
          search.createColumn({
            name: "inventorynumber",
            join: "inventoryDetail",
            label: " Number",
          }),
          search.createColumn({
            name: "expirationdate",
            join: "inventoryDetail",
            label: "Expiration Date",
          }),
        ],
      });

      transactionSearchObj.run().each(function (result) {
        tranLine.push({
          item: result.getValue("item"),
          quantity: +result.getValue("quantity") * -1,
          expDate: result.getValue({
            name: "expirationdate",
            join: "inventoryDetail",
          }),
          serialLotNumber: result.getText({
            name: "inventorynumber",
            join: "inventoryDetail",
          }),
        });
        return true;
      });
      log.audit("Tranline", tranLine);
      return tranLine;
    } catch (e) {
      log.error("getTransactionLine", e.message);
    }
  }

  /**
   *Set inventory Detail Subrecord
   * @param {object}options.inventoryDetailSubrecord - inventory detail sub record
   * @param {number}options.quantity - Quantity
   * @param {string}options.serialLotNumber - Serial lot number
   * @param {string}options.expirationDate - Expiration date
   * @param {string}options.toBinNumber - Internal Id of the bin number
   */
  function setInventoryDetails(options) {
    log.audit("setInventoryDetails", options);
    let {
      inventoryDetailSubrecord,
      quantity,
      serialLotNumber,
      expirationDate,
      toBinNumber,
    } = options;
    try {
      inventoryDetailSubrecord.selectNewLine({
        sublistId: "inventoryassignment",
      });
      serialLotNumber &&
        inventoryDetailSubrecord.setCurrentSublistValue({
          sublistId: "inventoryassignment",
          fieldId: "receiptinventorynumber",
          value: serialLotNumber,
        });
      quantity &&
        inventoryDetailSubrecord.setCurrentSublistValue({
          sublistId: "inventoryassignment",
          fieldId: "quantity",
          value: quantity,
        });
      expirationDate &&
        inventoryDetailSubrecord.setCurrentSublistValue({
          sublistId: "inventoryassignment",
          fieldId: "expirationdate",
          value: new Date(expirationDate),
        });
      toBinNumber &&
        inventoryDetailSubrecord.setCurrentSublistValue({
          sublistId: "inventoryassignment",
          fieldId: "tobinnumber",
          value: toBinNumber,
        });
      return inventoryDetailSubrecord.commitLine({
        sublistId: "inventoryassignment",
      });
    } catch (e) {
      log.error("Setting Inventory Details", e.message);
    }
  }

  /**
   * Check If payment info exist
   * @param {string} cmId
   * @return true if there is an existing payment for the credit memo
   */
  function checkExistingPaymentInfo(cmId) {
    log.audit("checkExistingPaymentInfo", cmId);
    try {
      const transactionSearchObj = search.create({
        type: "transaction",
        filters: [
          ["type", "anyof", "Custom107"],
          "AND",
          ["custbody_credit_memos", "anyof", cmId],
        ],
      });
      return transactionSearchObj.runPaged().count > 0;
    } catch (e) {
      log.error("checkExistingPaymentInfo", e.message);
    }
  }

  /**
   * Get Payment SUM based on Invoice
   * @param {string} invId
   */
  function getPaymentSum(invId) {
    log.audit("getPaymentSum", invId);
    let total = 0;
    try {
      const transactionSearchObj = search.create({
        type: "transaction",
        filters: [
          ["type", "anyof", "Custom107"],
          "AND",
          ["custbody_payment_invoice_link", "anyof", invId],
        ],
        columns: [
          search.createColumn({
            name: "debitamount",
            summary: "SUM",
            label: "Amount (Debit)",
          }),
        ],
      });

      transactionSearchObj.run().each(function (result) {
        total = result.getValue({
          name: "debitamount",
          summary: "SUM",
        });
      });
      return total;
    } catch (e) {
      log.error("getPaymentSum", e.message);
    }
  }

  /**
   * Get the Total Count of Invoice With CM Payment
   */
  function getInvoiceLineCountWithCmPayment(invId) {
    try {
      const invoiceSearchObj = search.create({
        type: "invoice",
        filters: [
          ["type", "anyof", "CustInvc"],
          "AND",
          ["custcol_credit_memo_reference", "noneof", "@NONE@"],
          "AND",
          ["internalid", "anyof", invId],
        ],
      });
      return invoiceSearchObj.runPaged().count;
    } catch (e) {
      log.error("getInvoiceLineCountWithCmPayment", e.message);
    }
  }

  /**
   * Get the transaction line item details for credit memo suitelet
   * @param {string}options.type transaction type
   * @param {string}options.id transaction id
   * @param {boolean} options.isEdit
   * @param {string} options.creditMemoId
   * @return {object[]}
   */
  function getSalesTransactionLine(options) {
    log.audit("getSalesTransactionLine", options);
    let { id, type, isEdit, creditMemoId } = options;
    let itemInfo = [];
    try {
      log.emergency("isEdit", isEdit);
      const currentRecord = record.load({
        type: record.Type.INVOICE,
        id: id,
      });
      const isGoverment = currentRecord.getValue("custbody_plan_type") == 11; // Government
      const lineCount = currentRecord.getLineCount({
        sublistId: "item",
      });
      for (let i = 0; i < lineCount; i++) {
        let LOTNUMBER = "";
        let EXPDATE = "";
        log.debug({ title: "line", details: lineCount });
        let creditMemoReference = currentRecord.getSublistValue({
          sublistId: "item",
          fieldId: "custcol_credit_memo_reference",
          line: i,
        });

        const item = currentRecord.getSublistValue({
          sublistId: "item",
          fieldId: "item",
          line: i,
        });
        const itemName = currentRecord.getSublistText({
          sublistId: "item",
          fieldId: "item",
          line: i,
        });

        const quantity = currentRecord.getSublistValue({
          sublistId: "item",
          fieldId: "quantity",
          line: i,
        });
        const fullPartial = currentRecord.getSublistValue({
          sublistId: "item",
          fieldId: "custcol_kod_fullpartial",
          line: i,
        });
        const fullPartialText = currentRecord.getSublistText({
          sublistId: "item",
          fieldId: "custcol_kod_fullpartial",
          line: i,
        });
        let amountPaid = currentRecord.getSublistValue({
          sublistId: "item",
          fieldId: "custcol_cm_amount_paid",
          line: i,
        });
        let unitPrice = currentRecord.getSublistValue({
          sublistId: "item",
          fieldId: "custcol_cm_unit_price",
          line: i,
        });

        const description = currentRecord.getSublistValue({
          sublistId: "item",
          fieldId: "description",
          line: i,
        });
        const lineUniqueKey = currentRecord.getSublistValue({
          sublistId: "item",
          fieldId: "lineuniquekey",
          line: i,
        });
        const packageSize = currentRecord.getSublistValue({
          sublistId: "item",
          fieldId: "custcol_package_size",
          line: i,
        });
        let rate = currentRecord.getSublistValue({
          sublistId: "item",
          fieldId: "rate",
          line: i,
        });

        let amount = currentRecord.getSublistValue({
          sublistId: "item",
          fieldId: "amount",
          line: i,
        });
        let partialQuantity = 0;
        let isPartial = fullPartial == 2 ? true : false;
        if (isPartial == true) {
          partialQuantity = currentRecord.getSublistValue({
            sublistId: "item",
            fieldId: "custcol_kd_partialcount",
            line: i,
          });
        }

        let creditMemoParent = currentRecord.getSublistValue({
          sublistId: "item",
          fieldId: "custcol_cm_parent_id",
          line: i,
        });

        const fieldLookUp = search.lookupFields({
          type: search.Type.ITEM,
          id: item, //pass the id of the item here
          columns: "islotitem",
        });

        const islotitem = fieldLookUp.islotitem;
        log.debug({ title: "islotitem", details: islotitem });
        if (islotitem == true) {
          let inventoryDetailSubrecord = currentRecord.getSublistSubrecord({
            sublistId: "item",
            fieldId: "inventorydetail",
            line: i,
          });
          log.debug({ title: "subrec", details: inventoryDetailSubrecord });
          const invcount = inventoryDetailSubrecord.getLineCount({
            sublistId: "inventoryassignment",
          });
          log.debug({ title: "inventory details count", details: invcount });

          if (invcount) {
            for (let j = 0; j < invcount; j++) {
              LOTNUMBER = inventoryDetailSubrecord.getSublistText({
                sublistId: "inventoryassignment",
                fieldId: "issueinventorynumber",
                line: j,
              });
              EXPDATE = inventoryDetailSubrecord.getSublistText({
                sublistId: "inventoryassignment",
                fieldId: "expirationdate",
                line: j,
              });
            }
          }
        }
        log.audit("isgovernemt", isGoverment);

        if (isGoverment == true) {
          unitPrice /= 0.15;
          amountPaid /= 0.15;
          rate /= 0.15;
          amount /= 0.15;
        }
        log.emergency("creditMemoReference", isEmpty(creditMemoReference));
        log.emergency("condition: " + isEdit, JSON.parse(isEdit) == true);
        if (
          JSON.parse(isEdit) == true &&
          isEmpty(creditMemoReference) == false &&
          creditMemoId == creditMemoParent
        ) {
          log.error("pushing edited ");
          itemInfo.push({
            lineUniqueKey: lineUniqueKey,
            itemId: item,
            item: itemName,
            description: description,
            lotNumber: LOTNUMBER,
            expDate: EXPDATE,
            fullPartial: fullPartialText,
            packageSize: packageSize,
            quantity: quantity,
            partialQuantity: partialQuantity,
            rate: rate.toFixed(2),
            amount: amount.toFixed(2),
            unitPrice: unitPrice.toFixed(2),
            amountPaid: amountPaid.toFixed(2),
            creditMemoReference: creditMemoReference,
            creditMemoParent: creditMemoParent,
          });
        }
        if (
          JSON.parse(isEdit) == false &&
          isEmpty(creditMemoReference) == true
        ) {
          itemInfo.push({
            lineUniqueKey: lineUniqueKey,
            itemId: item,
            item: itemName,
            description: description,
            lotNumber: LOTNUMBER,
            expDate: EXPDATE,
            fullPartial: fullPartialText,
            packageSize: packageSize,
            quantity: quantity,
            partialQuantity: partialQuantity,
            rate: rate.toFixed(2),
            amount: amount.toFixed(2),
            unitPrice: unitPrice.toFixed(2),
            amountPaid: amountPaid.toFixed(2),
            creditMemoReference: creditMemoReference,
            creditMemoParent: creditMemoParent,
          });
        }

        log.debug("getSalesTransactionLine itemInfo", itemInfo);
      }
      return itemInfo;
    } catch (e) {
      log.error("getSalesTransactionLine", e.message);
    }
  }

  /**
   * Transfrom invoice into credit memo and remove all of the item that is not mark as denied
   * @param {object} options
   * @param {string}options.invId
   * @param {string}options.cmId
   * @param {number}options.amount
   * @param {number}options.itemId
   * @param {number}options.creditType
   * @param {number}options.invStatus
   * @param {number}options.creditAdjustmentAmount
   * @param {number}options.creditAdjustmentItem
   * @return {string} credit memo Id
   */
  function createCreditMemoFromInv(options) {
    log.audit("createCreditMemoFromInv", options);
    let {
      invId,
      cmId,
      amount,
      itemId,
      creditAdjustmentAmount,
      creditAdjustmentItem,
      creditType,
      invStatus,
    } = options;
    let Id;
    try {
      const objRecord = record.transform({
        fromType: record.Type.INVOICE,
        fromId: invId,
        toType: record.Type.CREDIT_MEMO,
        isDynamic: true,
      });
      objRecord.setValue({
        fieldId: "custbody_credit_type",
        value: creditType,
      });
      objRecord.setValue({
        fieldId: "tobeemailed",
        value: false,
      });
      objRecord.setValue({
        fieldId: "discountitem",
        value: "",
      });

      for (let i = 0; i < objRecord.getLineCount("item"); i++) {
        objRecord.removeLine({
          sublistId: "item",
          line: 0,
        });
      }
      objRecord.selectLine({
        sublistId: "item",
        line: 0,
      });
      objRecord.setCurrentSublistValue({
        sublistId: "item",
        fieldId: "item",
        value: itemId,
      });
      objRecord.setCurrentSublistValue({
        sublistId: "item",
        fieldId: "amount",
        value: amount,
      });
      let amountSet = objRecord.getCurrentSublistValue({
        sublistId: "item",
        fieldId: "amount",
      });
      let setITemField = objRecord.getCurrentSublistValue({
        sublistId: "item",
        fieldId: "item",
      });
      log.audit("setItemInCreditMemo", { setITemField, amountSet });
      objRecord.commitLine({
        sublistId: "item",
      });

      if (!isEmpty(creditAdjustmentAmount)) {
        try {
          // objRecord.selectLine({
          //   sublistId: "item",
          //   line: 1,
          // });
          // objRecord.setCurrentSublistValue({
          //   sublistId: "item",
          //   fieldId: "item",
          //   value: creditAdjustmentItem,
          // });
          // objRecord.setCurrentSublistValue({
          //   sublistId: "item",
          //   fieldId: "amount",
          //   value: creditAdjustmentAmount,
          // });
          // objRecord.commitLine({
          //   sublistId: "item",
          // });
        } catch (e) {
          log.error("Entering CreditAdjumentAccount", e.message);
        }
      }
      cmId &&
        objRecord.setValue({
          fieldId: "custbody_credit_memos",
          value: cmId,
        });

      const invIndex = objRecord.findSublistLineWithValue({
        sublistId: "apply",
        fieldId: "internalid",
        value: invId,
      });

      objRecord.selectLine({
        sublistId: "apply",
        line: 0,
      });
      objRecord.setCurrentSublistValue({
        sublistId: "apply",
        fieldId: "apply",
        value: false,
      });
      objRecord.commitLine({
        sublistId: "apply",
      });
      log.audit(
        "objRecord applied",
        objRecord.getCurrentSublistValue({
          sublistId: "apply",
          fieldId: "apply",
        }),
      );
      if (invIndex !== 0) {
        log.audit("Invoice index", invIndex);
        objRecord.selectLine({
          sublistId: "apply",
          line: invIndex,
        });
        objRecord.setCurrentSublistValue({
          sublistId: "apply",
          fieldId: "apply",
          value: true,
        });
        log.audit(
          "objRecord applied invoice",
          objRecord.getCurrentSublistValue({
            sublistId: "apply",
            fieldId: "apply",
          }),
        );
        objRecord.commitLine({
          sublistId: "apply",
        });
      }

      Id = objRecord.save({
        ignoreMandatoryFields: true,
      });
      log.audit("CM ID Created", Id);
      if (invStatus) {
        log.audit("Setting Invoice to Deny");
        record.submitFields({
          type: "invoice",
          id: invId,
          values: {
            custbody_invoice_status: invStatus, //set the invoice status to denied
          },
        });
      }
      return Id;
    } catch (e) {
      log.error("createCreditMemoFromInv", e.message);
    }
  }

  /**
   * Get the accumulated total amount of the invoice that has cmMemo Applied to Id
   * @param {object} options
   * @param {string} options.cmId
   * @param {string} options.invId
   * @return total amount
   */
  function getInvoiceLineAmount(options) {
    let { cmId, invId } = options;
    log.audit("getInvoiceLineAmount", options);
    let totalAmount = 0;
    try {
      const invRec = record.load({
        type: record.Type.INVOICE,
        id: invId,
      });
      for (let i = 0; i < invRec.getLineCount("item"); i++) {
        const cmRef = invRec.getSublistValue({
          sublistId: "item",
          fieldId: "custcol_credit_memo_reference",
          line: i,
        });
        const amount = invRec.getSublistValue({
          sublistId: "item",
          fieldId: "amount",
          line: i,
        });
        log.debug("line details", { cmRef, amount });
        if (cmRef == cmId) {
          totalAmount += amount;
        }
      }
      log.debug("total amount", totalAmount);
      return totalAmount;
    } catch (e) {
      log.error("getInvoiceLineAmount", e.message);
    }
  }

  /**
   * Get trancation status
   * @param {string}options.type
   * @param {string}options.id
   * @param {string}options.columns
   */
  function getCertainField(options) {
    let { type, id, columns } = options;
    try {
      const tranSearch = search.lookupFields({
        type: type,
        id: id,
        columns: [columns],
      });
      return tranSearch[columns][0].value;
    } catch (e) {
      log.error("getTransactionStatus", e.message);
    }
  }

  /**
   * Transform Record
   * @param {string}options.fromType
   * @param {string}options.toType
   * @param {number}options.fromId
   * @param {number}options.rrId
   * @param {boolean}options.isDynamic
   * @param {number}options.finalPaymentSchedule
   */
  function transformRecord(options) {
    log.audit("transformRecord params", options);
    let { fromType, finalPaymentSchedule, toType, fromId, rrId, isDynamic } =
      options;
    try {
      const objRecord = record.transform({
        fromType: fromType,
        fromId: fromId,
        toType: toType,
        isDynamic: isDynamic,
      });

      rrId &&
        objRecord.setValue({
          fieldId: "custbody_kd_return_request2",
          value: rrId,
        });

      return objRecord.save({ ignoreMandatoryFields: true });
    } catch (e) {
      log.error("transfromRecord", e.message);
    }
  }

  /**
   * Update transactionline CM SalesOrder
   * @param {object} options
   * @param {string} options.lineuniquekey
   * @param {string} options.cmLineId
   * @param {string} options.invId
   * @param {string} options.cmId
   * @param {number} options.amount
   * @param {number} options.unitPrice
   */
  function updateTranLineCM(options) {
    log.audit("updateTranLineCM", options);
    let { lineuniquekey, cmLineId, invId, cmId, amount, unitPrice } = options;

    try {
      const invRec = record.load({
        type: record.Type.INVOICE,
        id: invId,
      });
      invRec.setValue({
        fieldId: "custbody_credit_memos",
        value: cmId,
      });
      const index = invRec.findSublistLineWithValue({
        sublistId: "item",
        fieldId: "lineuniquekey",
        value: lineuniquekey,
      });
      if (index !== -1) {
        log.audit("updateTranLineCM", cmLineId);
        invRec.setSublistValue({
          sublistId: "item",
          fieldId: "custcol_credit_memo_reference",
          line: index,
          value: Number(cmLineId),
        });
        invRec.setSublistValue({
          sublistId: "item",
          fieldId: "custcol_credit_memo_reference",
          line: index,
          value: Number(cmLineId),
        });
        // invRec.setSublistValue({
        //   sublistId: "item",
        //   fieldId: "price",
        //   line: index,
        //   value: -1,
        // });
        // invRec.setSublistValue({
        //   sublistId: "item",
        //   fieldId: "rate",
        //   line: index,
        //   value: unitPrice,
        // });
        // invRec.setSublistValue({
        //   sublistId: "item",
        //   fieldId: "amount",
        //   line: index,
        //   value: amount,
        // });
      }
      invRec.save({
        ignoreMandatoryFields: true,
      });
    } catch (e) {
      log.error("updateTranLineCM", e.message);
    }
  }

  /**
   * Create Custom Payment Record
   * @param {number}options.paymentAmount
   * @param {string}options.dateReceived
   * @param {string}options.invoiceId
   * @param {string}options.creditMemoId
   * @param {number}options.cmLinesCount
   * @param {number}options.cmLinesCountWithPayment
   * @param {string}options.paymentId
   * @param {number}options.cmAmount
   * @param {nummber}options.planSelectionType
   * Return the internal Id of the created custom payment
   */
  function createPayment(options) {
    log.audit("createPayment", options);
    let response = {};
    const invoiceStatus = {
      partiallyPaid: 4,
      fullyPaid: 5,
    };
    const GOVERNMENT = 11;
    let invoiceUpdateStatus;

    let params = JSON.parse(options);
    let {
      paymentId,
      dateReceived,
      invoiceId,
      cmLinesCount,
      cmLinesCountWithPayment,
      cmId,
      cmAmount,
      paymentAmount,
      cmTotalAmount,
    } = params;
    let paymentTotalAmount = 0;
    try {
      if (!paymentId) {
        const paymentRec = record.create({
          type: "customtransaction_payment_info",
          isDynamic: true,
        });
        paymentRec.setValue({
          fieldId: "subsidiary",
          value: 2,
        });
        dateReceived &&
          paymentRec.setValue({
            fieldId: "trandate",
            value: new Date(dateReceived),
          });
        invoiceId &&
          paymentRec.setValue({
            fieldId: "custbody_payment_invoice_link",
            value: invoiceId,
          });
        const planSelectionType = paymentRec.getValue({
          fieldId: "custbody_pi_plan_type",
        });

        cmId &&
          paymentRec.setValue({
            fieldId: "custbody_credit_memos",
            value: cmId,
          });
        if (planSelectionType == GOVERNMENT) {
          paymentRec.selectNewLine({
            sublistId: "line",
          });
          paymentRec.setCurrentSublistValue({
            sublistId: "line",
            fieldId: "account",
            value: ACCOUNT.Undeposited_Funds,
          });
          log.debug("paymentamount debit", paymentAmount.toFixed(2));
          paymentRec.setCurrentSublistValue({
            sublistId: "line",
            fieldId: "debit",
            value: paymentAmount.toFixed(2),
          });
          paymentRec.commitLine({
            sublistId: "line",
          });
          paymentRec.selectNewLine({
            sublistId: "line",
          });
          paymentRec.setCurrentSublistValue({
            sublistId: "line",
            fieldId: "account",
            value: ACCOUNT.Unapplied_Credits,
          });
          log.debug("paymentamount credit", paymentAmount);
          paymentRec.setCurrentSublistValue({
            sublistId: "line",
            fieldId: "credit",
            value: (paymentAmount * 0.15).toFixed(2),
          });
          paymentRec.commitLine({
            sublistId: "line",
          });
          paymentRec.selectNewLine({
            sublistId: "line",
          });
          paymentRec.setCurrentSublistValue({
            sublistId: "line",
            fieldId: "account",
            value: ACCOUNT.Undeposited_Funds,
          });
          log.debug("paymentamount credit", (paymentAmount * 0.85).toFixed(2));
          paymentRec.setCurrentSublistValue({
            sublistId: "line",
            fieldId: "credit",
            value: (paymentAmount * 0.85).toFixed(2),
          });
          paymentRec.commitLine({
            sublistId: "line",
          });
          log.debug("payment rec", paymentRec);
        } else {
          paymentRec.selectNewLine({
            sublistId: "line",
          });
          paymentRec.setCurrentSublistValue({
            sublistId: "line",
            fieldId: "account",
            value: ACCOUNT.Undeposited_Funds,
          });
          log.debug("paymentamount", paymentAmount);
          paymentRec.setCurrentSublistValue({
            sublistId: "line",
            fieldId: "debit",
            value: paymentAmount,
          });
          paymentRec.commitLine({
            sublistId: "line",
          });
          paymentRec.selectNewLine({
            sublistId: "line",
          });
          paymentRec.setCurrentSublistValue({
            sublistId: "line",
            fieldId: "account",
            value: ACCOUNT.Unapplied_Credits,
          });
          paymentRec.setCurrentSublistValue({
            sublistId: "line",
            fieldId: "credit",
            value: paymentAmount,
          });
          paymentRec.commitLine({
            sublistId: "line",
          });
        }

        paymentId = paymentRec.save({
          ignoreMandatoryFields: true,
        });
        if (paymentId) {
          paymentTotalAmount = getPaymentSum(invoiceId);
          if (cmLinesCount == cmLinesCountWithPayment) {
            invoiceUpdateStatus = invoiceStatus.fullyPaid;
          } else {
            invoiceUpdateStatus = invoiceStatus.partiallyPaid;
          }

          response.sucessMessage = "Successfully Created Payment: " + paymentId;
        }
      } else {
        const paymentRec = record.load({
          type: "customtransaction_payment_info",
          id: paymentId,
        });
        paymentRec.setSublistValue({
          sublistId: "line",
          fieldId: "debit",
          value: paymentAmount,
          line: 0,
        });
        paymentRec.setSublistValue({
          sublistId: "line",
          fieldId: "credit",
          value: paymentAmount,
          line: 1,
        });
        paymentId = paymentRec.save({
          ignoreMandatoryFields: true,
        });
        if (paymentId) {
          paymentTotalAmount = getPaymentSum(invoiceId);
          if (cmLinesCount == cmLinesCountWithPayment) {
            invoiceUpdateStatus = invoiceStatus.fullyPaid;
          } else {
            invoiceUpdateStatus = invoiceStatus.partiallyPaid;
          }
          response.sucessMessage = "Successfully Updated Payment: " + paymentId;
        }
      }
    } catch (e) {
      log.error("createPayment", e.message);
      response.error = e.message;
    }
    if (paymentId) {
      const invRec = record.load({
        type: record.Type.INVOICE,
        id: invoiceId,
        isDynamic: true,
      });
      invRec.setValue({
        fieldId: "custbody_invoice_status",
        value: invoiceUpdateStatus,
      });
      const total = invRec.getValue("total");
      invRec.setValue({
        fieldId: "custbody_remaining_balance",
        value: Number(total) - Number(paymentTotalAmount),
      });
      const invId = invRec.save({
        ignoreMandatoryFields: true,
      });
      log.error("invId", invId);
      return response.sucessMessage;
    } else {
      return "ERROR: " + response.error;
    }
  }

  /**
   * Check if the payment is already created for invoice || creditmemo
   * @param {string} options.invId
   * @param {string} options.cmId
   */
  function checkExistingPayment(options) {
    log.audit("checkExistingPayment", options);
    let { invId, cmId } = options;
    let returnObj = {};
    try {
      const transactionSearchObj = search.create({
        type: "transaction",
        filters: [
          ["type", "anyof", "Custom107"],
          "AND",
          ["custbody_payment_invoice_link", "anyof", invId],
        ],
        columns: [
          search.createColumn({
            name: "trandate",
            label: "Date",
          }),
          search.createColumn({
            name: "debitamount",
            label: "Amount (Debit)",
          }),
          search.createColumn({ name: "internalid", label: "Internal Id" }),
        ],
      });
      if (cmId) {
        transactionSearchObj.filters.push(
          search.createFilter({
            name: "custbody_credit_memos",
            operator: "anyof",
            values: cmId,
          }),
        );
      }

      transactionSearchObj.run().each(function (result) {
        returnObj.date = result.getValue("trandate");
        returnObj.amount = result.getValue("debitamount");
        returnObj.id = result.id;
      });
      log.audit("checkExistingPayment return", returnObj);
      return returnObj;
    } catch (e) {
      log.error("checkExistingPayment", e.message);
    }
  }

  /**
   * Create PO if the type of the Return Request is RRPO
   * @param {number}options.poId - Purchase Order Id
   * @param {number}options.finalPaymentSchedule - Final Payment Schedule
   * @param {string} options.planSelectionType
   */
  function createBill(options) {
    log.audit("createBill", options);
    let { finalPaymentSchedule, poId } = options;
    try {
      // if (finalPaymentSchedule == undefined) return;
      let vbId, vbRec2, vbRec, dueDate;
      vbId = transformRecord({
        fromType: record.Type.PURCHASE_ORDER,
        toType: record.Type.VENDOR_BILL,
        fromId: poId,
        isDynamic: false,
      });
      vbRec = record.load({
        type: record.Type.VENDOR_BILL,
        id: vbId,
        isDynamic: false,
      });

      const vendorId = vbRec.getValue("entity");
      let mrrId = vbRec.getValue("custbody_kd_master_return_id");
      if (vendorId == TOPCO_VENDOR) {
        // Top CO
        vbRec.setValue({
          fieldId: "tranid",
          value: poId,
        });
        dueDate = rxrs_util.setBillDueDate({
          date: new Date(),
          isTopCo: true,
          monthsToAdd: 3,
        });
        vbRec.setValue({
          fieldId: "duedate",
          value: dueDate,
        });
        const monthShort = dueDate.toLocaleString("en-US", { month: "short" });
        const year = dueDate.getFullYear();
        let postingPeriod = rxrs_util.getPeriodId(monthShort + " " + year);

        let vbId = vbRec.save({ ignoreMandatoryFields: true });
        return record.submitFields({
          type: record.Type.VENDOR_BILL,
          id: vbId,
          values: { postingperiod: postingPeriod },
        });
      } else {
        vbRec = removeVBLine({
          vbRec: vbRec,
          finalPaymentSchedule: finalPaymentSchedule,
          updateLine: false,
        });

        let vbId = vbRec.save({ ignoreMandatoryFields: true });
        vbRec = record.load({
          type: record.Type.VENDOR_BILL,
          id: vbId,
          isDynamic: false,
        });
        // return record.submitFields({
        //   type: record.Type.VENDOR_BILL,
        //   id: vbId,
        //   values: { postingperiod: postingPeriod },
        // });
        vbRec.setValue({
          fieldId: "tranid",
          value: mrrId + "_" + options.finalPaymentSchedule,
        });
        vbRec.setValue({
          fieldId: "custbody_kodpaymentsched",
          value: options.finalPaymentSchedule,
        });
        vbRec2 = removeVBLine({
          vbRec: vbRec,
          updateLine: false,
          finalPaymentSchedule: finalPaymentSchedule,
        });

        if (vbRec2 && finalPaymentSchedule === 12) {
          vbId = addBillProcessingFee({
            vbRecId: vbRec2.save({ ignoreMandatoryFields: true }),
          });
          return vbId;
        } else {
          return vbRec2.save({ ignoreMandatoryFields: true });
        }
      }
    } catch (e) {
      log.error("createBill", e.message);
      //  return { error: e.message };
    }
  }

  function createServiceItemLines(newVBRec) {
    log.emergency("createServiceItemLines", newVBRec);
    const ACCRUEDPURCHASEITEM = 916;

    const RETURNABLESERVICEFEEITEM = 882;

    let returnableAmount = 0;
    const returnableFeeRate =
      newVBRec.getValue("custbody_rxrs_returnable_fee") / 100;
    let accruedAmount = 0;
    try {
      for (let i = 0; i < newVBRec.getLineCount("item"); i++) {
        const mfgProcessing = newVBRec.getSublistValue({
          sublistId: "item",
          fieldId: "custcol_kod_mfgprocessing",
          line: i,
        });
        const pharmaProcessing = newVBRec.getSublistValue({
          sublistId: "item",
          fieldId: "custcol_kod_rqstprocesing",
          line: i,
        });
        let quantity = newVBRec.getSublistValue({
          sublistId: "item",
          fieldId: "quantity",
          line: i,
        });
        let rate = newVBRec.getSublistValue({
          sublistId: "item",
          fieldId: "rate",
          line: i,
        });
        log.debug("processing", {
          line: i,
          pharma: pharmaProcessing,
          mfg: mfgProcessing,
        });
        if (pharmaProcessing == NONRETURNABLE && mfgProcessing == RETURNABLE) {
          let amount = newVBRec.getSublistValue({
            sublistId: "item",
            fieldId: "amount",
            line: i,
          });
          amount = amount === 0 ? rate * quantity : amount;
          newVBRec.setSublistValue({
            sublistId: "item",
            fieldId: "amount",
            value: amount,
            line: i,
          });
          accruedAmount += newVBRec.getSublistValue({
            sublistId: "item",
            fieldId: "amount",
            line: i,
          });
        }
        if (
          pharmaProcessing == NONRETURNABLE &&
          mfgProcessing == NONRETURNABLE
        ) {
          newVBRec.setSublistValue({
            sublistId: "item",
            fieldId: "rate",
            value: 0,
            line: i,
          });
        }

        if (pharmaProcessing == RETURNABLE) {
          let amount = newVBRec.getSublistValue({
            sublistId: "item",
            fieldId: "amount",
            line: i,
          });
          amount = amount === 0 ? rate * quantity : amount;
          log.emergency("returnable line: ", { i, amount });
          newVBRec.setSublistValue({
            sublistId: "item",
            fieldId: "amount",
            value: amount,
            line: i,
          });
          returnableAmount += newVBRec.getSublistValue({
            sublistId: "item",
            fieldId: "amount",
            line: i,
          });
        }
      }
      if (returnableFeeRate) {
        const serviceFeeAmount = +returnableAmount * +returnableFeeRate;
        log.debug("addBillProcessingFee values", {
          returnableFeeRate,
          serviceFeeAmount,
          returnableAmount,
        });
        let returnableServiceFeeIndex = newVBRec.findSublistLineWithValue({
          sublistId: "item",
          fieldId: "item",
          value: RETURNABLESERVICEFEEITEM,
        });
        if (returnableServiceFeeIndex != -1) {
          newVBRec.removeLine({
            sublistId: "item",
            line: returnableServiceFeeIndex,
          });
          const lastIndex = newVBRec.getLineCount({ sublistId: "item" });
          newVBRec.insertLine({ sublistId: "item", line: lastIndex });
          newVBRec.setSublistValue({
            sublistId: "item",
            fieldId: "item",
            value: RETURNABLESERVICEFEEITEM,
            line: lastIndex,
          });
          newVBRec.setSublistValue({
            sublistId: "item",
            fieldId: "amount",
            value: -Math.abs(serviceFeeAmount),
            line: lastIndex,
          });
          newVBRec.setSublistValue({
            sublistId: "item",
            fieldId: "rate",
            value: -Math.abs(serviceFeeAmount),
            line: lastIndex,
          });
        } else {
          const lastIndex = newVBRec.getLineCount({ sublistId: "item" });
          newVBRec.insertLine({ sublistId: "item", line: lastIndex });
          newVBRec.setSublistValue({
            sublistId: "item",
            fieldId: "item",
            value: RETURNABLESERVICEFEEITEM,
            line: lastIndex,
          });

          newVBRec.setSublistValue({
            sublistId: "item",
            fieldId: "rate",
            value: -Math.abs(serviceFeeAmount),
            line: lastIndex,
          });
          newVBRec.setSublistValue({
            sublistId: "item",
            fieldId: "amount",
            value: -Math.abs(serviceFeeAmount),
            line: lastIndex,
          });
        }
      }
      if (accruedAmount > 0) {
        let accruedItemIndex = newVBRec.findSublistLineWithValue({
          sublistId: "item",
          fieldId: "item",
          value: ACCRUEDPURCHASEITEM,
        });
        if (accruedItemIndex != -1) {
          newVBRec.removeLine({
            sublistId: "item",
            line: accruedItemIndex,
          });
          const lastIndex = newVBRec.getLineCount({ sublistId: "item" });
          newVBRec.insertLine({ sublistId: "item", line: lastIndex });
          newVBRec.setSublistValue({
            sublistId: "item",
            fieldId: "item",
            value: ACCRUEDPURCHASEITEM,
            line: lastIndex,
          });
          newVBRec.setSublistValue({
            sublistId: "item",
            fieldId: "amount",
            value: -Math.abs(accruedAmount),
            line: lastIndex,
          });
          newVBRec.setSublistValue({
            sublistId: "item",
            fieldId: "rate",
            value: -Math.abs(accruedAmount),
            line: lastIndex,
          });
        } else {
          const lastIndex = newVBRec.getLineCount({ sublistId: "item" });
          newVBRec.insertLine({ sublistId: "item", line: lastIndex });
          newVBRec.setSublistValue({
            sublistId: "item",
            fieldId: "item",
            value: ACCRUEDPURCHASEITEM,
            line: lastIndex,
          });
          newVBRec.setSublistValue({
            sublistId: "item",
            fieldId: "amount",
            value: -Math.abs(accruedAmount),
            line: lastIndex,
          });
          newVBRec.setSublistValue({
            sublistId: "item",
            fieldId: "rate",
            value: -Math.abs(accruedAmount),
            line: lastIndex,
          });
        }
      }
      return newVBRec.save({ ignoreMandatoryFields: true });
    } catch (e) {
      log.error("createServiceItem", e.message);
    }
  }

  /**
   * Update the mfgprocessing/pharmaprocessing
   * @param {string}options.type - The type of transaction
   * @param {number}options.id - transaction Id
   * @param {string}options.pharmaProcessing - Pharma processing
   * @param {string}options.mfgProcessing - MFG processing
   * @param {string} options.IRSId - Item Return Scan Id
   * @param {number} options.priceLevel - Price Level updated
   */
  function updateProcessing(options) {
    log.audit("updateProcessing params", options);
    let { type, id, IRSId, pharmaProcessing, mfgProcessing } = options;
    try {
      const tranRec = record.load({
        type: type,
        id: id,
      });
      if (type === record.Type.VENDOR_BILL) {
        let newVBRec = removeVBLine({
          finalPaymentSchedule: tranRec.getValue("custbody_kodpaymentsched"),
          vbRec: tranRec,
        });
        const ACCRUEDPURCHASEITEM = 916;
        const RETURNABLE = 2;
        const NONRETURNABLE = 1;
        const RETURNABLESERVICEFEEITEM = 882;

        let returnableAmount = 0;
        const returnableFeeRate =
          newVBRec.getValue("custbody_rxrs_returnable_fee") / 100;
        let accruedAmount = 0;
        try {
          for (let i = 0; i < newVBRec.getLineCount("item"); i++) {
            const mfgProcessing = newVBRec.getSublistValue({
              sublistId: "item",
              fieldId: "custcol_kod_mfgprocessing",
              line: i,
            });
            const pharmaProcessing = newVBRec.getSublistValue({
              sublistId: "item",
              fieldId: "custcol_kod_rqstprocesing",
              line: i,
            });
            let quantity = newVBRec.getSublistValue({
              sublistId: "item",
              fieldId: "quantity",
              line: i,
            });
            let rate = newVBRec.getSublistValue({
              sublistId: "item",
              fieldId: "rate",
              line: i,
            });
            log.debug("processing", {
              line: i,
              pharma: pharmaProcessing,
              mfg: mfgProcessing,
            });
            if (
              pharmaProcessing == NONRETURNABLE &&
              mfgProcessing == RETURNABLE
            ) {
              let amount = newVBRec.getSublistValue({
                sublistId: "item",
                fieldId: "amount",
                line: i,
              });
              amount = amount === 0 ? rate * quantity : amount;
              newVBRec.setSublistValue({
                sublistId: "item",
                fieldId: "amount",
                value: amount,
                line: i,
              });
              accruedAmount += newVBRec.getSublistValue({
                sublistId: "item",
                fieldId: "amount",
                line: i,
              });
            }
            if (
              pharmaProcessing == NONRETURNABLE &&
              mfgProcessing == NONRETURNABLE
            ) {
              newVBRec.setSublistValue({
                sublistId: "item",
                fieldId: "rate",
                value: 0,
                line: i,
              });
            }

            if (pharmaProcessing == RETURNABLE) {
              let amount = newVBRec.getSublistValue({
                sublistId: "item",
                fieldId: "amount",
                line: i,
              });
              amount = amount === 0 ? rate * quantity : amount;
              log.emergency("returnable line: ", { i, amount });
              newVBRec.setSublistValue({
                sublistId: "item",
                fieldId: "amount",
                value: amount,
                line: i,
              });
              returnableAmount += newVBRec.getSublistValue({
                sublistId: "item",
                fieldId: "amount",
                line: i,
              });
            }
          }
          if (returnableFeeRate) {
            const serviceFeeAmount = +returnableAmount * +returnableFeeRate;
            log.debug("addBillProcessingFee values", {
              returnableFeeRate,
              serviceFeeAmount,
              returnableAmount,
            });
            let returnableServiceFeeIndex = newVBRec.findSublistLineWithValue({
              sublistId: "item",
              fieldId: "item",
              value: RETURNABLESERVICEFEEITEM,
            });
            if (returnableServiceFeeIndex != -1) {
              newVBRec.removeLine({
                sublistId: "item",
                line: returnableServiceFeeIndex,
              });
              const lastIndex = newVBRec.getLineCount({ sublistId: "item" });
              newVBRec.insertLine({ sublistId: "item", line: lastIndex });
              newVBRec.setSublistValue({
                sublistId: "item",
                fieldId: "item",
                value: RETURNABLESERVICEFEEITEM,
                line: lastIndex,
              });
              newVBRec.setSublistValue({
                sublistId: "item",
                fieldId: "amount",
                value: -Math.abs(serviceFeeAmount),
                line: lastIndex,
              });
              newVBRec.setSublistValue({
                sublistId: "item",
                fieldId: "rate",
                value: -Math.abs(serviceFeeAmount),
                line: lastIndex,
              });
            } else {
              const lastIndex = newVBRec.getLineCount({ sublistId: "item" });
              newVBRec.insertLine({ sublistId: "item", line: lastIndex });
              newVBRec.setSublistValue({
                sublistId: "item",
                fieldId: "item",
                value: RETURNABLESERVICEFEEITEM,
                line: lastIndex,
              });

              newVBRec.setSublistValue({
                sublistId: "item",
                fieldId: "rate",
                value: -Math.abs(serviceFeeAmount),
                line: lastIndex,
              });
              newVBRec.setSublistValue({
                sublistId: "item",
                fieldId: "amount",
                value: -Math.abs(serviceFeeAmount),
                line: lastIndex,
              });
            }
          }
          if (accruedAmount > 0) {
            let accruedItemIndex = newVBRec.findSublistLineWithValue({
              sublistId: "item",
              fieldId: "item",
              value: ACCRUEDPURCHASEITEM,
            });
            if (accruedItemIndex != -1) {
              newVBRec.removeLine({
                sublistId: "item",
                line: accruedItemIndex,
              });
              const lastIndex = newVBRec.getLineCount({ sublistId: "item" });
              newVBRec.insertLine({ sublistId: "item", line: lastIndex });
              newVBRec.setSublistValue({
                sublistId: "item",
                fieldId: "item",
                value: ACCRUEDPURCHASEITEM,
                line: lastIndex,
              });
              newVBRec.setSublistValue({
                sublistId: "item",
                fieldId: "amount",
                value: -Math.abs(accruedAmount),
                line: lastIndex,
              });
              newVBRec.setSublistValue({
                sublistId: "item",
                fieldId: "rate",
                value: -Math.abs(accruedAmount),
                line: lastIndex,
              });
            } else {
              const lastIndex = newVBRec.getLineCount({ sublistId: "item" });
              newVBRec.insertLine({ sublistId: "item", line: lastIndex });
              newVBRec.setSublistValue({
                sublistId: "item",
                fieldId: "item",
                value: ACCRUEDPURCHASEITEM,
                line: lastIndex,
              });
              newVBRec.setSublistValue({
                sublistId: "item",
                fieldId: "amount",
                value: -Math.abs(accruedAmount),
                line: lastIndex,
              });
              newVBRec.setSublistValue({
                sublistId: "item",
                fieldId: "rate",
                value: -Math.abs(accruedAmount),
                line: lastIndex,
              });
            }
          }
        } catch (e) {
          log.error("update service item", e.message);
        }
        return newVBRec.save({ ignoreMandatoryFields: true });
      } else {
        return tranRec.save({
          ignoreMandatoryFields: true,
        });
      }
    } catch (e) {
      log.error("updateProcessing", e.message);
    }
  }

  /**
   * Add service fee item in the bill
   * @param {object} options.vbRecId vendor bill Rec
   * @param {string} options.rclId return cover letter Id
   * @param {number} options.nonReturnableFeeAmount return non-returnable fee amount
   */
  function addBillProcessingFee(options) {
    log.audit("addBillProcessingFee", options);
    let { rclId, vbRecId } = options;
    try {
      const newVBRec = record.load({
        type: record.Type.VENDOR_BILL,
        id: vbRecId,
      });
      log.emergency("addBillProcessingFee", newVBRec);
      const ACCRUEDPURCHASEITEM = 916;
      const RETURNABLE = 2;
      const NONRETURNABLE = 1;
      const RETURNABLESERVICEFEEITEM = 882;

      let returnableAmount = 0;
      const returnableFeeRate =
        newVBRec.getValue("custbody_rxrs_returnable_fee") / 100;
      let accruedAmount = 0;
      try {
        for (let i = 0; i < newVBRec.getLineCount("item"); i++) {
          const mfgProcessing = newVBRec.getSublistValue({
            sublistId: "item",
            fieldId: "custcol_kod_mfgprocessing",
            line: i,
          });
          const pharmaProcessing = newVBRec.getSublistValue({
            sublistId: "item",
            fieldId: "custcol_kod_rqstprocesing",
            line: i,
          });
          let quantity = newVBRec.getSublistValue({
            sublistId: "item",
            fieldId: "quantity",
            line: i,
          });
          let rate = newVBRec.getSublistValue({
            sublistId: "item",
            fieldId: "rate",
            line: i,
          });
          log.debug("processing", {
            line: i,
            pharma: pharmaProcessing,
            mfg: mfgProcessing,
          });
          if (
            pharmaProcessing == NONRETURNABLE &&
            mfgProcessing == RETURNABLE
          ) {
            let amount = newVBRec.getSublistValue({
              sublistId: "item",
              fieldId: "amount",
              line: i,
            });
            amount = amount === 0 ? rate * quantity : amount;
            newVBRec.setSublistValue({
              sublistId: "item",
              fieldId: "amount",
              value: amount,
              line: i,
            });
            accruedAmount += newVBRec.getSublistValue({
              sublistId: "item",
              fieldId: "amount",
              line: i,
            });
          }
          if (
            pharmaProcessing == NONRETURNABLE &&
            mfgProcessing == NONRETURNABLE
          ) {
            newVBRec.setSublistValue({
              sublistId: "item",
              fieldId: "rate",
              value: 0,
              line: i,
            });
          }

          if (pharmaProcessing == RETURNABLE) {
            let amount = newVBRec.getSublistValue({
              sublistId: "item",
              fieldId: "amount",
              line: i,
            });
            amount = amount === 0 ? rate * quantity : amount;
            log.emergency("returnable line: ", { i, amount });
            newVBRec.setSublistValue({
              sublistId: "item",
              fieldId: "amount",
              value: amount,
              line: i,
            });
            returnableAmount += newVBRec.getSublistValue({
              sublistId: "item",
              fieldId: "amount",
              line: i,
            });
          }
        }
        if (returnableFeeRate) {
          const serviceFeeAmount = +returnableAmount * +returnableFeeRate;
          log.debug("addBillProcessingFee values", {
            returnableFeeRate,
            serviceFeeAmount,
            returnableAmount,
          });
          let returnableServiceFeeIndex = newVBRec.findSublistLineWithValue({
            sublistId: "item",
            fieldId: "item",
            value: RETURNABLESERVICEFEEITEM,
          });
          if (returnableServiceFeeIndex != -1) {
            newVBRec.removeLine({
              sublistId: "item",
              line: returnableServiceFeeIndex,
            });
            const lastIndex = newVBRec.getLineCount({ sublistId: "item" });
            newVBRec.insertLine({ sublistId: "item", line: lastIndex });
            newVBRec.setSublistValue({
              sublistId: "item",
              fieldId: "item",
              value: RETURNABLESERVICEFEEITEM,
              line: lastIndex,
            });
            newVBRec.setSublistValue({
              sublistId: "item",
              fieldId: "amount",
              value: -Math.abs(serviceFeeAmount),
              line: lastIndex,
            });
            newVBRec.setSublistValue({
              sublistId: "item",
              fieldId: "rate",
              value: -Math.abs(serviceFeeAmount),
              line: lastIndex,
            });
          } else {
            const lastIndex = newVBRec.getLineCount({ sublistId: "item" });
            newVBRec.insertLine({ sublistId: "item", line: lastIndex });
            newVBRec.setSublistValue({
              sublistId: "item",
              fieldId: "item",
              value: RETURNABLESERVICEFEEITEM,
              line: lastIndex,
            });

            newVBRec.setSublistValue({
              sublistId: "item",
              fieldId: "rate",
              value: -Math.abs(serviceFeeAmount),
              line: lastIndex,
            });
            newVBRec.setSublistValue({
              sublistId: "item",
              fieldId: "amount",
              value: -Math.abs(serviceFeeAmount),
              line: lastIndex,
            });
          }
        }
        if (accruedAmount > 0) {
          let accruedItemIndex = newVBRec.findSublistLineWithValue({
            sublistId: "item",
            fieldId: "item",
            value: ACCRUEDPURCHASEITEM,
          });
          if (accruedItemIndex != -1) {
            newVBRec.removeLine({
              sublistId: "item",
              line: accruedItemIndex,
            });
            const lastIndex = newVBRec.getLineCount({ sublistId: "item" });
            newVBRec.insertLine({ sublistId: "item", line: lastIndex });
            newVBRec.setSublistValue({
              sublistId: "item",
              fieldId: "item",
              value: ACCRUEDPURCHASEITEM,
              line: lastIndex,
            });
            newVBRec.setSublistValue({
              sublistId: "item",
              fieldId: "amount",
              value: -Math.abs(accruedAmount),
              line: lastIndex,
            });
            newVBRec.setSublistValue({
              sublistId: "item",
              fieldId: "rate",
              value: -Math.abs(accruedAmount),
              line: lastIndex,
            });
          } else {
            const lastIndex = newVBRec.getLineCount({ sublistId: "item" });
            newVBRec.insertLine({ sublistId: "item", line: lastIndex });
            newVBRec.setSublistValue({
              sublistId: "item",
              fieldId: "item",
              value: ACCRUEDPURCHASEITEM,
              line: lastIndex,
            });
            newVBRec.setSublistValue({
              sublistId: "item",
              fieldId: "amount",
              value: -Math.abs(accruedAmount),
              line: lastIndex,
            });
            newVBRec.setSublistValue({
              sublistId: "item",
              fieldId: "rate",
              value: -Math.abs(accruedAmount),
              line: lastIndex,
            });
          }
        }
        return newVBRec.save({ ignoreMandatoryFields: true });
      } catch (e) {
        log.error("createServiceItem", e.message);
      }
    } catch (e) {
      log.error("addBillProcessingFee", e.message);
    }
  }

  /**
   * Get transaction line item
   * @param {string}options.type transaction type
   * @param {string}options.id transaction id
   * @return {array} return item list of the Sales Order
   */
  function getItemTransactionLine(options) {
    log.audit("getItemTransactionLine", options);
    let { type, id } = options;
    let itemList = [];
    try {
      const tranRec = record.load({
        type: type,
        id: id,
      });
      for (let i = 0; i < tranRec.getLineCount("item"); i++) {
        itemList.push({
          item: tranRec.getSublistValue({
            sublistId: "item",
            fieldId: "item",
            line: i,
          }),
          lineuniquekey: tranRec.getSublistValue({
            sublistId: "item",
            fieldId: "lineuniquekey",
            line: i,
          }),
        });
      }
      return itemList;
    } catch (e) {
      log.error("getItemTransactionLine", e.message);
    }
  }

  /**
   * Get bill id based on payment sche and master return id
   * @param {string} options.paymentId
   * @param {string} options.masterReturnId
   * @return {string|null} return bill internal id
   */
  function getBillId(options) {
    log.debug("getBillId", options);
    let { paymentId, masterReturnId } = options;
    try {
      let billId;
      const transactionSearchObj = search.create({
        type: "transaction",
        filters: [
          ["custbody_kd_master_return_id", "anyof", masterReturnId],
          "AND",
          ["mainline", "is", "T"],
          "AND",
          ["type", "anyof", "VendBill"],
        ],
      });
      paymentId &&
        transactionSearchObj.filters.push(
          search.createFilter({
            name: "custbody_kodpaymentsched",
            operator: "anyof",
            values: paymentId,
          }),
        );
      const searchResultCount = transactionSearchObj.runPaged().count;
      if (searchResultCount === 0) return null;
      transactionSearchObj.run().each(function (result) {
        billId = result.id;
      });
      return billId;
    } catch (e) {
      log.error("getBillId", e.message);
    }
  }

  /**
   * Get Bill Status
   * @param masterReturnId
   * @returns {*|null}
   */
  function getBillStatus(masterReturnId) {
    log.audit("getBillStatus", masterReturnId);
    let status;
    try {
      let billIds = [];
      const transactionSearchObj = search.create({
        type: "transaction",
        filters: [
          ["custbody_kd_master_return_id", "anyof", masterReturnId],
          "AND",
          ["mainline", "is", "T"],
          "AND",
          ["type", "anyof", "VendBill"],
        ],
        columns: ["status"],
      });
      const searchResultCount = transactionSearchObj.runPaged().count;
      if (searchResultCount === 0) return null;
      transactionSearchObj.run().each(function (result) {
        status = result.getText("status");
      });
      return status;
    } catch (e) {
      log.error("getBillStatus", e.message);
    }
  }

  /**
   * Get all bill based on master return id
   * @param {string} masterReturnId
   * @return {array|null} return bill internal ids
   */
  function getAllBills(masterReturnId) {
    log.audit("getAllBills", masterReturnId);
    try {
      let billIds = [];
      const transactionSearchObj = search.create({
        type: "transaction",
        filters: [
          ["custbody_kd_master_return_id", "anyof", masterReturnId],
          "AND",
          ["mainline", "is", "T"],
          "AND",
          ["type", "anyof", "VendBill"],
        ],
      });
      const searchResultCount = transactionSearchObj.runPaged().count;
      if (searchResultCount === 0) return null;
      transactionSearchObj.run().each(function (result) {
        billIds.push(result.id);
        return true;
      });
      return billIds;
    } catch (e) {
      log.error("getBillId", e.message);
    }
  }

  /**
   * Transfrom vendor bill to vendor credit if it is already paid in full
   * @param options.billId - Bill Id
   * @param options.lines vendor bill line
   * @return the internal id of the created vendor bill
   */
  function createVendorCredit(options) {
    let { billId } = options;
    let jeTotalAmount = 0;
    try {
      const objRecord = record.transform({
        fromType: record.Type.VENDOR_BILL,
        fromId: billId,
        toType: record.Type.VENDOR_CREDIT,
        isDynamic: true,
      });
      for (let i = 0; i < objRecord.getLineCount("item"); i++) {
        objRecord.selectLine({
          sublistId: "item",
          line: i,
        });
        const pharmaProcessing = objRecord.getCurrentSublistValue({
          sublistId: "item",
          fieldId: "custcol_kod_rqstprocesing",
        });
        log.audit("pharmaProcessing", pharmaProcessing);
        if (pharmaProcessing == "2") {
          const amount = objRecord.getCurrentSublistValue({
            sublistId: "item",
            fieldId: "amount",
          });
          log.audit("amount", amount);
          jeTotalAmount += +amount;
        }
      }
      log.audit("JE Total", jeTotalAmount);
      let vendorCreditId = objRecord.save({
        ignoreMandatoryFields: true,
      });
      if (vendorCreditId) {
        createJournalEntry({
          debit: jeTotalAmount,
          masterReturnId: objRecord.getValue("custbody_kd_master_return_id"),
          vendorId: objRecord.getValue("entity"),
          subsidiaryId: 2,
        });
        createInventoryAdjustment({
          forViewLineEdit: true,
          vendorCreditId: vendorCreditId,
          mrrId: objRecord.getValue("custbody_kd_master_return_id"),
          rrId: null,
        });
      }
    } catch (e) {
      log.error("createVendorCredit", e.message);
    }
  }

  /**
     * Remove the line for an speicific payment schedule
     * @param {number}options.finalPaymentSchedule
     * @param {object}options.vbRec

     */
  function removeVBLine(options) {
    let { finalPaymentSchedule, vbRec } = options;
    log.audit("removeVBLine", finalPaymentSchedule);
    let lineCount = vbRec.getLineCount("item");
    if (lineCount === 1) {
      return vbRec.id;
    }
    try {
      for (let i = 0; i < lineCount; i++) {
        let paymentSched = vbRec.getSublistValue({
          sublistId: "item",
          fieldId: "custcol_kd_pymt_sched",
          line: i,
        });
        let itemType = vbRec.getSublistValue({
          sublistId: "item",
          fieldId: "itemtype",
          line: i,
        });
        log.audit("VB Line info ", { i, paymentSched, finalPaymentSchedule });

        if (paymentSched == finalPaymentSchedule || itemType != "InvtPart")
          continue;
        log.audit("removing Line " + i, paymentSched);
        vbRec.removeLine({
          sublistId: "item",
          line: i,
        });
      }
    } catch (e) {
      log.error("removeVBLine", {
        paymentSched: finalPaymentSchedule,
        error: e.message,
      });
      removeVBLine(options);
    }
    return vbRec;
  }

  /**
   * Remove the line for the bill credit
   * @param {number}options.pharmaProcessing
   * @param {object}options.rec
   */
  function removeBillCreditLine(options) {
    let { pharmaProcessing, newRec } = options;
    log.audit("removeBillCreditLine", pharmaProcessing);

    let totalAmount = 0;
    let nonInventoryItemCount = 0;
    let serviceFeeLine = 0;
    try {
      for (let i = 0; i < newRec.getLineCount("item"); i++) {
        let pharmaProcessingSublistVal = newRec.getSublistValue({
          sublistId: "item",
          fieldId: "custcol_kod_rqstprocesing",
          line: i,
        });

        let itemType = newRec.getSublistValue({
          sublistId: "item",
          fieldId: "itemtype",
          line: i,
        });

        log.audit("Bill Credit Line info ", {
          i,
          pharmaProcessingSublistVal,
          itemType,
        });
        if (itemType == "NonInvtPart") {
          nonInventoryItemCount += 1;
          newRec.removeLine({
            sublistId: "item",
            line: i,
          });
        }
        if (
          pharmaProcessingSublistVal == pharmaProcessing ||
          pharmaProcessingSublistVal == ""
        ) {
          newRec.removeLine({
            sublistId: "item",
            line: i,
          });
          log.audit("removing Line " + i);
        } else {
          let amount = newRec.getSublistValue({
            sublistId: "item",
            fieldId: "amount",
            line: i,
          });
          if (+amount > 0) {
            totalAmount += amount;
          }

          log.audit("serviceFeeLine", { serviceFeeLine, amount, totalAmount });
        }
      }
      let lineCount = newRec.getLineCount("item");

      log.audit("nonInventoryLineIndex", {
        lineCount,
        totalAmount,
      });
      const SERVICE_FEE_ADJUSTMENT_ITEM = 917;
      let serviceFeeIndex = newRec.findSublistLineWithValue({
        sublistId: "item",
        fieldId: "item",
        value: SERVICE_FEE_ADJUSTMENT_ITEM,
      });
      let serviceFeeLineFinal;
      if (serviceFeeIndex == -1) {
        serviceFeeLineFinal = lineCount + 1;
      } else {
        serviceFeeLineFinal = serviceFeeIndex;
      }
      newRec.setSublistValue({
        sublistId: "item",
        fieldId: "item",
        line: serviceFeeLineFinal,
        value: SERVICE_FEE_ADJUSTMENT_ITEM, //Service Fee - Adjustment Item
      });
      const adjustmentFee = Number(totalAmount) * 0.055;
      newRec.setSublistValue({
        sublistId: "item",
        fieldId: "rate",
        line: serviceFeeLineFinal,
        value: adjustmentFee, //Service Fee - Adjustment Item
      });
      newRec.setSublistValue({
        sublistId: "item",
        fieldId: "amount",
        line: serviceFeeLineFinal,
        value: adjustmentFee, //Service Fee - Adjustment Item
      });
      log.audit("serviceFee amount", +totalAmount * 5.5);
    } catch (e) {
      log.error("removeBillCreditLine", {
        error: e.message,
      });
      removeBillCreditLine(options);
    }
    return newRec;
  }

  /**
   * Create Journal Entry
   * @param {number} options.debit - Debit Amount based on the Returnable Amount
   * @param {string} options.masterReturnId - Master Request Id
   * @param {number} options.vendorId - Vendor Id from the bill
   * @param {number} options.subsidiaryId - Default Subsidiary of the Bill
   */
  function createJournalEntry(options) {
    log.audit("createJournalEntry", options);
    let { debit, vendorId, masterReturnId, subsidiaryId } = options;

    try {
      const accountsPayableAmount = +debit * 0.945;
      const serviceFeeAmount = +debit * 0.055;
      log.audit("Amount", { accountsPayableAmount, serviceFeeAmount });
      const jeRec = record.create({
        type: record.Type.JOURNAL_ENTRY,
        isDynamic: true,
      });
      masterReturnId &&
        jeRec.setValue({
          fieldId: "custbody_kd_master_return_id",
          value: masterReturnId,
        });
      jeRec.setValue({
        fieldId: "subsidiary",
        value: subsidiaryId,
      });
      jeRec.selectNewLine({
        sublistId: "line",
      });
      jeRec.setCurrentSublistValue({
        sublistId: "line",
        fieldId: "account",
        value: ACCOUNT.Accrued_Purchases,
      });
      jeRec.setCurrentSublistValue({
        sublistId: "line",
        fieldId: "debit",
        value: debit,
      });
      jeRec.commitLine({
        sublistId: "line",
      });

      // Setting accounts payable
      jeRec.selectNewLine({
        sublistId: "line",
      });
      jeRec.setCurrentSublistValue({
        sublistId: "line",
        fieldId: "account",
        value: ACCOUNT.Accounts_Payable,
      });
      jeRec.setCurrentSublistValue({
        sublistId: "line",
        fieldId: "entity",
        value: vendorId,
      });
      jeRec.setCurrentSublistValue({
        sublistId: "line",
        fieldId: "credit",
        value: accountsPayableAmount,
      });
      jeRec.commitLine({
        sublistId: "line",
      });

      // Setting service fee
      jeRec.selectNewLine({
        sublistId: "line",
      });
      jeRec.setCurrentSublistValue({
        sublistId: "line",
        fieldId: "account",
        value: ACCOUNT.Service_Fee,
      });
      jeRec.setCurrentSublistValue({
        sublistId: "line",
        fieldId: "credit",
        value: serviceFeeAmount,
      });
      jeRec.commitLine({
        sublistId: "line",
      });
      let jeId = jeRec.save({
        ignoreMandatoryFields: true,
      });
      log.audit("Created Journal Entry", jeId);
      return jeId;
    } catch (e) {
      log.error("createJournalEntry", e.message);
    }
  }

  /**
   * Delete Transaction
   * @param options.type Transaction Type
   * @param options.id Transaction ID
   */
  function deleteTransaction(options) {
    let { type, id } = options;
    try {
      return record.delete({
        type: type,
        id: id,
      });
    } catch (e) {
      log.error("deleteTransaction", e.message);
    }
  }

  /**
   * Set adjustment fee item to the vbRec in Standard mode
   * @param {object} options.vbRec
   * @param {number} options.adjustmentAmount
   * @param {number} options.irsId
   * @param {number} options.lastIndex
   */
  function setAdjustmentFee(options) {
    log.audit("setAdjustmentFee", options);
    let { vbRec, adjustmentAmount, irsId, lastIndex } = options;
    const ADJUSTMENTITEM = 917;
    try {
      vbRec.insertLine({ sublistId: "item", line: lastIndex });
      vbRec.setSublistValue({
        sublistId: "item",
        fieldId: "item",
        value: ADJUSTMENTITEM,
        line: lastIndex,
      });

      vbRec.setSublistValue({
        sublistId: "item",
        fieldId: "rate",
        value: -Math.abs(adjustmentAmount),
        line: lastIndex,
      });
      vbRec.setSublistValue({
        sublistId: "item",
        fieldId: "custcol_rsrs_itemscan_link",
        value: irsId,
        line: lastIndex,
      });
      return vbRec;
    } catch (e) {
      log.error("setAdjustmentFee", e.message);
    }
  }

  /**
   * Add accrued purchase item
   * @param {object}options.vbRec
   * @param {string}options.ACCRUEDPURCHASEITEM
   * @param {string}options.lastIndex
   * @param {number}options.accruedAmount
   */
  function addAccruedPurchaseItem(options) {
    log.audit("addAccruedPurchaseItem", options);
    let { vbRec, ACCRUEDPURCHASEITEM, lastIndex, accruedAmount } = options;
    try {
      let accruedItemIndex = vbRec.findSublistLineWithValue({
        sublistId: "item",
        fieldId: "item",
        value: ACCRUEDPURCHASEITEM,
      });
      if (accruedItemIndex != -1) {
        vbRec.removeLine({
          sublistId: "item",
          line: accruedItemIndex,
        });
        // const lastIndex = vbRec.getLineCount({ sublistId: "item" });
        vbRec.insertLine({ sublistId: "item", line: lastIndex });
        vbRec.setSublistValue({
          sublistId: "item",
          fieldId: "item",
          value: ACCRUEDPURCHASEITEM,
          line: lastIndex,
        });
        vbRec.setSublistValue({
          sublistId: "item",
          fieldId: "amount",
          value: -Math.abs(accruedAmount),
          line: lastIndex,
        });
        vbRec.setSublistValue({
          sublistId: "item",
          fieldId: "rate",
          value: -Math.abs(accruedAmount),
          line: lastIndex,
        });
      } else {
        //  const lastIndex = rec.getLineCount({ sublistId: "item" });
        vbRec.insertLine({ sublistId: "item", line: lastIndex });
        vbRec.setSublistValue({
          sublistId: "item",
          fieldId: "item",
          value: ACCRUEDPURCHASEITEM,
          line: lastIndex,
        });
        vbRec.setSublistValue({
          sublistId: "item",
          fieldId: "amount",
          value: -Math.abs(accruedAmount),
          line: lastIndex,
        });
        vbRec.setSublistValue({
          sublistId: "item",
          fieldId: "rate",
          value: -Math.abs(accruedAmount),
          line: lastIndex,
        });
      }
      return vbRec;
    } catch (e) {
      log.error("addAccruedPurchaseItem", e.message);
    }
  }

  /**
   * create all services fee
   * @param {number}id
   *
   */
  function createAllServiceFees(id) {
    try {
      const rec = record.load({
        type: record.Type.VENDOR_BILL,
        id: id,
      });
      log.audit("createAllServiceFees", rec);
      const ACCRUEDPURCHASEITEM = 916;
      const RETURNABLE = 2;
      const NONRETURNABLE = 1;
      const RETURNABLESERVICEFEEITEM = 882;
      const NONRETURNABLESERVICEFEEITEM = 883;
      let mrrId = rec.getValue("custbody_kd_master_return_id");
      let returnableAmount = getMrrIRSTotalAmount({
        mrrId: mrrId,
        pharmaProcessing: RETURNABLE,
        mfgProcessing: RETURNABLE,
      });
      let nonReturnableAmount = getMrrIRSTotalAmount({
        mrrId: mrrId,
        pharmaProcessing: NONRETURNABLE,
        mfgProcessing: NONRETURNABLE,
      });
      const nonReturnableFeeRate =
        rec.getValue("custbody_rxrs_non_returnable_rate") / 100;
      const returnableFeeRate =
        rec.getValue("custbody_rxrs_returnable_fee") / 100;
      let accruedAmount = 0;
      const finalPaymentSchedule = rec.getValue("custbody_kodpaymentsched");
      log.debug("finalPaymentSchedule", finalPaymentSchedule);

      for (let i = 0; i < rec.getLineCount("item"); i++) {
        const mfgProcessing = rec.getSublistValue({
          sublistId: "item",
          fieldId: "custcol_kod_mfgprocessing",
          line: i,
        });
        const pharmaProcessing = rec.getSublistValue({
          sublistId: "item",
          fieldId: "custcol_kod_rqstprocesing",
          line: i,
        });
        let quantity = rec.getSublistValue({
          sublistId: "item",
          fieldId: "quantity",
          line: i,
        });
        let rate = rec.getSublistValue({
          sublistId: "item",
          fieldId: "rate",
          line: i,
        });

        if (pharmaProcessing == NONRETURNABLE && mfgProcessing == RETURNABLE) {
          let amount = rec.getSublistValue({
            sublistId: "item",
            fieldId: "amount",
            line: i,
          });
          let item = rec.getSublistValue({
            sublistId: "item",
            fieldId: "item",
            line: i,
          });
          if (item != 917) {
            amount = amount === 0 ? rate * quantity : amount;
            rec.setSublistValue({
              sublistId: "item",
              fieldId: "amount",
              value: amount,
              line: i,
            });
            accruedAmount += rec.getSublistValue({
              sublistId: "item",
              fieldId: "amount",
              line: i,
            });
          }

          log.debug("amount: ", { i, amount, accruedAmount });
        }

        if (pharmaProcessing == RETURNABLE) {
          let amount = rec.getSublistValue({
            sublistId: "item",
            fieldId: "amount",
            line: i,
          });
          amount = amount === 0 ? rate * quantity : amount;

          rec.setSublistValue({
            sublistId: "item",
            fieldId: "amount",
            value: amount,
            line: i,
          });
        }
      }
      if (nonReturnableFeeRate) {
        const serviceFeeAmount = +nonReturnableAmount * +nonReturnableFeeRate;
        log.debug("addBillProcessingFee values", {
          nonReturnableFeeRate,
          serviceFeeAmount,
          nonReturnableAmount,
        });
        let nonReturnableServiceFeeIndex = rec.findSublistLineWithValue({
          sublistId: "item",
          fieldId: "item",
          value: NONRETURNABLESERVICEFEEITEM,
        });
        if (nonReturnableServiceFeeIndex != -1) {
          rec.removeLine({
            sublistId: "item",
            line: nonReturnableServiceFeeIndex,
          });
          const lastIndex = rec.getLineCount({ sublistId: "item" });
          rec.insertLine({ sublistId: "item", line: lastIndex });
          rec.setSublistValue({
            sublistId: "item",
            fieldId: "item",
            value: NONRETURNABLESERVICEFEEITEM,
            line: lastIndex,
          });
          rec.setSublistValue({
            sublistId: "item",
            fieldId: "amount",
            value: -Math.abs(serviceFeeAmount),
            line: lastIndex,
          });
          rec.setSublistValue({
            sublistId: "item",
            fieldId: "rate",
            value: -Math.abs(serviceFeeAmount),
            line: lastIndex,
          });
        } else {
          const lastIndex = rec.getLineCount({ sublistId: "item" });
          rec.insertLine({ sublistId: "item", line: lastIndex });
          rec.setSublistValue({
            sublistId: "item",
            fieldId: "item",
            value: NONRETURNABLESERVICEFEEITEM,
            line: lastIndex,
          });

          rec.setSublistValue({
            sublistId: "item",
            fieldId: "rate",
            value: -Math.abs(serviceFeeAmount),
            line: lastIndex,
          });
          rec.setSublistValue({
            sublistId: "item",
            fieldId: "amount",
            value: -Math.abs(serviceFeeAmount),
            line: lastIndex,
          });
        }
      }
      if (returnableFeeRate) {
        const serviceFeeAmount = +returnableAmount * +returnableFeeRate;
        log.debug("addBillProcessingFee values", {
          returnableFeeRate,
          serviceFeeAmount,
          returnableAmount,
        });
        let returnableServiceFeeIndex = rec.findSublistLineWithValue({
          sublistId: "item",
          fieldId: "item",
          value: RETURNABLESERVICEFEEITEM,
        });
        if (returnableServiceFeeIndex != -1) {
          rec.removeLine({
            sublistId: "item",
            line: returnableServiceFeeIndex,
          });
          const lastIndex = rec.getLineCount({ sublistId: "item" });
          rec.insertLine({ sublistId: "item", line: lastIndex });
          rec.setSublistValue({
            sublistId: "item",
            fieldId: "item",
            value: RETURNABLESERVICEFEEITEM,
            line: lastIndex,
          });
          rec.setSublistValue({
            sublistId: "item",
            fieldId: "amount",
            value: -Math.abs(serviceFeeAmount),
            line: lastIndex,
          });
          rec.setSublistValue({
            sublistId: "item",
            fieldId: "rate",
            value: -Math.abs(serviceFeeAmount),
            line: lastIndex,
          });
        } else {
          const lastIndex = rec.getLineCount({ sublistId: "item" });
          rec.insertLine({ sublistId: "item", line: lastIndex });
          rec.setSublistValue({
            sublistId: "item",
            fieldId: "item",
            value: RETURNABLESERVICEFEEITEM,
            line: lastIndex,
          });

          rec.setSublistValue({
            sublistId: "item",
            fieldId: "rate",
            value: -Math.abs(serviceFeeAmount),
            line: lastIndex,
          });
          rec.setSublistValue({
            sublistId: "item",
            fieldId: "amount",
            value: -Math.abs(serviceFeeAmount),
            line: lastIndex,
          });
        }
      }
      if (accruedAmount > 0) {
        let accruedItemIndex = rec.findSublistLineWithValue({
          sublistId: "item",
          fieldId: "item",
          value: ACCRUEDPURCHASEITEM,
        });
        if (accruedItemIndex != -1) {
          rec.removeLine({
            sublistId: "item",
            line: accruedItemIndex,
          });
          const lastIndex = rec.getLineCount({ sublistId: "item" });
          rec.insertLine({ sublistId: "item", line: lastIndex });
          rec.setSublistValue({
            sublistId: "item",
            fieldId: "item",
            value: ACCRUEDPURCHASEITEM,
            line: lastIndex,
          });
          rec.setSublistValue({
            sublistId: "item",
            fieldId: "amount",
            value: -Math.abs(accruedAmount),
            line: lastIndex,
          });
          rec.setSublistValue({
            sublistId: "item",
            fieldId: "rate",
            value: -Math.abs(accruedAmount),
            line: lastIndex,
          });
        } else {
          const lastIndex = rec.getLineCount({ sublistId: "item" });
          rec.insertLine({ sublistId: "item", line: lastIndex });
          rec.setSublistValue({
            sublistId: "item",
            fieldId: "item",
            value: ACCRUEDPURCHASEITEM,
            line: lastIndex,
          });
          rec.setSublistValue({
            sublistId: "item",
            fieldId: "amount",
            value: -Math.abs(accruedAmount),
            line: lastIndex,
          });
          rec.setSublistValue({
            sublistId: "item",
            fieldId: "rate",
            value: -Math.abs(accruedAmount),
            line: lastIndex,
          });
        }
      }
      return rec.save({ ignoreMandatoryFields: true });
    } catch (e) {
      log.error("createAllServiceFees", e.message);
    }
  }

  /**
   * Get the total item return scan amount per MRR and Manuf Processing
   * @param {number} options.mrrId
   * @param {string} options.pharmaProcessing
   * @param {string} options.mfgProcessing
   * @return {number} return non-returnable total amount
   *
   */
  function getMrrIRSTotalAmount(options) {
    let total = 0;
    log.audit("getMrrIRSTotalAmount", options);
    let { mrrId, pharmaProcessing, mfgProcessing } = options;
    const customrecord_cs_item_ret_scanSearchObj = search.create({
      type: "customrecord_cs_item_ret_scan",
      filters: [
        ["custrecord_irs_master_return_request", "anyof", mrrId],
        "AND",
        ["custrecord_cs__rqstprocesing", "anyof", pharmaProcessing],
      ],
      columns: [
        search.createColumn({
          name: "custrecord_irc_total_amount",
          summary: "SUM",
          label: "Wac Amount",
        }),
      ],
    });
    if (mfgProcessing) {
      customrecord_cs_item_ret_scanSearchObj.filters.push(
        search.createFilter({
          name: "custrecord_cs__mfgprocessing",
          operator: "anyof",
          values: mfgProcessing,
        }),
      );
    }

    customrecord_cs_item_ret_scanSearchObj.run().each(function (result) {
      // .run().each has a limit of 4,000 results
      total = result.getValue({
        name: "custrecord_irc_total_amount",
        summary: "SUM",
      });
    });
    return total;
  }

  /**
   * Add accrued amount to vb if the default vb is not fully paid
   * @param {object} rec
   */
  function addAcrruedAmountBasedonTransaction(rec) {
    const ACCRUEDPURCHASEITEM = 916;
    const RETURNABLE = 2;
    const NONRETURNABLE = 1;
    try {
      let accruedAmount = 0;
      for (let i = 0; i < rec.getLineCount("item"); i++) {
        const mfgProcessing = rec.getSublistValue({
          sublistId: "item",
          fieldId: "custcol_kod_mfgprocessing",
          line: i,
        });
        const pharmaProcessing = rec.getSublistValue({
          sublistId: "item",
          fieldId: "custcol_kod_rqstprocesing",
          line: i,
        });
        let quantity = rec.getSublistValue({
          sublistId: "item",
          fieldId: "quantity",
          line: i,
        });
        let rate = rec.getSublistValue({
          sublistId: "item",
          fieldId: "rate",
          line: i,
        });
        log.debug("processing", {
          line: i,
          pharma: pharmaProcessing,
          mfg: mfgProcessing,
        });
        if (pharmaProcessing == NONRETURNABLE && mfgProcessing == RETURNABLE) {
          let amount = rec.getSublistValue({
            sublistId: "item",
            fieldId: "amount",
            line: i,
          });
          amount = amount === 0 ? rate * quantity : amount;
          rec.setSublistValue({
            sublistId: "item",
            fieldId: "amount",
            value: amount,
            line: i,
          });
          accruedAmount += rec.getSublistValue({
            sublistId: "item",
            fieldId: "amount",
            line: i,
          });
        }
      }
      if (accruedAmount > 0) {
        let accruedItemIndex = rec.findSublistLineWithValue({
          sublistId: "item",
          fieldId: "item",
          value: ACCRUEDPURCHASEITEM,
        });
        if (accruedItemIndex != -1) {
          rec.removeLine({
            sublistId: "item",
            line: accruedItemIndex,
          });
          const lastIndex = rec.getLineCount({ sublistId: "item" });
          rec.insertLine({ sublistId: "item", line: lastIndex });
          rec.setSublistValue({
            sublistId: "item",
            fieldId: "item",
            value: ACCRUEDPURCHASEITEM,
            line: lastIndex,
          });
          rec.setSublistValue({
            sublistId: "item",
            fieldId: "amount",
            value: -Math.abs(accruedAmount),
            line: lastIndex,
          });
          rec.setSublistValue({
            sublistId: "item",
            fieldId: "rate",
            value: -Math.abs(accruedAmount),
            line: lastIndex,
          });
        } else {
          const lastIndex = rec.getLineCount({ sublistId: "item" });
          rec.insertLine({ sublistId: "item", line: lastIndex });
          rec.setSublistValue({
            sublistId: "item",
            fieldId: "item",
            value: ACCRUEDPURCHASEITEM,
            line: lastIndex,
          });
          rec.setSublistValue({
            sublistId: "item",
            fieldId: "amount",
            value: -Math.abs(accruedAmount),
            line: lastIndex,
          });
          rec.setSublistValue({
            sublistId: "item",
            fieldId: "rate",
            value: -Math.abs(accruedAmount),
            line: lastIndex,
          });
        }
      }
      return rec.save({
        ignoreMandatoryFields: true,
      });
    } catch (e) {
      log.error("addAcrruedAmountBasedonTransaction", e.message);
    }
  }

  /**
   * Remove CM from Invoice
   * @param options
   * @param {string} options.creditMemoId
   * @param {string} options.invId
   */
  function removeCMFromInvoiceLine(options) {
    let jsonParse = JSON.parse(options);
    let { creditMemoId, invId } = jsonParse;
    log.audit("removeCMFromInvoiceLine", options);

    try {
      const invRec = record.load({
        type: record.Type.INVOICE,
        id: invId,
      });

      for (let i = 0; i < invRec.getLineCount("item"); i++) {
        const cmRef = invRec.getSublistValue({
          sublistId: "item",
          fieldId: "custcol_cm_parent_id",
          line: i,
        });

        log.debug("line details", cmRef);
        if (cmRef == creditMemoId) {
          invRec.setSublistValue({
            sublistId: "item",
            fieldId: "custcol_credit_memo_reference",
            value: "",
            line: i,
          });
        }
      }
      return invRec.save({
        ignoreMandatoryFields: "true",
      });
    } catch (e) {
      log.error("removeCMFromInvoiceLine", e.message);
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
   * Submit functionality in the view line item suitelet
   * @param {string} options.billId - Bill Internal Id
   * @aram
   */

  function submitMRRitem(options) {
    let { billId } = options;
    try {
      const objRecord = record.transform({
        fromType: record.Type.VENDOR_BILL,
        fromId: billId,
        toType: record.Type.VENDOR_CREDIT,
      });
      for (let i = 0; i < objRecord.getLineCount("item"); i++) {
        const itemType = objRecord.getSublistValue({
          sublistId: "item",
          fieldId: "itemtype",
          line: i,
        });
        if (itemType == "NonInvtPart") {
          objRecord.removeLine({
            sublistId: "line",
            line: i,
          });
        }
      }
      objRecord.save({
        ignoreMandatoryFields: true,
      });
    } catch (e) {
      log.error("submitMRRitem", e.message);
    }
  }

  /**
   * Create Bin Transfer
   * @param options
   * @param options.location
   * @param options.itemLine
   */
  function createBInTransfer(options) {
    try {
      const binTransferRec = record.create({
        type: record.Type.BIN_TRANSFER,
      });
      binTransferRec.setValue({ fieldId: "subsidiary", value: 2 });
      binTransferRec.setValue({ fieldId: "location", value: 1 });
      binTransferRec.setSublistValue({
        sublistId: "inventory",
        fieldId: "item",
        value: 118420,
        line: 0,
      });
      let inventoryDetail = binTransferRec.getSublistSubrecord({
        sublistId: "inventory",
        fieldId: "inventorydetail",
        line: 0,
      });
    } catch (e) {
      log.error("createBInTransfer", e.message);
    }
  }

  /**
   * Create MRR Record
   * @param options
   * @param options.OrderId - Order Id
   * @param options.BoxNumber
   * @param options.CustomerNumber
   * @param options.CustomerId
   * @param options.BoxStatus
   * @param options.BoxType
   * @param options.ServiceType
   * @param options.OrderDate
   * @param options.CreateDate
   * @param options.FileUploads
   * @param options.FileUploads.Files
   *
   *
   */
  function createMasterReturnRequest(options) {
    log.audit("createMasterReturnRequest", options);
    let returnMessage = {};
    const folderId = 7246;
    let {
      OrderId,
      BoxNumber,
      CustomerNumber,
      CustomerId,
      BoxStatus,
      BoxType,
      ServiceType,
      OrderDate,
      CreateDate,
      Items,
      FileUploads,
    } = options;
    log.audit("ServiceType ", ServiceType);

    try {
      const mrrRec = record.create({
        type: "customrecord_kod_masterreturn",
      });
      let mrrName = CustomerNumber + "-" + BoxNumber;
      let existingInternalId = checkIfMRRExist({ mrrName: mrrName });
      log.audit("existing Internal Id", existingInternalId);
      if (existingInternalId) {
        let msg = `Master Return Id ${mrrName} has been already created. Netsuite Internal Id ${existingInternalId}`;

        returnMessage.status = "failed";
        returnMessage.errorMessage = msg;
        return returnMessage;
      }
      mrrRec.setValue({
        fieldId: "name",
        value: mrrName,
      });
      mrrRec.setValue({
        fieldId: "custrecord_mrrentity",
        value: rxrs_util.getEntityId({ entityId: CustomerNumber }),
      });
      mrrRec.setValue({
        fieldId: "custrecord_kod_mr_requestdt",
        value: new Date(OrderDate),
      });

      if (
        rxrs_util.SERVICETYPE[ServiceType] == rxrs_util.SERVICETYPE["MAIL-IN"]
      ) {
        if (BoxType.includes("RX") == true) {
          mrrRec.setValue({
            fieldId: "custrecord_kd_c2",
            value: true,
          });
        }
        if (BoxType.includes("C2") == true) {
          mrrRec.setValue({
            fieldId: "custrecord_kd_rxotc",
            value: true,
          });
        }
        if (BoxType.includes("C3-5") == true) {
          mrrRec.setValue({
            fieldId: "custrecord_kd_c3to5",
            value: true,
          });
        }

        if (FileUploads.Files.length > 0) {
          log.audit("Files", FileUploads.Files[0]);
          FileUploads.Files.forEach(function (files) {
            log.audit("files", files);

            let { FileName, FileContent } = files;

            const base64 = encode.convert({
              string: FileContent,
              inputEncoding: encode.Encoding.UTF_8,
              outputEncoding: encode.Encoding.BASE_64,
            });
            log.audit("Base64", base64);
            const fileObject = file.create({
              name: FileName,
              fileType: file.Type.PDF,
              contents: base64,
              folder: folderId,
            });

            let fileId = fileObject.save();
            log.audit("fileobject", fileId);
            if (fileId) {
              if (FileName.includes("RX")) {
                mrrRec.setValue({
                  fieldId: "custrecord_kd_mrr_rx_otc_file",
                  value: fileId,
                });
              } else if (FileName.includes("C2")) {
                mrrRec.setValue({
                  fieldId: "custrecord_kd_mrr_c2_file",
                  value: fileId,
                });
              } else if (FileName.includes("C3")) {
                mrrRec.setValue({
                  fieldId: "custrecord_kd_mrr_c3_5_file",
                  value: fileId,
                });
              }
            }
          });
        }
      }
      if (BoxStatus.includes("PENDING") == true) {
        mrrRec.setValue({
          fieldId: "custrecord_kod_mr_status",
          value: rxrs_util.mrrStatus.New,
        });
      }
      mrrRec.setValue({
        fieldId: "custrecord_service_type",
        value: rxrs_util.SERVICETYPE[ServiceType],
      });

      let mrrId = mrrRec.save({
        ignoreMandatoryFields: true,
      });

      if (
        rxrs_util.SERVICETYPE[ServiceType] !==
          rxrs_util.SERVICETYPE["MAIL-IN"] &&
        mrrId
      ) {
        Items.forEach(function (item) {
          createItemRequested({
            items: item,
            mrrId: mrrId,
          });
        });
      }
      log.audit("mrrId", mrrId);
      if (mrrId) {
        returnMessage.status = "success";
        returnMessage.id = mrrName;
        returnMessage.netsuiteId = mrrId;
      }
      return returnMessage;
    } catch (e) {
      log.error("createMasterReturnRequest", e.message);
      returnMessage.status = "failed";
      returnMessage.errorMessage = e.message;
      return returnMessage;
    }
  }

  /**
   * Create Item Requested
   * @param options
   * @param options.items - Items Array if service type is rep service
   * @param options.mrrId
   */
  function createItemRequested(options) {
    let {
      ID,
      NDC,
      LotNumber,
      ExpirationDate,
      Quantity,
      Control,
      IsPartial,
      IsPatientVial,
      IsDeleted,
    } = options.items;
    try {
      const itemRequestedRec = record.create({
        type: "customrecord_kod_mr_item_request",
        isDynamic: true,
      });

      NDC &&
        itemRequestedRec.setValue({
          fieldId: "custrecord_kd_rir_item",
          value: rxrs_itemlib.getItemId(NDC),
        });
      ExpirationDate &&
        itemRequestedRec.setValue({
          fieldId: "custrecord_kd_rir_lotexp",
          value: new Date(ExpirationDate),
        });
      Quantity &&
        itemRequestedRec.setValue({
          fieldId: "custrecord_kd_rir_quantity",
          value: Quantity,
        });
      LotNumber &&
        itemRequestedRec.setValue({
          fieldId: "custrecord_kd_rir_lotnumber",
          value: Quantity,
        });

      options.mrrId &&
        itemRequestedRec.setValue({
          fieldId: "custrecord_kd_rir_masterid",
          value: options.mrrId,
        });
      return itemRequestedRec.save({
        ignoreMandatoryFields: true,
      });
    } catch (e) {
      log.error("createItemRequested", e.message);
    }
  }

  /**
   * Create Bin Transfer
   * @param {number} options.itemId - Internal Id of the item
   * @param {number} options.quantity - Quantity of the transfer
   * @param {number} options.fromBin - Internal Id of the bin source
   * @param {number} options.toBin - Internal Id of the receiving Bin
   * @param {number} options.location - Internal Id of the location
   * @param {number} options.binNumberId - Internal id of the bin number record
   * @param options.memo - Memo
   * @return {number} Internal Id of the Created Bin
   *
   */
  function createBinTransfer(options) {
    log.audit("createBinTransfer", options);
    let { itemId, quantity, fromBin, toBin, location, memo, binNumberId } =
      options;
    try {
      const rec = record.create({
        type: record.Type.BIN_TRANSFER,
        isDynamic: true,
      });

      rec.setValue({
        fieldId: "location",
        value: location,
      });
      memo &&
        rec.setValue({
          fieldId: "memo",
          value: memo,
        });
      rec.selectNewLine({
        sublistId: "inventory",
      });
      rec.setCurrentSublistValue({
        sublistId: "inventory",
        fieldId: "item",
        value: itemId,
      }); // item
      rec.setCurrentSublistValue({
        sublistId: "inventory",
        fieldId: "quantity",
        value: quantity,
      }); // qty
      const subrec = rec.getCurrentSublistSubrecord({
        sublistId: "inventory",
        fieldId: "inventorydetail",
      });
      subrec.setCurrentSublistValue({
        sublistId: "inventoryassignment",
        fieldId: "issueinventorynumber",
        value: binNumberId,
      });
      subrec.setCurrentSublistValue({
        sublistId: "inventoryassignment",
        fieldId: "binnumber",
        value: fromBin,
      }); // from bins
      subrec.setCurrentSublistValue({
        sublistId: "inventoryassignment",
        fieldId: "tobinnumber",
        value: toBin,
      }); // to bins
      subrec.setCurrentSublistValue({
        sublistId: "inventoryassignment",
        fieldId: "quantity",
        value: quantity,
      });
      subrec.commitLine({
        sublistId: "inventoryassignment",
      });
      rec.commitLine({
        sublistId: "inventory",
      });

      const recId = rec.save();
      log.audit("Bin transfer id", recId);
      return recId;
    } catch (e) {
      log.error("createBinTransfer", e.message);
    }
  }

  /**
   * Get return request pending review per customer
   * @param {Object} options - The options object containing the entityId of the customer
   * @param {Number} options.entityId - Internal id of the customer
   * @returns {Object[]} - Array of return request objects with id, category, and type properties
   */
  function getReturnRequestPendingReview(options) {
    let res = [];
    try {
      let { entityId } = options;
      const transactionSearchObj = search.create({
        type: "transaction",
        settings: [{ name: "consolidationtype", value: "ACCTTYPE" }],
        filters: [
          ["type", "anyof", "CuTrPrch106", "CuTrSale102"],
          "AND",
          ["status", "anyof", "CuTrPrch106:A", "CuTrSale102:A"],
          "AND",
          ["name", "anyof", entityId],
          "AND",
          ["mainline", "is", "T"],
        ],
        columns: [
          search.createColumn({
            name: "custbody_kd_rr_category",
            label: "Category",
          }),
          search.createColumn({ name: "type", label: "Type" }),
        ],
      });
      transactionSearchObj.run().each(function (result) {
        res.push({
          id: result.id,
          category: result.getValue("custbody_kd_rr_category"),
          type: result.getValue("type"),
        });
        return true;
      });
      return res;
    } catch (e) {
      log.error("getReturnRequestPendingReview", e.message);
    }
  }

  /**
   * Get the Return Request count of MRR based on Status
   * @param {Object} options - The options object containing the following properties:
   * @param {string} options.mrrId - The MasterReturn Id
   * @param {string} options.status - Set to 'APPROVED' for approved return request only
   * @param {string} options.type - The type of transaction, accepted values are 'PO' or 'SALES'
   * @return {number} - The count of return requests based on the specified criteria
   */
  function getMrrReturnRequestCount(options) {
    log.audit("getMrrReturnRequestCount", options);
    let { status, mrrId, type } = options;
    try {
      const transactionSearchObj = search.create({
        type: "transaction",
        settings: [{ name: "consolidationtype", value: "ACCTTYPE" }],
        filters: [
          ["custbody_kd_master_return_id", "anyof", mrrId],
          "AND",
          ["mainline", "is", "T"],
          "AND",
          ["type", "anyof", "CuTrSale102", "CuTrPrch106"],
        ],
        columns: [
          search.createColumn({
            name: "tranid",
            label: "Document Number",
          }),
          search.createColumn({ name: "statusref", label: "Status" }),
        ],
      });
      if (status == "APPROVED") {
        transactionSearchObj.filters.push(
          search.createFilter({
            name: "status",
            operator: "anyof",
            values: ["CuTrSale102:I", "CuTrPrch106:I"],
          }),
        );
      }
      return transactionSearchObj.runPaged().count;
    } catch (e) {
      log.error("getMrrReturnRequestCount", e.message);
    }
  }

  /**
   * Retrieves the transaction type based on the provided options.
   *
   * @param {Object} options - The options object containing the transaction ID.
   * @param {string} options.id - The internal ID of the transaction to retrieve the type for.
   *
   * @return {string|null} The transaction type of the specified transaction ID, or null if an error occurs.
   */
  function getTransactionType(options) {
    log.audit("getTransactionType", options);
    let { id } = options;
    let type = null;
    try {
      const transactionSearchObj = search.create({
        type: "transaction",
        settings: [{ name: "consolidationtype", value: "ACCTTYPE" }],
        filters: [
          ["internalidnumber", "equalto", id],
          "AND",
          ["mainline", "is", "T"],
        ],
        columns: [search.createColumn({ name: "type", label: "Type" })],
      });

      transactionSearchObj.run().each(function (result) {
        type = result.getText("type");
      });
      return type;
    } catch (e) {
      log.error("getTransactionType", e.message);
    }
  }

  return {
    ACCOUNT: ACCOUNT,
    addAccruedPurchaseItem: addAccruedPurchaseItem,
    addAcrruedAmountBasedonTransaction: addAcrruedAmountBasedonTransaction,
    addBillProcessingFee: addBillProcessingFee,
    checkExistingPayment: checkExistingPayment,
    checkExistingPaymentInfo: checkExistingPaymentInfo,
    checkIfReturnRequuestIsApproved: checkIfReturnRequuestIsApproved,
    checkIfTransAlreadyExist: checkIfTransAlreadyExist,
    createAllServiceFees: createAllServiceFees,
    createBill: createBill,
    createBinTransfer: createBinTransfer,
    createCreditMemoFromInv: createCreditMemoFromInv,
    createInventoryAdjustment: createInventoryAdjustment,
    createJounralEntry: createJournalEntry,
    createMasterReturnRequest: createMasterReturnRequest,
    createPayment: createPayment,
    createPO: createPO,
    createVendorCredit: createVendorCredit,
    deleteTransaction: deleteTransaction,
    getAllBills: getAllBills,
    getBillId: getBillId,
    getBillStatus: getBillStatus,
    getCertainField: getCertainField,
    getInvoiceLineAmount: getInvoiceLineAmount,
    getInvoiceLineCountWithCmPayment: getInvoiceLineCountWithCmPayment,
    getItemTransactionLine: getItemTransactionLine,
    getMasterReturnReturnRequest: getMasterReturnReturnRequest,
    getMrrReturnRequestCount: getMrrReturnRequestCount,
    getPaymentSum: getPaymentSum,
    getReturnRequestPendingReview,
    getReturnRequestPerCategory: getReturnRequestPerCategory,
    getSalesTransactionLine: getSalesTransactionLine,
    getTransactionType: getTransactionType,
    removeBillCreditLine: removeBillCreditLine,
    removeCMFromInvoiceLine: removeCMFromInvoiceLine,
    removeVBLine: removeVBLine,
    setAdjustmentFee: setAdjustmentFee,
    setERVDiscountPrice: setERVDiscountPrice,
    setIRSRelatedTranLineProcessing: setIRSRelatedTranLineProcessing,
    setPartialAmount: setPartialAmount,
    updateBinNumber: updateBinNumber,
    updateProcessing: updateProcessing,
    updateSO222Form: updateSO222Form,
    updateTranLineCM: updateTranLineCM,
  };
});
