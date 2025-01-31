/* eslint-disable no-undef */
/* eslint-disable import/no-amd */
/**
 * Description:
 * Auto Set ERV Formulation
 * U-CONFIGURED : RXR = W-UNIT PRICE x (1 - Margin Rate) (Pricing Policy)
 * U-CONFIGURED : MKRX  = W-UNIT PRICE x (1 - Margin Rate) (Pricing Policy)
 * U-CONFIGURED : EMES = W-UNIT PRICE x (1 - Margin Rate) (Pricing Policy)
 * ERV-CONFIGURED = Mfg ERV x (1- Margin Rate) (Pricing Policy)
 *
 * W-UNIT PRICE = Wholesaler Unit Price
 * RXR UNIT PRICE
 * MKRX UNIT PRICE
 * EMES UNIT PRICE
 * @author agrajo
 * @copyright 2023
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(["N/record", "N/search", "../agSharedLib/rxrs_shared_functions"], (
  record,
  search,
  sharedFuncUtil,
) => {
  //   [
  //     {
  //        priceLevel: "1",
  //        price: 0
  //     },
  //     {
  //        priceLevel: "15",
  //        price: ""
  //     },
  //     {
  //        priceLevel: "14",
  //        price: 1.1
  //     },
  //     {
  //        priceLevel: "8",
  //        price: 300
  //     },
  //     {
  //        priceLevel: "12",
  //        price: 120
  //     },
  //     {
  //        priceLevel: "4",
  //        price: 2.2
  //     },
  //     {
  //        priceLevel: "2",
  //        price: ""
  //     },
  //     {
  //        priceLevel: "9",
  //        price: ""
  //     },
  //     {
  //        priceLevel: "18",
  //        price: 0.9
  //     },
  //     {
  //        priceLevel: "7",
  //        price: 1
  //     },
  //     {
  //        priceLevel: "16",
  //        price: 0.75
  //     },
  //     {
  //        priceLevel: "10",
  //        price: ""
  //     },
  //     {
  //        priceLevel: "17",
  //        price: 2.5
  //     },
  //     {
  //        priceLevel: "5",
  //        price: ""
  //     }
  //  ]

  /**
   * Function to retrieve price levels and amounts for a given item
   * @param {number} itemId - Internal ID of the item
   * @returns {Array} - Array of price levels and their amounts
   */
  const getItemPriceLevels = (itemId) => {
    try {
      // Load the item record
      const itemRecord = record.load({
        type: record.Type.LOT_NUMBERED_INVENTORY_ITEM, // Adjust type as needed
        id: itemId,
        isDynamic: true,
      });

      // Prepare the array to store price levels
      const priceLevels = [];
      const priceSublistId = "price1"; // Sublist ID for pricing
      const lineCount = itemRecord.getLineCount({ sublistId: priceSublistId });

      // Loop through each line in the price sublist
      for (let i = 0; i < lineCount; i++) {
        const priceLevel = itemRecord.getSublistValue({
          sublistId: priceSublistId,
          fieldId: "pricelevel", // Internal ID for price level
          line: i,
        });
        const price = itemRecord.getSublistValue({
          sublistId: priceSublistId,
          fieldId: "price_1_", // Standard field ID for price amount
          line: i,
        });

        // Store the price level and price in the array
        priceLevels.push({
          priceLevel: priceLevel,
          price: price,
        });
      }

      return priceLevels; // Return the array
    } catch (e) {
      log.error({
        title: "Error Fetching Price Levels",
        details: e.message,
      });
      return [];
    }
  };

  // 1.4.2 Calculate Price Levels on Item Record Update
  const priceLevelToCheck = {
    ervConfId: "14",
    uConfId: "9",
    mConfId: "8",
    mfgErvId: "4",
  };
  const planSelectType = {
    quickCash: "4",
    topCo: "10",
  };

  const beforeSubmit = (scriptContext) => {
    try {
      const { newRecord } = scriptContext;
      const itemId = newRecord.getValue({
        fieldId: "custrecord_cs_return_req_scan_item",
      });
      const overrideRateBool = newRecord.getValue({
        fieldId: "custrecord_isc_overriderate",
      });

      if (overrideRateBool) {
        return;
      }
      const currType = newRecord.type;
      const priceLevels = getItemPriceLevels(itemId);
      const ervConfAmt = priceLevels.find(
        (level) => level.priceLevel === priceLevelToCheck.ervConfId,
      ).price;
      const uConfAmt = priceLevels.find(
        (level) => level.priceLevel === priceLevelToCheck.uConfId,
      ).price;
      const mConfAmt = priceLevels.find(
        (level) => level.priceLevel === priceLevelToCheck.mConfId,
      ).price;
      const mfgErvAmt = priceLevels.find(
        (level) => level.priceLevel === priceLevelToCheck.mfgErvId,
      ).price;

      log.debug({
        title: "priceLevels",
        details: priceLevels,
      });
      log.debug({
        title: "checkamts",
        details: { ervConfAmt, uConfAmt, mConfAmt, mfgErvAmt },
      });
      const planSelectTypeId = newRecord.getValue({
        fieldId: "custrecord_irs_plan_selection_type",
      });
      let finalPriceLevelToSet = priceLevelToCheck.mfgErvId;
      let finalAmtToSet = mfgErvAmt;

      if (planSelectTypeId === planSelectType.quickCash) {
        if (mConfAmt) {
          finalPriceLevelToSet = priceLevelToCheck.mConfId;
          finalAmtToSet = mConfAmt;
        } else if (uConfAmt) {
          finalPriceLevelToSet = priceLevelToCheck.uConfId;
          finalAmtToSet = uConfAmt;
        } else {
          finalPriceLevelToSet = priceLevelToCheck.ervConfId;
          finalAmtToSet = ervConfAmt;
        }
      } else if (planSelectTypeId === planSelectType.topCo) {
        if (uConfAmt) {
          finalPriceLevelToSet = priceLevelToCheck.uConfId;
          finalAmtToSet = uConfAmt;
        }
      }
      const itemScanQty = newRecord.getValue({
        fieldId: "custrecord_cs_qty",
      });
      finalAmtToSet = finalAmtToSet * itemScanQty;
      // UPDATE PRICE LEVEL
      newRecord.setValue({
        fieldId: "custrecord_scanpricelevel",
        value: finalPriceLevelToSet,
      });
      // newRecord.setValue({
      //   fieldId: "custrecord_scanrate",
      //   value: finalAmtToSet,
      // });
    } catch (e) {
      log.error("beforeSubmit", e.message);
    }
  };

  return { beforeSubmit };
});
