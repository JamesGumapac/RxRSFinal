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
   * @param {number} options.binNumber - Bin Number Selected
   * @return {number} binId
   */
  function createBin(options) {
    log.audit("Create Bin", options);
    try {
      let { mfgProcessing, mrrId, manufId, rrId, entity, prevBag, binNumber } =
        options;
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
      binNumber &&
        binRec.setValue({
          fieldId: "custrecord_kd_putaway_loc",
          value: binNumber,
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
      if (binNumber) {
        let rsLookup = search.lookupFields({
          type: "bin",
          id: binNumber,
          columns: ["custrecord_bincategory"],
        });
        let field;
        let binCategory = rsLookup.custrecord_bincategory[0].value;
        switch (+binCategory) {
          case 1:
            field = "custrecord_irs_inbound_bin";
            break;
          case 2:
            field = "custrecord_irs_outbound_bin";
            break;
          case 3:
            field = "custrecord_irs_control_bin";
            break;
          case 4:
            field = "custrecord_irs_desctruction_bin";
        }
        log.audit(" bin values ", { binCategory, field });
        bagRec.setValue({
          fieldId: field,
          value: binNumber,
        });
        bagRec.setValue({
          fieldId: "custrecord_itemscanbin",
          value: binNumber,
        });
        1;
      }

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

  /**
   * Get the bag only that is put away
   * @param options.manufId - Manufacturer Id
   * @param options.binCategory - Bin Category,
   * @param options.specificBin - identifies if the bin is specific bin
   * @param options.productCategory - Return Request Category
   * @param options.generalBin - Mark if the bin searching is a general bin
   * @param options.forControlItems - - Mark if the bin searching is a general bin
   */
  function getBinPutAwayLocation(options) {
    let binResult = [];
    log.audit("getBinPutAwayLocation", options);
    let {
      manufId,
      specificBin,
      binCategory,
      productCategory,
      generalBin,
      forControlItems,
    } = options;

    try {
      const binSearchObj = search.create({
        type: "bin",
        filters: [["custrecord_bin_putaway_loc", "is", "T"]],
        columns: [
          search.createColumn({ name: "binnumber", label: "Bin Number" }),
          search.createColumn({ name: "location", label: "Location" }),
          search.createColumn({ name: "memo", label: "Memo" }),
        ],
      });
      if (manufId) {
        binSearchObj.filters.push(
          search.createFilter({
            name: "custrecord_kd_bin_manufacturer",
            operator: "anyof",
            values: manufId,
          }),
        );
      }
      if (productCategory) {
        binSearchObj.filters.push(
          search.createFilter({
            name: "custrecord_bin_product_category",
            operator: "anyof",
            values: productCategory,
          }),
        );
      }
      if (binCategory) {
        binSearchObj.filters.push(
          search.createFilter({
            name: "custrecord_bincategory",
            operator: "anyof",
            values: binCategory,
          }),
        );
      }

      if (generalBin == true) {
        binSearchObj.filters.push(
          search.createFilter({
            name: "custrecord_general_bins",
            operator: "is",
            values: true,
          }),
        );
      }
      if (forControlItems) {
        binSearchObj.filters.push(
          search.createFilter({
            name: "custrecord_bin_control_item",
            operator: "is",
            values: true,
          }),
        );
      }
      if (specificBin) {
        binSearchObj.filters.push(
          search.createFilter({
            name: "custrecord_specific_bin",
            operator: "is",
            values: true,
          }),
        );
      }
      binSearchObj.run().each(function (result) {
        binResult.push({
          value: result.id,
          text: result.getValue({ name: "binnumber" }),
        });
        return true;
      });
      return binResult;
    } catch (e) {
      log.error("getBinPutAwayLocation", e.message);
    }
  }

  /**
   * Remove specific bin to the manufacturer
   * @param options.manufId manuf Internal Id
   * @param options.fieldId - Field Id where to remove the bin
   * @param options.binId - Bin Id to remove in the list
   */
  function removeBinToManuf(options) {
    let { manufId, fieldId, binId } = options;
    try {
      const manufRec = record.load({
        type: "customrecord_csegmanufacturer",
        id: manufId,
      });
      let currentBins = manufRec.getValue(fieldId);
      let newBins = removeBinFromArray({
        currentBins: currentBins,
        binId: binId.toString(),
      });
      log.audit("removeBinToManuf", { binId, newBins });
      manufRec.setValue({
        fieldId: fieldId,
        value: newBins,
      });
      manufRec.setValue({
        fieldId: "custrecord_use_specific_bin",
        value: false,
      });

      return manufRec.save({
        ignoreMandatoryFields: true,
      });
    } catch (e) {
      log.error("removeBinToManuf", e.message);
    }
  }

  /**
   * Assign specific bin to the manufacturer
   * @param options.manufId manuf Internal Id
   * @param options.fieldId - Field Id where to remove the bin
   * @param options.binId - Bin Id to remove in the list
   */
  function assignBinToManuf(options) {
    let { manufId, fieldId, binId } = options;
    try {
      const manufRec = record.load({
        type: "customrecord_csegmanufacturer",
        id: manufId,
      });
      let currentBins = manufRec.getValue(fieldId);

      currentBins.push(binId.toString());

      log.audit("assignBinToManuf", { binId, currentBins });
      manufRec.setValue({
        fieldId: fieldId,
        value: currentBins,
      });
      manufRec.setValue({
        fieldId: "custrecord_use_specific_bin",
        value: true,
      });
      return manufRec.save({
        ignoreMandatoryFields: true,
      });
    } catch (e) {
      log.error("assignBinToManuf", e.message);
    }
  }

  /**
   * Unassign specific manuf to the bin
   * @param options.manufId manuf Internal Id
   * @param options.fieldId - Field Id where to remove the bin
   * @param options.binId - Bin Id to remove in the list
   */
  function unAssignManufToBin(options) {
    log.audit("unAssignManufToBin", options);
    let { binId, manufId } = options;
    try {
      const binRec = record.load({
        type: "bin",
        id: binId,
      });
      let useSpecificBin = binRec.getValue("custrecord_specific_bin");
      if (useSpecificBin != true) return;
      let currentManuf = binRec.getValue("custrecord_kd_bin_manufacturer");
      let newManuf = removeBinFromArray({
        currentBins: currentManuf,
        binId: manufId.toString(),
      });

      log.audit("unAssignManufToBin", { manufId, newManuf });
      binRec.setValue({
        fieldId: "custrecord_kd_bin_manufacturer",
        value: newManuf,
      });
      return binRec.save({
        ignoreMandatoryFields: true,
      });
    } catch (e) {
      log.error("unAssignManufToBin", e.message);
    }
  }

  /**
   * Assign specific manuf to the bin
   * @param options.manufId manuf Internal Id
   * @param options.fieldId - Field Id where to remove the bin
   * @param options.binId - Bin Id to remove in the list
   */
  function assignManufToBin(options) {
    log.audit("assignManufToBin", options);
    let { binId, manufId } = options;
    try {
      const binRec = record.load({
        type: "bin",
        id: binId,
      });
      let useSpecificBin = binRec.getValue("custrecord_specific_bin");
      if (useSpecificBin != true) return;
      let currentManuf = binRec.getValue("custrecord_kd_bin_manufacturer");

      currentManuf.push(manufId.toString());
      log.audit("assignManufToBin", { manufId, currentManuf });
      binRec.setValue({
        fieldId: "custrecord_kd_bin_manufacturer",
        value: currentManuf,
      });
      return binRec.save({
        ignoreMandatoryFields: true,
      });
    } catch (e) {
      log.error("assignManufToBin", e.message);
    }
  }

  return {
    assignBinToManuf,
    assignManufToBin,
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
    getBinPutAwayLocation,
    removeBinToManuf,
    unAssignManufToBin,
  };
});
