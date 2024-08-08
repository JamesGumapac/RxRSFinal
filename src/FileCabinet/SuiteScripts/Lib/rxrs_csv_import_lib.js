/**
 * @NApiVersion 2.1
 */
define(["N/file", "N/record", "N/search"] /**
 * @param{file} file
 * @param{record} record
 * @param{search} search
 */, (file, record, search) => {
  /**
   * This function maps the column line for pricing and iterate each line and return the line object
   * @param {*} fileObj - CSV file Object
   * @return the object for Processing
   */
  function getPricing(fileObj) {
    log.audit("Get Pricing", fileObj);
    try {
      const pricingToProcess = [];

      const iterator = fileObj.lines.iterator();
      log.debug("iterator", iterator);
      iterator.each(function (line) {
        const initialLineValue = line.value.replace(/;/g, "");
        const lineValues = initialLineValue.split("|");
        const updateCode = lineValues[0];
        const NDC = lineValues[1];
        const priceType = lineValues[2];
        const date = lineValues[3];
        const price = lineValues[4];

        pricingToProcess.push({
          updateCode: updateCode,
          NDC: NDC,
          priceType: priceType,
          date: date,
          price: price,
        });
        return true;
      });
      pricingToProcess.shift();
      //return object and remove the first element

      return pricingToProcess;
    } catch (e) {
      log.error("getPricing ", e.message);
    }
  }

  /**
   * This function maps the column line for item details and iterate each line and return the line object
   * @param {*} fileObj - CSV file Object
   * @return the object for Processing
   */
  function getItemDetails(fileObj) {
    log.audit("Get Item Details", fileObj);
    try {
      const itemToProcess = [];

      let iterator = fileObj.split("\n");
      iterator.shift();
      log.debug("iterator", iterator);
      for (let i = 0; i < 10; i++) {
        //for testing
        let val = iterator[i].split("|");
        itemToProcess.push({
          updateCode: val[0],
          description: val[69],
          packageSize: val[5],
          type: val[20],
          control: val[19],
          PNDC: val[10],
          REPNDC: val[11],
          NDCFI: val[12],
          DEA: val[19],
          OBSDTEC: val[28],
          CSP: val[34],
        });
      }
      log.audit("itemToProcess", itemToProcess);
      //return object and remove the first element

      return itemToProcess;
    } catch (e) {
      log.error("getItemDetails ", e.message);
    }
  }

  return {
    getPricing: getPricing,
    getItemDetails: getItemDetails,
  };
});
