const AWS = require('aws-sdk');
const pinpoint = new AWS.Pinpoint();
const kms = new AWS.KMS();
const sesv2 = new AWS.SESV2();
const dynamodbWriter = require('./persistence/dynamodb-writer.js'); 

exports.lambdaHandler = async (event, context) => {
    
    let signatureParameter = event["queryStringParameters"]['s'];
    if (!signatureParameter) {
        console.error('No signature parameter in request', event);
        return; //TODO return error response
    }

    const unsubscribeEvent = {
        Signature: signatureParameter,
        Timestamp: Date.now(),
        Status: 'Fail'
    };

    try {
        signatureParameter = signatureParameter.replaceAll(' ', '+');
        const signatureText = await decryptSignature(signatureParameter);
        const signature = parseSignatureString(signatureText);
        
        //const sessResult = await addToSESSuppressionList(signature.address);
        const pinpointResult = await unsubscribeFromPinpoint(signature);
        
        unsubscribeEvent.Status = 'Success';
        return 'Successfully unsubscribed email ' + signature.address;
    } catch (err) {
        console.error('Failed to unsubscribe', err);
        unsubscribeEvent.message = err.message;
        return 'Failed to unsubscribe.';
    } finally {
        await dynamodbWriter.putUnsubscribeEvent(unsubscribeEvent);
    }
};

function createOptOutEndpointRequest(endpoint) {
    let updateEndpointRequest = {... endpoint};
    ['ApplicationId', 'CohortId', 'CreationDate', 'Id'].forEach(property => {
        delete updateEndpointRequest[property];
    })
    
    updateEndpointRequest.OptOut = 'ALL';
    return updateEndpointRequest;
}

async function decryptSignature(signatureParameter) {
    try {
        const params = {
            CiphertextBlob: Buffer.from(signatureParameter, 'base64')
        };
        const result = await kms.decrypt(params).promise();
        return result.Plaintext.toString('utf-8');
    } catch (err) {
        throw new Error("Failed to decrypt signature", {cause: err});
    }
}

async function addToSESSuppressionList(email) {
    try {
        var params = {
            EmailAddress: email,
            Reason: 'BOUNCE'
        };

        const result = await sesv2.putSuppressedDestination(params).promise();
        return result;
    } catch (err) {
        throw new Error("Failed to add to SES suppression list", {cause: err});
    }
}

async function unsubscribeFromPinpoint(signature) {
    try {
        const params = {
            ApplicationId: signature.applicationId, 
            EndpointId: signature.endpointId
        };
        
        const data = await pinpoint.getEndpoint(params).promise();
        const endpoint = data.EndpointResponse;

        //TODO validate UserId and ChannelType
        const endpointRequest = createOptOutEndpointRequest(endpoint);

        const updateParams = {
            ApplicationId: signature.applicationId, 
            EndpointId: signature.endpointId,
            EndpointRequest: endpointRequest
        };

        const updateData = await pinpoint.updateEndpoint(updateParams).promise();
        return updateData;
    } catch (err) {
        throw new Error("Failed to unsubscribe from Pinpoint", {cause: err});
    }
}

function parseSignatureString(signatureText) {
    try {
        return JSON.parse(signatureText);
    } catch (err) {
        throw new Error("Failed to parse signature", {cause: err});
    }
}
