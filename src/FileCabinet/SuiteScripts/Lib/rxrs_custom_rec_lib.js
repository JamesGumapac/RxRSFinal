/**
 * @NApiVersion 2.1
 */
define([
  "N/https",
  "N/url",
  "N/record",
  "N/search",
  "./rxrs_transaction_lib",
  "./rxrs_util",
  "./rxrs_item_lib",
  "./rxrs_verify_staging_lib",
], /**
 * @param https
 * @param url
 * @param{record} record
 * @param{search} search
 * @param tranlib
 * @param util
 * @param itemlib
 * @param vslib
 */ (https, url, record, search, tranlib, util, itemlib, vslib) => {
  const PRICINGMAP = {
    6: 4, //direct package price
    8: 3, // Suggested wholesale price
    10: 1, // Wholesale Acquisition Cost (WAC) Package Price
    16: 2, //Consolidated Price 1 Package Price
    9: 7, // Wholesale Acquisition Cost (WAC) Unit Price
    5: 8, // Direct Unit Price
    15: 5, // Consolidated Price 1 Unit Price
    14: 6, // No Price
  };
  const RETURNABLE = 2;
  const NONRETURNABLE = 1;

  /**
   * Look if there is already a custom credit memo created for the invoice
   * @param {string} CreditMemoNumber - The custom credit memo number to search for
   * @return {*} The credit memo Id if found, otherwise undefined
   */
  function lookForExistingCreditMemoRec(CreditMemoNumber) {
    try {
      log.audit("lookForExistingCreditMemoRec", CreditMemoNumber);
      let creditMemoId;
      const customrecord_creditmemoSearchObj = search.create({
        type: "customrecord_creditmemo",
        filters: [["custrecord_creditmemonum", "is", CreditMemoNumber]],
      });

      customrecord_creditmemoSearchObj.run().each(function (result) {
        creditMemoId = result.id;
      });
      return creditMemoId;
    } catch (e) {
      log.error("lookForExistingCreditMemoRec", e.message);
    }
  }

  /**
   * Get All CM based on the invoice internal Id
   * @param {string}invId
   */
  function getAllCM(invId) {
    let cmIds = [];
    try {
      const customrecord_creditmemoSearchObj = search.create({
        type: "customrecord_creditmemo",
        filters: [["custrecord_invoice_applied", "anyof", invId]],
        columns: [
          search.createColumn({
            name: "internalid",
            sort: search.Sort.ASC,
            label: "ID",
          }),
          search.createColumn({
            name: "custrecord_creditmemonum",
            label: "Credit Memo No.",
          }),
        ],
      });
      customrecord_creditmemoSearchObj.run().each(function (result) {
        cmIds.push({
          text: result.getValue({ name: "custrecord_creditmemonum" }),
          value: result.id,
        });
        return true;
      });
      return cmIds;
    } catch (e) {
      log.error("getAllCM", e.message);
    }
  }

  /**
   * Delete the Price History if exists
   * @param options main object
   * @param {string} options.priceType
   * @param {string} options.itemId
   * @param {string} options.date
   * @return the delete price history record.
   */
  function deletePriceHistory(options) {
    // log.audit("deletePriceHistory", options);
    let { date, itemId, priceType } = options;
    date = parseDate(date);
    let newdate =
      date.getMonth() + 1 + "/" + date.getDate() + "/" + date.getFullYear();
    let priceLevel = PRICINGMAP[priceType];
    log.audit("searchValues", { newdate, itemId, priceLevel });
    try {
      const customrecord_kd_price_historySearchObj = search.create({
        type: "customrecord_kd_price_history",
        filters: [
          ["custrecord_fdbdate", "on", newdate],
          "AND",
          ["custrecord_kd_item", "anyof", itemId],
        ],
        columns: [
          search.createColumn({
            name: "id",
            sort: search.Sort.ASC,
            label: "ID",
          }),
          search.createColumn({ name: "scriptid", label: "Script ID" }),
        ],
      });
      if (priceLevel) {
        customrecord_kd_price_historySearchObj.filters.push(
          search.createFilter({
            name: "custrecord_kd_price_type",
            operator: "anyof",
            values: priceLevel,
          }),
        );
      }
      const searchResultCount =
        customrecord_kd_price_historySearchObj.runPaged().count;
      log.debug("getPriceHistory", searchResultCount);
      customrecord_kd_price_historySearchObj.run().each(function (result) {
        if (result.id) {
          log.audit(
            "Deleting Pricing History",
            record.delete({
              type: "customrecord_kd_price_history",
              id: result.id,
            }),
          );
        }
      });
    } catch (e) {
      log.error("getPriceHistory", e.message);
    }
  }

  /**
   *
   * @param options main object
   * @param options.itemId - Item Id
   * @param options.date - Date
   * @param options.priceType - Price Level
   * @param options.newPrice - Latest Price
   * @return the created Price History Id
   */
  function createPriceHistory(options) {
    log.audit("createPriceHistory", options);
    let { itemId, date, priceType, newPrice } = options;

    try {
      const priceHistoryRec = record.create({
        type: "customrecord_kd_price_history",
      });
      priceHistoryRec.setValue({
        fieldId: "custrecord_kd_item",
        value: itemId,
      });
      priceHistoryRec.setValue({
        fieldId: "custrecord_kd_price_type",
        value: PRICINGMAP[priceType],
      });
      priceHistoryRec.setValue({
        fieldId: "custrecord_kd_price_type",
        value: PRICINGMAP[priceType],
      });

      priceHistoryRec.setValue({
        fieldId: "custrecord_fdbdate",
        value: new Date(parseDate(date)),
      });
      priceHistoryRec.setValue({
        fieldId: "custrecord_kd_new_price",
        value: newPrice,
      });

      return priceHistoryRec.save({ ignoreMandatoryFields: true });
    } catch (e) {
      log.error("createPriceHistory", e.message);
    }
  }

  /**
   * Parse Date formatted as YYYYMMDD
   * @param str
   * @returns {Date|string}
   */
  function parseDate(str) {
    if (!/^(\d){8}$/.test(str)) return "invalid date";
    let y = str.substr(0, 4),
      m = str.substr(4, 2),
      d = str.substr(6, 2);
    return new Date(y, m, d);
  }

  /**
   * CM Parent Info
   * @param options.forUpdate
   * @param options.forCreation
   */
  function createUpdateCM(options) {
    let response = {};
    try {
      log.audit("createUpdateCM", options);
      let obj = JSON.parse(options);
      let { forUpdate, forCreation } = obj;
      if (forUpdate.length > 0) {
        createCreditMemoLines({ cmLines: forUpdate });
      }
      if (forCreation.cmLines.length > 0) {
        const cmId = createCreditMemoRec(forCreation);

        if (cmId) {
          createCreditMemoLines({
            cmLines: forCreation.cmLines,
            cmParentId: cmId,
            isGovernment: forCreation.isGovernment,
            isTopCo: forCreation.isTopCo,
            invId: forCreation.invoiceId,
          });
        }
        response.sucessMessage = "Successfully Created Credit Memo ID: " + cmId;
      }
    } catch (e) {
      log.error("createUpdateCM", e.message);
      return (response.error = "Error: " + e.message);
    }
    return response;
  }

  /**
   * Create Credit Memo Parent Record
   * @param  {string}options.cmId
   * @param {string} options.creditMemoNumber
   * @param  {number}options.amount
   * @param  {number}options.invoiceId
   * @param  {string}options.dateIssued
   * @param options.saveWithoutReconcilingItems
   * @param {string}options.serviceFee
   * @param  {string}options.fileId
   * @param {number}options.packingSlipAmount
   * @param {boolean}options.isGovernment
   * @param {boolean}options.isTopCo
   * @param options.cmLines
   *
   * @return string id of the parent credit memo
   */
  function createCreditMemoRec(options) {
    log.audit("createCreditMemoRec", options);

    try {
      let {
        creditMemoNumber,
        amount,
        serviceFee,
        saveWithoutReconcilingItems,
        invoiceId,
        dateIssued,
        fileId,
        cmId,
        packingSlipAmount,
        isGovernment,
        isTopCo,
      } = options;

      const cmRec = record.create({
        type: "customrecord_creditmemo",
        isDynamic: true,
      });
      if (!invoiceId) throw "No invoice Id. This is a required fields";
      invoiceId &&
        cmRec.setValue({
          fieldId: "custrecord_invoice_applied",
          value: invoiceId,
        });
      if (isGovernment == true) {
        const res = itemlib.getCurrentDiscountPercentage({
          displayName: "Government",
        });
        amount &&
          cmRec.setValue({
            fieldId: "custrecord_gross_credit_received",
            value: amount / res.totalPercent,
          });
        amount *= res.totalPercent;
        packingSlipAmount *= res.totalPercent;
      } else if (isTopCo == true) {
        const res = itemlib.getCurrentDiscountPercentage({
          displayName: "Top Co",
        });
        amount &&
          cmRec.setValue({
            fieldId: "custrecord_gross_credit_received",
            value: amount / res.totalPercent || 1,
          });
        amount *= res.totalPercent || 1;
        packingSlipAmount *= res.totalPercent || 1;
      }
      log.audit("amount", amount);
      isGovernment &&
        cmRec.setValue({
          fieldId: "custrecord_is_government",
          value: isGovernment,
        });
      isTopCo &&
        cmRec.setValue({
          fieldId: "custrecord_is_government",
          value: isGovernment,
        });
      creditMemoNumber &&
        cmRec.setValue({
          fieldId: "custrecord_creditmemonum",
          value: creditMemoNumber,
        });
      packingSlipAmount &&
        cmRec.setValue({
          fieldId: "custrecord_packing_slip_amount",
          value: packingSlipAmount,
        });
      amount &&
        cmRec.setValue({
          fieldId: "custrecord_amount",
          value: amount,
        });
      serviceFee &&
        cmRec.setValue({
          fieldId: "custrecord_servicefee",
          value: serviceFee,
        });
      dateIssued &&
        cmRec.setValue({
          fieldId: "custrecord_issuedon",
          value: new Date(dateIssued),
        });
      fileId &&
        cmRec.setValue({
          fieldId: "custrecord_fileupload",
          value: fileId,
        });
      saveWithoutReconcilingItems &&
        cmRec.setValue({
          fieldId: "custrecord_savewithoutreconitem",
          value: saveWithoutReconcilingItems,
        });
      cmId = cmRec.save({
        ignoreMandatoryFields: true,
      });
      if (cmId) {
        record.submitFields({
          type: record.Type.INVOICE,
          id: invoiceId,
          values: {
            custbody_invoice_status: 2, // Open Credit
          },
        });
      }
      return cmId;
    } catch (e) {
      log.error("createCreditMemoRec", e.message);
    }
  }

  /**
   * Remove and delete credit memo including payment
   * @param {string} options.creditMemoId
   * @param {string} options.invId
   */
  function deleteCreditMemo(options) {
    log.audit("deleteCreditMemo", options);
    let { creditMemoId, invId } = JSON.parse(options);
    try {
      let updatedInvId = tranlib.removeCMFromInvoiceLine(options);
      if (updatedInvId) {
        let cmId = tranlib.checkIfTransAlreadyExist({
          searchType: "CustCred",
          creditMemoId: creditMemoId,
        });

        if (cmId) {
          let deletedCM = record.delete({
            type: record.Type.CREDIT_MEMO,
            id: cmId,
          });
          log.audit("deleted native cm", deletedCM);
          if (deletedCM) {
            let isCMLineDeleted = deleteCMLine(creditMemoId);
            log.audit("is cmLine Deleted", isCMLineDeleted);
            if (isCMLineDeleted) {
              log.audit("deleting credit memo");
              record.delete({
                type: "customrecord_creditmemo",
                id: creditMemoId,
              });
              let cmIds = getAllCM(invId);
              log.audit("cmIds", cmIds.length);
              if (cmIds.length == 0) {
                record.submitFields({
                  type: record.Type.INVOICE,
                  id: invId,
                  values: {
                    custbody_invoice_status: 1,
                  },
                });
              }
            }
          }
        }
      }
    } catch (e) {
      log.error("deleteCreditMemo", e.message);
    }
  }

  /**
   * Get the all invoice CM total amount
   * @param {string}invId
   */
  function getALlCMTotalAmount(invId) {
    log.audit("getALlCMTotalAmount", invId);
    try {
      let total = 0;
      const customrecord_creditmemoSearchObj = search.create({
        type: "customrecord_creditmemo",
        filters: [["custrecord_invoice_applied", "anyof", invId]],
        columns: [
          search.createColumn({
            name: "custrecord_gross_credit_received",
            summary: "SUM",
            label: "Amount",
          }),
        ],
      });

      customrecord_creditmemoSearchObj.run().each(function (result) {
        total = result.getValue({
          name: "custrecord_gross_credit_received",
          summary: "SUM",
        });
      });
      log.audit("getALlCMTotalAmount", total);
      return total;
    } catch (e) {
      log.error("getALlCMTotalAmount", e.message);
    }
  }

  /**
   * Get Parent CM details
   * @param {string} cmId
   * @return Parent Credit Memo Details
   */
  function getCMParentInfo(cmId) {
    let result = {};
    let total = 0;
    let lineCount = 0;
    try {
      const customrecord_credit_memo_line_appliedSearchObj = search.create({
        type: "customrecord_credit_memo_line_applied",
        filters: [["custrecord_credit_memo_id", "anyof", cmId]],
        columns: [
          search.createColumn({
            name: "custrecord_cmline_gross_amount",
            summary: "SUM",
            label: "Amount Applied",
          }),
          search.createColumn({
            name: "internalid",
            summary: "COUNT",
            label: "Internal ID",
          }),
        ],
      });
      customrecord_credit_memo_line_appliedSearchObj
        .run()
        .each(function (result) {
          total = result.getValue({
            name: "custrecord_cmline_gross_amount",
            summary: "SUM",
          });
          lineCount = result.getValue({
            name: "internalid",
            summary: "COUNT",
          });
        });
      result.total = total;
      result.lineCount = lineCount;
      const parentRecord = record.load({
        type: "customrecord_creditmemo",
        id: cmId,
      });

      result.dateIssued = parentRecord.getText("custrecord_issuedon");
      result.serviceFee = parentRecord.getValue("custrecord_servicefee");
      result.file = parentRecord.getValue("custrecord_fileupload");

      return result;
    } catch (e) {
      log.error("getCMParentInfo", e.message);
    }
  }

  /**
   * Get the CM lineCount that has the payment applied
   * @param {array}cmId
   */
  function getCMLineCountWithAmount(cmId) {
    log.audit("getCMLineCountWithAmount", cmId);
    try {
      let count = 0;
      const customrecord_credit_memo_line_appliedSearchObj = search.create({
        type: "customrecord_credit_memo_line_applied",
        filters: [
          ["custrecord_credit_memo_id", "anyof", cmId],
          "AND",
          ["custrecord_cm_amount_applied", "isnotempty", ""],
          "AND",
          ["custrecord_cm_amount_applied", "notequalto", "0.00"],
        ],
        columns: [
          search.createColumn({
            name: "internalid",
            summary: "COUNT",
            label: "Internal ID",
          }),
        ],
      });
      customrecord_credit_memo_line_appliedSearchObj
        .run()
        .each(function (result) {
          count = result.getValue({
            name: "internalid",
            summary: "COUNT",
          });
          return true;
        });
      return count;
    } catch (e) {
      log.error("getCMLineCountWithAmount", e.message);
    }
  }

  /**
   * Get the CM lineCount that has the payment applied
   * @param {string}creditMemoId
   */
  function deleteCMLine(creditMemoId) {
    log.audit("deleteCMLine", creditMemoId);
    let count;
    try {
      const customrecord_credit_memo_line_appliedSearchObj = search.create({
        type: "customrecord_credit_memo_line_applied",
        filters: [["custrecord_credit_memo_id", "anyof", creditMemoId]],
        columns: [
          search.createColumn({
            name: "internalid",
            label: "Internal ID",
          }),
        ],
      });
      let searchResultCount =
        customrecord_credit_memo_line_appliedSearchObj.runPaged().count;
      customrecord_credit_memo_line_appliedSearchObj
        .run()
        .each(function (result) {
          let id = result.getValue({
            name: "internalid",
          });
          log.debug("deleting cm line id", id);
          record.delete({
            type: "customrecord_credit_memo_line_applied",
            id: id,
          });

          searchResultCount -= 1;
          log.audit("searchResultCount", searchResultCount);
          return true;
        });
      if (searchResultCount == 0) {
        return true;
      }
    } catch (e) {
      log.error("deleteCMLine", e.message);
    }
  }

  /**
   * Create credit memo lines based on provided options.
   *
   * @param {Object} options - The options object containing cmLines, invId, cmParentId, is*/
  function createCreditMemoLines(options) {
    log.audit("createCreditMemoLines", options);
    let { cmLines, invId, cmParentId, isGovernment, isTopCo } = options;
    let isRejected;
    try {
      cmLines.forEach((cm) => {
        let {
          lineUniqueKey,
          NDC,
          unitPrice,
          amountApplied,
          cmLineId,
          isSelected,
          cmId,
          invId,
        } = cm;
        isRejected = amountApplied <= 0 ? true : false;
        log.audit("isRejected", isRejected);
        if (!isEmpty(+cmLineId) || cmLineId != " ") {
          log.error("Cm ID EXIST IF");
          // let values = {
          //   custrecord_cm_amount_applied: amountApplied,
          //   custrecord_cm_unit_price: unitPrice,
          // };

          const cmLineRec = record.load({
            type: "customrecord_credit_memo_line_applied",
            id: cmLineId,
            isDynamic: true,
          });
          log.debug("cmLineRec", cmLineRec);
          cmLineRec.setValue({
            fieldId: "custrecord_cm_amount_applied",
            value: amountApplied,
          });

          cmLineRec.setValue({
            fieldId: "custrecord_rejected",
            value: isRejected,
          });

          cmLineRec.setValue({
            fieldId: "custrecord_cm_unit_price",
            value: unitPrice,
          });
          const updateCMLineId = cmLineRec.save({
            ignoreMandatoryFields: true,
          });
          log.audit("createCreditMemoLines updateCMLineId", updateCMLineId);
          reloadCM(cmId);
          tranlib.updateTranLineCM({
            cmLineId: cmLineId,
            invId: invId,
            lineuniquekey: lineUniqueKey,
            amount: amountApplied,
            unitPrice: unitPrice,
            isRejected: isRejected,
          });
        } else {
          log.emergency("CM DOES NOT EXIST ELSE");
          const cmChildRec = record.create({
            type: "customrecord_credit_memo_line_applied",
            isDynamic: true,
          });
          try {
            log.audit("cmParentId", cmParentId);
            cmChildRec.setValue({
              fieldId: "custrecord_credit_memo_id",
              value: cmParentId,
            });
            isGovernment &&
              cmChildRec.setValue({
                fieldId: "custrecord_government",
                value: isGovernment,
              });
            isTopCo &&
              cmChildRec.setValue({
                fieldId: "custrecord_cm_istopco",
                value: isTopCo,
              });
            cmChildRec.setValue({
              fieldId: "custrecord_cm_lineuniquekey",
              value: lineUniqueKey,
            });
            cmChildRec.setValue({
              fieldId: "custrecord_cm_line_item",
              value: NDC,
            });
            cmChildRec.setValue({
              fieldId: "custrecord_cm_amount_applied",
              value: amountApplied,
            });
            cmChildRec.setValue({
              fieldId: "custrecord_rejected",
              value: isRejected,
            });

            cmChildRec.setValue({
              fieldId: "custrecord_cm_unit_price",
              value: unitPrice,
            });
            if (
              isGovernment == true ||
              (isTopCo == true && isRejected != true)
            ) {
              cmChildRec.setValue({
                fieldId: "custrecord_cmline_gross_amount",
                value: amountApplied, /// 0.15,
              });
              cmChildRec.setValue({
                fieldId: "custrecord_cmline_gross_unit_price",
                value: unitPrice, /// 0.15,
              });
            }
          } catch (e) {
            log.error("createCreditMemoLines setting values", {
              error: e.message,
              value: cm,
            });
          }
          let cmChildId = cmChildRec.save({ ignoreMandatoryFields: true });

          if (cmChildId) {
            log.audit("Created Lines: ", { cmChildId, cmParentId });
            reloadCM(cmParentId);
            tranlib.updateTranLineCM({
              cmLineId: cmChildId,
              invId: invId,
              lineuniquekey: lineUniqueKey,
              amount: amountApplied,
              unitPrice: unitPrice,
              isRejected: isRejected,
            });
          }
        }
      });
    } catch (e) {
      log.error("createCreditMemoLines", { error: e.message, params: options });
      return "createCreditMemoLines " + e.message;
    }
  }

  function isEmpty(stValue) {
    return (
      stValue === "" ||
      stValue == null ||
      stValue == " " ||
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
   * Create 222 Form
   * @param {string} options.rrId - Return Request Id
   * @param {number} options.page - Page Number
   * @return the Internal Id of the created form 222
   */
  function create222Form(options) {
    log.audit("create222Form", options);
    let { rrId, page } = options;

    try {
      const form222Rec = record.create({
        type: "customrecord_kd_222formrefnum",
      });
      form222Rec.setValue({
        fieldId: "name",
        value: "000000000",
      });
      form222Rec.setValue({
        fieldId: "custrecord_kd_returnrequest",
        value: rrId,
      });
      form222Rec.setValue({
        fieldId: "custrecord_kd_form222_page",
        value: page,
      });
      return form222Rec.save({
        ignoreMandatoryFields: true,
      });
    } catch (e) {
      log.error("create222Form", e.message);
    }
  }

  /**
   * Get the item request based on mrrId
   * @param options - MRR ID
   */
  function getC2ItemRequested(options) {
    try {
      let totalItemRequested = [];
      const customrecord_kod_mr_item_requestSearchObj = search.create({
        type: "customrecord_kod_mr_item_request",
        filters: [
          ["custrecord_kd_rir_masterid", "anyof", options],
          "AND",
          ["custrecord_kd_rir_form222_ref", "anyof", "@NONE@"],
          "AND",
          ["custrecord_kd_rir_category", "anyof", "3"],
        ],
        columns: [
          search.createColumn({ name: "id", label: "ID" }),
          search.createColumn({
            name: "scriptid",
            label: "Script ID",
          }),
        ],
      });
      let searchResultCount =
        customrecord_kod_mr_item_requestSearchObj.runPaged().count;
      customrecord_kod_mr_item_requestSearchObj.run().each(function (result) {
        totalItemRequested.push(result.id);
        return true;
      });
      return totalItemRequested;
    } catch (e) {
      log.error("getC2ItemRequested", e.message);
    }
  }

  /**
   * Get the item request based on mrrId
   * @param {string} options.mrrId - MRR ID
   * @param {string} options.category - Return Request Category
   * @return the internal id of the return item request
   */
  function getItemRequestedPerCategory(options) {
    log.audit("getItemRequestedPerCategory", options);
    let { category, mrrId } = options;
    try {
      let totalItemRequested = [];
      const customrecord_kod_mr_item_requestSearchObj = search.create({
        type: "customrecord_kod_mr_item_request",
        filters: [
          ["custrecord_kd_rir_category", "anyof", category],
          "AND",
          ["custrecord_kd_rir_masterid", "anyof", mrrId],
        ],
        columns: [
          search.createColumn({ name: "id", label: "ID" }),
          search.createColumn({
            name: "scriptid",
            label: "Script ID",
          }),
        ],
      });
      let searchResultCount =
        customrecord_kod_mr_item_requestSearchObj.runPaged().count;
      log.audit(
        "searchResultCount getItemRequestedPerCategory",
        searchResultCount,
      );
      customrecord_kod_mr_item_requestSearchObj.run().each(function (result) {
        totalItemRequested.push(result.id);
        return true;
      });
      return totalItemRequested;
    } catch (e) {
      log.error("getItemRequestedPerCategory", e.message);
    }
  }

  function getReturnRequestItemRequested(options) {
    log.audit("getReturnRequestItemRequested", options);
    try {
      const objSearch = search.create({
        type: "customrecord_kod_mr_item_request",
        filters: [["custrecord_kd_rir_return_request", "anyof", options]],
        columns: [
          search.createColumn({ name: "id", label: "ID" }),
          search.createColumn({
            name: "custrecord_kd_rir_item",
            label: "Item ",
          }),
          search.createColumn({
            name: "displayname",
            join: "CUSTRECORD_KD_RIR_ITEM",
            label: "Display Name",
          }),
          search.createColumn({
            name: "custitem_ndc10",
            join: "CUSTRECORD_KD_RIR_ITEM",
            label: "NDC10",
          }),
          search.createColumn({
            name: "custrecord_kd_rir_quantity",
            label: "Quantity",
          }),
          search.createColumn({
            name: "custrecord_kd_rir_fulpar",
            label: "FULL/PARTIAL PACKAGE",
          }),
          search.createColumn({
            name: "custrecord_kd_rir_masterid",
            label: "Master Return ID",
          }),
          search.createColumn({
            name: "custrecord_kd_rir_form_222_no",
            label: "Form 222 No.",
          }),
          search.createColumn({
            name: "custrecord_kd_rir_form222_ref",
            label: "Form 222 Ref Num",
          }),
        ],
      });
      let searchRs = objSearch.run().getRange({ start: 0, end: 1000 });
      let itemsRequested = [];
      let rirId,
        item,
        displayName,
        itemNdc,
        qty,
        fulPar,
        form222No,
        form222RefNo,
        form222RefNoId;
      log.debug("getItemsRequested", "searchRs: " + JSON.stringify(searchRs));
      for (let i = 0; i < searchRs.length; i++) {
        rirId = searchRs[i].getValue({
          name: "id",
        });
        item = searchRs[i].getValue({
          name: "custrecord_kd_rir_item",
        });
        displayName = searchRs[i].getValue({
          name: "displayname",
          join: "custrecord_kd_rir_item",
        });
        if (displayName == "") {
          displayName = searchRs[i].getText({
            name: "custrecord_kd_rir_item",
          });
        }
        itemNdc = searchRs[i].getValue({
          name: "custitem_kod_item_ndc",
          join: "custrecord_kd_rir_item",
        });
        qty = searchRs[i].getValue({
          name: "custrecord_kd_rir_quantity",
        });
        fulPar = searchRs[i].getValue({
          name: "custrecord_kd_rir_fulpar",
        });
        form222No = searchRs[i].getValue({
          name: "custrecord_kd_rir_form_222_no",
        });
        form222RefNo = searchRs[i].getText({
          name: "custrecord_kd_rir_form222_ref",
        });
        form222RefNoId = searchRs[i].getValue({
          name: "custrecord_kd_rir_form222_ref",
        });

        itemsRequested.push({
          id: rirId,
          item: item,
          displayname: displayName,
          ndc: itemNdc,
          qty: qty,
          fulpar: fulPar,
          form222No: form222No,
          form222RefNo: form222RefNo,
          form222RefNoId: form222RefNoId,
        });
      }
      return itemsRequested;
    } catch (e) {
      log.error("getReturnRequestItemRequested", e.message);
    }
  }

  /**
   * Get the category of the return item requested of the master return request
   * @param options mrrId
   * @return array of the category
   */
  function getItemRequested(options) {
    let category = [];
    log.audit("getItemRequested", options);
    try {
      const customrecord_kod_mr_item_requestSearchObj = search.create({
        type: "customrecord_kod_mr_item_request",
        filters: [["custrecord_kd_rir_masterid", "anyof", options]],
        columns: [
          search.createColumn({
            name: "custrecord_kd_rir_category",
            summary: "GROUP",
            label: "Category",
          }),
        ],
      });

      customrecord_kod_mr_item_requestSearchObj.run().each(function (result) {
        let res = result.getValue({
          name: "custrecord_kd_rir_category",
          summary: "GROUP",
        });

        switch (+res) {
          case 3:
            category.push({ value: 3, text: "C2" });

            break;
          case 1:
            category.push({ value: 1, text: "RxOTC" });
            break;
          case 4:
            category.push({ value: 4, text: "C3To5" });
            break;
        }
        return true;
      });
      log.audit("getItemRequested", category);
      return category;
    } catch (e) {
      log.error("getItemRequested", e.message);
    }
  }

  /**
   * Assign the return request in the Return item requested per category
   * @param options main object
   * @param options.category - Return Request Category,
   * @param options.mrrId - Master Return Id
   */
  function assignReturnItemRequested(options) {
    log.audit("assignReturnItemRequested", options);
    let { category, mrrId } = options;
    const rrId = tranlib.getReturnRequestPerCategory({
      mrrId: mrrId,
      category: category,
    });
    try {
      const customrecord_kod_mr_item_requestSearchObj = search.create({
        type: "customrecord_kod_mr_item_request",
        filters: [
          ["custrecord_kd_rir_masterid", "anyof", mrrId],
          "AND",
          ["custrecord_kd_rir_category", "anyof", category],
        ],
        columns: [
          search.createColumn({
            name: "custrecord_kd_rir_category",
            label: "Category",
          }),
        ],
      });

      customrecord_kod_mr_item_requestSearchObj.run().each(function (result) {
        record.submitFields({
          type: "customrecord_kod_mr_item_request",
          id: result.id,
          values: {
            custrecord_kd_rir_return_request: rrId,
          },
        });
        return true;
      });
    } catch (e) {
      log.error("assignReturnItemRequested", e.message);
    }
  }

  /**
   * Create inbound packages
   * @param {number} options.mrrId master return request number
   * @param {number} options.rrId return request Id
   * @param {string} options.requestedDate  requested date
   * @param {number} options.category Return request category
   * @param {boolean} options.isC2 Check if the category is C2
   * @param {number} options.customer Customer indicated in the Master Return Request
   * @return the internal id of the return package
   */
  const createReturnPackages = (options) => {
    let { mrrId, rrId, requestedDate, category, customer, isC2 } = options;
    try {
      log.audit("createReturnPackages", options);
      const rpIds = search
        .load("customsearch_kd_package_return_search_2")
        .run()
        .getRange({ start: 0, end: 1 });
      const rpName =
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
      isC2 &&
        packageRec.setValue({
          fieldId: "custrecord_kd_is_222_kit",
          value: isC2,
        });
      packageRec.setValue({
        fieldId: "name",
        value: rpName,
      });
      mrrId &&
        packageRec.setValue({
          fieldId: "custrecord_kod_rtnpack_mr",
          value: mrrId,
        });
      rrId &&
        packageRec.setValue({
          fieldId: "custrecord_kod_packrtn_rtnrequest",
          value: rrId,
        });
      category &&
        packageRec.setValue({
          fieldId: "custrecord_kod_packrtn_control",
          value: category,
        });
      requestedDate &&
        packageRec.setValue({
          fieldId: "custrecord_kd_inbound_estimated_delivery",
          value: new Date(requestedDate),
        });
      customer &&
        packageRec.setValue({
          fieldId: "custrecord_kd_rp_customer",
          value: customer,
        });
      let id = packageRec.save({ ignoreMandatoryFields: true });
      log.debug("Package Return Id" + id);
      return id;
    } catch (e) {
      log.error("createReturnPackages", {
        errorMessage: e.message,
        parameters: options,
      });
    }
  };

  /**
   * Get the 222 Form For Reprinting
   * @param options - Return Request
   * @return the array of the internal id of the 222 form
   */
  function getReturnRequestForReprinting222Form(options) {
    let ids = [];
    try {
      const customrecord_kd_222formrefnumSearchObj = search.create({
        type: "customrecord_kd_222formrefnum",
        filters: [
          ["custrecord_kd_returnrequest", "anyof", options],
          "AND",
          ["name", "isnot", "000000000"],
          "AND",
          [
            ["custrecord_kd_2frn_for_222_regeneration", "is", "T"],
            "OR",
            ["formulatext: {custrecord_kd_2frn_222_form_pdf}", "isempty", ""],
          ],
        ],
        columns: [
          search.createColumn({
            name: "custrecord_kd_returnrequest",
            label: "Return Request",
          }),
        ],
      });

      customrecord_kd_222formrefnumSearchObj.run().each(function (result) {
        ids.push(result.id);
        return true;
      });
      return ids;
    } catch (e) {
      log.error("getReturnRequestForReprinting222Form", e.message);
    }
  }

  /**
   * Get the Return Package Details
   * @param {boolean}options.outbound - Set true for outbound
   * @param {boolean}options.getCount - Set true if you want to return count
   * @param {string}options.rrId - Return Request Id
   */
  function getReturnPackageInfo(options) {
    let { outbound, getCount, rrId } = options;
    try {
      const customrecord_kod_mr_packagesSearchObj = search.create({
        type: "customrecord_kod_mr_packages",
        filters: [["custrecord_kod_packrtn_rtnrequest", "anyof", rrId]],
        columns: [
          search.createColumn({ name: "name", label: "ID" }),
          search.createColumn({
            name: "custrecord_kod_packrtn_control",
            label: "Package Control",
          }),
          search.createColumn({
            name: "custrecord_kod_packrtn_rtnrequest",
            label: "Return Request",
          }),
          search.createColumn({
            name: "custrecord_kd_inbound_tracking_status",
            label: "Tracking Status ",
          }),
          search.createColumn({
            name: "custrecord_kod_packrtn_trackingnum",
            label: "Tracking Number",
          }),
          search.createColumn({
            name: "custrecord_kd_inbound_estimated_delivery",
            label: " Estimated Delivery",
          }),
          search.createColumn({
            name: "custrecord_kd_rp_customer",
            label: "Customer",
          }),
        ],
      });

      outbound &&
        customrecord_kod_mr_packagesSearchObj.filters.push(
          search.createFilter({
            name: "custrecord_kd_is_222_kit",
            operator: "is",
            values: outbound,
          }),
        );
      const searchResultCount =
        customrecord_kod_mr_packagesSearchObj.runPaged().count;
      log.debug(
        "customrecord_kod_mr_packagesSearchObj result count",
        searchResultCount,
      );
      if (getCount == true) {
        return searchResultCount;
      }
      customrecord_kod_mr_packagesSearchObj.run().each(function (result) {
        // .run().each has a limit of 4,000 results
        return true;
      });
    } catch (e) {
      log.error("getOutBoundPackages", e.message);
    }
  }

  /**
   * Reload CM
   * @param cmId
   */
  function reloadCM(cmId) {
    log.audit("Reload Cm", cmId);
    try {
      const curRec = record.load({
        type: "customrecord_creditmemo",
        id: cmId,
        isDynamic: true,
      });

      return curRec.save({
        ignoreMandatoryFields: true,
      });
    } catch (e) {
      log.error("reloadCM", e.message);
    }
  }

  /**
   * Check if for 222 Regeneration
   * @param options
   * @returns {boolean}
   */
  function checkIfFor222Regeneration(options) {
    try {
      const customrecord_kd_222formrefnumSearchObj = search.create({
        type: "customrecord_kd_222formrefnum",
        filters: [
          ["custrecord_kd_returnrequest", "anyof", options],
          "AND",
          ["custrecord_kd_2frn_for_222_regeneration", "is", "T"],
        ],
        columns: [
          search.createColumn({ name: "name", label: "Name" }),
          search.createColumn({
            name: "id",
            label: "ID",
          }),
          search.createColumn({ name: "scriptid", label: "Script ID" }),
          search.createColumn({
            name: "custrecord_kd_returnrequest",
            label: "Return Request",
          }),
        ],
      });
      const searchResultCount =
        customrecord_kd_222formrefnumSearchObj.runPaged().count;
      log.error("aaaa", searchResultCount);
      return searchResultCount > 0;
    } catch (e) {
      log.error("checkIfFor222Regeneration", e.message);
    }
  }

  /**
   * Update Item Return Scan for view edit line suitelet
   * @param options
   */
  function updateItemReturnScan(options) {
    log.audit("updateItemReturnScan", options);
    const MCONFIGURED = 8;
    const MANUALINPUT = 12;
    let updatedIRSIds = [];
    let newRec;
    let vendorCreditLine = [];
    let createVendorCredit = false;
    try {
      let data = JSON.parse(options.values);
      if (data.length > 1) {
      }
      data.forEach(function (data) {
        log.audit("data", data);
        let {
          itemId,
          id,
          pharmaProcessing,
          rate,
          updateCatalog,
          nonReturnableReason,
          notes,
          fullyPaid,
        } = data;
        const irsRec = record.load({
          type: "customrecord_cs_item_ret_scan",
          id: id,
          isDynamic: true,
        });
        if (pharmaProcessing) {
          irsRec.setValue({
            fieldId: "custrecord_cs_cb_orverride_phrm",
            value: true,
          });
          irsRec.setValue({
            fieldId: "custrecord_cs__rqstprocesing",
            value: pharmaProcessing,
          });
          irsRec.setValue({
            fieldId: "custrecord_cs_cb_or_non_ret_reason",
            value: true,
          });
          nonReturnableReason &&
            irsRec.setValue({
              fieldId: "custrecord_scannonreturnreason",
              value: nonReturnableReason,
            });
          notes &&
            irsRec.setValue({
              fieldId: "custrecord_notes",
              value: notes,
            });
        }

        if (rate && fullyPaid != true) {
          if (updateCatalog == true) {
            itemlib.updateItemPricing({
              itemId: itemId,
              priceLevel: MCONFIGURED,
              rate: rate,
            });
            irsRec.setValue({
              fieldId: "custrecord_scanpricelevel",
              value: MCONFIGURED,
            });
            irsRec.setValue({
              fieldId: "custrecord_isc_overriderate",
              value: false,
            });
            irsRec.setValue({
              fieldId: "custrecord_isc_inputrate",
              value: "",
            });
            irsRec.setValue({
              fieldId: "custrecord_scanrate",
              value: rate,
            });
          } else {
            itemlib.updateItemPricing({
              itemId: itemId,
              priceLevel: MANUALINPUT,
              rate: rate,
            });

            irsRec.setValue({
              fieldId: "custrecord_isc_overriderate",
              value: true,
            });
            irsRec.setValue({
              fieldId: "custrecord_isc_inputrate",
              value: rate,
            });
            irsRec.setValue({
              fieldId: "custrecord_scanpricelevel",
              value: MANUALINPUT,
            });
          }
          irsRec.setValue({
            fieldId: "custrecord_scanrate",
            value: rate,
          });
        } else {
          createVendorCredit = true;
          log.audit("creating bill credit");
        }

        newRec = updateIRSPrice(irsRec);
        let Ids = newRec.save({
          ignoreMandatoryFields: true,
        });

        updatedIRSIds.push(Ids);
      });
      log.audit("vendorCreditLine", { createVendorCredit });
      if (createVendorCredit == true) {
        tranlib.createVendorCredit({
          billId: options.billId,
        });
      }

      return updatedIRSIds;
    } catch (e) {
      log.error("updateItemReturnScan", e.message);
    }
  }

  /**
   * Calculate the amount of the for the bill credit
   * @param options.rec - Item Return Scan Record
   * @param options.selectedRate - New Rate from  the return scan
   * @returns {number|*}
   */
  function calculateAmount(options) {
    log.audit("calculateAmount", options);
    let { selectedRate, rec } = options;
    const fulPartialPackage = rec.getValue(
      "custrecord_cs_full_partial_package",
    );
    const qty = rec.getValue("custrecord_cs_qty");
    const packageSize = rec.getValue("custrecord_cs_package_size") || 0;
    const partialCount = rec.getValue("custrecord_scanpartialcount") || 0;
    const PACKAGESIZE = {
      PARTIAL: 2,
      FULL: 1,
    };
    log.audit("calculate Amount", {
      fulPartialPackage,
      selectedRate,
      qty,
      partialCount,
      packageSize,
    });
    try {
      if (fulPartialPackage == PACKAGESIZE.FULL) {
        amount = +selectedRate * qty;
      } else {
        amount = +qty * (partialCount / packageSize) * +selectedRate;
      }
      return amount;
    } catch (e) {
      log.error("updateIRSPrice", e.message);
    }
  }

  /**
   * Retrieves the total sum and gross amount applied of credit memo lines for a given parent credit memo ID.
   * @param {Object} options - The options object containing the parentCmId to identify the credit memo.
   * @param {Number} options.parentCmId - The internal ID of the parent credit memo.
   * @return {Object} An object containing the sumAmount and grossAmount of applied credit memo lines.
   */
  function getAllCMLineTotal(options) {
    log.audit("getAllCMLineTotal", options);
    let { parentCmId } = options;
    try {
      let res = {};
      res.sumAmount = 0;
      res.grossAmount = 0;
      const customrecord_credit_memo_line_appliedSearchObj = search.create({
        type: "customrecord_credit_memo_line_applied",
        filters: [
          ["custrecord_credit_memo_id", "anyof", parentCmId],
          "AND",
          ["custrecord_cm_amount_applied", "isnotempty", ""],
          "AND",
          ["custrecord_cm_amount_applied", "notequalto", "0.00"],
        ],
        columns: [
          search.createColumn({
            name: "custrecord_cm_amount_applied",
            summary: "SUM",
            label: "Amount Applied",
          }),
          search.createColumn({
            name: "custrecord_cmline_gross_amount",
            summary: "SUM",
            label: "Gross Applied",
          }),
          search.createColumn({
            name: "internalid",
            summary: "COUNT",
            label: "Internal ID",
          }),
        ],
      });

      customrecord_credit_memo_line_appliedSearchObj
        .run()
        .each(function (result) {
          res.sumAmount = result.getValue({
            name: "custrecord_cm_amount_applied",
            summary: "SUM",
          });
          res.grossAmount = result.getValue({
            name: "custrecord_cmline_gross_amount",
            summary: "SUM",
          });
          return true;
        });
      return res;
    } catch (e) {
      log.error("getAllCMLineTotal", e.message);
    }
  }

  /**
   * Update Item Return Scan Wac and Amount Price
   * @param rec - Item Return Scan Object
   */
  function updateIRSPrice(rec) {
    const fulPartialPackage = rec.getValue(
      "custrecord_cs_full_partial_package",
    );
    log.audit(
      "Update Related Transaction",
      rec.getValue("custrecord_update_related_tran"),
    );
    const item = rec.getValue("custrecord_cs_return_req_scan_item");
    const qty = rec.getValue("custrecord_cs_qty");
    const packageSize = rec.getValue("custrecord_cs_package_size") || 0;
    const partialCount = rec.getValue("custrecord_scanpartialcount") || 0;
    const PACKAGESIZE = {
      PARTIAL: 2,
      FULL: 1,
    };
    try {
      const rate = util.getItemRate({
        priceLevelName: "WHOLESALE ACQUISITION COST",
        itemId: item,
      });
      log.error("rate", rate);
      let amount = 0;
      const isOverrideRate = rec.getValue("custrecord_isc_overriderate");
      const inputRate = rec.getValue("custrecord_isc_inputrate")
        ? rec.getValue("custrecord_isc_inputrate")
        : 0;
      const selectedRate = rec.getValue("custrecord_scanrate")
        ? rec.getValue("custrecord_scanrate")
        : 0;
      let WACAmount = 0;
      if (fulPartialPackage == PACKAGESIZE.FULL) {
        WACAmount = +qty * +rate;
        log.debug("values", { isOverrideRate, selectedRate, qty, WACAmount });
        amount =
          isOverrideRate == true ? +inputRate * +qty : +selectedRate * qty;
      } else {
        log.audit("else", {
          isOverrideRate,
          qty,
          partialCount,
          packageSize,
          inputRate,
        });
        //[Quantity x (Partial Count/Std Pkg Size (Item Record))] * Rate
        amount =
          isOverrideRate == true
            ? +qty * (partialCount / packageSize) * +inputRate
            : +qty * (partialCount / packageSize) * +selectedRate;
        WACAmount = qty * (partialCount / packageSize) * rate;
      }
      log.debug("beforeSubmit amount", { WACAmount, amount });
      rec.setValue({
        fieldId: "custrecord_wac_amount",
        value: WACAmount || 0,
      });
      rec.setValue({
        fieldId: "custrecord_irc_total_amount",
        value: amount || 0,
      });
      return rec;
    } catch (e) {
      log.error("updateIRSPrice", e.message);
    }
  }

  /**
   * Update the Item Return Scan Price level to M-Configured including the related transaction of the IRS
   * @param {string} options - List of the Internal Ids of the Item Return Scan
   */
  function updateIRSPricelevel(options) {
    log.audit("updateIRSPricelevel", options);
    let { values, billId } = options;
    let ids = [];
    try {
      let ids = JSON.parse(values);
      ids.forEach(function (id) {
        const irsRec = record.load({
          type: "customrecord_cs_item_ret_scan",
          id: id,
          isDynamic: true,
        });
        log.audit("setting to m configured");
        irsRec.setValue({
          fieldId: "custrecord_scanpricelevel",
          value: 12, // M-CONFIGURED
        });
        irsRec.setValue({
          fieldId: "custrecord_scanpricelevel",
          value: 8, // M-CONFIGURED
        });

        irsRec.setValue({
          fieldId: "custrecord_isc_overriderate",
          value: false, // M-CONFIGURED
          forceSyncSourcing: true,
        });
        irsRec.setValue({
          fieldId: "custrecord_isc_inputrate",
          value: 0, // M-CONFIGURED
          forceSyncSourcing: true,
        });

        let updatedId = irsRec.save({
          ignoreMandatoryFields: true,
        });
        ids.push(updatedId);
      });
      return ids;
    } catch (e) {
      log.error("updateIRSPricelevel", e.message);
    }
  }

  /**
   * Update manufAvailable Bins
   * @param {string} options.id Manuf Internal Id
   * @param {string} options.binId Bin Number
   * @return the internal id of the updated manuf
   */
  function updateManufAvailableBins(options) {
    try {
      let { id, binId } = options;
      const manufRec = record.load({
        type: "customrecord_csegmanufacturer",
        id: id,
      });
      let availableBins = manufRec.getValue("custrecord_available_bins");
      if (availableBins.indexOf(binId) == -1) {
        availableBins.push(binId);
        manufRec.setValue({
          fieldId: "custrecord_available_bins",
          value: availableBins,
        });
      } else {
        return id;
      }
      return manufRec.save({
        ignoreMandatoryFields: true,
      });
    } catch (e) {
      log.error("updateManufAvailableBins", e.message);
    }
  }

  /**
   * Get the return to info of the manufacturer
   * @param options.manufId Manufacturer Id
   * @returns {null}
   */
  function getReturnToInfo(options) {
    log.audit("getReturnToInfo", options);
    let { manufId } = options;
    try {
      let returnToId = null;
      const customrecord_manuf_returntoinfoSearchObj = search.create({
        type: "customrecord_manuf_returntoinfo",
        filters: [["custrecord_returnto_manuf", "anyof", manufId]],
        columns: [
          search.createColumn({
            name: "custrecord_returnto",
            label: "Return To",
          }),
        ],
      });

      customrecord_manuf_returntoinfoSearchObj.run().each(function (result) {
        returnToId = result.getValue({
          name: "custrecord_returnto",
        });
      });
      return returnToId;
    } catch (e) {
      log.error("getReturnToInfo", e.message);
    }
  }

  /**
   * Creates credit memo upload based on provided options.
   *
   * @param {Object} options - The options for creating the credit memo upload.
   *@param options.requestBody - The content file
   * @return {void}
   */
  function createCreditMemoUpload(options) {
    log.audit("createCreditMemoUpload", options);
    let returnObj = {};
    let { requestBody } = options;
    let discountObj;
    try {
      if (requestBody.length > 0) {
        requestBody.forEach((obj) => {
          log.audit("obj", obj);
          let packingSlipAmount = 0;
          let {
            Amount,
            CreditMemoNumber,
            DateReceived,
            DebitMemoNumbers,
            LineItems,
            ServiceFee,
          } = obj;
          let res = tranlib.getTransactionByExternalId({
            externalId: DebitMemoNumbers,
            type: "CustInvc",
          });

          log.audit("RES", res);
          let { invId, isGovernment, isTopCo } = res;
          log.debug("invId", invId);
          if (isGovernment == true) {
            discountObj = itemlib.getCurrentDiscountPercentage({
              displayName: "Government",
            });
            log.audit("discountObj top co", discountObj);
            Amount = Number(Amount) * discountObj.totalPercent || 1;
            log.audit("Amount", Amount);
          } else if (isTopCo == true) {
            discountObj = itemlib.getCurrentDiscountPercentage({
              displayName: "Top Co",
            });
            log.audit("discountObj top co", discountObj);
            Amount = Number(Amount) * discountObj.totalPercent || 1;
            log.audit("Amount", Amount);
          }
          let cmObj = {
            amount: Amount,
            creditMemoNumber: CreditMemoNumber,
            dateIssued: DateReceived,
            invoiceId: invId,
            serviceFee: ServiceFee,
            isGovernment: isGovernment,
            isTopCo: isTopCo,
          };
          if (invId) {
            let cmId = lookForExistingCreditMemoRec(CreditMemoNumber);

            log.audit("CMID", cmId);
            log.audit("CMOBJ", cmObj);
            let cmLines = [];
            if (!cmId) {
              LineItems.forEach((line) => {
                let { NDC, UnitPrice, Quantity, ExtendedPrice, IsValid } = line;
                let resultObj = tranlib.getNDCTransactionLineDetails({
                  NDC: NDC,
                  invId: invId,
                });
                if (isGovernment == true || isTopCo == true) {
                  UnitPrice *= discountObj.totalPercent || 1;
                  ExtendedPrice *= discountObj.totalPercent || 1;
                }
                let lineDetails = {
                  unitPrice: UnitPrice,
                  amountApplied: ExtendedPrice,
                  cmLineId: " ",
                  invId: invId,
                };
                packingSlipAmount += +resultObj.amount;
                cmLines.push(Object.assign(lineDetails, resultObj));
              });
              cmObj.packingSlipAmount = packingSlipAmount;

              log.debug("CM Lines", { cmObj });
              let cmId = createCreditMemoRec(cmObj);
              log.audit("cmId", cmId);
              if (cmId) {
                createCreditMemoLines({
                  cmLines: cmLines,
                  cmParentId: cmId,
                  isGovernment: isGovernment,
                  isTopCo: isTopCo,
                  invId: invId,
                });
                let isFullAmount;
                let fullAmount = 0;
                if (isGovernment == true || isTopCo == true) {
                  fullAmount =
                    cmObj.packingSlipAmount * discountObj.totalPercent || 1;
                } else {
                  fullAmount = Amount;
                }
                log.audit("fullAmount", fullAmount);
                log.error("isFullamount", Number(fullAmount) < Number(Amount));
                log.error("value", { fullAmount, Amount });
                if (Number(fullAmount) == Number(Amount)) {
                  isFullAmount = true;
                } else {
                  isFullAmount = false;
                }
                returnObj.isFullAmount = isFullAmount;
                returnObj.response = "Successfully created CM " + cmId;
                returnObj.cmId = cmId;
                returnObj.invId = cmObj.invoiceId;
              }
            } else {
              returnObj.error = "CREDIT MEMO IS ALREADY CREATED";
            }
          } else {
            returnObj.error =
              "DEBIT MEMO NUMBER " + DebitMemoNumbers + " DOES NOT EXIST";
          }
        });
      }
      return returnObj;
    } catch (e) {
      log.error("createCreditMemoUpload", e.message);
    }
  }

  /**
   * Get the item request based on mrrId
   * @param {string} options.name - name of the file
   * @return the internal id of the customrecord_credit_memo_upload
   */
  function getCMFileUpload(options) {
    log.audit("getCMFileUpload", options);
    let { name } = options;
    let id;
    try {
      const customrecord_kod_mr_item_requestSearchObj = search.create({
        type: "customrecord_credit_memo_upload",
        filters: [["name", "is", name]],
      });

      customrecord_kod_mr_item_requestSearchObj.run().each(function (result) {
        id = result.id;
        return true;
      });
      return id;
    } catch (e) {
      log.error("getCMFileUpload", e.message);
    }
  }

  /**
   * Create customrecord_credit_memo_upload record
   * @param options.name name based on the file
   * @param options.fileId Uploaded file Internal id in the file cabinet
   * @returns the internal id of the created custom record of the credit memo upload
   */
  function createCMFileUpload(options) {
    let { name, fileId } = options;
    try {
      const cmFileUploadRec = record.create({
        type: "customrecord_credit_memo_upload",
      });
      cmFileUploadRec.setValue({
        fieldId: "name",
        value: name,
      });
      cmFileUploadRec.setValue({
        fieldId: "custrecord_cm_file",
        value: fileId,
      });
      return cmFileUploadRec.save({
        ignoreMandatoryFields: true,
      });
    } catch (e) {
      log.error("createCMFileUpload", e.message);
    }
  }

  /**
   * Create CM upload logs
   * @param options.cmRecUploadId Parent Record
   * @param options.Amount - Amount
   * @param options.invId - Invoice Id
   * @param options.CreditMemoNumber Credit Memo Number
   * @param options.isFullAmount is partial payment or full payment
   * @param options.cmId - Custom Credit Memo Id when Created
   * @param options.error - Error Received
   * @returns created record id
   */
  function createCMUploadLogs(options) {
    log.audit("createCMUploadLogs", options);
    let {
      cmRecUploadId,
      Amount,
      invId,
      CreditMemoNumber,
      isFullAmount,
      error,
      cmId,
    } = options;
    try {
      const cmLineUploadRec = record.create({
        type: "customrecord_cm_upload_line",
      });
      cmLineUploadRec.setValue({
        fieldId: "custrecord_cm_line_parent",
        value: cmRecUploadId,
      });
      invId &&
        cmLineUploadRec.setValue({
          fieldId: "custrecord_cm_line_debit_memo",
          value: invId,
        });
      cmLineUploadRec.setValue({
        fieldId: "custrecord_cm_line_amount",
        value: Amount,
      });
      cmLineUploadRec.setValue({
        fieldId: "custrecord_cm_line_number",
        value: CreditMemoNumber,
      });
      isFullAmount &&
        cmLineUploadRec.setValue({
          fieldId: "custrecord_cm_line_fullamount",
          value: isFullAmount,
        });
      error &&
        cmLineUploadRec.setValue({
          fieldId: "custrecord_cm_line_error",
          value: error,
        });
      cmId &&
        cmLineUploadRec.setValue({
          fieldId: "custrecord_cm_line_cm",
          value: cmId,
        });
      return cmLineUploadRec.save({
        ignoreMandatoryFields: true,
      });
    } catch (e) {
      log.error("createCMUploadLogs", e.message);
    }
  }

  /**
   * Retrieves package information based on the given options.
   *
   * @param {Object} options The options object containing the returnRequest property.
   * @param {string} options.returnRequest The specific return request to search for.
   *
   * @return {Array} An array of package information objects with the following properties:
   * - name {string} The name of the package.
   * - netsuiteInternalId {string} The internal ID of the package in Netsuite.
   * - pdfLink {string} The PDF link associated with the package.
   * - trackingNumber {string} The tracking number of the package.
   * - packageControl {string} The control associated with the package.
   * - trackingStatus {string} The tracking status of the package.
   * - estimatedDelivery {string} The estimated delivery date of the package.
   * - packageStatus {string} The status of the package.
   */
  function getPackageInfo(options) {
    let { returnRequest } = options;
    try {
      let res = [];
      const customrecord_kod_mr_packagesSearchObj = search.create({
        type: "customrecord_kod_mr_packages",
        filters: [["custrecord_kod_rtnpack_mr.name", "is", returnRequest]],
        columns: [
          search.createColumn({
            name: "custrecord_kd_pdflink",
            label: "PDF Link",
          }),
          search.createColumn({
            name: "custrecord_kod_packrtn_trackingnum",
            label: "Tracking Number",
          }),
          search.createColumn({
            name: "custrecord_kd_inbound_tracking_status",
            label: "Tracking Status",
          }),
          search.createColumn({
            name: "custrecord_kd_inbound_estimated_delivery",
            label: "Estimated Delivery",
          }),
          search.createColumn({
            name: "custrecord_packstatus",
            label: "Package Status",
          }),
          search.createColumn({
            name: "custrecord_kod_packrtn_control",
            label: "Package Control",
          }),
          search.createColumn({
            name: "name",
            label: "name",
          }),
        ],
      });

      customrecord_kod_mr_packagesSearchObj.run().each(function (result) {
        res.push({
          name: result.getValue("name"),
          netsuiteInternalId: result.id,
          pdfLink: result.getValue("custrecord_kd_pdflink"),
          trackingNumber: result.getValue("custrecord_kod_packrtn_trackingnum"),
          packageControl: result.getText("custrecord_kod_packrtn_control"),
          trackingStatus: result.getValue(
            "custrecord_kd_inbound_tracking_status",
          ),
          estimatedDelivery: result.getValue(
            "custrecord_kd_inbound_estimated_delivery",
          ),
          packageStatus: result.getText("custrecord_packstatus"),
        });
        return true;
      });
      return res;
    } catch (e) {
      log.error("getPackageInfo", e.message);
    }
  }

  return {
    assignReturnItemRequested,
    checkIfFor222Regeneration,
    create222Form,
    createCMFileUpload,
    createCreditMemoLines,
    createCreditMemoRec,
    createCreditMemoUpload,
    createPriceHistory,
    createCMUploadLogs,
    createReturnPackages,
    createUpdateCM,
    deleteCreditMemo,
    deletePriceHistory,
    getAllCM,
    getPackageInfo,
    getALlCMTotalAmount,
    getAllCMLineTotal,
    getC2ItemRequested,
    getCMFileUpload,
    getCMLineCountWithAmount,
    getCMParentInfo,
    getItemRequested,
    getItemRequestedPerCategory,
    getReturnPackageInfo,
    getReturnRequestForReprinting222Form,
    getReturnRequestItemRequested,
    getReturnToInfo,
    lookForExistingCreditMemoRec,
    updateIRSPrice,
    updateIRSPricelevel,
    updateItemReturnScan,
    updateManufAvailableBins,
  };
});
