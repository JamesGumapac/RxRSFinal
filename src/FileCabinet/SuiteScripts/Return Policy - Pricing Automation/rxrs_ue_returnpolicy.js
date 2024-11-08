/* eslint-disable no-undef */
/* eslint-disable import/no-amd */
/**
 * Custom Automization Rule - Return Policy
 *
 * agrajo
 *
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([
  "N/record",
  "N/search",
  "N/log",
  "../agSharedLib/rxrs_shared_functions",
  "../Lib/rxrs_lib_bag_label",
  "../Lib/rxrs_verify_staging_lib",
  "../Lib/rxrs_util",
], (record, search, log, sharedFuncUtil, baglib, vslib, util) => {
  const RETURNABLE = 2;
  const NONRETURNABLE = 1;
  // Processing Request List > https://6816904.app.netsuite.com/app/common/custom/custrecordentrylist.nl?rectype=385
  const processingRequestList = {
    nonReturnable: 1,
    returnable: 2,
    inDated: 3,
  };

  // Damage Codes List > https://6816904.app.netsuite.com/app/common/custom/custrecordentrylist.nl?rectype=389
  const damageCodesList = {
    illegibleLot: "1",
    containsPatientLabel: "2",
    packagesMissingDamaged: "3",
  };

  // Prescription/OTC List > https://6816904.app.netsuite.com/app/common/custom/custrecordentrylist.nl?rectype=425
  const prescriptionOtcList = {
    prescription: "1",
    otc: "2",
  };

  // Full Partial List List  > https://6816904.app.netsuite.com/app/common/custom/custrecordentrylist.nl?rectype=384
  const fullPartialList = {
    fullPkg: "1",
    partialPkg: "2",
  };

  // Non-Returnable Reason List > https://6816904.app.netsuite.com/app/common/custom/custrecordentrylist.nl?rectype=406
  const nonReturnableReasonList = {
    mfgNotAllowReturn: "1",
    mfgNotAllowPartialReturn: "2",
    itemDrugNotAcceptable: "3",
    pharmaIsPrepaidOrDestruction: "4",
    itemIsOutdated: "5",
    itemIsBeyondHandicappedPeriod: "6",
  };

  const stateRuleIncludedFromPartial = ["MS", "GA", "NC"];
  const planSelectTypePharmaQuickCash = "4";

  const validateSystemDateProcess = (
    expirationDate,
    pharmaValue,
    mfgValue,
    nonRetValue,
  ) => {
    const logTitle = "validateSystemDateProcess";
    const returnObj = {
      finalPharmaValue: pharmaValue,
      finalMfgValue: mfgValue,
      finalNonRetValue: nonRetValue,
      inDateCb: false,
      overrideExpirationDate: false,
      dates: {},
    };
    const inDays = 3;
    const outDays = 6;
    const handicapDays = 10;
    // const expirationDate = new Date("05/01/2023");

    // Compute returnableStartDate by subtracting 3 months
    const returnableStartDate = new Date(expirationDate);
    returnableStartDate.setMonth(expirationDate.getMonth() - inDays);

    // Compute returnableEndDate correctly
    const returnableEndDate = new Date(expirationDate);
    returnableEndDate.setMonth(returnableEndDate.getMonth() + outDays);
    returnableEndDate.setDate(returnableEndDate.getDate() - handicapDays);

    // Compute handicapStartDate
    const handicapStartDate = new Date(returnableEndDate);
    handicapStartDate.setDate(returnableEndDate.getDate() - handicapDays);

    // Compute handicapEndDate
    const handicapEndDate = new Date(expirationDate);
    handicapEndDate.setMonth(expirationDate.getMonth() + outDays);

    /* Compute systemDate (current date) - Format current date to display
                                                                                                                                                   only date, month, and year */
    const systemDate = new Date();

    // Display the computed dates (optional)

    log.debug({
      title: "Returnable Start Date:",
      details: JSON.stringify(returnableStartDate),
    });
    log.debug({
      title: "Returnable End Date:",
      details: JSON.stringify(returnableEndDate),
    });
    log.debug({
      title: "Handicap Start Date:",
      details: JSON.stringify(handicapStartDate),
    });
    log.debug({
      title: "Handicap End Date:",
      details: JSON.stringify(handicapEndDate),
    });
    log.debug({
      title: "System Date:",
      details: JSON.stringify(systemDate),
    });

    returnObj.dates = {
      returnableStartDate,
      returnableEndDate,
      handicapStartDate,
      handicapEndDate,
    };

    // Actual Comparison Logic

    // System Date within Returnable Period?
    if (systemDate >= returnableStartDate && systemDate <= returnableEndDate) {
      log.debug({
        title: logTitle,
        details: "System Date within Returnable Period",
      });
      returnObj.finalMfgValue = processingRequestList.returnable;
      // System Date within Handicap Days?
      if (systemDate >= handicapStartDate && systemDate <= handicapEndDate) {
        returnObj.finalNonRetValue =
          nonReturnableReasonList.itemIsBeyondHandicappedPeriod;
        returnObj.finalPharmaValue = processingRequestList.nonReturnable;
      } else {
        returnObj.finalPharmaValue = processingRequestList.returnable;
      }
      // System Date Before Start of Returnable Period? or After End Of Returnable Period?
    } else if (systemDate < returnableStartDate) {
      log.debug({
        title: logTitle,
        details: "Before Start of Returnable Period",
      });
      returnObj.finalPharmaValue = processingRequestList.returnable;
      returnObj.finalMfgValue = processingRequestList.returnable;
      returnObj.inDateCb = true;
      returnObj.overrideExpirationDate = true;
      // After End of Returnable Period
    } else {
      log.debug({
        title: logTitle,
        details: "After End Of Returnable Period",
      });
      returnObj.finalNonRetValue = nonReturnableReasonList.itemIsOutdated;
      returnObj.finalPharmaValue = processingRequestList.nonReturnable;
      returnObj.finalMfgValue = processingRequestList.nonReturnable;
    }

    log.debug({
      title: logTitle,
      details: returnObj,
    });

    return returnObj;
  };

  const getState = (entityRecord) => {
    let state = "";
    const addressSublist = entityRecord.getSublist({
      sublistId: "addressbook",
    });

    log.debug({
      title: "addressSublist verify -  getState",
      details: JSON.stringify(addressSublist),
    });

    // Check if the customer has at least one address
    const addressCount = entityRecord.getLineCount({
      sublistId: "addressbook",
    });
    if (addressCount > 0) {
      // Get the state value

      entityRecord.selectLine({
        sublistId: "addressbook",
        line: 0,
      });
      // Set an option field on the sublist line
      state = entityRecord.getCurrentSublistValue({
        sublistId: "addressbook",
        fieldId: "state",
      });

      log.debug({
        title: "State",
        details: state,
      });

      // You can use the 'state' variable as needed in your script
    } else {
      log.debug({
        title: "No Addresses Found",
        details: "The customer does not have any addresses.",
      });
    }

    return state;
  };

  const beforeSubmit = (scriptContext) => {
    const logTitle = "ReturnPolicy-Automation";
    const currentRecord = scriptContext.newRecord;

    let finalPharmaProcessingValue = "";
    let finalMfgProcessingValue = "";
    let finalNonReturnableValue = "";
    let scanInDate = false;
    let overrideExpDate = false;
    let datesObj = {};
    let verifyEntityNotQuickCash = false;

    const itemId = currentRecord.getValue({
      fieldId: "custrecord_cs_return_req_scan_item",
    });
    const entityId = currentRecord.getValue({
      fieldId: "custrecord_scanentity",
    });
    const returnPolicyValue = currentRecord.getValue({
      fieldId: "custrecord_cs_return_policy",
    });
    const damagedItemBool = currentRecord.getValue({
      fieldId: "custrecord_cs_damageditem",
    });
    const damageType = currentRecord.getValue({
      fieldId: "custrecord_cs_damagecode",
    });
    const fullPartialListValue = currentRecord.getValue({
      fieldId: "custrecord_cs_full_partial_package",
    });
    const quantity = currentRecord.getValue({
      fieldId: "custrecord_cs_qty",
    });
    const packageSize = currentRecord.getValue({
      fieldId: "custrecord_cs_package_size",
    });
    const expirationDate = currentRecord.getValue({
      fieldId: "custrecord_cs_expiration_date",
    });
    const overridePhrm = currentRecord.getValue({
      fieldId: "custrecord_cs_cb_orverride_phrm",
    });
    const overrideNonRetReason = currentRecord.getValue({
      fieldId: "custrecord_cs_cb_or_non_ret_reason",
    });
    const currentPhrmValue = currentRecord.getValue({
      fieldId: "custrecord_cs__rqstprocesing",
    });
    const entityType = currentRecord.getValue({
      fieldId: "custrecord_rxrs_entity_type",
    });

    try {
      log.debug({
        title: `Before Return Policy Checking ${returnPolicyValue}`,
        details: sharedFuncUtil.isNotEmpty(returnPolicyValue),
      });

      // Set Return Policy
      if (sharedFuncUtil.isNotEmpty(returnPolicyValue)) {
        const loadReturnPolicy = record.load({
          type: "customrecord_kod_returnpolicy_cr",
          id: returnPolicyValue,
        });
        const notAllowReturnBool = loadReturnPolicy.getValue({
          fieldId: "custrecord_kd_notallowsrtrn",
        });
        const allowsPartialBool = loadReturnPolicy.getValue({
          fieldId: "custrecord_kd_partialallowed",
        });
        // MFG Allow Returns
        if (sharedFuncUtil.isFalse(notAllowReturnBool)) {
          log.debug({
            title: "Verify Entity ID",
            details: entityId,
          });

          let loadRecType;
          if (entityType === "Vendor") {
            loadRecType = search.Type.VENDOR;
          } else {
            loadRecType = search.Type.CUSTOMER;
          }
          log.debug({
            title: logTitle,
            details: entityType,
          });

          const loadEntityRec = record.load({
            type: loadRecType,
            id: entityId,
            isDynamic: true,
          });
          const planSelectionType = loadEntityRec.getValue({
            fieldId: "custentity_planselectiontype",
          });

          // Check Address Exists
          const entityState = getState(loadEntityRec);

          const loadItemRecord = search.lookupFields({
            type: search.Type.ITEM,
            id: itemId,
            columns: [
              "custitem_kod_returnable",
              "custitem_kd_prescription_otc",
            ],
          });

          log.debug({
            title: logTitle,
            details: `Verify for Quick Cash EID ${planSelectionType} - \n default ${planSelectTypePharmaQuickCash}`,
          });

          // Check Entity Plan Selection Type - defaults to prepaid or destruction
          if (planSelectionType !== planSelectTypePharmaQuickCash) {
            log.debug({
              title: logTitle,
              details: "Plan Selection Type for Entity is not Quick Cash",
            });
            finalNonReturnableValue =
              nonReturnableReasonList.pharmaIsPrepaidOrDestruction;
            finalPharmaProcessingValue = processingRequestList.nonReturnable;
            verifyEntityNotQuickCash = true;
          }

          // Check Item Returnable
          if (sharedFuncUtil.isTrue(loadItemRecord.custitem_kod_returnable)) {
            // Check if Damaged Item
            if (sharedFuncUtil.isTrue(damagedItemBool)) {
              if (damageType === damageCodesList.illegibleLot) {
                log.debug({
                  title: logTitle,
                  details: "Damage Type is Illegible Lot",
                });
                finalPharmaProcessingValue =
                  processingRequestList.nonReturnable;
                finalMfgProcessingValue = processingRequestList.returnable;

                // (damageType === damageCodesList.containsPatientLabel)
              } else {
                log.debug({
                  title: logTitle,
                  details: "Damage Type Contains Patient Label",
                });
                finalPharmaProcessingValue =
                  processingRequestList.nonReturnable;
                finalMfgProcessingValue = processingRequestList.nonReturnable;
              }
            } else {
              const isOtcAllowed = loadReturnPolicy.getValue({
                fieldId: "custrecord_kod_otcallowed",
              });
              const isStateIncluded =
                stateRuleIncludedFromPartial.includes(entityState);
              log.debug({
                title: logTitle,
                details: {
                  title: "Per Logic Validation",
                  logic1Name: `${loadItemRecord.custitem_kd_prescription_otc[0].value}
                    === ${prescriptionOtcList.otc}
                    && sharedFuncUtil.isFalse(${isOtcAllowed})`,
                  logic1:
                    loadItemRecord.custitem_kd_prescription_otc ===
                      prescriptionOtcList.otc &&
                    sharedFuncUtil.isFalse(isOtcAllowed),
                  logic2Name: `${fullPartialListValue} === ${fullPartialList.fullPkg}
                    && ${allowsPartialBool} === true`,
                  logic2:
                    fullPartialListValue === fullPartialList.fullPkg &&
                    sharedFuncUtil.isTrue(allowsPartialBool),
                  logic3Name: `(${fullPartialListValue} === ${fullPartialList.partialPkg}
                      && ${allowsPartialBool} === true) && !(quantity >= packageSize)`,
                  logic3:
                    fullPartialListValue === fullPartialList.partialPkg &&
                    allowsPartialBool === true &&
                    !(quantity >= packageSize),
                  logic4Name: `(fullPartialListValue === fullPartialList.partialPkg
                      && allowsPartialBool === false)
                      && (!isStateIncluded || !(quantity >= packageSize))`,
                  logic4:
                    fullPartialListValue === fullPartialList.partialPkg &&
                    allowsPartialBool === false &&
                    (!isStateIncluded || !(quantity >= packageSize)),
                },
              });
              // Proceed on checking Product = OTC / or Prescription
              if (
                loadItemRecord.custitem_kd_prescription_otc[0].value ===
                  prescriptionOtcList.otc &&
                sharedFuncUtil.isFalse(isOtcAllowed)
              ) {
                log.debug({
                  title: logTitle,
                  details: "Prescription is OTC and OTC is Not Allowed",
                });
                finalPharmaProcessingValue =
                  processingRequestList.nonReturnable;
                finalMfgProcessingValue = processingRequestList.nonReturnable;
                // Item is Full or Partial
              } else if (
                fullPartialListValue === fullPartialList.fullPkg &&
                sharedFuncUtil.isTrue(allowsPartialBool)
              ) {
                // Set Mfg Processing = Non-Returnable
                log.debug({
                  title: logTitle,
                  details: "Package is Full and Allow Partial is True",
                });
                finalPharmaProcessingValue =
                  processingRequestList.nonReturnable;
                finalMfgProcessingValue = processingRequestList.nonReturnable;
                finalNonReturnableValue =
                  nonReturnableReasonList.mfgNotAllowPartialReturn;
              } else if (
                fullPartialListValue === fullPartialList.partialPkg &&
                sharedFuncUtil.isTrue(allowsPartialBool) &&
                !(quantity >= packageSize)
              ) {
                log.debug({
                  title: logTitle,
                  details: `Package is Partial and Allow Partial is True and 
                    Quantity is not greater or equal then Package Size`,
                });
                finalPharmaProcessingValue =
                  processingRequestList.nonReturnable;
                finalMfgProcessingValue = processingRequestList.nonReturnable;
              } else if (
                fullPartialListValue === fullPartialList.partialPkg &&
                sharedFuncUtil.isFalse(allowsPartialBool) &&
                (!isStateIncluded || !(quantity >= packageSize))
              ) {
                // Customer State = MS or GA, or NC
                // Mississippi MS
                // GA - Georgia
                // NC - North Carolina

                log.debug({
                  title: logTitle,
                  details: `Package is Partial and Allow Partial is False and 
                    Quantity is not greater or equal then Package Size or Not Included in
                    the state selection.`,
                });
                finalPharmaProcessingValue =
                  processingRequestList.nonReturnable;
                finalMfgProcessingValue = processingRequestList.nonReturnable;
              } else {
                log.debug({
                  title: logTitle,
                  details: "Reached all is returnable",
                });

                finalPharmaProcessingValue = processingRequestList.returnable;
                finalMfgProcessingValue = processingRequestList.returnable;

                // System Date within Returnable Period Logic
                const getReturnObj = validateSystemDateProcess(
                  expirationDate,
                  finalPharmaProcessingValue,
                  finalMfgProcessingValue,
                  finalNonReturnableValue,
                );

                finalPharmaProcessingValue = getReturnObj.finalPharmaValue;
                finalMfgProcessingValue = getReturnObj.finalMfgValue;
                finalNonReturnableValue = getReturnObj.finalNonRetValue;
                scanInDate = getReturnObj.inDateCb;
                overrideExpDate = getReturnObj.overrideExpirationDate;
                datesObj = getReturnObj.dates;
              }
            }
          } else {
            finalNonReturnableValue =
              nonReturnableReasonList.itemDrugNotAcceptable;
            log.debug({
              title: logTitle,
              details: "Item is NOT Returnable",
            });

            finalPharmaProcessingValue = processingRequestList.nonReturnable;
            finalMfgProcessingValue = processingRequestList.nonReturnable;
          }
        } else {
          log.debug({
            title: logTitle,
            details: "Return Policy does not allow Return",
          });

          finalNonReturnableValue = nonReturnableReasonList.mfgNotAllowReturn;
          finalPharmaProcessingValue = processingRequestList.nonReturnable;
          finalMfgProcessingValue = processingRequestList.nonReturnable;
        }
      } else {
        log.debug({
          title: logTitle,
          details: "There is no return Policy",
        });

        finalPharmaProcessingValue = processingRequestList.nonReturnable;
        finalMfgProcessingValue = processingRequestList.nonReturnable;
      }

      // Check if Entity is Quick Cash
      if (sharedFuncUtil.isTrue(verifyEntityNotQuickCash)) {
        finalPharmaProcessingValue = processingRequestList.nonReturnable;
      }

      // Override via Checkbox
      if (sharedFuncUtil.isTrue(overridePhrm)) {
        finalPharmaProcessingValue = currentPhrmValue;
      }

      // Set Field Values
      currentRecord.setValue({
        fieldId: "custrecord_cs__rqstprocesing",
        value: finalPharmaProcessingValue,
      });
      const previousMfgProcessing = currentRecord.getValue(
        "custrecord_cs__mfgprocessing",
      );
      currentRecord.setValue({
        fieldId: "custrecord_cs__mfgprocessing",
        value: finalMfgProcessingValue,
      });
      const currentBagAssignment = currentRecord.getValue(
        "custrecord_scanbagtaglabel",
      );
      log.audit("mfgProcessing", {
        previousMfgProcessing,
        finalMfgProcessingValue,
      });
      if (previousMfgProcessing != finalMfgProcessingValue) {
        try {
          let params = {
            mfgProcessing: finalMfgProcessingValue, //currentRecord.getValue("custrecord_cs__mfgprocessing"),
            rrId: currentRecord.getValue("custrecord_cs_ret_req_scan_rrid"),
          };
          let bagParams = {
            mrrId: currentRecord.getValue(
              "custrecord_irs_master_return_request",
            ),
            rrId: currentRecord.getValue("custrecord_cs_ret_req_scan_rrid"),
            entity: currentRecord.getValue("custrecord_scanentity"),

            mfgProcessing: currentRecord.getValue(
              "custrecord_cs__mfgprocessing",
            ),
          };
          if (finalMfgProcessingValue != NONRETURNABLE) {
            params.manufId = currentRecord.getValue(
              "custrecord_scanmanufacturer",
            );
            (bagParams.manufId = currentRecord.getValue(
              "custrecord_scanmanufacturer",
            )),
              (params.maximumAmount = vslib.getManufMaxSoAmount(
                currentRecord.getValue("custrecord_scanmanufacturer"),
              ));
            params.lowestIRSAmount = currentRecord.getValue(
              "custrecord_irc_total_amount",
            );
          }
          let bagLabel = baglib.getBaglabelAvailable(params);

          log.audit("bagLabel", bagLabel);
          if (!bagLabel) {
            log.emergency("bag label is null");
            bagLabel = baglib.createBin(bagParams);
            log.audit("Bag label", !isEmpty(bagLabel));
            if (!isEmpty(bagLabel)) {
              baglib.updateBagLabel({
                prevBag: currentBagAssignment,
                ids: currentRecord.id,
                bagId: bagLabel,
              });
            }
          } else {
            baglib.updateBagLabel({
              prevBag: currentBagAssignment,
              ids: currentRecord.id,
              bagId: bagLabel,
            });
          }

          util.sendEmailMFGProcessingIsUpdated({
            newRec: currentRecord,
            oldBag: currentBagAssignment,
            newBag: bagLabel,
            oldBin: currentRecord.getText("custrecord_previous_bin"),
            newBin: currentRecord.getText("custrecord_itemscanbin"),
          });
        } catch (e) {
          log.error("Assigning new bag", e.message);
        }
      }
      if (sharedFuncUtil.isFalse(overrideNonRetReason)) {
        currentRecord.setValue({
          fieldId: "custrecord_scannonreturnreason",
          value: finalNonReturnableValue,
        });
      }
      currentRecord.setValue({
        fieldId: "custrecord_scanindated",
        value: scanInDate,
      });

      if (sharedFuncUtil.isTrue(overrideExpDate)) {
        currentRecord.setValue({
          fieldId: "custrecord_cs_expiration_date",
          value: datesObj.returnableStartDate,
        });
      }

      // Set Date Fields

      if (sharedFuncUtil.isTrue(scanInDate)) {
        currentRecord.setValue({
          fieldId: "custrecord_cs_expiration_date",
          value: datesObj.returnableStartDate,
        });
      }

      log.debug({
        title: "scanInDate and datesObj",
        details: `${scanInDate} --- ${datesObj}`,
      });

      if (sharedFuncUtil.isNotEmpty(datesObj)) {
        currentRecord.setValue({
          fieldId: "custrecord_ret_start_date",
          value: datesObj.returnableStartDate,
        });
        currentRecord.setValue({
          fieldId: "custrecord_ret_end_date",
          value: datesObj.returnableEndDate,
        });
        currentRecord.setValue({
          fieldId: "custrecord_hand_start_date",
          value: datesObj.handicapStartDate,
        });
        currentRecord.setValue({
          fieldId: "custrecord_hand_end_date",
          value: datesObj.handicapEndDate,
        });
      }
    } catch (e) {
      log.error({ title: "ue after submit", details: e });
    }
  };

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

  return { beforeSubmit };
});
