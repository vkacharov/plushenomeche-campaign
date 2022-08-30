const AWS = require('aws-sdk');
const pinpoint = new AWS.Pinpoint();
const kms = new AWS.KMS();
const dynamodbWriter = require('./persistence/dynamodb-writer.js'); 

const unsubscribeStatus = {
    success: 'success'
}

exports.lambdaHandler = async (event, context) => {
    try {
        const signatureParameter = event["queryStringParameters"]['s'];
        const signatureText = await decryptSignature(signatureParameter);
        const signature = JSON.parse(signatureText);

        const params = {
            ApplicationId: signature.applicationId, 
            EndpointId: signature.endpointId
        };
        
        console.log('params', params);
        let data = await pinpoint.getEndpoint(params).promise();
        let endpoint = data.EndpointResponse;
            
        console.log('Endpoint', endpoint);

        //TODO validate UserId and ChannelType
        let endpointRequest = createOptOutEndpointRequest(endpoint);

        let  updateParams = {
            ApplicationId: signature.applicationId, 
            EndpointId: signature.endpointId,
            EndpointRequest: endpointRequest
        };

        let updateData = await pinpoint.updateEndpoint(updateParams).promise();
        return JSON.stringify(updateData);
    } catch (err) {
        console.log(err);
        return err;
    }
};

function createOptOutEndpointRequest(endpoint) {
    let updateEndpointRequest = {... endpoint};
    ['ApplicationId', 'CohortId', 'CreationDate', 'Id'].forEach(property => {
        delete updateEndpointRequest[property];
    })
    
    updateEndpointRequest.OptOut = 'NONE';
    return updateEndpointRequest;
}

async function decryptSignature(signatureParameter) {
    const params = {
        CiphertextBlob: Buffer.from(signatureParameter, 'base64')
    };
    const result = await kms.decrypt(params).promise();
    return result.Plaintext.toString('utf-8');
}