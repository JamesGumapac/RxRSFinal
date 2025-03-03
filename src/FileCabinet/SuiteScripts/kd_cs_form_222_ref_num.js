/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(["N/url", "N/search", "N/currentRecord", "N/runtime"], function (
  url,
  search,
  currentRecord,
  runtime,
) {
  var REC_FORM_222_REF_NUM = "customrecord_kd_222formrefnum";
  var FLD_F2RN_PAGE = "custrecord_kd_form222_page";
  var FLD_F2RN_RET_REQ = "custrecord_kd_returnrequest";

  function pageInit(context) {
    try {
      var rec = context.currentRecord;
      if (rec.getValue("custrecord_kd_2frn_customer") == "") {
        var rrRec;
        var rrId = rec.getValue("custrecord_kd_returnrequest");
        try {
          rrRec = record.load({
            type: "customsale_kod_returnrequest",
            id: rrId,
          });
        } catch (e) {
          rrRec = record.load({
            type: "custompurchase_returnrequestpo",
            id: rrId,
          });
        }
        rec.setValue({
          fieldId: "custrecord_kd_2frn_customer",
          value: rrRec.getValue("entity"),
        });
      }
    } catch (e) {
      console.error("pageInit", e.message);
    }
  }

  function generateForm222(form222toRegenerate) {
    if (form222toRegenerate) {
      alert(form222toRegenerate);
    } else {
      var fieldLookUp = search.lookupFields({
        type: "customrecord_kd_222formrefnum",
        id: currentRecord.get().id,
        columns: ["custrecord_kd_returnrequest"],
      });
      var suiteletURL = url.resolveScript({
        scriptId: "customscript_kd_sl_generate_2frn_form222",
        deploymentId: "customdeploy_kd_sl_generate_2frn_form222",
        returnExternalUrl: false,
        params: {
          custscript_kd_2frn_id: currentRecord.get().id, //fieldLookUp['custrecord_kd_returnrequest'][0].value//currentRecord.get().getValue('custrecord_kd_returnrequest'),
          //'custscript_kd_rr_authorized_by': runtime.getCurrentUser().id
        },
      });
      location.href = suiteletURL;
      /*if(!isAllRirHaveForm222(currentRecord.get().id)){
                                                                                              //alert('All Form 222 No. must at least have 1 item on it.');
                                                                                              alert('All Return Item Requested must have Form 222 Reference No.');
                                                                                          }else{
                                                                                              var suiteletURL = url.resolveScript({
                                                                                                  scriptId: 'customscript_kd_sl_generate_form222',
                                                                                                  deploymentId: 'customdeploy_kd_sl_generate_form222',
                                                                                                  returnExternalUrl: false,
                                                                                                  params: {
                                                                                                      'custscript_kd_rr_id': currentRecord.get().id,
                                                                                                      'custscript_kd_rr_authorized_by': runtime.getCurrentUser().id
                                                                                                  }
                                                                                              });
                                                                                              location.href = suiteletURL;
                                                                                          }*/
    }
  }

  function isPageExisting(f2rnRec) {
    var f2rnPage = f2rnRec.getValue(FLD_F2RN_PAGE);
    var f2rnRetReq = f2rnRec.getValue(FLD_F2RN_RET_REQ);

    var f2rnSearch = search.create({
      type: REC_FORM_222_REF_NUM,
      columns: [
        search.createColumn({
          name: "internalid",
          summary: search.Summary.COUNT,
        }),
      ],
      filters: [
        {
          name: FLD_F2RN_RET_REQ,
          operator: "anyof",
          values: [f2rnRetReq],
        },
        {
          name: FLD_F2RN_PAGE,
          operator: "equalto",
          values: [f2rnPage],
        },
      ],
    });
    if (f2rnRec.id != null && f2rnRec.id != "") {
      log.debug("isPageExisting", "adding internal id filter: " + f2rnRec.id);
      f2rnSearch.filters.push(
        search.createFilter({
          name: "internalid",
          operator: search.Operator.NONEOF,
          values: [f2rnRec.id],
        }),
      );
    }
    var rs = f2rnSearch.run().getRange(0, 1);
    var f2rnCount = rs[0].getValue({
      name: "internalid",
      summary: search.Summary.COUNT,
    });
    log.debug("isPageExisting", "F2RN COUNT: " + f2rnCount);
    if (f2rnCount > 0) return true;

    return false;
  }

  function isRefNumExisting(f2rnRec) {
    var f2rnName = f2rnRec.getValue("name");
    if (f2rnName == "000000000") return false;

    var f2rnRetReq = f2rnRec.getValue(FLD_F2RN_RET_REQ);

    var f2rnSearch = search.create({
      type: REC_FORM_222_REF_NUM,
      columns: [
        search.createColumn({
          name: "internalid",
          summary: search.Summary.COUNT,
        }),
      ],
      filters: [
        {
          name: FLD_F2RN_RET_REQ,
          operator: "anyof",
          values: [f2rnRetReq],
        },
        {
          name: "name",
          operator: "is",
          values: [f2rnName],
        },
      ],
    });
    if (f2rnRec.id != null && f2rnRec.id != "") {
      log.debug("isRefNumExisting", "adding internal id filter: " + f2rnRec.id);
      f2rnSearch.filters.push(
        search.createFilter({
          name: "internalid",
          operator: search.Operator.NONEOF,
          values: [f2rnRec.id],
        }),
      );
    }
    var rs = f2rnSearch.run().getRange(0, 1);
    var f2rnCount = rs[0].getValue({
      name: "internalid",
      summary: search.Summary.COUNT,
    });
    log.debug("isRefNumExisting", "F2RN COUNT: " + f2rnCount);
    if (f2rnCount > 0) return true;

    return false;
  }

  function saveRecord(context) {
    try {
      let currentRecord = context.currentRecord;
      log.debug("saveRecord", "START: " + currentRecord.id);
      let message = "";

      if (isNaN(context.currentRecord.getValue("name"))) {
        message = "should only contain number";
      }
      log.audit("length", context.currentRecord.getValue("name").length);
      if (context.currentRecord.getValue("name").length !== 9) {
        if (message == "") {
          message = "must be 9 digits";
        } else {
          message = message + " and must be 9 digits";
        }
      }
      if (message != "") {
        alert("Reference Number " + message + ".");
        return false;
      }

      if (isPageExisting(currentRecord)) {
        message = "- Page\n";
      }

      if (isRefNumExisting(currentRecord)) {
        message += "- Reference Number";
      }

      if (message != "") {
        alert(
          "The following is already used on other Form 222 Reference for the same Return Request and needs to be adjusted:\n" +
            message,
        );
        return false;
      }
      return true;
    } catch (e) {
      log.error("saveRecord", e.message);
    }
  }

  return {
    // pageInit: pageInit,
    saveRecord: saveRecord,
    generateForm222: generateForm222,
  };
});
