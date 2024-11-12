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
  "../rxrs_util",
], /**
 * @param{record} record
 * @param rxrsUtil
 * @param rxrsBagUtil
 * @param rxrs_tran_lib
 */ (record, rxrsUtil, rxrsBagUtil, rxrs_tran_lib, rxrs_custom_rec, util) => {
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
        let {
          maximumAmount,
          mfgProcessing,
          binNumber,
          exitingBagId,
          category,
          manualBin,
          rrType,
          returnType,
          rrId,
          mrrid,
          manufId,
          custscript_payload,
          isVerify,
          isHazardous,
        } = params;

        let curAmount = 0;
        let returnScanList = JSON.parse(custscript_payload);
        const entity = rxrsUtil.getEntityFromMrr(+mrrid);
        let bag = [];
        log.debug("returnScanList", returnScanList);
        curAmount = returnScanList.reduce(function (acc, obj) {
          return acc + obj.wacAmount;
        }, 0);
        let bags = [];

        log.debug("amount", { curAmount, maximumAmount });
        let numberOfBags;
        switch (returnType) {
          case "Returnable":
            const sortByAmount = returnScanList.sort(
              (a, b) => parseFloat(a.wacAmount) - parseFloat(b.wacAmount),
            );

            if (maximumAmount == 0) {
              numberOfBags = 1;
            } else {
              numberOfBags =
                +maximumAmount > +curAmount ? 1 : +curAmount / +maximumAmount;
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
            log.debug("numberOfBags", numberOfBags);
            for (let i = 0; i < numberOfBags; i++) {
              if (exitingBagId) {
                bags.push(exitingBagId);
              } else {
                bags.push(
                  rxrsBagUtil.createBin({
                    mrrId: +mrrid,
                    entity: entity,
                    manufId: manufId,
                    rrId: rrId,
                    mfgProcessing: mfgProcessing,
                    binNumber: binNumber,
                  }),
                );
              }
            }
            /**
             * Create Bags label depending on the maximum amount
             */
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
              /**
               * Assign Bag to the Item Return Scan
               */
              log.audit("bags", { bags, binNumberId: binNumber });

              bag.forEach((b) => {
                rxrsBagUtil.updateBagLabel({
                  ids: b.scanId,
                  isVerify: JSON.parse(isVerify),
                  bagId: b.bag,
                  prevBag: b.prevBag,
                  binNumber: binNumber,
                });
              });
            }
            break;
          case "InDated":
            if (manualBin == true || manualBin == "true") {
              log.audit("inDated Manual Bin Selection", {
                returnScanList,
                binNumberId: binNumber,
              });
              let bagTagId = rxrsBagUtil.createBin({
                mrrId: mrrid,
                entity: entity,
                manufId: manufId,
                rrId: rrId,
                mfgProcessing: mfgProcessing,
                binNumber: binNumber,
              });
              log.audit("inDated", { bagTagId });
              if (bagTagId) {
                returnScanList.forEach(function (item) {
                  log.audit("item", item);
                  rxrsBagUtil.updateBagLabel({
                    ids: item.id,
                    isVerify: JSON.parse(isVerify),
                    bagId: bagTagId,
                    prevBag: item.prevBag ? getPreviousBag(item.prevBag) : null,
                    binNumber: binNumber,
                  });
                });
              }
            } else {
              let groupIndated = util.groupByDate(returnScanList, "indate");
              log.audit("GroupIndated", groupIndated);
              const keys = Object.keys(groupIndated);
              let values = Object.values(groupIndated);
              log.audit("In Dated", { values, keys });
              for (let i = 0; i < keys.length; i++) {
                let bagTagId;
                log.audit("In Date", keys[i]);
                log.audit("Values", values[i]);
                const month = keys[i].split("-")[1];
                const year = keys[i].split("-")[0];

                let binId = rxrsBagUtil.getBinPutAwayLocation({
                  generalBin: true,
                  binCategory: rxrsBagUtil.BINCATEGORY.Outbound,
                  isIndated: true,
                  productCategory: category,
                  inDateYear: year,
                  inDateMonth: month,
                });

                log.audit("bin", binId);
                if (binId.length < 1) {
                  binId = rxrsBagUtil.getBinPutAwayLocation({
                    generalBin: true,
                    binCategory: rxrsBagUtil.BINCATEGORY.Outbound,
                    isIndated: true,
                    productCategory: category,
                    inDateYear: year,
                    inDateMonth: "wholeyear",
                  });
                }
                if (binId.length > 0) {
                  binId = binId[0].value;
                  bagTagId = rxrsBagUtil.createBin({
                    mrrId: mrrid,
                    entity: entity,
                    manufId: manufId,
                    rrId: rrId,
                    mfgProcessing: mfgProcessing,
                    binNumber: binId,
                  });
                  log.audit("Creating Bag Tag", bagTagId);
                  if (bagTagId) {
                    log.audit("values", values);
                    values[i].forEach(function (item) {
                      log.audit("item", item);
                      rxrsBagUtil.updateBagLabel({
                        ids: item.id,
                        isVerify: JSON.parse(isVerify),
                        bagId: bagTagId,
                        prevBag: item.prevBag
                          ? getPreviousBag(item.prevBag)
                          : null,
                        binNumber: binId,
                      });
                    });
                  }
                }
              }
            }
            break;
          case "Destruction":
            if (manualBin == true || manualBin == "true") {
              log.audit("inDated Manual Bin Selection", {
                returnScanList,
                binNumberId: binNumber,
              });
              let bagTagId = rxrsBagUtil.createBin({
                mrrId: mrrid,
                entity: entity,
                manufId: manufId,
                rrId: rrId,
                mfgProcessing: mfgProcessing,
                binNumber: binNumber,
              });
              log.audit("Destruction", { bagTagId });
              if (bagTagId) {
                returnScanList.forEach(function (item) {
                  log.audit("item", item);
                  rxrsBagUtil.updateBagLabel({
                    ids: item.id,
                    isVerify: JSON.parse(isVerify),
                    bagId: bagTagId,
                    prevBag: item.prevBag ? getPreviousBag(item.prevBag) : null,
                    binNumber: binNumber,
                    isAerosol: item.isAerosol,
                    isSharp: item.isSharp,
                  });
                });
              }
            } else {
              if (category == util.RRCATEGORY.RXOTC) {
                const GL1Disp_OTC = 1029; // NON hazardous bag
                const GL2Disp_NoScanPatVit = 1030; // Unscannable bag
                const GL3Disp_Aero_Comb = 1031;
                const GL4Disp_Sharp = 1032;
                const nonHazardousBag = [];
                const unscannableBag = [];
                const aeroSolBag = [];
                const sharpBag = [];

                returnScanList.forEach(function (item) {
                  let {
                    itemId,
                    isAerosol,
                    isSharp,
                    patientVial,
                    nonScannable,
                  } = item;
                  log.audit("Non Hazardous", item);

                  if (isAerosol == true && isSharp == true) {
                    sharpBag.push(item);
                  } else if (isAerosol == true) {
                    aeroSolBag.push(item);
                  } else if (isSharp == true) {
                    sharpBag.push(item);
                  } else if (patientVial == true || nonScannable == true) {
                    unscannableBag.push(item);
                  } else {
                    if (isHazardous == false || isHazardous == "false") {
                      nonHazardousBag.push(item);
                    } else {
                      log.audit("No destruction bag", item);
                    }
                  }
                });
                log.audit("Destruction bags", {
                  nonHazardousBag,
                  unscannableBag,
                  aeroSolBag,
                  sharpBag,
                });
                if (nonHazardousBag.length > 0) {
                  let nonHazardousBagId = rxrsBagUtil.createBin({
                    mrrId: +mrrid,
                    entity: entity,
                    manufId: manufId,
                    rrId: rrId,
                    mfgProcessing: mfgProcessing,
                    binNumber: GL1Disp_OTC,
                  });
                  if (nonHazardousBagId) {
                    nonHazardousBag.forEach(function (item) {
                      rxrsBagUtil.updateBagLabel({
                        ids: item.id,
                        isVerify: JSON.parse(isVerify),
                        bagId: nonHazardousBagId,
                        prevBag: item.prevBag
                          ? getPreviousBag(item.prevBag)
                          : null,
                        binNumber: GL1Disp_OTC,
                      });
                    });
                  }
                }

                if (unscannableBag.length > 0) {
                  let unscannablebagId = rxrsBagUtil.createBin({
                    mrrId: +mrrid,
                    entity: entity,
                    manufId: manufId,
                    rrId: rrId,
                    mfgProcessing: mfgProcessing,
                    binNumber: GL2Disp_NoScanPatVit,
                  });
                  if (unscannablebagId) {
                    unscannableBag.forEach(function (item) {
                      rxrsBagUtil.updateBagLabel({
                        ids: item.id,
                        isVerify: JSON.parse(isVerify),
                        bagId: unscannablebagId,
                        prevBag: item.prevBag
                          ? getPreviousBag(item.prevBag)
                          : null,
                        binNumber: GL2Disp_NoScanPatVit,
                      });
                    });
                  }
                }
                if (aeroSolBag.length > 0) {
                  let aerosolBagId = rxrsBagUtil.createBin({
                    mrrId: +mrrid,
                    entity: entity,
                    manufId: manufId,
                    rrId: rrId,
                    mfgProcessing: mfgProcessing,
                    binNumber: GL3Disp_Aero_Comb,
                  });
                  if (aerosolBagId) {
                    aeroSolBag.forEach(function (item) {
                      rxrsBagUtil.updateBagLabel({
                        ids: item.id,
                        isVerify: JSON.parse(isVerify),
                        bagId: aerosolBagId,
                        prevBag: item.prevBag
                          ? getPreviousBag(item.prevBag)
                          : null,
                        binNumber: GL3Disp_Aero_Comb,
                        isAerosol: item.isAerosol,
                        isSharp: item.isSharp,
                      });
                    });
                  }
                }
                if (sharpBag.length > 0) {
                  let sharpBagId = rxrsBagUtil.createBin({
                    mrrId: +mrrid,
                    entity: entity,
                    manufId: manufId,
                    rrId: rrId,
                    mfgProcessing: mfgProcessing,
                    binNumber: GL4Disp_Sharp,
                  });
                  if (sharpBagId) {
                    sharpBag.forEach(function (item) {
                      rxrsBagUtil.updateBagLabel({
                        ids: item.id,
                        isVerify: JSON.parse(isVerify),
                        bagId: sharpBagId,
                        prevBag: item.prevBag
                          ? getPreviousBag(item.prevBag)
                          : null,
                        binNumber: GL4Disp_Sharp,
                        isAerosol: item.isAerosol,
                        isSharp: item.isSharp,
                      });
                    });
                  }
                }
              } else {
                context.response.write(
                  "ERROR: " + "NO AVAILABLE BINS FOR CONTROL CATEGORY",
                );
              }
            }

            break;
        }

        if (rrType == "customsale_kod_returnrequest") {
          log.audit("Creating Inventory Adjustment");
          rxrs_tran_lib.createInventoryAdjustment({
            rrId: rrId,
            mrrId: mrrid,
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
