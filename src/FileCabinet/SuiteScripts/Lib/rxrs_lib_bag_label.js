/**
 * @NApiVersion 2.1
 */
define(["N/record", "N/search", "./rxrs_verify_staging_lib"], /**
 * @param{record} record
 * @param{search} search
 */ (record, search, vs_lib) => {
  const RETURNABLE = 2;
  const NONRETURNABLE = 1;

  /**
   * Create Bin Record
   * @param {number}  options.mrrId Master Return Id
   * @param {number} options.entity entity Internal Id
   * @param {number} options.manufId Manufacturer internal Id
   * @param {number} options.rrId return Request Id
   * @param {number} options.prevBag Previous Bag of the return item scan
   * @param {number} options.mfgProcessing Manuf Processing
   * @return {number} binId
   */
  function createBin(options) {
    log.audit("Create Bin", options);
    try {
      let { mfgProcessing, mrrId, manufId, rrId, entity, prevBag } = options;
      log.audit("createBin", options);
      log.audit("values", { mrrId, manufId, rrId });
      const binRec = record.create({
        type: "customrecord_kd_taglabel",
      });
      binRec.setValue({
        fieldId: "custrecord_kd_mrr_link",
        value: options.mrrId,
      });
      binRec.setValue({
        fieldId: "custrecord_kd_mfgname",
        value: options.manufId,
      });
      binRec.setValue({
        fieldId: "custrecord_kd_tag_return_request",
        value: options.rrId,
      });
      binRec.setValue({
        fieldId: "custrecord_kd_tag_return_request",
        value: options.rrId,
      });
      mfgProcessing &&
        binRec.setValue({
          fieldId: "custrecord_tag_label_processing",
          value: options.mfgProcessing,
        });

      binRec.setValue({
        fieldId: "custrecord_tagentity",
        value: options.entity,
      });

      return binRec.save({
        ignoreMandatoryFields: true,
      });
    } catch (e) {
      log.error("createBin", e.message);
    }
  }

  /**
   * Update the status of the item return scan
   * @param {number} options.ids Internal Id of the return item scan
   * @param {boolean} options.isVerify
   * @param {number} options.bagId
   * @param {number} options.prevBag
   * @param {number} options.binNumber
   * @param
   * @return {number} item return scan Id
   */
  function updateBagLabel(options) {
    try {
      let { bagId, prevBag, ids, isVerify, binNumber } = options;
      log.audit("updateBagLabel", options);

      const bagRec = record.load({
        type: "customrecord_cs_item_ret_scan",
        id: options.ids,
      });
      bagId &&
        bagRec.setValue({
          fieldId: "custrecord_scanbagtaglabel",
          value: bagId,
        });
      prevBag &&
        bagRec.setValue({
          fieldId: "custrecord_prev_bag_assignement",
          value: prevBag,
        });
      binNumber &&
        bagRec.setValue({
          fieldId: "custrecord_itemscanbin",
          value: binNumber,
        });
      isVerify &&
        bagRec.setValue({
          fieldId: "custrecord_is_verified",
          value: isVerify,
        });
      const manufId = bagRec.getValue("custrecord_kd_mfgname");
      log.debug("manufId", manufId);
      const currentAmount = bagRec.getValue("custrecord_bag_amount");
      if (manufId) {
        const maxValue = vs_lib.getManufMaxSoAmount(manufId);
        bagRec.setValue({
          fieldId: "custrecord_manuf_max_so_amount",
          value: maxValue,
        });
        bagRec.setValue({
          fieldId: "custrecord_remaining_amount",
          value: maxValue - currentAmount,
        });
      }
      let updatedId = bagRec.save({
        ignoreMandatoryFields: true,
      });
      log.audit("updated id ", updatedId);
      return updatedId;
    } catch (e) {
      log.error("updateBagLabel", e.message);
    }
  }

  /**
   * Get the bag current amount
   * @param options.bagId - Internal Id of the bag
   * @return the sum of the amount
   */
  function getBagCurrentAmount(options) {
    log.audit("getBagCurrentAmount", options);
    let { bagId } = options;
    try {
      let amount = 0;
      const customrecord_cs_item_ret_scanSearchObj = search.create({
        type: "customrecord_cs_item_ret_scan",
        filters: [["custrecord_scanbagtaglabel", "anyof", bagId]],
        columns: [
          search.createColumn({
            name: "custrecord_irc_total_amount",
            summary: "SUM",
            label: "Amount ",
          }),
        ],
      });

      customrecord_cs_item_ret_scanSearchObj.run().each(function (result) {
        amount = result.getValue({
          name: "custrecord_irc_total_amount",
          summary: "SUM",
        });
      });
      return amount;
    } catch (e) {
      log.error("getBagCurrentAmount", e.message);
    }
  }

  /**
   * Get the available bag for a manufacturer that does not reach the maximum amount limit per bag
   * @param options.manufId - Manufacturer Internal Id
   * @param options.maximumAmount - Maximum Amount of the manufacturer return procedure
   * @param options.lowestIRSAmount - Lowest Item Return Scan Amount
   * @param options.mfgProcessing - New MFG Processing
   * @param options.rrId - return request Id
   * @returns {null}
   */
  function getBaglabelAvailable(options) {
    log.audit("getBaglabelAvailable", options);
    let { manufId, maximumAmount, lowestIRSAmount, mfgProcessing, rrId } =
      options;

    try {
      let isMaxAmountNull = maximumAmount == 0 || maximumAmount == null;
      let availableBagId = null;

      const customrecord_kd_taglabelSearchObj = search.create({
        type: "customrecord_kd_taglabel",
        filters: [
          ["custrecord_kd_tag_return_request", "anyof", rrId],
          "AND",
          ["custrecord_tag_label_processing", "anyof", mfgProcessing],
          "AND",
          ["custrecord_is_inactive", "is", "F"],
        ],
        columns: [
          search.createColumn({
            name: "custrecord_is_inactive",
            label: "INACTIVE",
          }),
        ],
      });
      if (manufId) {
        customrecord_kd_taglabelSearchObj.filters.push(
          search.createFilter({
            name: "custrecord_kd_mfgname",
            operator: "anyof",
            values: manufId,
          }),
        );
      }

      const searchResultCount =
        customrecord_kd_taglabelSearchObj.runPaged().count;
      log.audit("searchResultCount", { searchResultCount, isMaxAmountNull });
      //if (searchResultCount == 0) return null;

      customrecord_kd_taglabelSearchObj.run().each(function (result) {
        const bagId = result.id;
        if (mfgProcessing == RETURNABLE && isMaxAmountNull == false) {
          const bagCurrentAmount = getBagCurrentAmount({ bagId: bagId });
          log.debug("getBaglabelAvailable result", { bagId, bagCurrentAmount });
          let bagAmountDifference = 0;
          bagAmountDifference =
            +maximumAmount - (bagCurrentAmount + lowestIRSAmount);
          if (bagCurrentAmount < maximumAmount) {
            if (bagAmountDifference > 0) {
              availableBagId = bagId;
            }
          }
        } else {
          availableBagId = bagId;
        }
      });
      return availableBagId;
    } catch (e) {
      log.error("getBaglabelAvailable", e.message);
    }
  }

  /**
   * Get the Letter in the middle
   * @param options.startLetter
   * @param options.endLetter
   * @param options.binNumber
   * @returns {*[]}
   */
  function getManufStartLetter(options) {
    const alphabet = "abcdefghijklmnopqrstuvwxyz";
    let { startLetter, endLetter, binNumber } = options;
    try {
      const start = alphabet.indexOf(startLetter.toLowerCase());
      const end = alphabet.indexOf(endLetter.toLowerCase());
      let letterStart = [];
      let index = [];
      for (let i = start; i <= end; i++) {
        index.push(i);
      }
      index.forEach((i) => letterStart.push(alphabet[i]));
      return letterStart;
    } catch (e) {
      log.error("getIndex", e.message);
    }
  }

  function createConditionArray(letters) {
    let conditions = [];
    letters.forEach((letter, index) => {
      conditions.push(["name", "startswith", letter]);
      if (index < letters.length - 1) {
        conditions.push("OR");
      }
    });
    return conditions;
  }

  /**
   * Create search filter for manuf search
   * @param options.letterStart - if the
   * @param options.binNumber - bin number
   * @param options.binField - Bin Field Id
   * @returns {*[]}
   */
  function getManufList(options) {
    let manufList = [];
    log.audit("getManufList", options);
    let { letterStart, binNumber, binField } = options;
    try {
      if (letterStart) {
        letterStart.forEach((letter) => {
          manufList.push(
            getManufacturer({
              letter: letter,
              binNumber: binNumber,
              binField: binField,
            }),
          );
        });
      }
      return manufList.flat(1);
    } catch (e) {
      log.error("getManufList", e.message);
    }
  }

  /**
   * Get the manufacturer Id based on the search filter
   * @param options.letter
   * @param options.binNumber
   * @param options.binField
   * @param options.name
   *
   */
  function getManufacturer(options) {
    log.audit("getManufacturer", options);
    let { letter, binNumber, binField, name, useSpecifBin } = options;
    let manufIds = [];
    try {
      const customrecord_csegmanufacturerSearchObj = search.create({
        type: "customrecord_csegmanufacturer",
        columns: [search.createColumn({ name: "name", label: "Name" })],
      });
      customrecord_csegmanufacturerSearchObj.filters.push(
        search.createFilter({
          name: "custrecord_use_specific_bin",
          operator: "is",
          values: "F",
        }),
      );
      if (letter) {
        customrecord_csegmanufacturerSearchObj.filters.push(
          search.createFilter({
            name: "name",
            operator: "startswith",
            values: letter,
          }),
        );
      }
      if (binField) {
        customrecord_csegmanufacturerSearchObj.filters.push(
          search.createFilter({
            name: binField,
            operator: "noneof",
            values: binNumber,
          }),
        );
      }
      if (name) {
        customrecord_csegmanufacturerSearchObj.filters.push(
          search.createFilter({
            name: "name",
            operator: search.Operator.HASKEYWORDS,
            values: name,
          }),
        );
      }

      const searchResultCount =
        customrecord_csegmanufacturerSearchObj.runPaged().count;
      if (+searchResultCount > 4000) {
        let result;
        const pagedData = customrecord_csegmanufacturerSearchObj.runPaged({
          pageSize: 2000,
        });
        let tempIdHolder = [];
        // iterate the pages
        for (let i = 0; i < pagedData.pageRanges.length; i++) {
          // fetch the current page data
          const currentPage = pagedData.fetch(i);

          // and forEach() thru all results
          currentPage.data.forEach(function (result) {
            tempIdHolder.push(result.id);
          });
          manufIds.push(tempIdHolder);
        }
        log.audit("manuf ids", manufIds);
        return manufIds.flat(1);
      } else {
        customrecord_csegmanufacturerSearchObj.run().each(function (result) {
          manufIds.push(result.id);
          return true;
        });
        return manufIds;
      }
    } catch (e) {
      log.error("getManufacturer", e.message);
    }
  }

  /**
   * Get the field to update based on the naming convention of the bin
   * @param binName
   * @returns {string}
   */
  function getFieldToUpdate(binName) {
    try {
      let fieldToUpdate;
      if (binName.includes("IB") == true) {
        fieldToUpdate = "custrecord_inbound_bin";
      } else if (binName.includes("OB") == true) {
        fieldToUpdate = "custrecord_outbound_bin";
      } else if (binName.includes("CON") == true) {
        fieldToUpdate = "custrecord_control_bin";
      }
      return fieldToUpdate;
    } catch (e) {
      log.error("getFieldToUpdate", e.message);
    }
  }

  function getBinFieldId(category) {
    try {
      let fieldToUpdate;
      if (category == 1) {
        fieldToUpdate = "custrecord_inbound_bin";
      } else if (category == 2) {
        fieldToUpdate = "custrecord_outbound_bin";
      } else if (category == 3) {
        fieldToUpdate = "custrecord_control_bin";
      }
      return fieldToUpdate;
    } catch (e) {
      log.error("getFieldToUpdate", e.message);
    }
  }

  function getBinBasedOnLetter(options) {
    let { letter } = options;

    try {
    } catch (e) {
      log.error("getStandardBin", e.message);
    }
  }

  /**
   * Get the general bins
   * @param {object} options
   * @param {boolean} options.returnGroup - Set to True to return bin group based on OUTBOUND, INBOUND, CONTROL
   */
  function getGeneralBin(options) {
    try {
      let { returnGroup } = options;
      let generalBins = [];
      let binGroup = {};
      binGroup.CONTROL = [];
      binGroup.OUTBOUND = [];
      binGroup.INBOUND = [];
      const binSearchObj = search.create({
        type: "bin",
        filters: [["custrecord_is_parent_bin", "is", "F"]],
        columns: [
          search.createColumn({ name: "binnumber", label: "Bin Number" }),
        ],
      });
      binSearchObj.filters.push(
        search.createFilter({
          name: "inactive",
          operator: "is",
          values: "F",
        }),
      );
      binSearchObj.run().each(function (result) {
        const binNumberText = result.getValue({
          name: "binnumber",
        });
        if (binNumberText.split("-").length == 2) {
          generalBins.push({ id: result.id, name: binNumberText });
          if (binNumberText.includes("IB") == true) {
            binGroup.INBOUND.push(result.id);
          } else if (binNumberText.includes("OB") == true) {
            binGroup.OUTBOUND.push(result.id);
          } else if (binNumberText.includes("CON") == true) {
            binGroup.CONTROL.push(result.id);
          }
        }

        return true;
      });
      if (returnGroup == true) {
        return binGroup;
      } else {
        return generalBins;
      }
    } catch (e) {
      log.error("getGeneralBin", e.message);
    }
  }

  /**
   * Get the Manufacturer with Specific bin
   * @param options.fieldId - Bin Field Id
   * @param options.binId - Bin internal id
   * @returns {*[]} return the manufacturer list
   */
  function getManufWithSpeicificBin(options) {
    log.audit("getManufWithSpeicificBin", options);
    let { fieldId, binId } = options;
    try {
      let manufIds = [];
      const customrecord_csegmanufacturerSearchObj = search.create({
        type: "customrecord_csegmanufacturer",
        filters: [[fieldId, "anyof", binId]],
        columns: [
          search.createColumn({ name: "name", label: "Name" }),
          search.createColumn({
            name: "custrecord_control_bin",
            label: "Control Bin",
          }),
        ],
      });

      customrecord_csegmanufacturerSearchObj.run().each(function (result) {
        manufIds.push(result.id);
        return true;
      });
      return manufIds;
    } catch (e) {
      log.error("getManufWithSpeicificBin", e.message);
    }
  }

  /**
   * Remove bin from the specific array.
   * @param options.currentBins  - List of current Bin
   * @param options.binId - Bin Id to Remove
   * @returns {any[]} - new set of bin
   */
  function removeBinFromArray(options) {
    log.audit("removeBinFromArray", options);
    try {
      let { currentBins, binId } = options;
      let arr = [];
      let indexToRemove = currentBins.indexOf(binId.toString());
      if (indexToRemove > -1) {
        arr = currentBins.filter(function (item) {
          return item !== binId;
        });
      }
      log.debug("newBinlist", arr);
      return arr;
    } catch (e) {
      log.error("removeBinFromArray", e.message);
    }
  }

  return {
    createBin,
    updateBagLabel,
    getBagCurrentAmount,
    getBaglabelAvailable,
    getBagCurrentAmount,
    getManufStartLetter,
    getManufList,
    getManufacturer,
    getFieldToUpdate,
    getGeneralBin,
    getManufWithSpeicificBin,
    removeBinFromArray,
    getBinFieldId,
  };
});
