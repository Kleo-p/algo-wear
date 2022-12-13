import algosdk from "algosdk";
import {
    algodClient,
    indexerClient,
    marketplaceNote,
    minRound,
    myAlgoConnect,
    numGlobalBytes,
    numGlobalInts,
    numLocalBytes,
    numLocalInts
} from "./constants";
/* eslint import/no-webpack-loader-syntax: off */
import approvalProgram from "!!raw-loader!../contracts/wear_approval.teal";
import clearProgram from "!!raw-loader!../contracts/wear_clear.teal";
import { base64ToUTF8String, utf8ToBase64String } from "./conversions";

class Wear {
    constructor(name, image, description, amount, stock, discount, appId, owner) {
        this.name = name;
        this.image = image;
        this.description = description;
        this.amount = amount;
        this.stock = stock;
        this.discount = discount;
        this.appId = appId;
        this.owner = owner;
    }
}

// Compile smart contract in .teal format to program
const compileProgram = async (programSource) => {
    let encoder = new TextEncoder();
    let programBytes = encoder.encode(programSource);
    let compileResponse = await algodClient.compile(programBytes).do();
    return new Uint8Array(Buffer.from(compileResponse.result, "base64"));
}

// CREATE wear: ApplicationCreateTxn
export const createWearAction = async (senderAddress, wear) => {
    console.log("Adding wear...", wear)

    let params = await algodClient.getTransactionParams().do();

    // Compile programs
    const compiledApprovalProgram = await compileProgram(approvalProgram)
    const compiledClearProgram = await compileProgram(clearProgram)

    // Build note to identify transaction later and required app args as Uint8Arrays
    let note = new TextEncoder().encode(marketplaceNote);
    let name = new TextEncoder().encode(wear.name);
    let image = new TextEncoder().encode(wear.image);
    let description = new TextEncoder().encode(wear.description);
    let amount = algosdk.encodeUint64(wear.price);
    let stock = algosdk.encodeUint64(parseInt(wear.stock));
    let discount = algosdk.encodeUint64(parseInt(wear.discount));

    let appArgs = [name, description, image, amount, stock, discount]

    // Create ApplicationCreateTxn
    let txn = algosdk.makeApplicationCreateTxnFromObject({
        from: senderAddress,
        suggestedParams: params,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        approvalProgram: compiledApprovalProgram,
        clearProgram: compiledClearProgram,
        numLocalInts: numLocalInts,
        numLocalByteSlices: numLocalBytes,
        numGlobalInts: numGlobalInts,
        numGlobalByteSlices: numGlobalBytes,
        note: note,
        appArgs: appArgs
    });

    // Get transaction ID
    let txId = txn.txID().toString();

    // Sign & submit the transaction
    let signedTxn = await myAlgoConnect.signTransaction(txn.toByte());
    console.log("Signed transaction with txID: %s", txId);
    await algodClient.sendRawTransaction(signedTxn.blob).do();

    // Wait for transaction to be confirmed
    let confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);

    // Get the completed Transaction
    console.log("Transaction " + txId + " confirmed in round " + confirmedTxn["confirmed-round"]);

    // Get created application id and notify about completion
    let transactionResponse = await algodClient.pendingTransactionInformation(txId).do();
    let appId = transactionResponse['application-index'];
    console.log("Created new app-id: ", appId);
    return appId;
}

// BUY wear: Group transaction consisting of ApplicationCallTxn and PaymentTxn
export const buyWearAction = async (senderAddress, wear) => {
    console.log("Buying wear...", wear);

    let params = await algodClient.getTransactionParams().do();

    // Build required app args as Uint8Array
    let buyArg = new TextEncoder().encode("buy")
    let appArgs = [buyArg]

    // Create ApplicationCallTxn
    let appCallTxn = algosdk.makeApplicationCallTxnFromObject({
        from: senderAddress,
        appIndex: wear.appId,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        suggestedParams: params,
        appArgs: appArgs
    })

    // Create PaymentTxn
    let paymentTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
        from: senderAddress,
        to: wear.owner,
        amount: wear.amount - wear.discount,
        suggestedParams: params
    })

    let txnArray = [appCallTxn, paymentTxn]

    // Create group transaction out of previously build transactions
    let groupID = algosdk.computeGroupID(txnArray)
    for (let i = 0; i < 2; i++) txnArray[i].group = groupID;

    // Sign & submit the group transaction
    let signedTxn = await myAlgoConnect.signTransaction(txnArray.map(txn => txn.toByte()));
    console.log("Signed group transaction");
    let tx = await algodClient.sendRawTransaction(signedTxn.map(txn => txn.blob)).do();

    // Wait for group transaction to be confirmed
    let confirmedTxn = await algosdk.waitForConfirmation(algodClient, tx.txId, 4);

    // Notify about completion
    console.log("Group transaction " + tx.txId + " confirmed in round " + confirmedTxn["confirmed-round"]);
}

export const changeDiscountAction = async (senderAddress, wear, discount) => {
    console.log("Changing Discount...", wear, discount);

    let params = await algodClient.getTransactionParams().do();

    // Build required app args as Uint8Array
    let discountArg = new TextEncoder().encode("change_discount")
    let _discount = algosdk.encodeUint64(discount);
    let appArgs = [discountArg, _discount]

    // Create ApplicationCallTxn
    let appCallTxn = algosdk.makeApplicationCallTxnFromObject({
        from: senderAddress,
        appIndex: wear.appId,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        suggestedParams: params,
        appArgs: appArgs
    })

    let txId = appCallTxn.txID().toString();

    // Sign & submit the transaction
    let signedTxn = await myAlgoConnect.signTransaction(appCallTxn.toByte());
    console.log("Signed transaction with txID: %s", txId);
    await algodClient.sendRawTransaction(signedTxn.blob).do();

    // Wait for transaction to be confirmed
    let confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);

    // Get the completed Transaction
    console.log("Transaction " + txId + " confirmed in round " + confirmedTxn["confirmed-round"]);
}


export const updateStockAction = async (senderAddress, wear, _stock) => {
    console.log("Updating Stock...");

    let params = await algodClient.getTransactionParams().do();

    // Build required app args as Uint8Array
    let stockArg = new TextEncoder().encode("update-stock")
    let stock = algosdk.encodeUint64(_stock);
    let appArgs = [stockArg, stock]

    // Create ApplicationCallTxn
    let appCallTxn = algosdk.makeApplicationCallTxnFromObject({
        from: senderAddress,
        appIndex: wear.appId,
        onComplete: algosdk.OnApplicationComplete.NoOpOC,
        suggestedParams: params,
        appArgs: appArgs
    })

    let txId = appCallTxn.txID().toString();

    // Sign & submit the transaction
    let signedTxn = await myAlgoConnect.signTransaction(appCallTxn.toByte());
    console.log("Signed transaction with txID: %s", txId);
    await algodClient.sendRawTransaction(signedTxn.blob).do();

    // Wait for transaction to be confirmed
    let confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);

    // Get the completed Transaction
    console.log("Transaction " + txId + " confirmed in round " + confirmedTxn["confirmed-round"]);
}

// DELETE wear: ApplicationDeleteTxn
export const deleteWearAction = async (senderAddress, index) => {
    console.log("Deleting application...");

    let params = await algodClient.getTransactionParams().do();

    // Create ApplicationDeleteTxn
    let txn = algosdk.makeApplicationDeleteTxnFromObject({
        from: senderAddress, suggestedParams: params, appIndex: index,
    });

    // Get transaction ID
    let txId = txn.txID().toString();

    // Sign & submit the transaction
    let signedTxn = await myAlgoConnect.signTransaction(txn.toByte());
    console.log("Signed transaction with txID: %s", txId);
    await algodClient.sendRawTransaction(signedTxn.blob).do();

    // Wait for transaction to be confirmed
    const confirmedTxn = await algosdk.waitForConfirmation(algodClient, txId, 4);

    // Get the completed Transaction
    console.log("Transaction " + txId + " confirmed in round " + confirmedTxn["confirmed-round"]);

    // Get application id of deleted application and notify about completion
    let transactionResponse = await algodClient.pendingTransactionInformation(txId).do();
    let appId = transactionResponse['txn']['txn'].apid;
    console.log("Deleted app-id: ", appId);
}

// GET wearS: Use indexer
export const getWearsAction = async () => {
    console.log("Fetching wears...")
    let note = new TextEncoder().encode(marketplaceNote);
    let encodedNote = Buffer.from(note).toString("base64");

    // Step 1: Get all transactions by notePrefix (+ minRound filter for performance)
    let transactionInfo = await indexerClient.searchForTransactions()
        .notePrefix(encodedNote)
        .txType("appl")
        .minRound(minRound)
        .do();
    let wears = []
    for (const transaction of transactionInfo.transactions) {
        let appId = transaction["created-application-index"]
        if (appId) {
            // Step 2: Get each application by application id
            let wear = await getApplication(appId)
            if (wear) {
                wears.push(wear)
            }
        }
    }
    console.log("wears fetched.")
    return wears
}

const getApplication = async (appId) => {
    try {
        // 1. Get application by appId
        let response = await indexerClient.lookupApplications(appId).includeAll(true).do();
        if (response.application.deleted) {
            return null;
        }
        let globalState = response.application.params["global-state"]

        // 2. Parse fields of response and return wear
        let owner = response.application.params.creator
        let name = ""
        let image = ""
        let description = ""
        let amount = 0
        let stock = 0
        let discount = 0

        const getField = (fieldName, globalState) => {
            return globalState.find(state => {
                return state.key === utf8ToBase64String(fieldName);
            })
        }

        if (getField("_name", globalState) !== undefined) {
            let field = getField("_name", globalState).value.bytes
            name = base64ToUTF8String(field)
        }

        if (getField("_image", globalState) !== undefined) {
            let field = getField("_image", globalState).value.bytes
            image = base64ToUTF8String(field)
        }

        if (getField("_description", globalState) !== undefined) {
            let field = getField("_description", globalState).value.bytes
            description = base64ToUTF8String(field)
        }

        if (getField("_amount", globalState) !== undefined) {
            amount = getField("_amount", globalState).value.uint
        }

        if (getField("_stock", globalState) !== undefined) {
            stock = getField("_stock", globalState).value.uint
        }

        if (getField("_discount", globalState) !== undefined) {
            discount = getField("_discount", globalState).value.uint
        }

        return new Wear(name, image, description, amount, stock, discount, appId, owner)
    } catch (err) {
        return null;
    }
}
