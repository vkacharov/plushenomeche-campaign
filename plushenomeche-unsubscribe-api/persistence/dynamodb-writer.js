const AWS = require('aws-sdk'); 
const documentClient = new AWS.DynamoDB.DocumentClient();

exports.putUnsubscribeEvent = async (unsubscribeEvent) => {
    var params = {
        TableName : 'UnsubscribeEvents',
        Item: unsubscribeEvent
      };
    const result = await documentClient.put(params).promise();
    return result;
}