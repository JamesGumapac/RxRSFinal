/**
 * @NApiVersion 2.x
 * @NScriptType WorkflowActionScript
 */
define(["N/search", "N/email", "N/url", "N/runtime", "N/record"], function (
  search,
  email,
  url,
  runtime,
  record
) {
  function onAction(scriptContext) {
    log.debug({
      title: "Start Script",
    });
    var rec = scriptContext.newRecord;
    var objScript = runtime.getCurrentScript();
    var strType = objScript.getParameter("custscript_kd_wa_send_email");
    var strSubject = "";
    var strBody = "";
    var recipient = "";
    log.debug("strType", strType);
    switch (strType) {
      case "masterreturncreation":
        recipient = scriptContext.newRecord.getValue("custrecord_kod_customer");
        strSubject =
          " Your Order " +
          scriptContext.newRecord.getValue("name") +
          " Has Been Submitted";
        strBody =
          " Your Order " +
          scriptContext.newRecord.getValue("name") +
          " Has Been Submitted";
        log.debug("Recipient", recipient);
        break;

      case "packagereceipt":
        recipient = scriptContext.newRecord.getValue("entity");
        strSubject =
          " Your Order #" +
          scriptContext.newRecord.getValue("tranid") +
          " Has Been Received";
        strBody =
          " Your Order #" +
          scriptContext.newRecord.getValue("tranid") +
          " Has Been Received";
        log.debug("Recipient", recipient);
        break;

      case "approvedreturnrequest":
        recipient = scriptContext.newRecord.getValue("entity");
        strSubject =
          " Your Order #" +
          scriptContext.newRecord.getValue("tranid") +
          " Has Been Approved";
        strBody =
          " Your Order #" +
          scriptContext.newRecord.getValue("tranid") +
          " Has Been Approved";
        log.debug("Recipient", recipient);
        break;

      case "submitreturnrequest":
        recipient = scriptContext.newRecord.getValue("entity");
        strSubject =
          " Your Order #" +
          scriptContext.newRecord.getValue("tranid") +
          " Has Been Submitted";
        strBody =
          " Your Order #" +
          scriptContext.newRecord.getValue("tranid") +
          " Has Been Submitted";
        log.debug("Recipient", recipient);
        break;

      case "form222":
        recipient = scriptContext.newRecord.getValue("entity");
        strSubject =
          " Your Order #" +
          scriptContext.newRecord.getValue("tranid") +
          " 222 Kit is on the way";
        strBody =
          " Your Order #" +
          scriptContext.newRecord.getValue("tranid") +
          " 222 Kit is on the way";
        log.debug("Recipient", recipient);
        break;
      case "salesorder":
        manufId = scriptContext.newRecord.getValue("csegmanufacturer");
        log.debug("Manuf Id", manufId);

        var recipient = scriptContext.newRecord.getValue(
          "custbody_rma_authorization_email"
        );

        var soId = record.submitFields({
          type: record.Type.SALES_ORDER,
          id: rec.id,
          values: {
            custbody_rma_email_sent: true,
          },
        });
        log.debug("Updated email Sent", soId);

        strSubject =
          " Requesting for RMA # for Transaction " +
          rec.getValue("tranid") +
          "";
        strBody =
          " Requesting for RMA # for Transaction" + rec.getValue("tranid") + "";
        log.debug("Recipient", recipient);
        break;
      default:
      // code block
    }
    log.debug("Line 80 ", recipient);
    if (recipient) {
      var userObj = runtime.getCurrentUser();
      if (userObj.id) {
        email.send({
          author: userObj.id,
          recipients: recipient,
          subject: strSubject,
          body: strBody,
          relatedRecords: {
            entityId: rec.getValue("entity"),
            transactionId: rec.id,
          },
        });
      } else {
        email.send({
          author: -5,
          recipients: recipient,
          subject: strSubject,
          body: strBody,
          relatedRecords: {
            entityId: rec.getValue("entity"),
            transactionId: rec.id,
          },
        });
      }
    }
  }

  return {
    onAction: onAction,
  };
});
