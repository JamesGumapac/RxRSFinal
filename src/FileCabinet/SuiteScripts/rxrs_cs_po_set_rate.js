/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(["N/search"], function (search) {
  const priceLevel = [
    { priceName: "Mfg ERV (SysCalc)", column: "price4" },
    { priceName: "Non-Returnable", column: "price7" },
    { priceName: "Non-scannable", column: "price11" },
    { priceName: "Pharma - Credit (ERV SysCalc)", column: "price10" },
    { priceName: "Pharma - Credit (UP SysCalc)", column: "price9" },
    { priceName: "Pharma - Credit (input)", column: "price8" },
    { priceName: "Unit Price (input)", column: "price2" },
    { priceName: "Online Price", column: "price5" },
    {
      priceName: "Wholesale Acquisition Price " + '"WAC"' + " (input)",
      column: "baseprice",
    },
  ];
  const priceLevel2 = [
    { priceName: "BASE PRICE", column: "price1" },
    { priceName: "ERV (DISCOUNTED)", column: "price15" },
    { priceName: "ERV-CONFIGURED", column: "price14" },
    { priceName: "M-CONFIGURED", column: "price8" },
    { priceName: "MANUAL INPUT", column: "price12" },
    { priceName: "Packing Slip Price", column: "price17" },
    { priceName: "U-CONFIGURED", column: "price16" },
    { priceName: "ONLINE PRICE", column: "price5" },
    {
      priceName: "Wholesale Acquisition Price " + '"WAC"' + " (input)",
      column: "baseprice",
    },
  ];

  function fieldChanged(scriptContext) {
    try {
      const curRec = scriptContext.currentRecord;
      const fieldId = scriptContext.fieldId;
      const sublistId = scriptContext.sublistId;

      if (sublistId === "item") {
        if (fieldId === "custcol_rxrs_price_level") {
          let priceLevelName = curRec.getCurrentSublistText({
            sublistId: "item",
            fieldId: "custcol_rxrs_price_level",
          });
          let itemId = curRec.getCurrentSublistValue({
            sublistId: "item",
            fieldId: "item",
          });
          let rate = getItemRate({ priceLevelName, itemId });
          rate &&
            curRec.setCurrentSublistValue({
              sublistId: "item",
              fieldId: "rate",
              value: rate,
            });
        }
      }
    } catch (e) {
      console.error("fieldChanged", e.message);
    }
  }

  /**
   * Get the item rate based on item id and price level name
   * @param {string} options.priceLevelName
   * @param {number} options.itemId
   * @return {number} return rate of the selected price level of the item
   */
  function getItemRate(options) {
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

  return {
    fieldChanged: fieldChanged,
  };
});
