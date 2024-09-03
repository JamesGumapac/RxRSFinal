/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 */
define([
  "N/record",
  "../rxrs_verify_staging_lib",
  "../rxrs_lib_bag_label",
  "../rxrs_transaction_lib",
  "../rxrs_custom_rec_lib",
], /**
 * @param{record} record
 * @param rxrsUtil
 * @param rxrsBagUtil
 * @param rxrs_tran_lib
 */ (record, rxrsUtil, rxrsBagUtil, rxrs_tran_lib, rxrs_custom_rec) => {
  /**
   * Defines the Suitelet script trigger point.
   * @param {Object} context
   * @param {ServerRequest} context.request - Incoming request
   * @param {ServerResponse} context.response - Suitelet response
   * @since 2015.2
   */
  const onRequest = (context) => {
    if (context.request.method === "POST") {
      try {
        let params = context.request.parameters;
        log.debug("Params", params);
        let maximumAmount = params.maximumAmount;
        let mfgProcessing = params.mfgProcessing;
        let binNumberId = params.binNumber;
        let exitingBagId = params.exitingBagId;

        let returnScanList = JSON.parse(params.custscript_payload);
        log.debug("returnScanList", returnScanList);
        let curAmount = returnScanList.reduce(function (acc, obj) {
          return acc + obj.amount;
        }, 0);
        const sortByAmount = returnScanList.sort(
          (a, b) => parseFloat(a.amount) - parseFloat(b.amount),
        );
        let rrType = params.rrType;
        // let existingBag = rxrsBagUtil.getBaglabelAvailable({
        //   manufId: params.manufId,
        //   maximumAmount: maximumAmount,
        //   mfgProcessing: mfgProcessing,
        //   lowestIRSAmount: sortByAmount[0].amount,
        // });
        // log.audit("existingbag", existingBag);
        //
        log.debug("amount", { curAmount, maximumAmount });
        let numberOfBags;
        if (params.returnType != "Destruction") {
          if (maximumAmount == 0) {
            numberOfBags = 1;
          } else {
            numberOfBags =
              +maximumAmount > +curAmount ? 1 : +curAmount / +maximumAmount;
          }

          log.debug("numberOfBags", numberOfBags);
        } else {
          numberOfBags = 1;
        }
        if (maximumAmount == 0 && curAmount == 0) {
          numberOfBags = 1;
        }

        if (!numberOfBags) {
          log.emergency("numberofbags", numberOfBags);
          numberOfBags = 1;
        }
        log.emergency("numberOfBags", typeof numberOfBags);
        log.emergency("numberOfBags", typeof numberOfBags == null);
        let bags = [];
        /**
         * Create Bags label depending on the maximum amount
         */

        let entity = rxrsUtil.getEntityFromMrr(+params.mrrid);
        if (params.returnType == "Destruction") {
          log.audit("existing  bag");
          if (exitingBagId) {
            bags.push(exitingBagId);
          } else {
            log.error("creating destruction bag");
            for (let i = 0; i < numberOfBags; i++) {
              bags.push(
                rxrsBagUtil.createBin({
                  mrrId: +params.mrrid,
                  entity: entity,
                  manufId: params.manufId,
                  rrId: params.rrId,
                  mfgProcessing: mfgProcessing,
                  binNumber: binNumberId,
                }),
              );
            }
          }
        } else {
          for (let i = 0; i < numberOfBags; i++) {
            if (exitingBagId) {
              bags.push(exitingBagId);
            } else {
              bags.push(
                rxrsBagUtil.createBin({
                  mrrId: +params.mrrid,
                  entity: entity,
                  manufId: params.manufId,
                  rrId: params.rrId,
                  mfgProcessing: mfgProcessing,
                  binNumber: binNumberId,
                }),
              );
            }
          }
        }

        /**
         * Assign Bag to the Item Return Scan
         */
        log.audit("bags", { bags, binNumberId });
        let bag = [];

        for (let i = 0; i < returnScanList.length; i++) {
          let prevBag = returnScanList[i].prevBag;
          if (!rxrsUtil.isEmpty(prevBag)) {
            prevBag = prevBag.split("&");
            prevBag = prevBag[1]; // get the id from the URL
            prevBag = prevBag.substring(3, prevBag.length);
            log.audit("prevbag", prevBag);
            if (prevBag.includes("=") == true) {
              prevBag = null;
            }
            log.audit("prevbag", prevBag);
          } else {
            prevBag = null;
          }
          bag.push({
            bag: bags[0],
            scanId: returnScanList[i].id,
            prevBag: prevBag,
          });
        }

        bag.forEach((b) => {
          rxrsBagUtil.updateBagLabel({
            ids: b.scanId,
            isVerify: JSON.parse(params.isVerify),
            bagId: b.bag,
            prevBag: b.prevBag,
            binNumber: binNumberId,
          });
        });

        if (rrType == "customsale_kod_returnrequest") {
          log.audit("Creating Inventory Adjustment");
          rxrs_tran_lib.createInventoryAdjustment({
            rrId: params.rrId,
            mrrId: params.mrrid,
          });
        }
        // else {
        //   log.audit("Creating PO");
        //   rxrs_tran_lib.createPO({
        //     rrId: params.rrId,
        //     mrrId: params.mrrid,
        //   });
        // }
        context.response.write("SUCCESSFUL");
      } catch (e) {
        context.response.write("ERROR: " + e.message);
        log.error("POST", e.message);
      }
    }
  };

  function getPreviousBag(prevBag) {
    prevBag = prevBag.split("&");
    prevBag = prevBag[1]; // get the id from the URL
    prevBag = prevBag.substring(3, prevBag.length);
    return prevBag;
  }

  return { onRequest };
});
