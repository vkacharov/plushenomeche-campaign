const AWS = require('aws-sdk'); 
const kms = new AWS.KMS();

exports.lambdaHandler = async (event, context) => {
    const applicationId = event.ApplicationId;

    for (const key in event.Endpoints) {
        if (event.Endpoints.hasOwnProperty(key)) {
            const endpoint = event.Endpoints[key];
            var attr = endpoint.Attributes;
            if (!attr) {
                attr = {};
                endpoint.Attributes = attr;
            }

            const userId = endpoint.User.UserId;
            const channelType = endpoint.ChannelType; 

            const signature = JSON.stringify({
                applicationId: applicationId, 
                endpointId: key, 
                userId: userId,
                channelType: channelType, 
                version: 1
            }); 

            const encryptedSignature = await encrypt(signature)
            attr["Signature"] = [encryptedSignature];
        }
    }
    console.log("Received event:", JSON.stringify(event, null, 2));
    return event.Endpoints;
};

async function encrypt(text) {
    const params = {
        KeyId: process.env.KMS_KEY_ID,
        Plaintext: text
    };
    
    const { CiphertextBlob } = await kms.encrypt(params).promise();
    return CiphertextBlob.toString('base64');
}
